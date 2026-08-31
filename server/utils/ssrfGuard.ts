import { isIP } from 'node:net'
import { lookup } from 'node:dns/promises'
import { request as httpsRequest } from 'node:https'
import { request as httpRequest } from 'node:http'

const BLOCKED_IPV4 = [
  /^0\./,
  /^10\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.0\.0\./,
  /^192\.0\.2\./,
  /^192\.168\./,
  /^198\.18\./,
  /^198\.51\.100\./,
  /^203\.0\.113\./,
  /^224\./,
  /^240\./,
  /^255\.255\.255\.255$/,
]

function isBlockedIp(ip: string): boolean {
  const v = isIP(ip)
  if (v === 4) return BLOCKED_IPV4.some((re) => re.test(ip))
  if (v === 6) {
    const lower = ip.toLowerCase()
    // IPv4-mapped IPv6（::ffff:x.x.x.x）按内嵌 IPv4 判断，防绕过
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped) return BLOCKED_IPV4.some((re) => re.test(mapped[1]!))
    if (lower === '::1' || lower === '::') return true
    if (lower.startsWith('fe80:')) return true
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true
    // IPv4-compatible 地址（::x.x.x.x）及 ::/96 前导零地址一律拦截
    if (/^::\d{1,3}\./.test(lower)) return true
  }
  return false
}

function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (h === 'localhost' || h.endsWith('.localhost')) return true
  if (h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.lan') || h.endsWith('.home')) return true
  return false
}

export type SafeUrlResolution = { hostname: string; ips: string[] }

/**
 * 校验 URL 仅 http/https 且不指向本机/内网/链路本地/云元数据地址，
 * 并返回解析后的 IP 列表，供 safeFetch 用「IP 直连 + 原域名 SNI/Host」防 DNS rebinding。
 */
export async function resolveSafeUrl(rawUrl: string): Promise<SafeUrlResolution> {
  let u: URL
  try {
    u = new URL(String(rawUrl || '').trim())
  } catch {
    throw new Error('无效的 URL')
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('仅允许 http/https URL')
  }
  const hostname = u.hostname
  if (!hostname) throw new Error('缺少主机名')
  if (isBlockedHostname(hostname)) {
    throw new Error('禁止访问本机/内网地址')
  }
  if (isIP(hostname)) {
    if (isBlockedIp(hostname)) throw new Error('禁止访问本机/内网地址')
    return { hostname, ips: [hostname] }
  }
  let addrs
  try {
    addrs = await lookup(hostname, { all: true })
  } catch {
    throw new Error('域名解析失败')
  }
  if (addrs.some((a) => isBlockedIp(a.address))) {
    throw new Error('禁止访问本机/内网地址')
  }
  return { hostname, ips: addrs.map((a) => a.address) }
}

/** 兼容旧调用：仅校验，不关心解析结果 */
export async function assertSafePublicUrl(rawUrl: string): Promise<void> {
  await resolveSafeUrl(rawUrl)
}

const MAX_BODY_BYTES = 20 * 1024 * 1024

export type SafeFetchOptions = {
  method?: string
  headers?: Record<string, string>
  body?: string | Buffer
  redirect?: 'manual' | 'follow'
  timeoutMs?: number
  maxRedirects?: number
}

export type SafeFetchResponse = {
  status: number
  headers: { get(name: string): string | null }
  ok: boolean
  text(): Promise<string>
  arrayBuffer(): Promise<ArrayBuffer>
}

function rawRequest(opts: {
  protocol: string
  ip: string
  hostname: string
  port: number
  path: string
  method: string
  headers?: Record<string, string>
  body?: string | Buffer
  timeoutMs: number
}): Promise<SafeFetchResponse> {
  return new Promise((resolve, reject) => {
    let settled = false
    const settle = (fn: () => void) => {
      if (settled) return
      settled = true
      fn()
    }
    const lib = opts.protocol === 'https:' ? httpsRequest : httpRequest
    const headers: Record<string, string> = { ...(opts.headers || {}) }
    // 用 IP 直连，但 Host 保持原域名，避免服务端按 Host 返回错误站点
    if (!headers['Host'] && !headers['host']) headers['Host'] = opts.hostname
    const req = lib(
      {
        hostname: opts.ip,
        // SNI 用原域名：TLS 证书校验走原域名，连接走解析后的 IP
        servername: opts.protocol === 'https:' ? opts.hostname : undefined,
        port: opts.port,
        path: opts.path,
        method: opts.method,
        headers,
      },
      (res) => {
        const chunks: Buffer[] = []
        let size = 0
        res.on('data', (c: Buffer) => {
          size += c.length
          if (size > MAX_BODY_BYTES) {
            req.destroy(new Error('响应体过大'))
            settle(() => reject(new Error('响应体过大')))
            return
          }
          chunks.push(c)
        })
        res.on('end', () => {
          const buf = Buffer.concat(chunks)
          const rawHeaders = res.headers
          settle(() =>
            resolve({
              status: res.statusCode || 0,
              headers: {
                get: (name: string) => {
                  const lname = name.toLowerCase()
                  const v = rawHeaders[lname] ?? rawHeaders[name]
                  if (v == null) return null
                  return Array.isArray(v) ? String(v[0]) : String(v)
                },
              },
              ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300,
              text: async () => buf.toString('utf8'),
              arrayBuffer: async () =>
                buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
            }),
          )
        })
        res.on('error', (err) => settle(() => reject(err)))
      },
    )
    req.on('error', (err) => settle(() => reject(err)))
    req.setTimeout(opts.timeoutMs, () => req.destroy(new Error('request timeout')))
    if (opts.body) req.write(opts.body)
    req.end()
  })
}

/**
 * 安全的服务端抓取：先解析域名并校验 IP，再「IP 直连 + 原域名 SNI/Host」，
 * 消除 DNS rebinding（TOCTOU）。redirect=follow 时对每个重定向目标重新校验。
 */
export async function safeFetch(rawUrl: string, opts: SafeFetchOptions = {}): Promise<SafeFetchResponse> {
  const redirect = opts.redirect ?? 'follow'
  const maxRedirects = opts.maxRedirects ?? 5
  const timeoutMs = opts.timeoutMs ?? 20000
  let current = String(rawUrl || '').trim()

  for (let i = 0; i <= maxRedirects; i++) {
    const u = new URL(current)
    const { hostname, ips } = await resolveSafeUrl(current)
    const res = await rawRequest({
      protocol: u.protocol,
      ip: ips[0]!,
      hostname,
      port: u.port ? Number(u.port) : u.protocol === 'https:' ? 443 : 80,
      path: `${u.pathname}${u.search}`,
      method: opts.method || 'GET',
      headers: opts.headers,
      body: opts.body,
      timeoutMs,
    })
    if (redirect === 'follow' && res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location')
      if (!loc) return res
      current = new URL(loc, current).href
      continue
    }
    return res
  }
  throw new Error('重定向次数过多')
}

import { isIP } from 'node:net'
import { lookup } from 'node:dns/promises'

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
]

function isBlockedIp(ip: string): boolean {
  const v = isIP(ip)
  if (v === 4) return BLOCKED_IPV4.some((re) => re.test(ip))
  if (v === 6) {
    const lower = ip.toLowerCase()
    if (lower === '::1' || lower === '::') return true
    if (lower.startsWith('fe80:')) return true
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true
  }
  return false
}

function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (h === 'localhost' || h.endsWith('.localhost')) return true
  if (h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.lan') || h.endsWith('.home')) return true
  return false
}

/**
 * 校验 URL 仅 http/https 且不指向本机/内网/链路本地/云元数据地址。
 * 用于服务端抓取用户可控 URL 前做 SSRF 防护（音源、歌单等）。
 */
export async function assertSafePublicUrl(rawUrl: string): Promise<void> {
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
    return
  }
  try {
    const addrs = await lookup(hostname, { all: true })
    if (addrs.some((a) => isBlockedIp(a.address))) {
      throw new Error('禁止访问本机/内网地址')
    }
  } catch {
    throw new Error('域名解析失败')
  }
}

import { createHmac, createHash, timingSafeEqual, randomUUID } from 'node:crypto'

/** 会话默认 7 天（与 Cookie maxAge 对齐） */
export const SESSION_MAX_AGE_SEC = 7 * 24 * 60 * 60
const SESSION_TTL_MS = SESSION_MAX_AGE_SEC * 1000

export function createSessionToken(secret: string) {
  const exp = Date.now() + SESSION_TTL_MS
  const payload = Buffer.from(JSON.stringify({ exp, n: randomUUID() })).toString('base64url')
  const sig = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function verifySession(token: string | undefined, secret: string): { exp: number } | null {
  if (!token || !secret) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const expected = createHmac('sha256', secret).update(payload).digest('base64url')
  try {
    const a = Buffer.from(sig, 'base64url')
    const b = Buffer.from(expected, 'base64url')
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp: number }
    if (!data.exp || Date.now() > data.exp) return null
    return data
  } catch {
    return null
  }
}

export function safeEqualString(a: string, b: string) {
  // 先哈希再常量时间比较：避免长度不等提前返回泄露长度
  const ha = createHash('sha256').update(String(a)).digest()
  const hb = createHash('sha256').update(String(b)).digest()
  return timingSafeEqual(ha, hb)
}

import { getAuthToken, getSessionSecret } from '~~/server/utils/runtimeEnv'
import { isAuthRequired } from '~~/server/utils/authMode'
import { safeEqualString, createSessionToken } from '~~/server/utils/crypto'

const loginFails = new Map<string, { count: number; resetAt: number }>()
const MAX_LOGIN_ATTEMPTS = 5
const LOGIN_WINDOW_MS = 60_000

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const now = Date.now()
  const rec = loginFails.get(ip)
  if (rec) {
    if (now > rec.resetAt) loginFails.delete(ip)
    else if (rec.count >= MAX_LOGIN_ATTEMPTS) {
      throw createError({ statusCode: 429, statusMessage: '尝试过于频繁，请稍后再试' })
    }
  }

  const body = await readBody<{ password?: string }>(event)
  const authToken = getAuthToken()

  if (!isAuthRequired(authToken)) {
    throw createError({ statusCode: 400, statusMessage: '当前为开放模式，无需登录' })
  }

  const input = String(body?.password || '')
  if (!safeEqualString(input, authToken)) {
    const cur = loginFails.get(ip)
    if (!cur || now > cur.resetAt) {
      loginFails.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS })
    } else {
      cur.count += 1
    }
    throw createError({ statusCode: 401, statusMessage: '口令错误' })
  }

  loginFails.delete(ip)

  const secret = getSessionSecret()
  if (!secret) {
    throw createError({ statusCode: 500, statusMessage: '缺少 SESSION_SECRET，无法签发会话。请在运行配置中设置 SESSION_SECRET' })
  }
  const session = createSessionToken(secret)
  setCookie(event, 'daoyin_session', session, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })
  return { ok: true, token: session }
})

import { getAuthToken, getSessionSecret } from '~~/server/utils/runtimeEnv'
import { isAuthRequired } from '~~/server/utils/authMode'
import { safeEqualString, createSessionToken } from '~~/server/utils/crypto'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ password?: string }>(event)
  const authToken = getAuthToken()

  if (!isAuthRequired(authToken)) {
    throw createError({ statusCode: 400, statusMessage: '当前为开放模式，无需登录' })
  }

  const input = String(body?.password || '')
  if (!safeEqualString(input, authToken)) {
    throw createError({ statusCode: 401, statusMessage: '口令错误' })
  }

  const session = createSessionToken(getSessionSecret())
  setCookie(event, 'daoyin_session', session, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })
  return { ok: true, token: session }
})

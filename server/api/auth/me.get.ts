import { getAuthToken, getSessionSecret } from '~~/server/utils/runtimeEnv'
import { isAuthRequired } from '~~/server/utils/authMode'
import { verifySession } from '~~/server/utils/crypto'

export default defineEventHandler((event) => {
  const authRequired = isAuthRequired(getAuthToken())
  let session: { exp: number } | null = null
  if (authRequired) {
    const secret = getSessionSecret()
    const cookie = getCookie(event, 'daoyin_session')
    const header = getHeader(event, 'authorization')
    const bearer = header?.startsWith('Bearer ') ? header.slice(7) : undefined
    session = verifySession(bearer, secret) || verifySession(cookie, secret)
  }
  const loggedIn = !!session
  return {
    authRequired,
    // 开放模式恒视为已通过；鉴权模式下需存在有效会话
    authenticated: !authRequired || loggedIn,
    session: loggedIn ? session : null,
  }
})

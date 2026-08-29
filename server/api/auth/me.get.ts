import { getAuthToken } from '~~/server/utils/runtimeEnv'
import { isAuthRequired } from '~~/server/utils/authMode'

export default defineEventHandler((event) => {
  const authRequired = isAuthRequired(getAuthToken())
  const auth = event.context.auth as { open?: boolean } | undefined
  const loggedIn = !!auth && !auth.open
  return {
    authRequired,
    // 开放模式恒视为已通过；鉴权模式下需存在有效会话
    authenticated: !authRequired || loggedIn,
    session: loggedIn ? auth : null,
  }
})

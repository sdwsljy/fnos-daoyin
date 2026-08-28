import { getAuthToken } from '~~/server/utils/runtimeEnv'
import { isAuthRequired } from '~~/server/utils/authMode'

export default defineEventHandler((event) => {
  const authRequired = isAuthRequired(getAuthToken())
  const auth = event.context.auth
  return {
    authenticated: authRequired,
    session: auth && auth.open ? null : auth || null,
  }
})

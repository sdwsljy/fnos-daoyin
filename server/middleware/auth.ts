import { verifySession } from '../utils/crypto'
import { isAuthRequired } from '../utils/authMode'
import { getAuthToken, getSessionSecret } from '../utils/runtimeEnv'

export default defineEventHandler((event) => {
  // 用 event.path（已剥 baseURL）而非 getRequestURL().pathname（含 /app/daoyin 前缀），
  // 否则飞牛网关模式下 /app/daoyin/api/... 不以 /api/ 开头，鉴权会被整体跳过。
  const path = event.path
  if (!path.startsWith('/api/')) return
  if (path === '/api/auth/login' || path === '/api/auth/me' || path === '/api/health') return

  const authToken = getAuthToken()
  if (!isAuthRequired(authToken)) {
    event.context.auth = { open: true }
    return
  }

  const cookie = getCookie(event, 'daoyin_session')
  const header = getHeader(event, 'authorization')
  const bearer = header?.startsWith('Bearer ') ? header.slice(7) : undefined
  const secret = getSessionSecret()
  // 优先 Bearer，失败再回退 Cookie，避免过期 Cookie 掩盖合法 Bearer
  const session = verifySession(bearer, secret) || verifySession(cookie, secret)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: '未登录或会话已过期' })
  }
  event.context.auth = session
})

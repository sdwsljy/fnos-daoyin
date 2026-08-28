export default defineEventHandler((event) => {
  deleteCookie(event, 'daoyin_session', { path: '/' })
  return { ok: true }
})

import { retryTask } from '~~/server/services/downloadQueue'

export default defineEventHandler(async (event) => {
  const id = String(getRouterParam(event, 'id') || '')
  const body = await readBody<{ resetAttempts?: boolean }>(event).catch(() => undefined)
  return retryTask(id, { resetAttempts: body?.resetAttempts })
})

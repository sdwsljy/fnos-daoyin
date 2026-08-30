import { confirmPending } from '~~/server/services/downloadQueue'

export default defineEventHandler(async (event) => {
  const id = String(getRouterParam(event, 'id') || '')
  const body = await readBody<{ quality?: string }>().catch(() => undefined)
  return confirmPending(id, { quality: body?.quality })
})

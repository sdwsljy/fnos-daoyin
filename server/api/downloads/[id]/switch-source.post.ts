import { switchSourceAndRetry } from '~~/server/services/downloadQueue'

export default defineEventHandler(async (event) => {
  const id = String(getRouterParam(event, 'id') || '')
  const body = await readBody<{ sourceId?: string }>(event).catch(() => undefined)
  return switchSourceAndRetry(id, body?.sourceId ? { sourceId: body.sourceId } : undefined)
})

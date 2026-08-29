import { batchSwitchSourceAndRetry } from '~~/server/services/downloadQueue'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ ids?: string[]; sourceId?: string; sourceById?: Record<string, string> }>(event)
  const ids = Array.isArray(body?.ids) ? body.ids : []
  if (!ids.length) throw createError({ statusCode: 400, statusMessage: 'ids 必填' })
  return batchSwitchSourceAndRetry(ids, {
    sourceId: body?.sourceId,
    sourceById: body?.sourceById,
  })
})

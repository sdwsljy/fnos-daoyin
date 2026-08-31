import { batchSwitchQuality } from '~~/server/services/downloadQueue'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ ids?: string[]; quality?: string }>(event)
  const ids = Array.isArray(body?.ids) ? body.ids : []
  if (!ids.length) throw createError({ statusCode: 400, statusMessage: 'ids 必填' })
  if (!body?.quality) throw createError({ statusCode: 400, statusMessage: 'quality 必填' })
  return batchSwitchQuality(ids, body.quality)
})

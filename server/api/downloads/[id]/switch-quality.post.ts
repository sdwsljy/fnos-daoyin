import { switchQualityAndRetry } from '~~/server/services/downloadQueue'

export default defineEventHandler(async (event) => {
  const id = String(getRouterParam(event, 'id') || '')
  const body = await readBody<{ quality?: string }>(event)
  if (!body?.quality) {
    throw createError({ statusCode: 400, statusMessage: 'quality 必填' })
  }
  return switchQualityAndRetry(id, body.quality)
})

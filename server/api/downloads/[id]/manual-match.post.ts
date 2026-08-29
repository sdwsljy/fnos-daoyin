import { manualMatchTask } from '~~/server/services/downloadQueue'

export default defineEventHandler(async (event) => {
  const id = String(getRouterParam(event, 'id') || '')
  const body = await readBody<{
    title?: string
    artist?: string
    album?: string
    platform?: string
    externalId?: string
    musicInfo?: Record<string, any>
  }>(event)
  if (!body?.title || !body?.platform || !body?.musicInfo) {
    throw createError({ statusCode: 400, statusMessage: 'title / platform / musicInfo 必填' })
  }
  return manualMatchTask(id, {
    title: body.title,
    artist: body.artist || '未知',
    album: body.album || null,
    platform: body.platform,
    externalId: body.externalId || null,
    musicInfo: body.musicInfo,
  })
})

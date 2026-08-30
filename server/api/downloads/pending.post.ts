import { enqueuePendingConfirm } from '~~/server/services/downloadQueue'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    items?: Array<{
      title: string
      artist: string
      album?: string | null
      platform?: string
      quality?: string | null
      musicInfo?: Record<string, any>
      externalId?: string | null
      versions?: Array<{ name: string; path: string; size: number }>
    }>
  }>()
  const items = Array.isArray(body?.items) ? body.items : []
  if (!items.length) {
    throw createError({ statusCode: 400, statusMessage: 'items 必填' })
  }
  const tasks = items.map((it) =>
    enqueuePendingConfirm({
      title: it.title,
      artist: it.artist || '未知',
      album: it.album,
      platform: it.platform || 'wy',
      quality: it.quality,
      musicInfo: it.musicInfo,
      externalId: it.externalId,
      versions: it.versions,
    }),
  )
  return { count: tasks.length, tasks }
})

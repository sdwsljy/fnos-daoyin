import { randomUUID } from 'node:crypto'
import { enqueueDownload } from '~~/server/services/downloadQueue'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    platform?: string
    tracks?: Array<{
      title: string
      artist?: string
      album?: string
      externalId?: string
      musicInfo?: Record<string, any>
    }>
    quality?: string
    downloadLyric?: boolean
    lyricMode?: 'external' | 'embedded'
  }>(event)

  const platform = body?.platform || 'wy'
  const tracks = Array.isArray(body?.tracks) ? body.tracks : []
  if (!tracks.length) {
    throw createError({ statusCode: 400, statusMessage: 'tracks 必填' })
  }

  const batchId = randomUUID()
  const results: Array<{ title: string; ok: boolean; error?: string }> = []
  let enqueued = 0
  for (const t of tracks) {
    if (!t?.musicInfo) {
      results.push({ title: t?.title || '未知', ok: false, error: '缺少 musicInfo' })
      continue
    }
    try {
      enqueueDownload({
        title: t.title,
        artist: t.artist || '未知',
        album: t.album,
        platform,
        quality: body.quality,
        musicInfo: t.musicInfo,
        externalId: t.externalId,
        matchMethod: 'id',
        downloadLyric: body.downloadLyric,
        lyricMode: body.lyricMode,
        batchId,
      })
      enqueued += 1
      results.push({ title: t.title, ok: true })
    } catch (e: any) {
      results.push({ title: t.title, ok: false, error: e?.statusMessage || e?.message || '入队失败' })
    }
  }
  return { total: tracks.length, enqueued, results }
})

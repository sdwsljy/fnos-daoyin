import { enqueueDownload } from '~~/server/services/downloadQueue'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!body?.platform || !body?.musicInfo) {
    throw createError({ statusCode: 400, statusMessage: 'platform/musicInfo 必填' })
  }
  const task = enqueueDownload({
    title: body.title || body.musicInfo?.name || '未知',
    artist: body.artist || body.musicInfo?.singer || body.musicInfo?.artist || '未知',
    album: body.album || body.musicInfo?.albumName || undefined,
    platform: body.platform,
    sourceId: body.sourceId,
    quality: body.quality,
    musicInfo: body.musicInfo,
    externalId: body.externalId || body.musicInfo?.songmid || body.musicInfo?.hash,
    matchMethod: body.matchMethod,
    downloadLyric: body.downloadLyric,
    lyricMode: body.lyricMode,
  })
  return { task }
})

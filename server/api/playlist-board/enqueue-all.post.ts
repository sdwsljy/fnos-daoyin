import { enqueueAllPlaylistTracks } from '~~/server/services/playlistBoardService'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    platform?: string
    playlistId?: string
    quality?: string
    downloadLyric?: boolean
    lyricMode?: 'external' | 'embedded'
  }>(event)

  if (!body?.platform || !body?.playlistId) {
    throw createError({ statusCode: 400, statusMessage: 'platform/playlistId 必填' })
  }
  return enqueueAllPlaylistTracks({
    platform: body.platform,
    playlistId: body.playlistId,
    quality: body.quality,
    downloadLyric: body.downloadLyric,
    lyricMode: body.lyricMode,
  })
})

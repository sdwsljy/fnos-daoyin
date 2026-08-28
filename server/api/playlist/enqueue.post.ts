import { matchAndEnqueuePlaylist, type PlaylistDraft } from '~~/server/services/playlistService'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    playlist?: PlaylistDraft
    tracks?: PlaylistDraft['tracks']
    quality?: string
    downloadLyric?: boolean
    lyricMode?: 'external' | 'embedded'
  }>(event)
  const playlist = body?.playlist
  const tracks = Array.isArray(body?.tracks) ? body.tracks : playlist?.tracks
  if (!playlist || !Array.isArray(tracks) || !tracks.length) {
    throw createError({ statusCode: 400, statusMessage: 'playlist/tracks 必填' })
  }
  const draft: PlaylistDraft = { ...playlist, tracks }
  return await matchAndEnqueuePlaylist(draft, {
    quality: body.quality,
    downloadLyric: body.downloadLyric,
    lyricMode: body.lyricMode,
  })
})

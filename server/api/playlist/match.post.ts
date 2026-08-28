import { matchPlaylistTracks, type PlaylistTrackDraft } from '~~/server/services/playlistService'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ tracks?: PlaylistTrackDraft[]; scoreThreshold?: number }>(event)
  if (!Array.isArray(body?.tracks) || !body.tracks.length) {
    throw createError({ statusCode: 400, statusMessage: 'tracks 必填' })
  }
  const rows = await matchPlaylistTracks(body.tracks, { scoreThreshold: body.scoreThreshold })
  return { rows }
})

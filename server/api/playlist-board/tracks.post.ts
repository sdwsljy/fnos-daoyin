import { getPlaylistTracks } from '~~/server/services/playlistBoardService'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ platform?: string; playlistId?: string; page?: number; refresh?: boolean }>(event)
  if (!body?.playlistId) {
    throw createError({ statusCode: 400, statusMessage: 'playlistId 必填' })
  }
  const platform = body.platform || 'wy'
  const pageRaw = Number(body.page)
  const page = Number.isInteger(pageRaw) && pageRaw > 0 && pageRaw <= 100 ? pageRaw : 1
  const result = await getPlaylistTracks(platform, String(body.playlistId), page, body?.refresh === true)
  return { platform, playlistId: String(body.playlistId), ...result }
})

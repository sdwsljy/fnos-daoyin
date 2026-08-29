import { listPlaylistBoards } from '~~/server/services/playlistBoardService'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ platform?: string; refresh?: boolean }>(event)
  const platform = body?.platform || 'wy'
  const items = await listPlaylistBoards(platform, body?.refresh === true)
  return { platform, items }
})

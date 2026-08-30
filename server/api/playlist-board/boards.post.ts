import { listPlaylistBoards } from '~~/server/services/playlistBoardService'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ platform?: string; refresh?: boolean; page?: number; sort?: string }>(event)
  const platform = body?.platform || 'wy'
  const pageRaw = Number(body?.page)
  const page = Number.isInteger(pageRaw) && pageRaw > 0 && pageRaw <= 100 ? pageRaw : 1
  const sort = body?.sort === 'new' ? 'new' : 'hot'
  const result = await listPlaylistBoards(platform, body?.refresh === true, page, sort)
  return { platform, ...result }
})

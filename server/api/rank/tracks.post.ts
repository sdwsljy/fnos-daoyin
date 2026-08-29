import { getRankTracks } from '~~/server/services/rankService'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ platform?: string; boardId?: string; page?: number }>(event)
  if (!body?.boardId) {
    throw createError({ statusCode: 400, statusMessage: 'boardId 必填' })
  }
  const platform = body.platform || 'wy'
  const pageRaw = Number(body.page)
  const page = Number.isInteger(pageRaw) && pageRaw > 0 && pageRaw <= 100 ? pageRaw : 1
  const result = await getRankTracks(platform, String(body.boardId), page)
  return { platform, boardId: String(body.boardId), ...result }
})

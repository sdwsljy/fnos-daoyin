import { listRankBoards } from '~~/server/services/rankService'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ platform?: string }>(event)
  const platform = body?.platform || 'wy'
  const items = await listRankBoards(platform)
  return { platform, items }
})

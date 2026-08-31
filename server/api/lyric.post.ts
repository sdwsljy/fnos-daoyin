import { fetchLyric } from '~~/server/services/lyricService'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ platform?: string; musicInfo?: Record<string, any> }>(event)
  if (!body?.platform || !body?.musicInfo) {
    throw createError({ statusCode: 400, statusMessage: 'platform/musicInfo 必填' })
  }
  const lyric = await fetchLyric(body.platform, body.musicInfo)
  return { lyric }
})

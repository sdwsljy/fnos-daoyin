import { parsePlaylist } from '~~/server/services/playlistService'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ url?: string }>(event)
  if (!body?.url) {
    throw createError({ statusCode: 400, statusMessage: '请输入歌单链接' })
  }
  const draft = await parsePlaylist(body.url)
  return {
    platform: draft.platform,
    title: draft.title,
    url: draft.url,
    total: draft.tracks.length,
    tracks: draft.tracks,
  }
})

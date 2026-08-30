import { relinkTaskFile } from '~~/server/services/downloadQueue'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ id: string; path: string }>()
  if (!body?.id || !body?.path) {
    throw createError({ statusCode: 400, statusMessage: 'id/path 必填' })
  }
  return relinkTaskFile(body.id, body.path)
})

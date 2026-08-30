import { deleteOrphanFile } from '~~/server/services/downloadQueue'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ path: string }>()
  if (!body?.path) {
    throw createError({ statusCode: 400, statusMessage: 'path 必填' })
  }
  return deleteOrphanFile(body.path)
})

import { reDownloadTask } from '~~/server/services/downloadQueue'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id 必填' })
  return reDownloadTask(id)
})

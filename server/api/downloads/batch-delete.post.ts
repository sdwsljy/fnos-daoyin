import { batchDeleteTasks } from '~~/server/services/downloadQueue'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ ids?: string[]; deleteLocalFiles?: boolean }>(event)
  const ids = Array.isArray(body?.ids) ? body.ids : []
  if (!ids.length) throw createError({ statusCode: 400, statusMessage: 'ids 必填' })
  return batchDeleteTasks(ids, { deleteLocalFiles: Boolean(body?.deleteLocalFiles) })
})

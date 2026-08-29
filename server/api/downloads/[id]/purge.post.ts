import { deleteTask } from '~~/server/services/downloadQueue'

export default defineEventHandler(async (event) => {
  const id = String(getRouterParam(event, 'id') || '')
  const body = await readBody<{ deleteLocalFiles?: boolean }>(event).catch(() => undefined)
  return deleteTask(id, { deleteLocalFiles: Boolean(body?.deleteLocalFiles) })
})

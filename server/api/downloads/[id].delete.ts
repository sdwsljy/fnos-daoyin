import { deleteTask } from '~~/server/services/downloadQueue'

export default defineEventHandler((event) => {
  const id = String(getRouterParam(event, 'id') || '')
  const q = getQuery(event)
  const deleteLocalFiles = q.deleteLocalFiles === '1' || q.deleteLocalFiles === 'true'
  return deleteTask(id, { deleteLocalFiles })
})

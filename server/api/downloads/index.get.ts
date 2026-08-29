import { listTasks } from '~~/server/services/downloadQueue'

export default defineEventHandler((event) => {
  const q = getQuery(event)
  const status = typeof q.status === 'string' && q.status ? q.status : undefined
  return { items: listTasks(status) }
})

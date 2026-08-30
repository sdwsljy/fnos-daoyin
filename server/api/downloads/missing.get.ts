import { listMissingFileTasksDetailed } from '~~/server/services/downloadQueue'

export default defineEventHandler(() => {
  const missing = listMissingFileTasksDetailed()
  return {
    count: missing.length,
    items: missing,
  }
})

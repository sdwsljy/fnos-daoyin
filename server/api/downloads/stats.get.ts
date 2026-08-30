import { computeDownloadStats } from '~~/server/services/downloadQueue'

export default defineEventHandler(() => {
  return computeDownloadStats()
})

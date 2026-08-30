import { dedupeSharedRecords } from '~~/server/services/downloadQueue'

export default defineEventHandler(() => {
  return dedupeSharedRecords()
})

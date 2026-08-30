import {
  reconcileDownloadState,
  deleteMissingFileRecords,
} from '~~/server/services/downloadQueue'

export default defineEventHandler(() => {
  reconcileDownloadState()
  const deleted = deleteMissingFileRecords()
  return { deleted, stats: reconcileDownloadState() }
})

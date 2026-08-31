import {
  reconcileDownloadState,
  deleteMissingFileRecords,
} from '~~/server/services/downloadQueue'

export default defineEventHandler(async () => {
  await reconcileDownloadState()
  const deleted = deleteMissingFileRecords()
  const stats = await reconcileDownloadState()
  return { deleted, stats }
})

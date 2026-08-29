import { listMissingFileTasks } from '~~/server/services/downloadQueue'

export default defineEventHandler(() => {
  const missing = listMissingFileTasks()
  return {
    count: missing.length,
    items: missing.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      platform: t.platform,
      quality: t.quality,
      file_path: t.file_path,
    })),
  }
})

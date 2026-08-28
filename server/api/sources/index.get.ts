import { listSources } from '~~/server/services/sourceRegistry'

export default defineEventHandler(() => {
  const rows = listSources()
  return {
    items: rows.map((r) => {
      let platforms: string[] = []
      try {
        platforms = JSON.parse(r.platforms)
      } catch {
        /* ignore */
      }
      return { ...r, platforms }
    }),
  }
})

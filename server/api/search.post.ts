import { searchPlatform, listSearchablePlatforms } from '~~/server/services/platformSearch'
import { platformLabel } from '#shared/platforms'
import { listEnabledOkSources } from '~~/server/services/sourceRegistry'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ platform?: string; keyword?: string; page?: number }>(event)
  const platform = body?.platform || 'wy'
  const keyword = body?.keyword || ''
  const pageRaw = Number(body?.page)
  const page = Number.isInteger(pageRaw) && pageRaw > 0 && pageRaw <= 100 ? pageRaw : 1
  const items = await searchPlatform(platform, keyword, page)
  const sources = listEnabledOkSources(platform)
  return {
    platform,
    platforms: listSearchablePlatforms().map((p) => ({
      id: p,
      label: platformLabel(p),
      sourceCount: listEnabledOkSources(p).length,
    })),
    sourceHint: sources.map((s) => s.name),
    items,
  }
})

/** 试听链接内存缓存（平台 CDN 链接有时效，默认 25 分钟） */
const PLAY_URL_TTL_MS = 25 * 60 * 1000
const MAX_ENTRIES = 120

const cache = new Map<string, { value: unknown; expiresAt: number }>()

export function buildPlayUrlCacheKey(source: string, songId: string, quality = '128k'): string {
  return `${source || ''}:${songId || ''}:${quality || '128k'}`
}

export function getCachedPlayUrl<T>(key: string): T | undefined {
  const entry = cache.get(key)
  if (!entry) return undefined
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return undefined
  }
  return entry.value as T
}

export function setCachedPlayUrl(key: string, value: unknown, ttlMs = PLAY_URL_TTL_MS) {
  if (!key || value == null) return
  cache.set(key, { value, expiresAt: Date.now() + ttlMs })
  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest) cache.delete(oldest)
  }
}

export function clearPlayUrlCache() {
  cache.clear()
}

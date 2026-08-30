import { resolveMusicUrl, isHighestQuality } from '~~/server/services/musicUrlResolve'
import { buildPlayUrlCacheKey, getCachedPlayUrl, setCachedPlayUrl } from '~~/server/utils/playUrlCache'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    platform: string
    musicInfo: Record<string, any>
    quality?: string
    sourceId?: string
  }>(event)
  if (!body?.platform || !body?.musicInfo) {
    throw createError({ statusCode: 400, statusMessage: 'platform/musicInfo 必填' })
  }
  // 试听始终用最高可用（自动降级），保证能播；下载音质选项已不提供「最高可用」
  const qualityPref = 'highest'

  const songId = String(
    body.musicInfo.id || body.musicInfo.songmid || body.musicInfo.hash || body.musicInfo.songId || '',
  )
  const cacheKey = buildPlayUrlCacheKey(body.platform, songId, qualityPref)
  const cached = getCachedPlayUrl<{ url: string; quality: string; sourceId: string; sourceName: string }>(cacheKey)
  if (cached?.url) {
    return {
      url: cached.url,
      quality: cached.quality,
      sourceId: cached.sourceId,
      sourceName: cached.sourceName,
      degraded: isHighestQuality(qualityPref) && cached.quality !== 'flac24bit' && cached.quality !== 'flac',
    }
  }

  try {
    const result = await resolveMusicUrl({
      platform: body.platform,
      musicInfo: body.musicInfo,
      quality: qualityPref,
      sourceId: body.sourceId,
    })
    setCachedPlayUrl(cacheKey, {
      url: result.url,
      quality: result.quality,
      sourceId: result.sourceId,
      sourceName: result.sourceName,
    })
    return {
      url: result.url,
      quality: result.quality,
      sourceId: result.sourceId,
      sourceName: result.sourceName,
      // 固定音质失败不会走到这里；highest 时可能已降级
      degraded: isHighestQuality(qualityPref) && result.quality !== 'flac24bit' && result.quality !== 'flac',
    }
  } catch (err: any) {
    throw createError({
      statusCode: 502,
      statusMessage: err?.message || '试听取链失败',
    })
  }
})

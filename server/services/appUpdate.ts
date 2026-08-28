import { isNewerVersion, type AppUpdateCheckResult, type MiyinLatestManifest } from '#shared/appUpdate'

let cachedResult: AppUpdateCheckResult | null = null
let cachedAt = 0
const CACHE_TTL_MS = 60 * 60 * 1000

/**
 * 启动后请求 GitHub Release 附带的 latest.json 检测新版本。
 * 失败返回「无更新 + 空 latest」，不抛错阻断启动。
 */
export async function checkAppUpdate(current: string): Promise<AppUpdateCheckResult> {
  if (cachedResult && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedResult
  }
  const url = String(useRuntimeConfig().public.updateManifestUrl || '').trim()
  if (!url) {
    return { current, hasUpdate: false, latest: null }
  }
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'daoyin/1.0' },
    })
    clearTimeout(timer)
    if (!res.ok) {
      cachedResult = { current, hasUpdate: false, latest: null }
      cachedAt = Date.now()
      return cachedResult
    }
    const manifest = (await res.json()) as MiyinLatestManifest
    const hasUpdate = isNewerVersion(manifest.version, current)
    cachedResult = { current, hasUpdate, latest: manifest }
    cachedAt = Date.now()
    return cachedResult
  } catch {
    cachedResult = { current, hasUpdate: false, latest: null }
    cachedAt = Date.now()
    return cachedResult
  }
}

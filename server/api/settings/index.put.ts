import { saveSettings } from '~~/server/services/settingsService'
import { getFnOsDirAuthStatus } from '~~/server/services/fnosDirAuth'
import { isFnOsRuntime, pathCoveredByRoots } from '~~/server/utils/fnosEnv'

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, any>>(event)
  const nextDir = body?.downloadDir
  // 飞牛 custom 模式：改下载目录必须落在已授权路径内，避免绕过目录授权
  if (isFnOsRuntime() && typeof nextDir === 'string' && nextDir && process.env.DOWNLOAD_MODE === 'custom') {
    const status = await getFnOsDirAuthStatus()
    if (status.paths.length && !pathCoveredByRoots(nextDir, status.paths)) {
      throw createError({ statusCode: 400, statusMessage: '下载目录未授权，请在设置中完成目录授权' })
    }
  }
  const next = saveSettings(body || {})
  return { settings: next }
})

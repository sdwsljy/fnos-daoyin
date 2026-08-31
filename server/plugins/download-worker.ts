import { startDownloadWorker, reconcileDownloadState } from '../services/downloadQueue'
import { getSettings } from '../services/settingsService'
import { ensureDownloadDirWritable, cleanupStaleWriteProbes } from '../utils/downloadDir'
import { getAuthToken, getSessionSecret } from '../utils/runtimeEnv'
import { isAuthRequired } from '../utils/authMode'

let reconcileTimer: NodeJS.Timeout | null = null

export default defineNitroPlugin(() => {
  const downloadDir = getSettings().downloadDir
  try {
    ensureDownloadDirWritable(downloadDir)
    cleanupStaleWriteProbes(downloadDir)
  } catch (err: any) {
    console.error(
      '[daoyin] 下载目录当前不可写，创建下载任务将失败：',
      err?.message || err,
    )
  }

  // 鉴权配置自检：已设 AUTH_TOKEN 却漏配 SESSION_SECRET 时，登录会 fail-closed 无法签发会话
  const authToken = getAuthToken()
  if (isAuthRequired(authToken) && !getSessionSecret()) {
    console.error(
      '[daoyin] 已设置 AUTH_TOKEN 但未设置 SESSION_SECRET，登录将无法签发会话。请在运行配置中设置 SESSION_SECRET。',
    )
  }

  startDownloadWorker()

  // 自愈：启动即核对一次，之后每 10 分钟校验 completed/existing 记录的文件是否仍在，
  // 标记 file_missing，使「已下载文件数」与磁盘真实文件保持一致。
  const reconcile = async () => {
    try {
      await reconcileDownloadState()
    } catch (err: any) {
      console.error('[daoyin] 下载状态自愈失败：', err?.message || err)
    }
  }
  reconcile()
  if (!reconcileTimer) {
    reconcileTimer = setInterval(reconcile, 10 * 60 * 1000)
    reconcileTimer.unref?.()
  }
})

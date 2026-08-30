import { startDownloadWorker, reconcileDownloadState } from '../services/downloadQueue'
import { getSettings } from '../services/settingsService'
import { ensureDownloadDirWritable } from '../utils/downloadDir'

export default defineNitroPlugin(() => {
  try {
    ensureDownloadDirWritable(getSettings().downloadDir)
  } catch (err: any) {
    console.error(
      '[daoyin] 下载目录当前不可写，创建下载任务将失败：',
      err?.message || err,
    )
  }
  startDownloadWorker()

  // 自愈：启动即核对一次，之后每 10 分钟校验 completed/existing 记录的文件是否仍在，
  // 标记 file_missing，使「已下载文件数」与磁盘真实文件保持一致。
  const reconcile = () => {
    try {
      reconcileDownloadState()
    } catch (err: any) {
      console.error('[daoyin] 下载状态自愈失败：', err?.message || err)
    }
  }
  reconcile()
  setInterval(reconcile, 10 * 60 * 1000)
})

export const PLATFORM_LABELS: Record<string, string> = {
  wy: '网易云',
  kw: '酷我',
  kg: '酷狗',
  tx: 'QQ音乐',
  mg: '咪咕',
}

export function platformLabel(id: string) {
  return PLATFORM_LABELS[id] || id
}

export const QUALITY_LABELS: Record<string, string> = {
  highest: '最高可用',
  flac24bit: 'FLAC 24bit',
  flac: 'FLAC',
  '320k': '320kbps',
  '192k': '192kbps',
  '128k': '128kbps',
}

export function qualityLabel(q?: string | null) {
  if (!q) return 'FLAC 24bit'
  return QUALITY_LABELS[q] || q
}

export const TASK_STATUS_LABELS: Record<string, string> = {
  queued: '排队中',
  running: '下载中',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
  existing: '已存在',
}

export function formatDuration(sec: number) {
  if (!sec || sec <= 0) return ''
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatBytes(bytes?: number | null) {
  if (bytes == null || !Number.isFinite(bytes)) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function formatPercent(p: number) {
  return `${Math.round((p || 0) * 100)}%`
}

export function statusLabel(status: string) {
  return TASK_STATUS_LABELS[status] || status
}

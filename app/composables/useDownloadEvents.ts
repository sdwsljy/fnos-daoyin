import type { Ref } from 'vue'

export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'deleted'

export type DownloadTask = {
  id: string
  title: string
  artist: string
  album: string | null
  platform: string
  source_id: string | null
  quality: string | null
  status: string
  progress: number
  file_path: string | null
  lyric_path: string | null
  error: string | null
  attempts: number
  external_id: string | null
  match_method: string | null
  batch_id: string | null
  playlist_url: string | null
  file_size: number | null
  total_bytes: number | null
  created_at: string
  updated_at: string
}

// 模块级单例：连接、重连定时器、引用计数跨组件共享，
// 避免多页面各持独立连接、卸载后残留连接与重连定时器。
let es: EventSource | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let connectCount = 0

export function useDownloadEvents() {
  const tasks: Ref<DownloadTask[]> = useState<DownloadTask[]>('daoyin-download-tasks', () => [])

  /** 拼接 Nuxt baseURL（飞牛网关下为 /app/daoyin/），与 $fetch 行为一致 */
  function apiUrl(path: string) {
    const base = (useRuntimeConfig().app.baseURL || '/').replace(/\/?$/, '/')
    return `${base}${path.replace(/^\//, '')}`
  }

  function ensureConnected() {
    if (typeof EventSource === 'undefined') return
    if (es) return
    es = new EventSource(apiUrl('/api/downloads/events'))
    es.addEventListener('snapshot', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data)
        tasks.value = data.items || []
      } catch {
        /* ignore */
      }
    })
    es.addEventListener('task', (e) => {
      try {
        const task = JSON.parse((e as MessageEvent).data) as DownloadTask
        const idx = tasks.value.findIndex((t) => t.id === task.id)
        if (idx >= 0) {
          tasks.value.splice(idx, 1, task)
        } else {
          tasks.value.unshift(task)
        }
      } catch {
        /* ignore */
      }
    })
    es.onerror = () => {
      es?.close()
      es = null
      // 仍有引用时自动重连；定时器可被 disconnect 清理
      if (connectCount > 0 && !reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null
          ensureConnected()
        }, 3000)
      }
    }
  }

  function connect() {
    if (typeof EventSource === 'undefined') return
    connectCount += 1
    ensureConnected()
  }

  function disconnect() {
    connectCount = Math.max(0, connectCount - 1)
    if (connectCount > 0) return
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    es?.close()
    es = null
  }

  return {
    tasks,
    connect,
    disconnect,
  }
}

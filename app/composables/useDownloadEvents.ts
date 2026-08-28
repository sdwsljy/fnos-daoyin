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

export function useDownloadEvents() {
  const tasks: Ref<DownloadTask[]> = useState<DownloadTask[]>('daoyin-download-tasks', () => [])
  let es: EventSource | null = null

  /** 拼接 Nuxt baseURL（飞牛网关下为 /app/daoyin/），与 $fetch 行为一致 */
  function apiUrl(path: string) {
    const base = (useRuntimeConfig().app.baseURL || '/').replace(/\/?$/, '/')
    return `${base}${path.replace(/^\//, '')}`
  }

  function connect() {
    if (es || typeof EventSource === 'undefined') return
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
      // EventSource 会自动重连；这里仅兜底关闭旧连接避免重复
      es?.close()
      es = null
      // 延迟重连
      setTimeout(() => {
        connect()
      }, 3000)
    }
  }

  function disconnect() {
    es?.close()
    es = null
  }

  return {
    tasks,
    connect,
    disconnect,
  }
}

import { ref } from 'vue'

type CheckItem = {
  title: string
  artist: string
  album?: string | null
  platform?: string
  quality?: string | null
}

type CheckResult = {
  title: string
  artist: string
  state: 'exists' | 'multi_version' | 'none'
  path: string | null
  size: number | null
  versions: Array<{ name: string; path: string; size: number }>
}

function keyOf(item: { title: string; artist: string }) {
  return `${item.title}\u0000${item.artist}`
}

type PendingItem = {
  title: string
  artist: string
  album?: string | null
  platform?: string
  musicInfo?: Record<string, any>
  externalId?: string | null
}

/**
 * 下载前本地存在预检 + 多版本待确认。
 */
export function useLocalExisting() {
  const existing = ref<Map<string, CheckResult>>(new Map())
  const checking = ref(false)

  async function check(items: CheckItem[]) {
    if (!items.length) return existing.value
    checking.value = true
    try {
      const data = await $fetch<{ results: CheckResult[] }>('/api/downloads/existing-check', {
        method: 'POST',
        body: { items },
      })
      const map = new Map<string, CheckResult>()
      for (const r of data.results || []) map.set(keyOf(r), r)
      existing.value = map
    } catch {
      existing.value = new Map()
    } finally {
      checking.value = false
    }
    return existing.value
  }

  function resultOf(item: { title: string; artist: string }) {
    return existing.value.get(keyOf(item))
  }

  function isExisting(item: { title: string; artist: string }) {
    return resultOf(item)?.state === 'exists'
  }

  function multiVersions(item: { title: string; artist: string }) {
    const r = resultOf(item)
    return r?.state === 'multi_version' ? r.versions : []
  }

  async function savePending(
    item: PendingItem,
    versions: Array<{ name: string; path: string; size: number }>,
  ): Promise<string | null> {
    try {
      const data = await $fetch<{ tasks: Array<{ id: string }> }>('/api/downloads/pending', {
        method: 'POST',
        body: {
          items: [
            {
              title: item.title,
              artist: item.artist,
              album: item.album,
              platform: item.platform,
              musicInfo: item.musicInfo,
              externalId: item.externalId,
              versions,
            },
          ],
        },
      })
      return data.tasks?.[0]?.id || null
    } catch {
      return null
    }
  }

  async function confirmPending(id: string, quality?: string) {
    await $fetch(`/api/downloads/${id}/confirm`, { method: 'POST', body: { quality } })
  }

  async function skipPending(id: string) {
    await $fetch(`/api/downloads/${id}`, { method: 'DELETE' })
  }

  return {
    existing,
    checking,
    check,
    isExisting,
    multiVersions,
    savePending,
    confirmPending,
    skipPending,
  }
}

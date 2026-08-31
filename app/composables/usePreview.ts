import { usePlayer } from './usePlayer'
import { useToast } from './useToast'

/**
 * 试听：取链播放 + 异步加载歌词（失败静默，不影响播放）。
 */
export function usePreview() {
  const { play, setLyric } = usePlayer()
  const toast = useToast()

  async function preview(input: {
    platform: string
    musicInfo: Record<string, any>
    title: string
    artist: string
    cover?: string
    sourceId?: string
  }) {
    try {
      const res = await $fetch<{ url: string; quality: string; sourceName: string; degraded: boolean }>('/api/preview', {
        method: 'POST',
        body: { platform: input.platform, musicInfo: input.musicInfo, sourceId: input.sourceId },
      })
      play({ url: res.url, title: input.title, artist: input.artist, cover: input.cover })
      if (res.degraded) {
        toast.info(`试听音质已降级：${res.quality}（${res.sourceName}）`)
      }
      loadLyric(input.platform, input.musicInfo)
    } catch (e: any) {
      toast.error(e?.statusMessage || e?.message || '试听取链失败')
    }
  }

  async function loadLyric(platform: string, musicInfo: Record<string, any>) {
    try {
      const data = await $fetch<{ lyric: string | null }>('/api/lyric', {
        method: 'POST',
        body: { platform, musicInfo },
      })
      setLyric(data.lyric)
    } catch {
      setLyric(null)
    }
  }

  return { preview }
}

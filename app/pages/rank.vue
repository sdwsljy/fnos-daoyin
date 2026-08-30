<template>
  <div class="rank-page">
    <h2>排行榜</h2>

    <div class="platform-tabs">
      <button
        v-for="p in platforms"
        :key="p.id"
        class="platform-tab"
        :class="{ active: platform === p.id }"
        @click="switchPlatform(p.id)"
      >
        {{ p.label }}
      </button>
      <button class="btn-secondary" @click="refreshBoards">刷新榜单</button>
    </div>

    <div v-if="loadingBoards" class="hint">加载榜单中…</div>

    <div v-else-if="!board" class="boards">
      <button v-for="b in boards" :key="b.id" class="board-item card" @click="selectBoard(b)">
        <span class="board-name">{{ b.name }}</span>
      </button>
      <div v-if="!boards.length" class="empty">暂无榜单</div>
    </div>

    <div v-else class="board-view">
      <div class="board-head">
        <button class="btn-secondary" @click="board = null">返回榜单</button>
        <h3>{{ board.name }}</h3>
        <button class="btn-secondary" @click="refreshTracks">刷新</button>
      </div>

      <div class="download-opts card">
        <label class="checkbox">
          音质
          <select v-model="quality">
            <option v-for="q in qualityOptions" :key="q" :value="q">{{ qualityLabel(q) }}</option>
          </select>
        </label>
        <label class="checkbox">
          <input v-model="downloadLyric" type="checkbox" /> 歌词
        </label>
        <label v-if="downloadLyric" class="checkbox">
          写入方式
          <select v-model="lyricMode">
            <option value="external">外挂 .lrc</option>
            <option value="embedded">内嵌到音频</option>
          </select>
        </label>
        <button :disabled="enqueueing || !tracks.length" @click="enqueueAll">
          {{ enqueueing ? '入队中…' : `全部加入队列（${tracks.length}）` }}
        </button>
      </div>

      <div class="track-list">
        <div v-for="t in tracks" :key="t.externalId + t.title" class="track-row">
          <div class="track-meta">
            <span class="track-title">{{ t.title }}</span>
            <span class="dim"> - {{ t.artist }}</span>
            <span v-if="t.album" class="dim"> · {{ t.album }}</span>
          </div>
          <div class="track-actions">
            <button v-if="isExisting(t)" class="btn-ghost" disabled>已下载</button>
            <button v-else-if="multiVersions(t).length" class="btn-ghost mv-btn" @click="openMultiVersion(t)">
              多版本
            </button>
            <button v-else class="btn-ghost" @click="enqueueOne(t)">下载</button>
          </div>
        </div>
      </div>

      <div v-if="loadingTracks" class="hint">加载中…</div>
      <button v-else-if="hasMore" class="btn-secondary load-more" @click="loadMore">加载更多</button>
    </div>

    <MultiVersionDialog
      v-if="mvTarget"
      :title="mvTarget.item.title"
      :artist="mvTarget.item.artist"
      :versions="multiVersions(mvTarget.item)"
      @later="laterMv"
      @skip="skipMv"
      @download="downloadMv"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { qualityLabel } from '~/utils/mediaLabels'
import { useToast } from '~/composables/useToast'
import { useLocalExisting } from '~/composables/useLocalExisting'

type RankBoard = { id: string; name: string; cover?: string }
type RankTrack = {
  title: string
  artist: string
  album: string
  duration: number
  externalId: string
  musicInfo: Record<string, any>
}

const platforms = [
  { id: 'wy', label: '网易云' },
  { id: 'tx', label: 'QQ音乐' },
  { id: 'kg', label: '酷狗' },
]

const toast = useToast()
const { check: checkExisting, isExisting, multiVersions, savePending, confirmPending, skipPending } = useLocalExisting()

const platform = ref('wy')
const boards = ref<RankBoard[]>([])
const board = ref<RankBoard | null>(null)
const tracks = ref<RankTrack[]>([])
const page = ref(1)
const hasMore = ref(false)
const loadingBoards = ref(false)
const loadingTracks = ref(false)
const enqueueing = ref(false)

const quality = ref('flac24bit')
const downloadLyric = ref(true)
const lyricMode = ref<'external' | 'embedded'>('external')
const qualityOptions = ['flac24bit', 'flac', '320k', '192k', '128k']

async function loadDefaults() {
  try {
    const data = await $fetch<{
      settings: { downloadLyric: boolean; lyricMode: 'external' | 'embedded'; defaultQuality: string }
    }>('/api/settings')
    const s = data.settings
    downloadLyric.value = s.downloadLyric
    lyricMode.value = s.lyricMode || 'external'
    if (qualityOptions.includes(s.defaultQuality)) quality.value = s.defaultQuality
  } catch {
    /* 保持默认值 */
  }
}

async function loadBoards(refresh = false) {
  loadingBoards.value = true
  board.value = null
  tracks.value = []
  try {
    const data = await $fetch<{ items: RankBoard[] }>('/api/rank/boards', {
      method: 'POST',
      body: { platform: platform.value, refresh },
    })
    boards.value = data.items || []
  } catch (e: any) {
    boards.value = []
    toast.error(e?.statusMessage || e?.message || '榜单加载失败')
  } finally {
    loadingBoards.value = false
  }
}

function refreshBoards() {
  loadBoards(true)
}

function switchPlatform(id: string) {
  if (platform.value === id) return
  platform.value = id
  loadBoards()
}

async function selectBoard(b: RankBoard) {
  board.value = b
  page.value = 1
  tracks.value = []
  await loadTracks()
}

async function loadTracks(refresh = false) {
  if (!board.value) return
  loadingTracks.value = true
  try {
    const data = await $fetch<{ items: RankTrack[]; hasMore: boolean }>('/api/rank/tracks', {
      method: 'POST',
      body: { platform: platform.value, boardId: board.value.id, page: page.value, refresh },
    })
    if (refresh) tracks.value = data.items || []
    else tracks.value = tracks.value.concat(data.items || [])
    hasMore.value = data.hasMore
    checkExisting(
      tracks.value.map((t) => ({
        title: t.title,
        artist: t.artist,
        album: t.album,
        platform: platform.value,
      })),
    )
  } catch (e: any) {
    toast.error(e?.statusMessage || e?.message || '歌曲加载失败')
  } finally {
    loadingTracks.value = false
  }
}

async function refreshTracks() {
  page.value = 1
  await loadTracks(true)
}

async function loadMore() {
  page.value += 1
  await loadTracks()
}

async function enqueueAll() {
  if (!tracks.value.length) return
  const multi = tracks.value.filter((t) => multiVersions(t).length)
  const toEnqueue = tracks.value.filter((t) => !isExisting(t) && !multiVersions(t).length)
  const skipped = tracks.value.length - toEnqueue.length - multi.length

  let pendingCount = 0
  if (multi.length) {
    try {
      const data = await $fetch<{ count: number }>('/api/downloads/pending', {
        method: 'POST',
        body: {
          items: multi.map((t) => ({
            title: t.title,
            artist: t.artist,
            album: t.album,
            platform: platform.value,
            quality: quality.value,
            musicInfo: t.musicInfo,
            externalId: t.externalId,
            versions: multiVersions(t),
          })),
        },
      })
      pendingCount = data.count || 0
    } catch {
      pendingCount = 0
    }
  }

  if (!toEnqueue.length) {
    toast.info(pendingCount ? `多版本 ${pendingCount} 首已加入待确认` : '所选歌曲均已下载')
    return
  }

  enqueueing.value = true
  try {
    const data = await $fetch<{ total: number; enqueued: number }>('/api/rank/enqueue', {
      method: 'POST',
      body: {
        platform: platform.value,
        tracks: toEnqueue,
        quality: quality.value,
        downloadLyric: downloadLyric.value,
        lyricMode: lyricMode.value,
      },
    })
    const parts = [`已入队 ${data.enqueued} 首`]
    if (skipped) parts.push(`跳过已存在 ${skipped} 首`)
    if (pendingCount) parts.push(`多版本 ${pendingCount} 首加入待确认`)
    toast.success(parts.join('，'))
  } catch (e: any) {
    toast.error(e?.statusMessage || e?.message || '入队失败')
  } finally {
    enqueueing.value = false
  }
}

async function enqueueOne(t: RankTrack) {
  try {
    const data = await $fetch<{ enqueued: number }>('/api/rank/enqueue', {
      method: 'POST',
      body: {
        platform: platform.value,
        tracks: [t],
        quality: quality.value,
        downloadLyric: downloadLyric.value,
        lyricMode: lyricMode.value,
      },
    })
    if (data.enqueued > 0) toast.success(`已加入队列：${t.title}`)
  } catch (e: any) {
    toast.error(e?.statusMessage || e?.message || '入队失败')
  }
}

const mvTarget = ref<{ item: RankTrack; pendingId: string } | null>(null)

async function openMultiVersion(t: RankTrack) {
  const versions = multiVersions(t)
  const id = await savePending(
    {
      title: t.title,
      artist: t.artist,
      album: t.album,
      platform: platform.value,
      musicInfo: t.musicInfo,
      externalId: t.externalId,
    },
    versions,
  )
  if (!id) {
    toast.error('写入待确认失败')
    return
  }
  mvTarget.value = { item: t, pendingId: id }
}

async function downloadMv(quality: string) {
  const mv = mvTarget.value
  mvTarget.value = null
  if (!mv) return
  try {
    await confirmPending(mv.pendingId, quality)
    toast.success(`已加入队列：${mv.item.title}`)
  } catch (e: any) {
    toast.error(e?.statusMessage || '确认下载失败')
  }
}

function skipMv() {
  const mv = mvTarget.value
  mvTarget.value = null
  if (mv) skipPending(mv.pendingId).catch(() => {})
}

function laterMv() {
  mvTarget.value = null
}

onMounted(() => {
  loadDefaults()
  loadBoards()
})
</script>

<style scoped>
.platform-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.platform-tab {
  background: var(--color-bg-elev);
  color: var(--color-text-dim);
}

.platform-tab.active {
  background: var(--color-primary);
  color: #fff;
}

.boards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}

.board-item {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  cursor: pointer;
  color: var(--color-text);
  transition: border-color 0.15s ease, background 0.15s ease;
}

.board-item:hover {
  border-color: var(--color-accent);
  background: var(--color-bg-elev2);
}

.board-name {
  font-weight: 600;
}

.board-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.board-head h3 {
  margin: 0;
}

.download-opts {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 10px 14px;
  margin-bottom: 16px;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--color-text-dim);
  font-size: 13px;
}

.checkbox select {
  width: auto;
}

.track-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.track-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: var(--radius);
  background: var(--color-bg-elev);
  font-size: 13px;
}

.track-meta {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.track-title {
  font-weight: 600;
}

.dim {
  color: var(--color-text-dim);
}

.track-actions {
  flex-shrink: 0;
}

.mv-btn {
  color: var(--color-warning);
}

.load-more {
  display: block;
  margin: 16px auto 0;
}

.hint {
  color: var(--color-text-dim);
  padding: 24px 0;
  text-align: center;
}

.empty {
  text-align: center;
  color: var(--color-text-dim);
  padding: 48px 0;
}
</style>

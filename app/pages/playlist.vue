<template>
  <div class="playlist-page">
    <h2>歌单下载</h2>

    <div class="mode-tabs">
      <button class="mode-tab" :class="{ active: mode === 'link' }" @click="mode = 'link'">链接导入</button>
      <button class="mode-tab" :class="{ active: mode === 'board' }" @click="mode = 'board'">歌单广场</button>
    </div>

    <template v-if="mode === 'link'">
    <div class="parse-bar">
      <input v-model="url" type="text" placeholder="粘贴 wy / tx / kg 歌单链接" />
      <button :disabled="parsing" @click="parse">
        {{ parsing ? '解析中…' : '解析歌单' }}
      </button>
      <button class="btn-secondary" :disabled="parsing || enqueueing" @click="parseAndEnqueue">
        {{ enqueueing ? '下载中…' : '一键解析下载' }}
      </button>
    </div>

    <div class="download-opts card">
      <span class="opts-title">下载选项</span>
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
    </div>

    <div v-if="draft" class="draft card">
      <div class="draft-head">
        <div>
          <b>{{ draft.title }}</b>
          <span class="dim">（{{ platformLabel(draft.platform) }} · {{ draft.tracks.length }} 首）</span>
        </div>
        <div class="quality-pick">
          <button :disabled="enqueueing" @click="enqueueAll">
            {{ enqueueing ? '匹配中…' : '全部加入队列' }}
          </button>
        </div>
      </div>

      <div class="track-list">
        <div v-for="row in matchRows" :key="row.index" class="track-row" :class="{ warn: row.needsConfirm }">
          <div class="track-meta">
            <span class="track-title">{{ row.track.title }}</span>
            <span class="dim"> - {{ row.track.artist }}</span>
            <template v-if="row.selected">
              <span class="match-badge">匹配：{{ row.selected.title }} - {{ row.selected.artist }}</span>
              <span v-if="row.crossPlatform" class="cross-badge">跨平台 · {{ platformLabel(row.matchPlatform || row.track.platform) }}</span>
            </template>
            <span v-if="row.needsConfirm" class="warn-badge">需确认</span>
            <span v-if="row.error" class="err-text">{{ row.error }}</span>
          </div>
          <div class="track-actions">
            <span class="score">得分 {{ row.score != null ? Math.round(row.score * 100) : 0 }}</span>
            <button v-if="row.selected && !row.needsConfirm" class="btn-ghost" @click="openConfirm(row)">改用匹配名</button>
            <button v-if="row.needsConfirm" class="btn-ghost" @click="openConfirm(row)">确认</button>
          </div>
        </div>
      </div>
    </div>

    <MatchConfirmDialog
      v-if="confirmRow"
      :row="confirmRow"
      @close="confirmRow = null"
      @confirm="applyMatch"
    />
    <EnqueueResultDialog
      v-if="enqueueResult"
      :total="enqueueResult.total"
      :enqueued="enqueueResult.enqueued"
      :results="enqueueResult.results"
      @close="enqueueResult = null"
    />
    </template>

    <template v-else>
      <div class="board-platform-tabs">
        <button
          v-for="p in boardPlatforms"
          :key="p.id"
          class="platform-tab"
          :class="{ active: boardPlatform === p.id }"
          @click="switchBoardPlatform(p.id)"
        >
          {{ p.label }}
        </button>
        <button class="btn-secondary" @click="refreshBoards">刷新歌单</button>
      </div>

      <div v-if="loadingBoards" class="hint">加载歌单中…</div>

      <div v-else-if="!board" class="boards">
        <button v-for="b in boards" :key="b.id" class="board-item card" @click="selectBoard(b)">
          <span class="board-name">{{ b.name }}</span>
          <span v-if="b.count" class="board-count">{{ b.count }} 首</span>
        </button>
        <div v-if="!boards.length" class="empty">暂无歌单</div>
      </div>

      <div v-else class="board-view">
        <div class="board-head">
          <button class="btn-secondary" @click="board = null">返回歌单</button>
          <h3>{{ board.name }}</h3>
          <button class="btn-secondary" @click="refreshBoardTracks">刷新</button>
        </div>

        <div v-if="board.creator || board.playCount || board.collectCount" class="board-meta">
          <span v-if="board.creator" class="meta-item">创建者 {{ board.creator }}</span>
          <span v-if="board.playCount" class="meta-item">播放 {{ formatCount(board.playCount) }}</span>
          <span v-if="board.collectCount" class="meta-item">收藏 {{ formatCount(board.collectCount) }}</span>
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
          <button :disabled="boardEnqueueing || !boardTracks.length" @click="boardEnqueueAll">
            {{ boardEnqueueing ? '入队中…' : `全部加入队列（${boardTracks.length}）` }}
          </button>
        </div>

        <div class="track-list">
          <div v-for="t in boardTracks" :key="t.externalId + t.title" class="track-row">
            <div class="track-meta">
              <span class="track-title">{{ t.title }}</span>
              <span class="dim"> - {{ t.artist }}</span>
              <span v-if="t.album" class="dim"> · {{ t.album }}</span>
            </div>
            <div class="track-actions">
              <button class="btn-ghost" @click="boardEnqueueOne(t)">下载</button>
            </div>
          </div>
        </div>

        <div v-if="loadingTracks" class="hint">加载中…</div>
        <button v-else-if="hasMore" class="btn-secondary load-more" @click="loadMore">加载更多</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { platformLabel, qualityLabel } from '~/utils/mediaLabels'
import { useToast } from '~/composables/useToast'

type PlaylistTrack = {
  externalId?: string
  title: string
  artist: string
  album?: string
  duration?: number
  platform: string
  musicInfo?: Record<string, any>
}

type MatchRow = {
  index: number
  track: PlaylistTrack
  score: number
  needsConfirm: boolean
  matchPlatform?: string
  crossPlatform?: boolean
  selected?: { title: string; artist: string } | null
  candidates?: Array<{ title: string; artist: string; score?: number; musicInfo?: Record<string, any> }>
  error?: string
}

const url = ref('')
const parsing = ref(false)
const enqueueing = ref(false)
const draft = ref<{ platform: string; title: string; tracks: PlaylistTrack[] } | null>(null)
const matchRows = ref<MatchRow[]>([])
const quality = ref('flac24bit')
const downloadLyric = ref(true)
const lyricMode = ref<'external' | 'embedded'>('external')
const confirmRow = ref<MatchRow | null>(null)
const enqueueResult = ref<{ total: number; enqueued: number; results: Array<{ title: string; ok: boolean; error?: string }> } | null>(null)
const qualityOptions = ['flac24bit', 'flac', '320k', '192k', '128k']

const mode = ref<'link' | 'board'>('link')
const boardPlatforms = [
  { id: 'wy', label: '网易云' },
  { id: 'tx', label: 'QQ音乐' },
  { id: 'kg', label: '酷狗' },
]
const boardPlatform = ref('wy')
const boards = ref<Array<{ id: string; name: string; cover?: string; count?: number; playCount?: number; collectCount?: number; creator?: string }>>([])
const board = ref<{ id: string; name: string; cover?: string; count?: number; playCount?: number; collectCount?: number; creator?: string } | null>(null)
const boardTracks = ref<Array<{ title: string; artist: string; album: string; duration: number; externalId: string; musicInfo: Record<string, any> }>>([])
const boardPage = ref(1)
const hasMore = ref(false)
const loadingBoards = ref(false)
const loadingTracks = ref(false)
const boardEnqueueing = ref(false)

const toast = useToast()

/** 预填默认设置：音质 / 歌词开关 / 歌词写入方式（与设置页一致） */
async function loadDefaults() {
  try {
    const data = await $fetch<{
      settings: {
        downloadLyric: boolean
        lyricMode: 'external' | 'embedded'
        defaultQuality: string
      }
    }>('/api/settings')
    const s = data.settings
    downloadLyric.value = s.downloadLyric
    lyricMode.value = s.lyricMode || 'external'
    if (qualityOptions.includes(s.defaultQuality)) {
      quality.value = s.defaultQuality
    }
  } catch {
    /* 保持默认值 */
  }
}

onMounted(() => {
  loadDefaults()
})

watch(mode, (m) => {
  if (m === 'board' && !boards.value.length && !loadingBoards.value) {
    loadBoards()
  }
})

function formatCount(n?: number): string {
  if (!n) return '0'
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)} 亿`
  if (n >= 10000) return `${(n / 10000).toFixed(1)} 万`
  return String(n)
}

async function loadBoards(refresh = false) {
  loadingBoards.value = true
  board.value = null
  boardTracks.value = []
  try {
    const data = await $fetch<{ items: Array<{ id: string; name: string; cover?: string; count?: number }> }>('/api/playlist-board/boards', {
      method: 'POST',
      body: { platform: boardPlatform.value, refresh },
    })
    boards.value = data.items || []
  } catch (e: any) {
    boards.value = []
    toast.error(e?.statusMessage || e?.message || '歌单加载失败')
  } finally {
    loadingBoards.value = false
  }
}

function refreshBoards() {
  loadBoards(true)
}

function switchBoardPlatform(id: string) {
  if (boardPlatform.value === id) return
  boardPlatform.value = id
  loadBoards()
}

async function selectBoard(b: { id: string; name: string; cover?: string; count?: number; playCount?: number; collectCount?: number; creator?: string }) {
  board.value = b
  boardPage.value = 1
  boardTracks.value = []
  await loadTracks()
}

async function loadTracks(refresh = false) {
  if (!board.value) return
  loadingTracks.value = true
  try {
    const data = await $fetch<{ items: Array<{ title: string; artist: string; album: string; duration: number; externalId: string; musicInfo: Record<string, any> }>; hasMore: boolean }>('/api/playlist-board/tracks', {
      method: 'POST',
      body: { platform: boardPlatform.value, playlistId: board.value.id, page: boardPage.value, refresh },
    })
    if (refresh) boardTracks.value = data.items || []
    else boardTracks.value = boardTracks.value.concat(data.items || [])
    hasMore.value = data.hasMore
  } catch (e: any) {
    toast.error(e?.statusMessage || e?.message || '歌曲加载失败')
  } finally {
    loadingTracks.value = false
  }
}

async function refreshBoardTracks() {
  boardPage.value = 1
  await loadTracks(true)
}

async function loadMore() {
  boardPage.value += 1
  await loadTracks()
}

async function boardEnqueueAll() {
  if (!boardTracks.value.length) return
  boardEnqueueing.value = true
  try {
    const data = await $fetch<{ total: number; enqueued: number }>('/api/playlist-board/enqueue', {
      method: 'POST',
      body: {
        platform: boardPlatform.value,
        tracks: boardTracks.value,
        quality: quality.value,
        downloadLyric: downloadLyric.value,
        lyricMode: lyricMode.value,
      },
    })
    toast.success(`已入队 ${data.enqueued} 首`)
  } catch (e: any) {
    toast.error(e?.statusMessage || e?.message || '入队失败')
  } finally {
    boardEnqueueing.value = false
  }
}

async function boardEnqueueOne(t: { title: string; artist: string; album: string; duration: number; externalId: string; musicInfo: Record<string, any> }) {
  try {
    const data = await $fetch<{ enqueued: number }>('/api/playlist-board/enqueue', {
      method: 'POST',
      body: {
        platform: boardPlatform.value,
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

async function parse() {
  if (!url.value.trim()) return
  parsing.value = true
  try {
    const data = await $fetch<{ platform: string; title: string; tracks: PlaylistTrack[] }>('/api/playlist/parse', {
      method: 'POST',
      body: { url: url.value },
    })
    draft.value = data
    matchRows.value = []
    await doMatch(data.tracks)
  } catch (e: any) {
    toast.error(e?.statusMessage || e?.message || '歌单解析失败')
  } finally {
    parsing.value = false
  }
}

async function doMatch(tracks: PlaylistTrack[]) {
  matchRows.value = tracks.map((t, i) => ({
    index: i,
    track: t,
    score: 0,
    needsConfirm: true,
  }))
  try {
    const data = await $fetch<{ rows: MatchRow[] }>('/api/playlist/match', {
      method: 'POST',
      body: { tracks },
    })
    matchRows.value = data.rows
  } catch (e: any) {
    toast.error(e?.statusMessage || '匹配失败')
  }
}

function openConfirm(row: MatchRow) {
  confirmRow.value = row
}

function applyMatch(index: number) {
  const row = confirmRow.value
  if (!row) return
  const cand = row.candidates?.[index]
  if (!cand) return
  const target = matchRows.value.find((r) => r.index === row.index)
  if (target) {
    target.selected = cand
    target.needsConfirm = false
    target.score = cand.score || 0
    target.track = {
      ...target.track,
      title: cand.title,
      artist: cand.artist,
      musicInfo: cand.musicInfo,
    }
  }
  confirmRow.value = null
}

async function enqueueAll() {
  if (!draft.value) return
  enqueueing.value = true
  try {
    const tracks = matchRows.value
      .filter((r) => !r.needsConfirm && r.track.musicInfo)
      .map((r) => r.track)
    const data = await $fetch<{
      total: number
      enqueued: number
      results: Array<{ title: string; ok: boolean; error?: string }>
    }>('/api/playlist/enqueue', {
      method: 'POST',
      body: {
        playlist: {
          platform: draft.value.platform,
          title: draft.value.title,
          url: url.value,
          tracks,
        },
        quality: quality.value,
        downloadLyric: downloadLyric.value,
        lyricMode: lyricMode.value,
      },
    })
    enqueueResult.value = data
  } catch (e: any) {
    toast.error(e?.statusMessage || e?.message || '入队失败')
  } finally {
    enqueueing.value = false
  }
}

/** 一键：解析 + 服务端匹配 + 全部入队（低分匹配项会跳过并汇总提示） */
async function parseAndEnqueue() {
  if (!url.value.trim()) return
  enqueueing.value = true
  try {
    const parsed = await $fetch<{ platform: string; title: string; tracks: PlaylistTrack[] }>(
      '/api/playlist/parse',
      { method: 'POST', body: { url: url.value } },
    )
    const data = await $fetch<{
      total: number
      enqueued: number
      results: Array<{ title: string; ok: boolean; error?: string }>
    }>('/api/playlist/enqueue', {
      method: 'POST',
      body: {
        playlist: {
          platform: parsed.platform,
          title: parsed.title,
          url: url.value,
          tracks: parsed.tracks,
        },
        quality: quality.value,
        downloadLyric: downloadLyric.value,
        lyricMode: lyricMode.value,
      },
    })
    draft.value = parsed
    enqueueResult.value = data
    if (data.enqueued > 0) toast.success(`已入队 ${data.enqueued} 首`)
  } catch (e: any) {
    toast.error(e?.statusMessage || e?.message || '一键解析下载失败')
  } finally {
    enqueueing.value = false
  }
}
</script>

<style scoped>
.parse-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.download-opts {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 10px 14px;
  margin-bottom: 16px;
}

.opts-title {
  font-weight: 600;
  color: var(--color-text);
  font-size: 13px;
}

.draft {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.draft-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.dim {
  color: var(--color-text-dim);
}

.quality-pick {
  display: flex;
  gap: 8px;
  align-items: center;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--color-text-dim);
  font-size: 13px;
}

.track-list {
  max-height: 480px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.track-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--radius);
  background: var(--color-bg);
  font-size: 13px;
}

.track-row.warn {
  outline: 1px solid var(--color-warning);
}

.track-meta {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.warn-badge {
  color: var(--color-warning);
  margin-left: 6px;
  font-size: 12px;
}

.match-badge {
  color: var(--color-text-dim);
  margin-left: 8px;
  font-size: 12px;
}

.cross-badge {
  color: var(--color-accent);
  margin-left: 6px;
  font-size: 12px;
}

.err-text {
  color: var(--color-danger);
  margin-left: 6px;
  font-size: 12px;
}

.track-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}

.score {
  color: var(--color-text-dim);
  font-size: 12px;
}

.mode-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.mode-tab {
  background: var(--color-bg-elev);
  color: var(--color-text-dim);
}

.mode-tab.active {
  background: var(--color-primary);
  color: #fff;
}

.board-platform-tabs {
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
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
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

.board-count {
  font-size: 12px;
  color: var(--color-text-dim);
}

.board-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.board-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.board-head h3 {
  margin: 0;
}

.board-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  color: var(--color-text-dim);
  font-size: 12px;
}

.meta-item {
  white-space: nowrap;
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

<template>
  <Teleport to="body">
    <div class="dialog-mask" @click.self="emit('close')">
      <div class="dialog wide">
        <h3>手动匹配</h3>
        <p class="dim">
          当前任务：{{ task?.title }} - {{ task?.artist }}
          <span class="dim-sub">（匹配后将重新入队下载）</span>
        </p>

        <div class="search-bar">
          <select v-model="platform" class="platform-select">
            <option v-for="p in platforms" :key="p.id" :value="p.id">{{ p.label }}</option>
          </select>
          <input v-model="keyword" type="search" placeholder="搜索歌曲 / 歌手" @keyup.enter="search" >
          <button :disabled="searching" @click="search">
            {{ searching ? '搜索中…' : '搜索' }}
          </button>
        </div>

        <div v-if="error" class="err-text">{{ error }}</div>

        <div class="cand-list">
          <button
            v-for="(c, i) in items"
            :key="c.id"
            class="cand-item"
            :class="{ active: i === selectedIndex }"
            @click="selectedIndex = i"
          >
            <span class="cand-main">
              <span class="cand-title">{{ c.title }}</span>
              <span class="cand-sub">
                {{ c.artist }}<template v-if="c.album"> · {{ c.album }}</template>
                <template v-if="c.duration"> · {{ formatDuration(c.duration) }}</template>
              </span>
            </span>
            <span class="cand-quality">{{ c.qualitys.join(' / ') }}</span>
          </button>
          <div v-if="!items.length && searched" class="empty">未找到相关歌曲</div>
        </div>

        <div class="dialog-actions">
          <button class="btn-secondary" @click="emit('close')">取消</button>
          <button :disabled="selectedIndex < 0" @click="confirm">匹配并重新下载</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { platformLabel, formatDuration } from '~/utils/mediaLabels'
import type { DownloadTask } from '~/composables/useDownloadEvents'

type SearchItem = {
  id: string
  externalId: string
  title: string
  artist: string
  album: string
  duration: number
  platform: string
  qualitys: string[]
  musicInfo: Record<string, any>
}

const props = defineProps<{ task: DownloadTask | null }>()
const emit = defineEmits<{
  close: []
  confirm: [payload: { title: string; artist: string; album?: string; platform: string; externalId?: string; musicInfo: Record<string, any> }]
}>()

const platforms = (['wy', 'kw', 'kg', 'tx', 'mg'] as const).map((id) => ({ id, label: platformLabel(id) }))

const platform = ref('wy')
const keyword = ref('')
const items = ref<SearchItem[]>([])
const selectedIndex = ref(-1)
const searching = ref(false)
const searched = ref(false)
const error = ref('')

watch(
  () => props.task,
  (task) => {
    if (!task) return
    platform.value = task.platform || 'wy'
    keyword.value = `${task.title} ${task.artist}`.trim()
    items.value = []
    selectedIndex.value = -1
    searched.value = false
    error.value = ''
  },
  { immediate: true },
)

watch(platform, () => {
  items.value = []
  selectedIndex.value = -1
  searched.value = false
})

async function search() {
  if (!keyword.value.trim()) return
  searching.value = true
  error.value = ''
  try {
    const data = await $fetch<{ items: SearchItem[] }>('/api/search', {
      method: 'POST',
      body: { platform: platform.value, keyword: keyword.value, page: 1 },
    })
    items.value = data.items || []
    selectedIndex.value = -1
    searched.value = true
  } catch (e: any) {
    error.value = e?.message || e?.statusMessage || '搜索失败'
  } finally {
    searching.value = false
  }
}

function confirm() {
  const c = items.value[selectedIndex.value]
  if (!c) return
  emit('confirm', {
    title: c.title,
    artist: c.artist,
    album: c.album || undefined,
    platform: c.platform,
    externalId: c.externalId,
    musicInfo: c.musicInfo,
  })
  emit('close')
}
</script>

<style scoped>
.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 1500;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog.wide {
  background: var(--color-bg-elev);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 20px;
  width: 520px;
  max-width: 92vw;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dim {
  color: var(--color-text-dim);
  margin: 0;
}

.dim-sub {
  color: var(--color-text-dim);
  font-size: 12px;
}

.search-bar {
  display: flex;
  gap: 8px;
}

.search-bar input {
  flex: 1;
}

.platform-select {
  width: auto;
}

.cand-list {
  max-height: 320px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cand-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  background: var(--color-bg-elev2);
  text-align: left;
}

.cand-item.active {
  outline: 2px solid var(--color-accent);
}

.cand-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.cand-title {
  font-weight: 600;
}

.cand-sub {
  color: var(--color-text-dim);
  font-size: 12px;
}

.cand-quality {
  color: var(--color-text-dim);
  font-size: 12px;
  flex-shrink: 0;
}

.empty {
  text-align: center;
  color: var(--color-text-dim);
  padding: 24px 0;
}

.err-text {
  color: var(--color-danger);
  font-size: 12px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>

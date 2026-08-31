<template>
  <div class="search-page">
    <FnOsDirAuthDialog
      :open="showFnOsAuthDialog"
      @authorize="goFnOsAuthorize"
      @dismiss="dismissBanner()"
    />
    <MultiVersionDialog
      v-if="mvTarget"
      :title="mvTarget.item.title"
      :artist="mvTarget.item.artist"
      :versions="multiVersions(mvTarget.item)"
      @later="laterMv"
      @skip="skipMv"
      @download="downloadMv"
    />
    <div class="search-bar">
      <div class="tabs">
        <button
          v-for="p in platforms"
          :key="p.id"
          class="tab"
          :class="{ active: p.id === platform }"
          @click="switchPlatform(p.id)"
        >
          {{ p.label }}
          <span class="count">{{ p.sourceCount }}</span>
        </button>
      </div>
      <form class="search-form" @submit.prevent="doSearch">
        <input v-model="keyword" type="search" placeholder="搜索歌曲 / 歌手 / 专辑" >
        <button type="submit" :disabled="searching">搜索</button>
      </form>
    </div>

    <div v-if="searching" class="searching">
      <PageLoading :busy="true" />
    </div>

    <div v-else-if="error" class="card error-card">
      <p>{{ error }}</p>
    </div>

    <div v-else class="results">
      <div v-if="!items.length && searched" class="empty">未找到相关歌曲</div>
      <div v-for="item in items" :key="item.id" class="result-row card">
        <CoverImage :src="item.cover" :size="'md'" />
        <div class="meta">
          <div class="title">{{ item.title }}</div>
          <div class="sub">
            {{ item.artist }}<span v-if="item.album"> · {{ item.album }}</span>
            <span v-if="item.duration"> · {{ formatDuration(item.duration) }}</span>
          </div>
          <div class="qualitys">
            <span v-for="q in item.qualitys" :key="q" class="quality-tag">{{ q }}</span>
          </div>
        </div>
        <div class="actions">
          <button class="btn-ghost play-btn" :disabled="previewing" @click="preview(item)">
            <template v-if="previewingId === item.id">取链中…</template>
            <template v-else>试听</template>
          </button>
          <button v-if="isExisting(item)" class="btn-ghost existing-btn" disabled>已下载</button>
          <button v-else-if="multiVersions(item).length" class="btn-ghost mv-btn" @click="openMultiVersion(item)">
            多版本
          </button>
          <QualityMenu v-else @pick="(q) => enqueue(item, q)" />
        </div>
      </div>
    </div>

    <div v-if="items.length" class="pager">
      <button class="btn-secondary" :disabled="page <= 1" @click="page--; doSearch()">上一页</button>
      <span class="page-num">第 {{ page }} 页</span>
      <button class="btn-secondary" :disabled="items.length < 30" @click="page++; doSearch()">下一页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { formatDuration } from '~/utils/mediaLabels'
import { usePlayer } from '~/composables/usePlayer'
import { useToast } from '~/composables/useToast'
import { useDownloadEvents } from '~/composables/useDownloadEvents'
import { useFnOsDirAuth } from '~/composables/useFnOsDirAuth'
import { useLocalExisting } from '~/composables/useLocalExisting'

const { showHomeBanner, refresh: refreshFnOsAuth, dismissBanner } = useFnOsDirAuth()
const route = useRoute()
/** KeepAlive + Teleport：离开首页时不得继续盖住其它页 */
const showFnOsAuthDialog = computed(() => showHomeBanner.value && route.path === '/')

function goFnOsAuthorize() {
  dismissBanner()
  void navigateTo('/settings?fnosAuth=1')
}

type SearchItem = {
  id: string
  externalId: string
  title: string
  artist: string
  album: string
  duration: number
  platform: string
  cover?: string
  qualitys: string[]
  musicInfo: Record<string, any>
  sourceId?: string
  sourceName?: string
}

const platform = ref('wy')
const keyword = ref('')
const items = ref<SearchItem[]>([])
const platforms = ref<Array<{ id: string; label: string; sourceCount: number }>>([])
const searching = ref(false)
const searched = ref(false)
const error = ref('')
const page = ref(1)
const previewingId = ref('')
const previewing = computed(() => previewingId.value !== '')

const { play } = usePlayer()
const toast = useToast()
const { connect, disconnect } = useDownloadEvents()
const { check: checkExisting, isExisting, multiVersions, savePending, confirmPending, skipPending } = useLocalExisting()

async function doSearch() {
  if (!keyword.value.trim()) return
  searching.value = true
  error.value = ''
  try {
    const data = await $fetch<{ items: SearchItem[]; platforms: typeof platforms.value }>('/api/search', {
      method: 'POST',
      body: { platform: platform.value, keyword: keyword.value, page: page.value },
    })
    items.value = data.items
    if (platforms.value.length === 0) platforms.value = data.platforms
    searched.value = true
    checkExisting(
      data.items.map((i) => ({
        title: i.title,
        artist: i.artist,
        album: i.album,
        platform: i.platform,
      })),
    )
  } catch (e: any) {
    error.value = e?.data?.message || e?.statusMessage || '搜索失败'
    items.value = []
  } finally {
    searching.value = false
  }
}

function switchPlatform(id: string) {
  platform.value = id
  page.value = 1
  if (searched.value) doSearch()
}

async function preview(item: SearchItem) {
  previewingId.value = item.id
  try {
    const res = await $fetch<{ url: string; quality: string; sourceName: string; degraded: boolean }>('/api/preview', {
      method: 'POST',
      body: { platform: platform.value, musicInfo: item.musicInfo, sourceId: item.sourceId },
    })
    play({
      url: res.url,
      title: item.title,
      artist: item.artist,
      cover: item.cover,
    })
    if (res.degraded) {
      toast.info(`试听音质已降级：${res.quality}（${res.sourceName}）`)
    }
  } catch (e: any) {
    toast.error(e?.statusMessage || e?.message || '试听取链失败')
  } finally {
    previewingId.value = ''
  }
}

async function enqueue(item: SearchItem, quality: string) {
  try {
    await $fetch('/api/downloads', {
      method: 'POST',
      body: {
        platform: platform.value,
        musicInfo: item.musicInfo,
        title: item.title,
        artist: item.artist,
        album: item.album,
        externalId: item.externalId,
        quality,
      },
    })
    toast.success(`已加入队列：${item.title}`)
  } catch (e: any) {
    toast.error(e?.statusMessage || e?.message || '入队失败')
  }
}

const mvTarget = ref<{ item: SearchItem; pendingId: string } | null>(null)

async function openMultiVersion(item: SearchItem) {
  const versions = multiVersions(item)
  const id = await savePending(
    {
      title: item.title,
      artist: item.artist,
      album: item.album,
      platform: platform.value,
      musicInfo: item.musicInfo,
      externalId: item.externalId,
    },
    versions,
  )
  if (!id) {
    toast.error('写入待确认失败')
    return
  }
  mvTarget.value = { item, pendingId: id }
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
  connect()
  refreshFnOsAuth()
  $fetch('/api/search', {
    method: 'POST',
    body: { platform: 'wy', keyword: ' ' },
  })
    .then((d: any) => {
      platforms.value = d.platforms
    })
    .catch(() => {})
})

onUnmounted(() => {
  disconnect()
})
</script>

<style scoped>
.search-bar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tab {
  background: var(--color-bg-elev);
  color: var(--color-text-dim);
}

.tab.active {
  background: var(--color-primary);
  color: #fff;
}

.count {
  font-size: 12px;
  opacity: 0.8;
  margin-left: 4px;
}

.search-form {
  display: flex;
  gap: 8px;
}

.search-form input {
  flex: 1;
}

.searching {
  position: relative;
  min-height: 200px;
}

.error-card p {
  margin: 0;
}

.results {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty {
  text-align: center;
  color: var(--color-text-dim);
  padding: 48px 0;
}

.result-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
}

.meta {
  flex: 1;
  min-width: 0;
}

.title {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sub {
  color: var(--color-text-dim);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qualitys {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}

.quality-tag {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--color-bg-elev2);
  color: var(--color-text-dim);
}

.actions {
  display: flex;
  gap: 6px;
}

.play-btn {
  min-width: 56px;
}

.existing-btn {
  color: var(--color-success);
  opacity: 0.7;
}

.mv-btn {
  color: var(--color-warning);
}

.pager {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
}

.page-num {
  color: var(--color-text-dim);
}
</style>

<template>
  <div class="queue-page">
    <h2>下载队列</h2>

    <div class="toolbar">
      <button class="btn-secondary" @click="refresh">刷新</button>
      <button class="btn-secondary" @click="openReconcile">文件对账</button>
      <input
        v-model="searchQuery"
        type="search"
        class="queue-search"
        placeholder="搜索歌名 / 歌手 / 文件名"
      >
      <span class="counts">
        已下载文件 {{ stats?.files ?? '…' }} / 记录 {{ recordCount }} / 下载中 {{ counts.running }} / 失败 {{ counts.failed }}
      </span>
    </div>

    <div v-if="stats && stats.missing > 0" class="missing-banner">
      <span class="missing-text">
        {{ stats.missing }} 条下载记录对应的文件已丢失（可能被外部删除）。
      </span>
      <button class="btn-secondary" @click="filter = 'missing'">查看缺失</button>
      <button class="btn-secondary" @click="purgeMissing">清理缺失记录</button>
    </div>

    <div v-if="reconcileOpen" class="reconcile-panel card">
      <div class="reconcile-head">
        <span class="reconcile-title">文件对账</span>
        <button class="btn-ghost" @click="reconcileOpen = false">收起</button>
      </div>
      <div v-if="reconcileLoading" class="reconcile-loading">对账中…</div>
      <template v-else-if="reconcileData">
        <div class="reconcile-summary">
          记录 {{ reconcileData.totalRecords }} · 文件 {{ reconcileData.totalFiles }} ·
          差额 {{ reconcileData.totalRecords - reconcileData.totalFiles }}
        </div>
        <div class="reconcile-summary">
          缺失 {{ reconcileData.missing.length }} · 共享重复 {{ sharedExtra }} ·
          疑似改名 {{ reconcileData.renamed.length }} · 孤儿文件 {{ reconcileData.orphans.length }}
        </div>
        <div v-if="reconcileData.shared.length" class="reconcile-section">
          <div class="reconcile-section-head">
            <span class="reconcile-section-title">
              共享文件（同一文件被多条记录引用，{{ reconcileData.shared.length }} 个文件 · 多出 {{ sharedExtra }} 条记录）
            </span>
            <button class="btn-secondary" @click="dedupeShared">清理重复记录</button>
          </div>
          <div v-for="s in reconcileData.shared" :key="s.path" class="reconcile-row">
            <div class="reconcile-row-main">
              <div class="reconcile-row-title">{{ s.path.split(/[\\/]/).pop() }}（{{ s.records.length }} 条记录）</div>
              <div v-for="r in s.records" :key="r.id" class="reconcile-row-path">
                · {{ r.title }} - {{ r.artist }}（{{ statusLabel(r.status) }}）
              </div>
            </div>
          </div>
        </div>
        <div v-if="reconcileData.renamed.length" class="reconcile-section">
          <div class="reconcile-section-title">疑似改名/迁移（{{ reconcileData.renamed.length }}）</div>
          <div v-for="r in reconcileData.renamed" :key="r.id" class="reconcile-row">
            <div class="reconcile-row-main">
              <div class="reconcile-row-title">{{ r.title }}<span class="dim"> · {{ r.artist }}</span></div>
              <div class="reconcile-row-path">旧：{{ r.file_path }}</div>
              <div class="reconcile-row-path">新：{{ r.matchedFile.name }}</div>
            </div>
            <button class="btn-secondary" @click="relink(r)">重新关联</button>
          </div>
        </div>
        <div v-if="reconcileData.orphans.length" class="reconcile-section">
          <div class="reconcile-section-title">孤儿文件（无记录对应，{{ reconcileData.orphans.length }}）</div>
          <div v-for="o in reconcileData.orphans" :key="o.path" class="reconcile-row">
            <div class="reconcile-row-main">
              <div class="reconcile-row-title">{{ o.name }}</div>
              <div class="reconcile-row-path">{{ o.path }}（{{ formatBytes(o.size) }}）</div>
            </div>
            <button class="btn-secondary" @click="deleteOrphan(o)">删除文件</button>
          </div>
        </div>
        <div
          v-if="!reconcileData.shared.length && !reconcileData.renamed.length && !reconcileData.orphans.length && !reconcileData.missing.length"
          class="reconcile-loading"
        >
          记录与磁盘文件完全一致。
        </div>
      </template>
    </div>

    <div class="filter-tabs">
      <button
        v-for="tab in filterTabs"
        :key="tab.value"
        class="filter-tab"
        :class="{ active: filter === tab.value }"
        @click="filter = tab.value"
      >
        {{ tab.label }}
        <span class="filter-count">{{ countFor(tab.value) }}</span>
      </button>
    </div>

    <div v-if="!filteredTasks.length" class="empty">{{ searchQuery ? '未找到匹配的任务' : `暂无${filterLabel}任务` }}</div>

    <div v-if="filteredTasks.length" class="batch-bar">
      <label class="check">
        <input type="checkbox" :checked="allSelected" @change="toggleAll" > 全选
      </label>
      <template v-if="selectedCount">
        <template v-if="filter === 'downloading'">
          <button class="btn-secondary" @click="batchCancel">批量取消（{{ selectedCount }}）</button>
        </template>
        <template v-else-if="filter === 'completed'">
          <button class="btn-secondary" @click="batchDelete">批量删除（{{ selectedCount }}）</button>
        </template>
        <template v-else-if="filter === 'failed'">
          <button class="btn-secondary" @click="batchRetry">批量重试（{{ selectedCount }}）</button>
          <button class="btn-secondary" @click="batchSwitchSource">批量换源（{{ selectedCount }}）</button>
          <button class="btn-secondary" @click="batchSwitchQuality">批量换音质（{{ selectedCount }}）</button>
          <button class="btn-secondary" @click="batchDelete">批量删除（{{ selectedCount }}）</button>
        </template>
        <template v-else-if="filter === 'existing'">
          <button class="btn-secondary" @click="batchReDownload">强制重新下载（{{ selectedCount }}）</button>
          <button class="btn-secondary" @click="batchDelete">批量删除（{{ selectedCount }}）</button>
        </template>
        <template v-else-if="filter === 'cancelled'">
          <button class="btn-secondary" @click="batchRetry">批量重试（{{ selectedCount }}）</button>
          <button class="btn-secondary" @click="batchDelete">批量删除（{{ selectedCount }}）</button>
        </template>
        <template v-else-if="filter === 'pending'">
          <button class="btn-secondary" @click="batchConfirmPending">批量确认下载（{{ selectedCount }}）</button>
          <button class="btn-secondary" @click="batchDelete">批量删除（{{ selectedCount }}）</button>
        </template>
        <template v-else-if="filter === 'missing'">
          <button class="btn-secondary" @click="batchDelete">批量删除记录（{{ selectedCount }}）</button>
        </template>
        <template v-else>
          <button class="btn-secondary" @click="batchCancel">批量取消（{{ selectedCount }}）</button>
          <button class="btn-secondary" @click="batchRetry">批量重试（{{ selectedCount }}）</button>
          <button class="btn-secondary" @click="batchSwitchSource">批量换源（{{ selectedCount }}）</button>
          <button class="btn-secondary" @click="batchDelete">批量删除（{{ selectedCount }}）</button>
        </template>
      </template>
    </div>

    <div v-for="t in filteredTasks" :key="t.id" class="task card" :class="`task-${t.status}`">
      <label class="task-check">
        <input type="checkbox" :checked="selected.has(t.id)" @change="toggleOne(t.id, ($event.target as HTMLInputElement).checked)" >
      </label>
      <div class="task-main">
        <div class="task-title">{{ t.title }}</div>
        <div class="task-sub">
          {{ t.artist }}<span v-if="t.album"> · {{ t.album }}</span>
          · {{ platformLabel(t.platform) }} · {{ qualityLabel(t.quality) }}
        </div>
        <div v-if="t.status === 'running'" class="progress-track">
          <div class="progress-fill" :style="{ width: formatPercent(t.progress) }"/>
        </div>
        <div v-if="t.status === 'running'" class="progress-info">
          {{ formatBytes(t.file_size) }}
          <template v-if="t.total_bytes"> / {{ formatBytes(t.total_bytes) }}</template>
          <span class="percent-inline">{{ formatPercent(t.progress) }}</span>
        </div>
        <div v-if="t.error && (t.status === 'failed' || t.status === 'queued')" class="task-error" :title="t.error">
          {{ t.error }}
        </div>
        <div v-if="t.status === 'pending_confirm'" class="task-file pending-note">
          同名不同歌手，待确认是否下载
          <span v-if="pendingVersions(t).length" class="dim">（已有版本：{{ pendingVersions(t).map((v) => v.name).join('、') }}）</span>
        </div>
        <div v-if="t.file_path && t.status === 'completed'" class="task-file">
          {{ t.file_path }}<span v-if="t.file_size" class="file-size">（{{ formatBytes(t.file_size) }}）</span>
        </div>
        <div v-if="t.file_path && t.status === 'existing'" class="task-file existing-file">
          {{ t.file_path }}<span v-if="t.file_size" class="file-size">（{{ formatBytes(t.file_size) }}）</span>
        </div>
        <div v-if="missingReasonById.get(t.id)" class="task-file missing-file">
          {{ missingReasonLabel(missingReasonById.get(t.id)!) }}
        </div>
      </div>
      <div class="task-status">
        <span :class="`status-${t.status}`">{{ statusLabel(t.status) }}</span>
        <span v-if="t.status === 'running'" class="percent">{{ formatPercent(t.progress) }}</span>
      </div>
      <div class="task-actions">
        <template v-if="t.status === 'pending_confirm'">
          <button class="btn-ghost" @click="confirmPendingTask(t.id)">确认下载</button>
        </template>
        <template v-else-if="t.status === 'existing'">
          <button class="btn-ghost" @click="reDownload(t.id)">重新下载</button>
          <button class="btn-ghost" @click="openManualMatch(t)">手动匹配</button>
        </template>
        <template v-else-if="t.status === 'failed' || t.status === 'cancelled'">
          <button class="btn-ghost" @click="retry(t.id)">重试</button>
          <button class="btn-ghost" @click="openManualMatch(t)">手动匹配</button>
          <button class="btn-ghost" @click="openSwitchSource(t)">换源</button>
          <button class="btn-ghost" @click="openSwitchQuality(t)">换音质</button>
        </template>
        <template v-if="t.status === 'completed'">
          <button class="btn-ghost" @click="openManualMatch(t)">手动匹配</button>
        </template>
        <template v-if="t.status === 'queued' || t.status === 'running'">
          <button class="btn-ghost" @click="cancel(t.id)">取消</button>
          <button class="btn-ghost" @click="openManualMatch(t)">手动匹配</button>
        </template>
        <button class="btn-ghost" @click="remove(t)">删除</button>
      </div>
    </div>

    <DeleteConfirmDialog
      v-if="deleteTarget"
      title="删除任务"
      :message="`确定删除「${deleteTarget.title}」？`"
      confirm-text="删除"
      allow-delete-files
      @close="deleteTarget = null"
      @confirm="doDelete"
    />
    <DeleteConfirmDialog
      v-if="batchDeleteOpen"
      title="批量删除"
      :message="`确定删除选中的 ${selectedCount} 条任务吗？默认仅删除队列记录，可勾选同时删除本地文件。`"
      confirm-text="删除"
      allow-delete-files
      @close="batchDeleteOpen = false"
      @confirm="doBatchDelete"
    />
    <SwitchSourceDialog
      v-if="switchSourceTarget"
      :task="switchSourceTarget"
      :sources="sourcesFor(switchSourceTarget.platform)"
      :batch="batchSwitchSourceTargets.length > 1"
      :count="batchSwitchSourceTargets.length || 1"
      @close="switchSourceTarget = null; batchSwitchSourceTargets = []"
      @confirm="doSwitchSource"
    />
    <SwitchQualityDialog
      v-if="switchQualityTarget || batchSwitchQualityTargets.length"
      :task="switchQualityTarget"
      :batch="batchSwitchQualityTargets.length > 0"
      :count="batchSwitchQualityTargets.length || 1"
      @close="switchQualityTarget = null; batchSwitchQualityTargets = []"
      @confirm="doSwitchQuality"
    />
    <ManualMatchDialog
      v-if="manualMatchTarget"
      :task="manualMatchTarget"
      @close="manualMatchTarget = null"
      @confirm="doManualMatch"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { platformLabel, qualityLabel, statusLabel, formatPercent, formatBytes } from '~/utils/mediaLabels'
import { useDownloadEvents, type DownloadTask } from '~/composables/useDownloadEvents'
import { useToast } from '~/composables/useToast'

const { tasks, connect, disconnect } = useDownloadEvents()
const toast = useToast()

const filter = ref<'all' | 'downloading' | 'failed' | 'completed' | 'existing' | 'cancelled' | 'missing' | 'pending'>('all')
const searchQuery = ref('')
const filterTabs = [
  { value: 'all', label: '全部' },
  { value: 'downloading', label: '下载中' },
  { value: 'pending', label: '待确认' },
  { value: 'failed', label: '下载失败' },
  { value: 'completed', label: '下载完成' },
  { value: 'cancelled', label: '已取消' },
  { value: 'existing', label: '已存在' },
  { value: 'missing', label: '文件缺失' },
] as const

type MissingItem = {
  id: string
  title: string
  artist: string
  platform: string
  quality: string | null
  status: string
  file_path: string | null
  reason: 'dir_missing' | 'ext_changed' | 'backup_left' | 'file_deleted'
}

const missingItems = ref<MissingItem[]>([])
const missingIds = computed(() => new Set(missingItems.value.map((m) => m.id)))
const missingReasonById = computed(() => {
  const map = new Map<string, MissingItem['reason']>()
  for (const m of missingItems.value) map.set(m.id, m.reason)
  return map
})

function taskInFilter(t: DownloadTask, f: typeof filter.value) {
  switch (f) {
    case 'downloading':
      return t.status === 'running' || t.status === 'queued'
    case 'failed':
      return t.status === 'failed'
    case 'cancelled':
      return t.status === 'cancelled'
    case 'completed':
      return t.status === 'completed'
    case 'existing':
      return t.status === 'existing'
    case 'missing':
      return missingIds.value.has(t.id)
    case 'pending':
      return t.status === 'pending_confirm'
    default:
      return true
  }
}

const filterLabel = computed(() => {
  const tab = filterTabs.find((t) => t.value === filter.value)
  return tab ? tab.label : '该'
})

const filteredTasks = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return tasks.value.filter((t) => {
    if (!taskInFilter(t, filter.value)) return false
    if (!q) return true
    return (
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      (t.file_path || '').toLowerCase().includes(q)
    )
  })
})

function countFor(f: (typeof filterTabs)[number]['value']) {
  return tasks.value.filter((t) => taskInFilter(t, f)).length
}

const selected = ref<Set<string>>(new Set())
const selectedCount = computed(() => selected.value.size)
const allSelected = computed(() => filteredTasks.value.length > 0 && selected.value.size === filteredTasks.value.length)

function toggleOne(id: string, checked: boolean) {
  const next = new Set(selected.value)
  if (checked) next.add(id)
  else next.delete(id)
  selected.value = next
}

function toggleAll() {
  if (allSelected.value) {
    selected.value = new Set()
    return
  }
  selected.value = new Set(filteredTasks.value.map((t) => t.id))
}

// 切换筛选时清空选择
watch(filter, () => {
  selected.value = new Set()
})

const deleteTarget = ref<DownloadTask | null>(null)
const batchDeleteOpen = ref(false)
const switchSourceTarget = ref<DownloadTask | null>(null)
const switchQualityTarget = ref<DownloadTask | null>(null)
const manualMatchTarget = ref<DownloadTask | null>(null)
const batchSwitchSourceTargets = ref<DownloadTask[]>([])
const batchSwitchQualityTargets = ref<DownloadTask[]>([])

const sourcesCache = ref<Array<{ id: string; name: string; platform: string; status: string }>>([])
const sourcesByPlatform = computed(() => {
  const map: Record<string, Array<{ id: string; name: string; status: string }>> = {}
  for (const s of sourcesCache.value) {
    ;(map[s.platform] ||= []).push(s)
  }
  return map
})
function sourcesFor(platform: string) {
  return sourcesByPlatform.value[platform] || []
}

const counts = computed(() => {
  const c = { completed: 0, running: 0, failed: 0 }
  for (const t of tasks.value) {
    if (t.status === 'completed') c.completed++
    if (t.status === 'running' || t.status === 'queued') c.running++
    if (t.status === 'failed') c.failed++
  }
  return c
})

const stats = ref<{
  files: number
  missing: number
  records: {
    total: number
    completed: number
    existing: number
    running: number
    queued: number
    failed: number
    cancelled: number
  }
} | null>(null)

const recordCount = computed(() => {
  if (!stats.value) return '…'
  return stats.value.records.completed + stats.value.records.existing
})

async function loadStats() {
  try {
    stats.value = await $fetch('/api/downloads/stats')
  } catch (e: any) {
    console.warn('[daoyin] 统计加载失败：', e?.statusMessage || e?.message || e)
  }
}

async function purgeMissing() {
  try {
    const res = await $fetch<{ deleted: number }>('/api/downloads/purge-missing', { method: 'POST' })
    toast.success(`已清理 ${res.deleted} 条缺失记录`)
    refresh()
    loadStats()
    loadMissing()
  } catch (e: any) {
    toast.error(e?.statusMessage || '清理失败')
  }
}

function missingReasonLabel(reason: string) {
  switch (reason) {
    case 'dir_missing':
      return '目录不存在（可能下载目录已迁移/改名）'
    case 'ext_changed':
      return '同名文件扩展名已变（换格式/重下载）'
    case 'backup_left':
      return '存在重下载备份残留'
    default:
      return '文件被外部删除'
  }
}

async function loadMissing() {
  try {
    const data = await $fetch<{ items: MissingItem[] }>('/api/downloads/missing')
    missingItems.value = data.items || []
  } catch (e: any) {
    console.warn('[daoyin] 缺失文件加载失败：', e?.statusMessage || e?.message || e)
  }
}

type ReconcileMissing = {
  id: string
  title: string
  artist: string
  platform: string
  quality: string | null
  status: string
  file_path: string | null
  reason: string
}
type ReconcileRenamed = ReconcileMissing & {
  matchedFile: { name: string; path: string; size: number; mtime: number }
}
type ReconcileShared = {
  path: string
  size: number
  records: Array<{ id: string; title: string; artist: string; status: string; quality: string | null }>
}
type ReconcileData = {
  totalRecords: number
  totalFiles: number
  matched: number
  missing: ReconcileMissing[]
  shared: ReconcileShared[]
  renamed: ReconcileRenamed[]
  orphans: Array<{ name: string; path: string; size: number; mtime: number }>
}

const reconcileOpen = ref(false)
const reconcileLoading = ref(false)
const reconcileData = ref<ReconcileData | null>(null)
const sharedExtra = computed(
  () => reconcileData.value?.shared.reduce((s, x) => s + x.records.length - 1, 0) || 0,
)

async function loadReconcile() {
  reconcileLoading.value = true
  try {
    reconcileData.value = await $fetch('/api/downloads/reconcile')
  } catch (e: any) {
    toast.error(e?.statusMessage || '对账失败')
  } finally {
    reconcileLoading.value = false
  }
}

function openReconcile() {
  if (reconcileOpen.value) {
    reconcileOpen.value = false
    return
  }
  reconcileOpen.value = true
  loadReconcile()
}

async function relink(r: ReconcileRenamed) {
  try {
    await $fetch('/api/downloads/relink', { method: 'POST', body: { id: r.id, path: r.matchedFile.path } })
    toast.success('已重新关联')
    loadReconcile()
    refresh()
    loadMissing()
  } catch (e: any) {
    toast.error(e?.statusMessage || '重新关联失败')
  }
}

async function deleteOrphan(o: { path: string }) {
  try {
    await $fetch('/api/downloads/orphan-delete', { method: 'POST', body: { path: o.path } })
    toast.success('已删除文件')
    loadReconcile()
  } catch (e: any) {
    toast.error(e?.statusMessage || '删除失败')
  }
}

async function dedupeShared() {
  if (!reconcileData.value?.shared.length) return
  const n = reconcileData.value.shared.reduce((sum, s) => sum + s.records.length - 1, 0)
  if (!confirm(`确认清理 ${n} 条重复记录？每个共享文件仅保留一条（优先「下载完成」，只删记录不删文件）。`)) return
  try {
    const res = await $fetch<{ deleted: number }>('/api/downloads/dedupe-shared', { method: 'POST' })
    toast.success(`已清理 ${res.deleted} 条重复记录`)
    loadReconcile()
    refresh()
    loadStats()
    loadMissing()
  } catch (e: any) {
    toast.error(e?.statusMessage || '清理失败')
  }
}

function refresh() {
  $fetch<{ items: DownloadTask[] }>('/api/downloads')
    .then((d) => {
      tasks.value = d.items
      // 清理已不存在任务的选中状态
      const ids = new Set(d.items.map((t) => t.id))
      const next = new Set([...selected.value].filter((id) => ids.has(id)))
      if (next.size !== selected.value.size) selected.value = next
    })
    .catch(() => {})
}

async function retry(id: string) {
  try {
    await $fetch(`/api/downloads/${id}/retry`, { method: 'POST', body: { resetAttempts: true } })
    toast.success('已重新入队')
  } catch (e: any) {
    toast.error(e?.statusMessage || '重试失败')
  }
}

async function reDownload(id: string) {
  try {
    await $fetch(`/api/downloads/${id}/re-download`, { method: 'POST' })
    toast.success('已重新入队下载')
  } catch (e: any) {
    toast.error(e?.statusMessage || '操作失败')
  }
}

async function batchReDownload() {
  if (!selectedCount.value) return
  const n = selectedCount.value
  if (!confirm(`确认强制重新下载选中的 ${n} 个「已存在」任务？将重新下载覆盖。`)) return
  try {
    await $fetch('/api/downloads/batch-re-download', { method: 'POST', body: { ids: [...selected.value] } })
    selected.value = new Set()
    toast.success(`已重新入队 ${n} 个任务`)
    refresh()
  } catch (e: any) {
    toast.error(e?.statusMessage || '操作失败')
  }
}

function pendingVersions(t: DownloadTask) {
  try {
    const mi = JSON.parse(t.music_info_json || '{}')
    return Array.isArray(mi.__versions) ? (mi.__versions as Array<{ name: string }>) : []
  } catch {
    return []
  }
}

async function confirmPendingTask(id: string) {
  try {
    await $fetch(`/api/downloads/${id}/confirm`, { method: 'POST' })
    toast.success('已确认下载')
    refresh()
  } catch (e: any) {
    toast.error(e?.statusMessage || '操作失败')
  }
}

async function batchConfirmPending() {
  if (!selectedCount.value) return
  const ids = [...selected.value]
  let ok = 0
  let fail = 0
  for (const id of ids) {
    try {
      await $fetch(`/api/downloads/${id}/confirm`, { method: 'POST' })
      ok += 1
    } catch {
      fail += 1
    }
  }
  selected.value = new Set()
  if (fail) toast.warning(`确认下载：成功 ${ok}，失败 ${fail}`)
  else toast.success(`已确认下载 ${ok} 首`)
  refresh()
}

async function cancel(id: string) {
  try {
    await $fetch('/api/downloads/batch-cancel', { method: 'POST', body: { ids: [id] } })
    toast.info('已取消')
  } catch (e: any) {
    toast.error(e?.statusMessage || '取消失败')
  }
}

function remove(t: DownloadTask) {
  deleteTarget.value = t
}

function doDelete(deleteFilesFlag: boolean) {
  const t = deleteTarget.value
  if (!t) return
  $fetch(`/api/downloads/${t.id}`, {
    method: 'DELETE',
    query: { deleteLocalFiles: deleteFilesFlag ? '1' : '0' },
  })
    .then(() => toast.success('已删除'))
    .catch((e: any) => toast.error(e?.statusMessage || '删除失败'))
}

async function batchCancel() {
  if (!selectedCount.value) return
  const n = selectedCount.value
  if (!confirm(`确认取消选中的 ${n} 个下载任务？`)) return
  try {
    await $fetch('/api/downloads/batch-cancel', { method: 'POST', body: { ids: [...selected.value] } })
    selected.value = new Set()
    toast.success(`已批量取消 ${n} 个任务`)
    refresh()
  } catch (e: any) {
    toast.error(e?.statusMessage || '批量取消失败')
  }
}

async function batchRetry() {
  if (!selectedCount.value) return
  const n = selectedCount.value
  if (!confirm(`确认重试选中的 ${n} 个失败任务？`)) return
  try {
    await $fetch('/api/downloads/batch-retry', { method: 'POST', body: { ids: [...selected.value], resetAttempts: true } })
    selected.value = new Set()
    toast.success(`已批量重试 ${n} 个任务`)
    refresh()
  } catch (e: any) {
    toast.error(e?.statusMessage || '批量重试失败')
  }
}

function batchDelete() {
  if (!selectedCount.value) return
  batchDeleteOpen.value = true
}

async function doBatchDelete(deleteFilesFlag: boolean) {
  if (!selectedCount.value) return
  const ids = [...selected.value]
  try {
    await $fetch('/api/downloads/batch-delete', {
      method: 'POST',
      body: { ids, deleteLocalFiles: deleteFilesFlag },
    })
    selected.value = new Set()
    toast.success(`已删除 ${ids.length} 个任务`)
    refresh()
  } catch (e: any) {
    toast.error(e?.statusMessage || '批量删除失败')
  }
}

async function batchSwitchSource() {
  if (!selectedCount.value) return
  const targets = filteredTasks.value.filter((t) => selected.value.has(t.id))
  if (!targets.length) return
  // 加载音源后打开换源弹窗（弹窗按单个任务展示；批量时用首个任务所在平台）
  await loadSources()
  const first = targets.find((t) => sourcesFor(t.platform).length)
  if (!first) {
    toast.error('选中任务没有可用音源')
    return
  }
  batchSwitchSourceTargets.value = targets
  switchSourceTarget.value = first
}

async function doBatchSwitchSource(sourceId: string) {
  const targets = batchSwitchSourceTargets.value
  if (!targets.length) return
  try {
    const res = await $fetch<{ items: Array<{ sourceName?: string; error?: string }> }>(
      '/api/downloads/batch-switch-source',
      { method: 'POST', body: { ids: targets.map((t) => t.id), sourceId } },
    )
    const ok = res.items.filter((i) => !i.error).length
    const fail = res.items.length - ok
    selected.value = new Set()
    batchSwitchSourceTargets.value = []
    if (fail) toast.warning(`批量换源重试：成功 ${ok}，失败 ${fail}`)
    else toast.success(`批量换源重试：成功 ${ok}`)
    refresh()
  } catch (e: any) {
    toast.error(e?.statusMessage || '批量换源失败')
  }
}

function openSwitchSource(t: DownloadTask) {
  if (!sourcesFor(t.platform).length) {
    loadSources().then(() => {
      if (sourcesFor(t.platform).length) switchSourceTarget.value = t
      else toast.error('该平台没有可用音源')
    })
    return
  }
  switchSourceTarget.value = t
}

async function doSwitchSource(sourceId: string) {
  if (batchSwitchSourceTargets.value.length) {
    await doBatchSwitchSource(sourceId)
    switchSourceTarget.value = null
    return
  }
  const t = switchSourceTarget.value
  if (!t) return
  try {
    await $fetch(`/api/downloads/${t.id}/switch-source`, { method: 'POST', body: { sourceId } })
    toast.success('已换源并重新入队')
  } catch (e: any) {
    toast.error(e?.statusMessage || '换源失败')
  }
}

function openSwitchQuality(t: DownloadTask) {
  switchQualityTarget.value = t
}

async function openManualMatch(t: DownloadTask) {
  // 进行中的任务先取消（后端同步标记 cancelled），再打开手动匹配
  if (t.status === 'queued' || t.status === 'running') {
    try {
      await cancel(t.id)
    } catch (e: any) {
      toast.error(e?.statusMessage || '取消失败，无法手动匹配')
      return
    }
  }
  manualMatchTarget.value = t
}

async function doManualMatch(payload: {
  title: string
  artist: string
  album?: string
  platform: string
  externalId?: string
  musicInfo: Record<string, any>
}) {
  const t = manualMatchTarget.value
  if (!t) return
  try {
    await $fetch(`/api/downloads/${t.id}/manual-match`, { method: 'POST', body: payload })
    toast.success('已匹配并重新入队')
  } catch (e: any) {
    toast.error(e?.statusMessage || e?.message || '手动匹配失败')
  }
}

async function doSwitchQuality(quality: string) {
  if (batchSwitchQualityTargets.value.length) {
    await doBatchSwitchQuality(quality)
    return
  }
  const t = switchQualityTarget.value
  if (!t) return
  try {
    await $fetch(`/api/downloads/${t.id}/switch-quality`, { method: 'POST', body: { quality } })
    toast.success('已换音质并重新下载')
  } catch (e: any) {
    toast.error(e?.statusMessage || '换音质失败')
  }
}

function batchSwitchQuality() {
  if (!selectedCount.value) return
  batchSwitchQualityTargets.value = filteredTasks.value.filter((t) => selected.value.has(t.id))
  switchQualityTarget.value = null
}

async function doBatchSwitchQuality(quality: string) {
  const targets = batchSwitchQualityTargets.value
  if (!targets.length) return
  try {
    const res = await $fetch<{ items: Array<{ error?: string }> }>('/api/downloads/batch-switch-quality', {
      method: 'POST',
      body: { ids: targets.map((t) => t.id), quality },
    })
    const ok = res.items.filter((i) => !i.error).length
    const fail = res.items.length - ok
    selected.value = new Set()
    batchSwitchQualityTargets.value = []
    if (fail) toast.warning(`批量换音质：成功 ${ok}，失败 ${fail}`)
    else toast.success(`批量换音质：成功 ${ok}`)
    refresh()
  } catch (e: any) {
    toast.error(e?.statusMessage || '批量换音质失败')
  }
}

async function loadSources() {
  try {
    const data = await $fetch<{ items: Array<{ id: string; name: string; platforms: string[]; status: string }> }>('/api/sources')
    sourcesCache.value = data.items.flatMap((s) =>
      (s.platforms || []).map((p) => ({
        id: s.id,
        name: s.name,
        platform: p,
        status: s.status,
      })),
    )
  } catch (e: any) {
    console.warn('[daoyin] 音源加载失败：', e?.statusMessage || e?.message || e)
  }
}

onMounted(() => {
  connect()
  refresh()
  loadStats()
  loadMissing()
  loadSources()
})

onUnmounted(() => {
  disconnect()
})
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.queue-search {
  flex: 1;
  max-width: 320px;
}

.counts {
  color: var(--color-text-dim);
  font-size: 13px;
}

.missing-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  margin-bottom: 12px;
  border: 1px solid var(--color-warning);
  border-radius: var(--radius);
  background: var(--color-warning-soft, var(--color-bg-elev));
}

.missing-text {
  flex: 1;
  color: var(--color-warning);
  font-size: 13px;
}

.missing-file {
  color: var(--color-warning);
}

.reconcile-panel {
  margin-bottom: 12px;
  padding: 12px;
}

.reconcile-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.reconcile-title {
  font-weight: 600;
  font-size: 14px;
}

.reconcile-loading {
  color: var(--color-text-dim);
  font-size: 13px;
  padding: 8px 0;
}

.reconcile-summary {
  color: var(--color-text-dim);
  font-size: 13px;
  margin-bottom: 8px;
}

.reconcile-section {
  margin-top: 10px;
}

.reconcile-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}

.reconcile-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-warning);
}

.reconcile-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
  border-bottom: 1px solid var(--color-border);
}

.reconcile-row:last-child {
  border-bottom: none;
}

.reconcile-row-main {
  flex: 1;
  min-width: 0;
}

.reconcile-row-title {
  font-size: 13px;
}

.reconcile-row-title .dim {
  color: var(--color-text-dim);
}

.reconcile-row-path {
  color: var(--color-text-dim);
  font-size: 12px;
  margin-top: 2px;
  word-break: break-all;
}

.filter-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.filter-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-dim);
  font-size: 13px;
  cursor: pointer;
}

.filter-tab.active {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
}

.filter-count {
  font-size: 11px;
  padding: 0 6px;
  border-radius: 8px;
  background: var(--color-bg-elev2);
}

.empty {
  text-align: center;
  color: var(--color-text-dim);
  padding: 48px 0;
}

.batch-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 12px;
  margin-bottom: 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-bg-elev);
}

.batch-bar .check {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-dim);
  font-size: 13px;
  cursor: pointer;
}

.task-check {
  display: flex;
  align-items: center;
  align-self: center;
  cursor: pointer;
}

.task {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 8px;
}

.task-main {
  flex: 1;
  min-width: 0;
}

.task-title {
  font-weight: 600;
}

.task-sub {
  color: var(--color-text-dim);
  font-size: 13px;
}

.progress-info {
  color: var(--color-text-dim);
  font-size: 12px;
  margin-top: 4px;
}

.percent-inline {
  color: var(--color-accent);
  margin-left: 6px;
}

.file-size {
  color: var(--color-accent);
}

.task-error {
  color: var(--color-danger);
  font-size: 12px;
  margin-top: 4px;
  word-break: break-all;
}

.task-file {
  color: var(--color-text-dim);
  font-size: 12px;
  margin-top: 4px;
  word-break: break-all;
}

.task-status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  font-size: 13px;
  white-space: nowrap;
}

.percent {
  color: var(--color-text-dim);
}

.task-actions {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.status-queued {
  color: var(--color-warning);
}
.status-running {
  color: var(--color-accent);
}
.status-completed {
  color: var(--color-success);
}
.status-failed {
  color: var(--color-danger);
}
.status-cancelled {
  color: var(--color-text-dim);
}
.status-pending_confirm {
  color: var(--color-warning);
}

.pending-note {
  color: var(--color-warning);
}
</style>

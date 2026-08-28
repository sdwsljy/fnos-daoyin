<template>
  <div class="queue-page">
    <h2>下载队列</h2>

    <div class="toolbar">
      <button class="btn-secondary" @click="refresh">刷新</button>
      <span class="counts">
        完成 {{ counts.completed }} / 下载中 {{ counts.running }} / 失败 {{ counts.failed }}
      </span>
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

    <div v-if="!filteredTasks.length" class="empty">暂无{{ filterLabel }}任务</div>

    <div class="batch-bar" v-if="filteredTasks.length">
      <label class="check">
        <input type="checkbox" :checked="allSelected" @change="toggleAll" /> 全选
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
          <button class="btn-secondary" @click="batchDelete">批量删除（{{ selectedCount }}）</button>
        </template>
        <template v-else-if="filter === 'existing'">
          <button class="btn-secondary" @click="batchReDownload">强制重新下载（{{ selectedCount }}）</button>
          <button class="btn-secondary" @click="batchDelete">批量删除（{{ selectedCount }}）</button>
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
        <input type="checkbox" :checked="selected.has(t.id)" @change="toggleOne(t.id, ($event.target as HTMLInputElement).checked)" />
      </label>
      <div class="task-main">
        <div class="task-title">{{ t.title }}</div>
        <div class="task-sub">
          {{ t.artist }}<span v-if="t.album"> · {{ t.album }}</span>
          · {{ platformLabel(t.platform) }} · {{ qualityLabel(t.quality) }}
        </div>
        <div v-if="t.status === 'running'" class="progress-track">
          <div class="progress-fill" :style="{ width: formatPercent(t.progress) }"></div>
        </div>
        <div v-if="t.status === 'running'" class="progress-info">
          {{ formatBytes(t.file_size) }}
          <template v-if="t.total_bytes"> / {{ formatBytes(t.total_bytes) }}</template>
          <span class="percent-inline">{{ formatPercent(t.progress) }}</span>
        </div>
        <div v-if="t.error && (t.status === 'failed' || t.status === 'queued')" class="task-error" :title="t.error">
          {{ t.error }}
        </div>
        <div v-if="t.file_path && t.status === 'completed'" class="task-file">
          {{ t.file_path }}<span v-if="t.file_size" class="file-size">（{{ formatBytes(t.file_size) }}）</span>
        </div>
        <div v-if="t.file_path && t.status === 'existing'" class="task-file existing-file">
          {{ t.file_path }}<span v-if="t.file_size" class="file-size">（{{ formatBytes(t.file_size) }}）</span>
        </div>
      </div>
      <div class="task-status">
        <span :class="`status-${t.status}`">{{ statusLabel(t.status) }}</span>
        <span v-if="t.status === 'running'" class="percent">{{ formatPercent(t.progress) }}</span>
      </div>
      <div class="task-actions">
        <template v-if="t.status === 'existing'">
          <button class="btn-ghost" @click="reDownload(t.id)">重新下载</button>
          <button class="btn-ghost" @click="remove(t)">删除</button>
        </template>
        <template v-else-if="t.status === 'failed' || t.status === 'cancelled'">
          <button class="btn-ghost" @click="retry(t.id)">重试</button>
          <button class="btn-ghost" @click="openSwitchSource(t)">换源</button>
          <button class="btn-ghost" @click="openSwitchQuality(t)">换音质</button>
        </template>
        <template v-if="t.status === 'queued' || t.status === 'running' || t.status === 'completed'">
          <button class="btn-ghost" @click="cancel(t.id)">取消</button>
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
      v-if="switchQualityTarget"
      :task="switchQualityTarget"
      @close="switchQualityTarget = null"
      @confirm="doSwitchQuality"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { platformLabel, qualityLabel, statusLabel, formatPercent, formatBytes } from '~/utils/mediaLabels'
import { useDownloadEvents, type DownloadTask } from '~/composables/useDownloadEvents'
import { useToast } from '~/composables/useToast'

const { tasks, connect } = useDownloadEvents()
const toast = useToast()

const filter = ref<'all' | 'downloading' | 'failed' | 'completed' | 'existing'>('all')
const filterTabs = [
  { value: 'all', label: '全部' },
  { value: 'downloading', label: '下载中' },
  { value: 'failed', label: '下载失败' },
  { value: 'completed', label: '下载完成' },
  { value: 'existing', label: '已存在' },
] as const

function taskInFilter(t: DownloadTask, f: typeof filter.value) {
  switch (f) {
    case 'downloading':
      return t.status === 'running' || t.status === 'queued'
    case 'failed':
      return t.status === 'failed'
    case 'completed':
      return t.status === 'completed'
    case 'existing':
      return t.status === 'existing'
    default:
      return true
  }
}

const filterLabel = computed(() => {
  const tab = filterTabs.find((t) => t.value === filter.value)
  return tab ? tab.label : '该'
})

const filteredTasks = computed(() => tasks.value.filter((t) => taskInFilter(t, filter.value)))

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
const batchSwitchSourceTargets = ref<DownloadTask[]>([])

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

function refresh() {
  $fetch<{ items: DownloadTask[] }>('/api/downloads')
    .then((d) => {
      tasks.value = d.items
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

async function doSwitchQuality(quality: string) {
  const t = switchQualityTarget.value
  if (!t) return
  try {
    await $fetch(`/api/downloads/${t.id}/switch-quality`, { method: 'POST', body: { quality } })
    toast.success('已换音质并重新下载')
  } catch (e: any) {
    toast.error(e?.statusMessage || '换音质失败')
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
  } catch {
    /* ignore */
  }
}

onMounted(() => {
  connect()
  refresh()
  loadSources()
})
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.counts {
  color: var(--color-text-dim);
  font-size: 13px;
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
  background: rgba(20, 184, 166, 0.08);
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
</style>

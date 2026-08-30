<template>
  <div class="sources-page">
    <h2>音源管理</h2>

    <div class="toolbar">
      <button class="btn-secondary" @click="loadSources">刷新</button>
      <button class="btn-secondary" @click="showForm = true">新增 URL</button>
      <button class="btn-secondary" @click="fileInput?.click()">上传 .js</button>
      <input ref="fileInput" type="file" accept=".js" multiple hidden @change="onFiles" />
      <button class="btn-secondary" @click="openFolderPicker">上传文件夹</button>
      <input ref="dirInput" type="file" multiple hidden webkitdirectory @change="onDirSelected" />
      <button class="btn-secondary" @click="openImportText">批量导入</button>
      <button class="btn-secondary" @click="runCheck">检测</button>
      <button class="btn-secondary" @click="disableDead">停用失效</button>
      <button class="btn-secondary" @click="runCleanup">清理失效</button>
    </div>

    <div v-if="sources.length" class="source-list">
      <div
        v-for="(s, i) in sources"
        :key="s.id"
        class="source-row card"
        :class="{ 'drag-over': dragOverIndex === i }"
        draggable="true"
        @dragstart="onDragStart(i, $event)"
        @dragover.prevent="onDragOver(i)"
        @drop.prevent="onDrop(i)"
        @dragend="onDragEnd"
      >
        <div class="drag-handle" title="拖拽排序">⠿</div>
        <div class="source-main">
          <div class="source-name">
            {{ s.name }}
            <span class="status" :class="`status-${s.status}`">
              {{ s.status === 'ok' ? '正常' : '失效' }}
            </span>
            <span class="enabled" :class="{ off: !s.enabled }">{{ s.enabled ? '启用' : '停用' }}</span>
          </div>
          <div class="source-url">{{ s.url }}</div>
          <div class="source-platforms">{{ platformList(s.platforms) }}</div>
          <div v-if="s.last_error" class="source-error" :title="s.last_error">{{ s.last_error }}</div>
        </div>
        <div class="source-actions">
          <div class="sort-actions">
            <button class="btn-ghost sort-btn" :disabled="i === 0" title="上移" @click="moveUp(i)">↑</button>
            <button class="btn-ghost sort-btn" :disabled="i === sources.length - 1" title="下移" @click="moveDown(i)">↓</button>
            <button class="btn-ghost sort-btn" :disabled="i === 0" title="置顶" @click="moveTop(i)">⤒</button>
          </div>
          <button class="btn-ghost" @click="toggle(s)">{{ s.enabled ? '停用' : '启用' }}</button>
          <button class="btn-ghost" @click="openEdit(s)">编辑</button>
          <button class="btn-ghost" @click="askDelete(s)">删除</button>
        </div>
      </div>
    </div>
    <div v-else class="empty">暂无音源，请先添加音源脚本</div>

    <SourceFormDialog
      v-if="showForm"
      :source="editing"
      @close="showForm = false; editing = null"
      @submit="onSubmitForm"
    />

    <div v-if="importMode === 'text'" class="import-panel card">
      <div class="import-head">
        <b>批量导入音源</b>
        <button class="btn-ghost" @click="closeImport">×</button>
      </div>
      <textarea
        v-model="importText"
        rows="8"
        placeholder="每行一个名称 + URL，或纯 URL 列表"
      ></textarea>
      <div class="import-actions">
        <button :disabled="importing" @click="startImport">
          {{ importing ? '导入中…' : '开始导入' }}
        </button>
      </div>
    </div>

    <div v-if="busy" class="batch-overlay">
      <PageLoading :busy="true" :text="busyText" />
    </div>

    <ImportConflictDialog
      :count="conflictPreview?.conflictCount || 0"
      :conflicts="conflictPreview?.conflicts || []"
      :loading="conflictLoading"
      :description="conflictDescription"
      @resolve="onConflictResolve"
      @cancel="onConflictCancel"
    />

    <DeleteConfirmDialog
      v-if="deleteTarget"
      title="删除音源"
      :message="`确定删除音源「${deleteTarget.name}」？`"
      confirm-text="删除"
      @close="deleteTarget = null"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useToast } from '~/composables/useToast'
import { fetchSourceBatchNdjson } from '~/utils/fetchSourceBatchNdjson'
import { progressText } from '~/utils/sourceCheck'
import ImportConflictDialog, { type ImportConflict } from '~/components/ImportConflictDialog.vue'

type SourceRow = {
  id: string
  name: string
  url: string
  mirror_url?: string | null
  enabled: number
  status: string
  platforms: string[]
  last_error?: string | null
}

const sources = ref<SourceRow[]>([])
const showForm = ref(false)
const editing = ref<SourceRow | null>(null)
const deleteTarget = ref<SourceRow | null>(null)
const importMode = ref<'text' | null>(null)
const importText = ref('')
const importing = ref(false)
const busy = ref(false)
const busyText = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const dirInput = ref<HTMLInputElement | null>(null)

const conflictLoading = ref(false)
const conflictPreview = ref<{
  conflictCount: number
  newCount: number
  conflicts: ImportConflict[]
} | null>(null)
const pendingDirFiles = ref<File[]>([])

const conflictDescription = computed(() => {
  const preview = conflictPreview.value
  if (!preview) return ''
  return `目录中有 ${preview.conflictCount} 个与现有音源同名，另有 ${preview.newCount} 个可直接新增。音源名称取自 JS 文件名。请选择对冲突项的处理方式：`
})

const toast = useToast()

async function loadSources() {
  try {
    const data = await $fetch<{ items: SourceRow[] }>('/api/sources')
    sources.value = data.items
  } catch (e: any) {
    toast.error(e?.statusMessage || '加载音源失败')
  }
}

function platformList(platforms: string[]) {
  return (platforms || []).join(' / ')
}

const dragIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

function onDragStart(i: number, e: DragEvent) {
  dragIndex.value = i
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

function onDragOver(i: number) {
  dragOverIndex.value = i
}

async function onDrop(i: number) {
  const from = dragIndex.value
  dragIndex.value = null
  dragOverIndex.value = null
  if (from === null || from === i) return
  move(from, i)
  await saveOrder()
}

function onDragEnd() {
  dragIndex.value = null
  dragOverIndex.value = null
}

function move(from: number, to: number) {
  const arr = [...sources.value]
  const [item] = arr.splice(from, 1)
  if (item) arr.splice(to, 0, item)
  sources.value = arr
}

async function saveOrder() {
  try {
    await $fetch('/api/sources/reorder', {
      method: 'POST',
      body: { ids: sources.value.map((s) => s.id) },
    })
  } catch (e: any) {
    toast.error(e?.statusMessage || '保存排序失败')
  }
}

function moveUp(i: number) {
  if (i <= 0) return
  move(i, i - 1)
  void saveOrder()
}

function moveDown(i: number) {
  if (i >= sources.value.length - 1) return
  move(i, i + 1)
  void saveOrder()
}

function moveTop(i: number) {
  if (i <= 0) return
  move(i, 0)
  void saveOrder()
}

function toggle(s: SourceRow) {
  $fetch(`/api/sources/${s.id}`, { method: 'PATCH', body: { enabled: !s.enabled } })
    .then(() => loadSources())
    .catch((e: any) => toast.error(e?.statusMessage || '操作失败'))
}

function openEdit(s: SourceRow) {
  editing.value = s
  showForm.value = true
}

async function onSubmitForm(data: { name: string; url: string; mirrorUrl?: string }) {
  try {
    if (editing.value) {
      await $fetch(`/api/sources/${editing.value.id}`, {
        method: 'PATCH',
        body: { name: data.name },
      })
      toast.success('已保存名称')
    } else {
      await $fetch('/api/sources', { method: 'POST', body: data })
      toast.success('已添加音源')
    }
    showForm.value = false
    editing.value = null
    await loadSources()
  } catch (e: any) {
    toast.error(e?.statusMessage || e?.message || '保存失败')
  }
}

function askDelete(s: SourceRow) {
  deleteTarget.value = s
}

function doDelete() {
  const s = deleteTarget.value
  if (!s) return
  $fetch(`/api/sources/${s.id}`, { method: 'DELETE' })
    .then(() => {
      toast.success('已删除')
      loadSources()
    })
    .catch((e: any) => toast.error(e?.statusMessage || '删除失败'))
}

function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  if (!files.length) return
  void uploadFiles(files)
  input.value = ''
}

async function uploadFiles(files: File[]) {
  busy.value = true
  busyText.value = '准备上传…'
  try {
    const fd = new FormData()
    for (const f of files) fd.append('files', f, f.name)
    fd.append('onConflict', 'overwrite')
    fd.append('stream', 'true')
    const done = await fetchSourceBatchNdjson('/api/sources/upload', fd, {
      onProgress: (p) => {
        busyText.value = progressText(p)
      },
      onError: (msg) => toast.error(msg),
    })
    const ok = done?.imported ?? 0
    const overwritten = done?.overwritten ?? 0
    const skipped = done?.skipped ?? 0
    const failed = done?.failed ?? 0
    const text =
      `上传完成：新增 ${ok}` +
      (overwritten ? `，覆盖 ${overwritten}` : '') +
      (skipped ? `，跳过 ${skipped}` : '') +
      (failed ? `，失败 ${failed}` : '') +
      (done?.timedOut ? '（整批超时）' : '')
    if (ok + overwritten > 0) toast.success(text)
    else toast.error(text)
    await loadSources()
  } catch (e: any) {
    toast.error(e?.message || '上传失败')
  } finally {
    busy.value = false
  }
}

function collectJsFromDir(list: FileList | null): File[] {
  if (!list?.length) return []
  return [...list].filter((f) => /\.js$/i.test(f.name))
}

/** 上传文件夹：直接唤起浏览器原生文件夹选择器（webkitdirectory），与觅音一致 */
function openFolderPicker() {
  dirInput.value?.click()
}

async function onDirSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const files = collectJsFromDir(input.files)
  input.value = ''
  if (!files.length) {
    toast.error('所选目录中未找到 .js 音源文件')
    return
  }
  pendingDirFiles.value = files
  busy.value = true
  busyText.value = '解析目录脚本…'
  try {
    const fd = new FormData()
    for (const f of files) fd.append('files', f, f.name)
    fd.append('dryRun', 'true')
    const preview = await $fetch<{
      conflictCount: number
      newCount: number
      conflicts: ImportConflict[]
      total: number
    }>('/api/sources/upload', { method: 'POST', body: fd })

    if (preview.conflictCount > 0) {
      conflictPreview.value = preview
      return
    }

    await applyDirFiles('skip')
  } catch (e: any) {
    toast.error(e?.statusMessage || e?.message || '导入目录失败')
    pendingDirFiles.value = []
  } finally {
    busy.value = false
  }
}

async function applyDirFiles(onConflict: 'overwrite' | 'skip') {
  const files = pendingDirFiles.value
  if (!files.length) return
  conflictLoading.value = true
  busy.value = true
  busyText.value = '准备导入…'
  try {
    const fd = new FormData()
    for (const f of files) fd.append('files', f, f.name)
    fd.append('onConflict', onConflict)
    fd.append('stream', 'true')
    const done = await fetchSourceBatchNdjson('/api/sources/upload', fd, {
      onProgress: (p) => {
        busyText.value = progressText(p)
      },
      onError: (msg) => toast.error(msg),
    })
    pendingDirFiles.value = []
    conflictPreview.value = null
    const ok = done?.imported ?? 0
    const overwritten = done?.overwritten ?? 0
    const skipped = done?.skipped ?? 0
    const failed = done?.failed ?? 0
    const text =
      `导入完成：新增 ${ok}` +
      (overwritten ? `，覆盖 ${overwritten}` : '') +
      (skipped ? `，跳过 ${skipped}` : '') +
      (failed ? `，失败 ${failed}` : '') +
      (done?.timedOut ? '（整批超时）' : '')
    if (ok + overwritten > 0) toast.success(text)
    else toast.error(text)
    await loadSources()
  } catch (e: any) {
    toast.error(e?.message || '导入目录失败')
  } finally {
    conflictLoading.value = false
    busy.value = false
  }
}

function onConflictResolve(action: 'overwrite' | 'skip') {
  void applyDirFiles(action)
}

function onConflictCancel() {
  pendingDirFiles.value = []
  conflictPreview.value = null
}

function openImportText() {
  importMode.value = 'text'
  importText.value = ''
}

function closeImport() {
  importMode.value = null
  importText.value = ''
}

async function startImport() {
  importing.value = true
  busy.value = true
  try {
    busyText.value = '开始导入…'
    await fetchSourceBatchNdjson('/api/sources/import', { text: importText.value }, {
      onProgress: (p) => {
        busyText.value = progressText(p)
      },
      onError: (msg) => toast.error(msg),
    })
    closeImport()
    await loadSources()
  } catch (e: any) {
    toast.error(e?.message || '导入失败')
  } finally {
    importing.value = false
    busy.value = false
  }
}

async function runCheck() {
  busy.value = true
  busyText.value = '开始检测…'
  await fetchSourceBatchNdjson('/api/sources/check', {}, {
    onProgress: (p) => {
      busyText.value = progressText(p)
    },
    onError: (msg) => toast.error(msg),
  })
  busy.value = false
  await loadSources()
  toast.success('检测完成')
}

async function disableDead() {
  try {
    const data = await $fetch<{ disabled: number }>('/api/sources/disable-dead', { method: 'POST' })
    toast.success(`已停用 ${data.disabled} 个失效音源`)
    await loadSources()
  } catch (e: any) {
    toast.error(e?.statusMessage || '操作失败')
  }
}

async function runCleanup() {
  busy.value = true
  busyText.value = '清理中…'
  await fetchSourceBatchNdjson('/api/sources/cleanup', {}, {
    onProgress: (p) => {
      busyText.value = progressText(p)
    },
    onError: (msg) => toast.error(msg),
  })
  busy.value = false
  await loadSources()
  toast.success('清理完成')
}

onMounted(loadSources)
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.empty {
  text-align: center;
  color: var(--color-text-dim);
  padding: 48px 0;
}

.source-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.source-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  transition: border-color 0.15s, background 0.15s;
}

.source-row.drag-over {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
}

.drag-handle {
  cursor: grab;
  color: var(--color-text-dim);
  font-size: 18px;
  align-self: center;
  user-select: none;
  line-height: 1;
}

.sort-actions {
  display: flex;
  gap: 2px;
}

.sort-btn {
  padding: 4px 8px;
  font-size: 14px;
  line-height: 1;
}

.source-main {
  flex: 1;
  min-width: 0;
}

.source-name {
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.status {
  font-size: 12px;
  padding: 1px 8px;
  border-radius: 10px;
}

.status-ok {
  background: rgba(22, 163, 74, 0.15);
  color: var(--color-success);
}

.status-dead {
  background: rgba(220, 38, 38, 0.15);
  color: var(--color-danger);
}

.enabled {
  font-size: 12px;
  color: var(--color-success);
}
.enabled.off {
  color: var(--color-text-dim);
}

.source-url {
  color: var(--color-text-dim);
  font-size: 12px;
  word-break: break-all;
}

.source-platforms {
  font-size: 12px;
  color: var(--color-accent);
  margin-top: 2px;
}

.source-error {
  color: var(--color-danger);
  font-size: 12px;
  margin-top: 4px;
  word-break: break-all;
}

.source-actions {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.import-panel {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.import-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.import-actions {
  display: flex;
  justify-content: flex-end;
}

.batch-overlay {
  position: fixed;
  inset: 0;
  z-index: 1800;
}
</style>

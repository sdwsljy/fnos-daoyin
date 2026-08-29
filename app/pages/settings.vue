<template>
  <div class="settings-page">
    <h2>系统设置</h2>

    <div v-if="loading" class="loading">
      <PageLoading :busy="true" />
    </div>

    <template v-else>
      <div v-if="fnos?.needsAuth" class="fnos-warn card">
        <p>下载目录未授权，下载可能失败。</p>
        <button @click="onPickAuthorize">去授权</button>
      </div>

      <div class="card section">
        <h3>下载</h3>
        <div class="field">
          <label>下载目录</label>
          <input v-model="form.downloadDir" type="text" />
          <p class="hint">
            {{ fnos ? `下载模式：${fnos.downloadMode === 'custom' ? '自定义' : '共享目录'}` : '本地开发环境' }}
          </p>
        </div>
        <div v-if="fnos?.supported" class="fnos-box">
          <p class="fnos-title">飞牛目录授权</p>
          <p class="hint">
            状态：
            <span :class="fnos.authorized ? 'ok-inline' : 'warn'">
              {{ fnos.authorized ? '已授权' : '未授权' }}
            </span>
            <template v-if="fnos.downloadMode === 'custom'">（自定义路径）</template>
          </p>
          <p v-if="!fnos.authorized" class="hint">
            自定义下载目录需管理员为应用授予读写权限。授权成功后请重启应用。
          </p>
          <div class="fnos-actions">
            <button class="btn-secondary" type="button" @click="onPickAuthorize">选择并授权目录</button>
            <button class="btn-secondary" type="button" @click="onAuthorizeCurrent">授权当前路径</button>
            <button class="btn-secondary" type="button" @click="onRefreshFnOs">刷新授权状态</button>
            <button class="btn-secondary" type="button" @click="openSystemAppSetting">打开系统应用设置</button>
          </div>
        </div>
        <div class="field">
          <label>默认音质</label>
          <select v-model="form.defaultQuality">
            <option v-for="q in qualityOptions" :key="q" :value="q">{{ qualityLabel(q) }}</option>
          </select>
        </div>
        <div class="field">
          <label>并发数</label>
          <input v-model.number="form.concurrency" type="number" min="1" max="5" />
        </div>
        <div class="field-row">
          <div class="field">
            <label>任务启动间隔（秒）</label>
            <input v-model.number="form.taskStartIntervalSec" type="number" min="0" max="120" />
          </div>
          <div class="field">
            <label>下载间隔（秒）</label>
            <input v-model.number="form.downloadIntervalSec" type="number" min="0" max="120" />
          </div>
        </div>
        <div class="field">
          <label>最大重试次数</label>
          <input v-model.number="form.maxAttempts" type="number" min="1" max="8" />
        </div>
        <label class="checkbox">
          <input v-model="form.autoFailover" type="checkbox" /> 失败自动换源
        </label>
      </div>

      <div class="card section">
        <h3>歌词</h3>
        <label class="checkbox">
          <input v-model="form.downloadLyric" type="checkbox" /> 下载歌词
        </label>
        <div class="field">
          <label>歌词模式</label>
          <select v-model="form.lyricMode">
            <option value="external">外挂 .lrc 文件</option>
            <option value="embedded">内嵌到音频</option>
          </select>
        </div>
      </div>

      <div class="card section">
        <h3>文件命名</h3>
        <div class="field">
          <label>命名模板</label>
          <input v-model="form.nameTemplate" type="text" />
          <p class="hint">
            可用变量：{{ templateVars.map((v) => v.key).join(' ') }}
          </p>
        </div>
      </div>

      <div class="card section">
        <h3>版本与更新</h3>
        <p class="version">
          当前版本 v{{ version }}
          <button class="btn-ghost" @click="checkUpdate">检查更新</button>
        </p>
        <p v-if="update?.hasUpdate" class="update-avail">
          发现新版本 v{{ update.latest?.version }}
          <button class="btn-ghost" @click="showChangelog = true">查看更新日志</button>
        </p>
        <button class="btn-ghost" @click="about = true">关于</button>
      </div>

      <div class="actions">
        <button :disabled="saving" @click="save">{{ saving ? '保存中…' : '保存设置' }}</button>
      </div>
    </template>

    <UpdateChangelogDialog v-if="showChangelog" :update="update" @close="showChangelog = false" />
    <AboutMiyinDialog v-if="about" @close="about = false" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { qualityLabel } from '~/utils/mediaLabels'
import { useToast } from '~/composables/useToast'
import { useFnOsDirAuth } from '~/composables/useFnOsDirAuth'
import { useAppUpdate } from '~/composables/useAppUpdate'

type SettingsForm = {
  downloadDir: string
  defaultQuality: string
  concurrency: number
  taskStartIntervalSec: number
  downloadIntervalSec: number
  downloadLyric: boolean
  lyricMode: 'external' | 'embedded'
  nameTemplate: string
  autoFailover: boolean
  maxAttempts: number
}

const loading = ref(true)
const saving = ref(false)
const form = ref<SettingsForm>({
  downloadDir: './downloads',
  defaultQuality: 'flac24bit',
  concurrency: 1,
  taskStartIntervalSec: 0,
  downloadIntervalSec: 0,
  downloadLyric: true,
  lyricMode: 'external',
  nameTemplate: '{title} - {artist}',
  autoFailover: true,
  maxAttempts: 3,
})
const templateVars = ref<Array<{ key: string }>>([])
const showChangelog = ref(false)
const about = ref(false)
const qualityOptions = ['flac24bit', 'flac', '320k', '192k', '128k']

const toast = useToast()
const {
  status: fnos,
  refresh: refreshFnOs,
  ensureSdk,
  pickAndAuthorize,
  authorizeCurrentPath,
  openSystemAppSetting,
  bindAuthMessage,
} = useFnOsDirAuth()
const { update, check: checkUpdate } = useAppUpdate()

const runtimeConfig = useRuntimeConfig()
const version = runtimeConfig.public.appVersion
let unbindAuth: (() => void) | null = null

async function load() {
  try {
    const data = await $fetch<{ settings: SettingsForm; nameTemplateVars: Array<{ key: string }> }>('/api/settings')
    form.value = { ...form.value, ...data.settings }
    templateVars.value = data.nameTemplateVars
    await refreshFnOs({ notifyError: true })
    if (fnos.value?.downloadDir) form.value.downloadDir = fnos.value.downloadDir
  } catch (e: any) {
    toast.error(e?.statusMessage || '加载设置失败')
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    await $fetch('/api/settings', { method: 'PUT', body: form.value })
    toast.success('设置已保存')
    await refreshFnOs({ notifyError: true })
  } catch (e: any) {
    toast.error(e?.statusMessage || '保存失败')
  } finally {
    saving.value = false
  }
}

async function onPickAuthorize() {
  try {
    const res = await pickAndAuthorize()
    if (res?.downloadDir) form.value.downloadDir = res.downloadDir
    await refreshFnOs({ notifyError: true })
  } catch (e: any) {
    toast.error(e?.statusMessage || e?.message || '选择授权失败')
  }
}

async function onAuthorizeCurrent() {
  try {
    await authorizeCurrentPath(form.value.downloadDir)
    await refreshFnOs({ notifyError: true })
  } catch (e: any) {
    toast.error(e?.statusMessage || e?.message || '授权失败')
  }
}

async function onRefreshFnOs() {
  try {
    await refreshFnOs({ notifyError: true })
    if (fnos.value?.downloadDir) form.value.downloadDir = fnos.value.downloadDir
    toast.success('已刷新授权状态')
  } catch (e: any) {
    toast.error(e?.statusMessage || '刷新失败')
  }
}

onMounted(async () => {
  await ensureSdk()
  unbindAuth = bindAuthMessage(() => {
    void refreshFnOs({ notifyError: true })
  })
  await load()
  await refreshFnOs()
})

onUnmounted(() => {
  unbindAuth?.()
})
</script>

<style scoped>
.loading {
  min-height: 200px;
}

.fnos-warn {
  border-color: var(--color-warning);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.fnos-warn p {
  margin: 0;
}

.fnos-box {
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fnos-title {
  margin: 0;
  font-weight: 600;
  font-size: 14px;
}

.ok-inline {
  color: var(--color-success);
}

.warn {
  color: var(--color-warning);
}

.fnos-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.section {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section h3 {
  margin: 0 0 4px;
  font-size: 15px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field label {
  color: var(--color-text-dim);
  font-size: 12px;
}

.hint {
  color: var(--color-text-dim);
  font-size: 12px;
  margin: 0;
}

.field-row {
  display: flex;
  gap: 12px;
}

.field-row .field {
  flex: 1;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
}

.version {
  display: flex;
  align-items: center;
  gap: 8px;
}

.update-avail {
  color: var(--color-warning);
  display: flex;
  align-items: center;
  gap: 8px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}
</style>

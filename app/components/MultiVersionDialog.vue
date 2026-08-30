<template>
  <Teleport to="body">
    <div class="dialog-mask" @click.self="emit('later')">
      <div class="dialog">
        <h3>多版本：{{ title }}</h3>
        <p class="mv-desc">
          本地已存在同名但歌手不同的版本，以下为已有版本：
        </p>
        <div class="mv-list">
          <div v-for="v in versions" :key="v.path" class="mv-row">
            <span class="mv-name">{{ v.name }}</span>
            <span class="mv-size">{{ formatBytes(v.size) }}</span>
          </div>
        </div>
        <div class="dialog-actions">
          <select v-model="quality" class="mv-quality">
            <option v-for="q in options" :key="q" :value="q">{{ qualityLabel(q) }}</option>
          </select>
          <button class="btn-secondary" @click="emit('later')">待会再说</button>
          <button class="btn-secondary" @click="emit('skip')">跳过</button>
          <button @click="emit('download', quality)">仍要下载此版本</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { formatBytes, qualityLabel } from '~/utils/mediaLabels'

defineProps<{
  title: string
  artist: string
  versions: Array<{ name: string; path: string; size: number }>
}>()
const emit = defineEmits<{ later: []; skip: []; download: [quality: string] }>()

const options = ['flac24bit', 'flac', '320k', '192k', '128k']
const quality = ref('flac24bit')
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

.dialog {
  background: var(--color-bg-elev);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 20px;
  width: 460px;
  max-width: 92vw;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mv-desc {
  color: var(--color-text-dim);
  font-size: 13px;
  margin: 0;
}

.mv-list {
  max-height: 260px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mv-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  padding: 4px 0;
  border-bottom: 1px solid var(--color-border);
}

.mv-row:last-child {
  border-bottom: none;
}

.mv-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mv-size {
  color: var(--color-text-dim);
  flex-shrink: 0;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}

.mv-quality {
  width: auto;
  margin-right: auto;
}
</style>

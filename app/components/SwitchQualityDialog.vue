<template>
  <Teleport to="body">
    <div class="dialog-mask" @click.self="emit('close')">
      <div class="dialog">
        <h3>切换音质</h3>
        <p class="dim">{{ task?.title }}</p>
        <select v-model="quality">
          <option v-for="q in qualityOptions" :key="q" :value="q">{{ label(q) }}</option>
        </select>
        <div class="dialog-actions">
          <button class="btn-secondary" @click="emit('close')">取消</button>
          <button @click="confirm">重新下载</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { qualityLabel } from '~/utils/mediaLabels'
import type { DownloadTask } from '~/composables/useDownloadEvents'

defineProps<{ task: DownloadTask | null }>()
const emit = defineEmits<{ close: []; confirm: [quality: string] }>()

const qualityOptions = ['flac24bit', 'flac', '320k', '192k', '128k']
const quality = ref('flac24bit')

function label(q: string) {
  return qualityLabel(q)
}

function confirm() {
  emit('confirm', quality.value)
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

.dialog {
  background: var(--color-bg-elev);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 20px;
  width: 360px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dim {
  color: var(--color-text-dim);
  margin: 0;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>

<template>
  <Teleport to="body">
    <div class="dialog-mask" @click.self="emit('close')">
      <div class="dialog">
        <h3>{{ batch ? '批量切换音源' : '切换音源' }}</h3>
        <p class="dim">{{ batch ? `已选 ${count} 个任务` : task?.title }}</p>
        <div class="source-list">
          <button
            v-for="s in sources"
            :key="s.id"
            class="source-item"
            :class="{ active: s.id === selected }"
            @click="selected = s.id"
          >
            {{ s.name }}
            <span class="status" :class="`status-${s.status}`">{{ s.status }}</span>
          </button>
        </div>
        <div class="dialog-actions">
          <button class="btn-secondary" @click="emit('close')">取消</button>
          <button :disabled="!selected" @click="confirm">切换并重试</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { DownloadTask } from '~/composables/useDownloadEvents'

const props = withDefaults(
  defineProps<{
    task: DownloadTask | null
    sources: Array<{ id: string; name: string; status: string }>
    batch?: boolean
    count?: number
  }>(),
  { batch: false, count: 0 },
)
const emit = defineEmits<{ close: []; confirm: [sourceId: string] }>()

const selected = ref<string>('')
watch(
  () => props.sources,
  (list) => {
    if (!selected.value && list.length) selected.value = list[0]!.id
  },
  { immediate: true },
)

function confirm() {
  if (selected.value) {
    emit('confirm', selected.value)
    emit('close')
  }
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
  width: 400px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dim {
  color: var(--color-text-dim);
  margin: 0;
}

.source-list {
  max-height: 260px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.source-item {
  display: flex;
  justify-content: space-between;
  background: var(--color-bg-elev2);
  text-align: left;
}

.source-item.active {
  outline: 2px solid var(--color-accent);
}

.status {
  font-size: 12px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>

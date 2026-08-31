<template>
  <Teleport to="body">
    <div class="dialog-mask" @click.self="emit('close')">
      <div class="dialog">
        <h3>{{ title }}</h3>
        <p class="dialog-body">{{ message }}</p>
        <label v-if="allowDeleteFiles" class="check-row">
          <input v-model="deleteFiles" type="checkbox" > 同时删除本地文件
        </label>
        <div class="dialog-actions">
          <button class="btn-secondary" @click="emit('close')">取消</button>
          <button class="btn-danger" @click="confirm">{{ confirmText }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'

withDefaults(
  defineProps<{
    title?: string
    message?: string
    confirmText?: string
    allowDeleteFiles?: boolean
  }>(),
  { title: '确认', message: '', confirmText: '删除', allowDeleteFiles: false },
)
const emit = defineEmits<{ close: []; confirm: [deleteFiles: boolean] }>()
const deleteFiles = ref(false)
function confirm() {
  emit('confirm', deleteFiles.value)
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
  width: 400px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dialog-body {
  color: var(--color-text-dim);
  word-break: break-all;
  margin: 0;
}

.check-row {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-dim);
  font-size: 13px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>

<template>
  <Teleport to="body">
    <div class="dialog-mask" @click.self="emit('close')">
      <div class="dialog">
        <h3>入队结果</h3>
        <p>
          成功入队 <b>{{ enqueued }}</b> / {{ total }} 首
          <span v-if="pendingCount" class="pending-hint">（多版本 {{ pendingCount }} 首已加入待确认）</span>
        </p>
        <div class="result-list">
          <div v-for="(r, i) in results" :key="i" class="result-row">
            <span class="dot" :class="r.ok ? (r.pending ? 'pending' : 'ok') : 'fail'"/>
            <span class="result-title">{{ r.title }}</span>
            <span v-if="r.pending" class="result-tag">待确认</span>
            <span v-if="!r.ok" class="result-err">{{ r.error }}</span>
          </div>
        </div>
        <div class="dialog-actions">
          <button class="btn-secondary" @click="emit('close')">关闭</button>
          <button @click="goQueue">前往队列</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  total: number
  enqueued: number
  pendingCount?: number
  results: Array<{ title: string; ok: boolean; error?: string; pending?: boolean }>
}>()
const emit = defineEmits<{ close: [] }>()
const router = useRouter()
function goQueue() {
  emit('close')
  router.push('/queue')
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
  width: 440px;
  max-width: 92vw;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-list {
  max-height: 300px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}

.result-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot.ok {
  background: var(--color-success);
}
.dot.fail {
  background: var(--color-danger);
}
.dot.pending {
  background: var(--color-warning);
}

.pending-hint {
  color: var(--color-warning);
}

.result-tag {
  color: var(--color-warning);
  font-size: 12px;
  flex-shrink: 0;
}

.result-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-err {
  color: var(--color-text-dim);
  margin-left: auto;
  max-width: 50%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>

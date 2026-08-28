<template>
  <Teleport to="body">
    <div class="dialog-mask" @click.self="emit('close')">
      <div class="dialog wide">
        <h3>匹配确认</h3>
        <p class="dim">
          原曲：{{ row?.track?.title }} - {{ row?.track?.artist }}（得分
          {{ row?.score != null ? Math.round(row.score * 100) : 0 }}）
        </p>
        <div class="cand-list">
          <button
            v-for="(c, i) in candidates"
            :key="i"
            class="cand-item"
            :class="{ active: i === selected }"
            @click="selected = i"
          >
            <span>{{ c.title }} - {{ c.artist }}</span>
            <span class="score">{{ c.score != null ? Math.round(c.score * 100) : 0 }}</span>
          </button>
        </div>
        <div class="dialog-actions">
          <button class="btn-secondary" @click="emit('close')">取消</button>
          <button :disabled="selected < 0" @click="confirm">确认选中</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  row: {
    track?: { title: string; artist: string }
    score?: number
    candidates?: Array<{ title: string; artist: string; score?: number }>
  } | null
}>()
const emit = defineEmits<{ close: []; confirm: [index: number] }>()

const selected = ref(0)
watch(
  () => props.row,
  () => {
    selected.value = 0
  },
)
const candidates = computed(() => props.row?.candidates || [])

function confirm() {
  emit('confirm', selected.value)
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

.dialog.wide {
  background: var(--color-bg-elev);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 20px;
  width: 480px;
  max-width: 92vw;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dim {
  color: var(--color-text-dim);
  margin: 0;
}

.cand-list {
  max-height: 300px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cand-item {
  display: flex;
  justify-content: space-between;
  background: var(--color-bg-elev2);
  text-align: left;
}

.cand-item.active {
  outline: 2px solid var(--color-accent);
}

.score {
  color: var(--color-text-dim);
  font-size: 12px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>

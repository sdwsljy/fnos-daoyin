<script setup lang="ts">
export type ImportConflict = {
  id: string
  name: string
  url: string
  existingId: string
  existingName: string
  reason: 'id' | 'url' | 'name'
}

const props = withDefaults(
  defineProps<{
    count?: number
    conflicts?: ImportConflict[]
    loading?: boolean
    /** 冲突说明文案 */
    description?: string
  }>(),
  {
    count: 0,
    conflicts: () => [],
    loading: false,
    description: '',
  },
)

const emit = defineEmits<{
  resolve: [action: 'overwrite' | 'skip']
  cancel: []
}>()

const descriptionText = computed(() => {
  if (props.description) return props.description
  return `有 ${props.count} 个音源与现有音源冲突。请选择对冲突项的处理方式：`
})

function reasonLabel(reason: ImportConflict['reason']) {
  if (reason === 'id') return 'ID'
  if (reason === 'url') return 'URL'
  return '同名'
}

function onCancel() {
  if (props.loading) return
  emit('cancel')
}

function choose(action: 'overwrite' | 'skip') {
  if (props.loading) return
  emit('resolve', action)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="count > 0 || conflicts.length > 0" class="dialog-mask" @click.self="onCancel">
      <div class="dialog" role="alertdialog" aria-modal="true">
        <h3>导入冲突</h3>
        <p class="dim">{{ descriptionText }}</p>
        <ul v-if="conflicts.length" class="conflict-list">
          <li v-for="(c, i) in conflicts.slice(0, 8)" :key="`${c.id}-${i}`">
            「{{ c.name }}」↔ 已有「{{ c.existingName }}」（{{ reasonLabel(c.reason) }}）
          </li>
          <li v-if="conflicts.length > 8" class="dim">…其余 {{ conflicts.length - 8 }} 项</li>
        </ul>
        <div class="dialog-actions">
          <button class="btn-secondary" :disabled="loading" @click="choose('overwrite')">
            {{ loading ? '处理中…' : '覆盖冲突项' }}
          </button>
          <button class="btn-secondary" :disabled="loading" @click="choose('skip')">
            跳过冲突项
          </button>
          <button class="btn-ghost" :disabled="loading" @click="onCancel">取消</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

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

.dim {
  color: var(--color-text-dim);
  margin: 0;
}

.conflict-list {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  max-height: 200px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}
</style>

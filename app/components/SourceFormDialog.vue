<template>
  <Teleport to="body">
    <div class="dialog-mask" @click.self="emit('close')">
      <div class="dialog">
        <h3>{{ source ? '编辑音源' : '新增音源' }}</h3>
        <div class="field">
          <label>名称</label>
          <input v-model="name" type="text" placeholder="音源名称" />
        </div>
        <div class="field">
          <label>URL</label>
          <input v-model="url" type="text" placeholder="https://…" />
        </div>
        <div class="field">
          <label>镜像 URL（可选）</label>
          <input v-model="mirrorUrl" type="text" placeholder="https://…" />
        </div>
        <div class="dialog-actions">
          <button class="btn-secondary" @click="emit('close')">取消</button>
          <button :disabled="!name || !url" @click="submit">保存</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  source?: { name: string; url: string; mirror_url?: string | null } | null
}>()
const emit = defineEmits<{ close: []; submit: [data: { name: string; url: string; mirrorUrl?: string }] }>()

const name = ref('')
const url = ref('')
const mirrorUrl = ref('')

watch(
  () => props.source,
  (s) => {
    name.value = s?.name || ''
    url.value = s?.url || ''
    mirrorUrl.value = s?.mirror_url || ''
  },
  { immediate: true },
)

function submit() {
  emit('submit', { name: name.value.trim(), url: url.value.trim(), mirrorUrl: mirrorUrl.value.trim() || undefined })
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
  width: 420px;
  max-width: 92vw;
  display: flex;
  flex-direction: column;
  gap: 12px;
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

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>

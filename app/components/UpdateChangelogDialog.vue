<template>
  <Teleport to="body">
    <div class="dialog-mask" @click.self="emit('close')">
      <div class="dialog">
        <h3>发现新版本 {{ update?.latest?.version }}</h3>
        <pre class="changelog">{{ update?.latest?.changelog }}</pre>
        <div class="dialog-actions">
          <button class="btn-secondary" @click="emit('close')">暂不更新</button>
          <a v-if="update?.latest?.downloads?.releasePage" :href="update.latest.downloads.releasePage" target="_blank">
            <button>前往下载</button>
          </a>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { AppUpdateManifest } from '~/composables/useAppUpdate'

defineProps<{ update: { latest: AppUpdateManifest | null } | null }>()
const emit = defineEmits<{ close: [] }>()
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
  width: 480px;
  max-width: 92vw;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.changelog {
  background: var(--color-bg);
  border-radius: var(--radius);
  padding: 12px;
  max-height: 320px;
  overflow-y: auto;
  white-space: pre-wrap;
  font-size: 13px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  align-items: center;
}
</style>

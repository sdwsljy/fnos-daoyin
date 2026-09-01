<template>
  <Transition name="fade">
    <div v-if="toasts.length" class="toast-wrap">
      <div v-for="t in toasts" :key="t.id" class="toast-item" :class="`toast-${t.kind}`">
        {{ t.message }}
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useToast } from '~/composables/useToast'

const { toasts } = useToast()
</script>

<style scoped>
.toast-wrap {
  position: fixed;
  top: 24px;
  left: calc(var(--sidebar-width) + (100vw - var(--sidebar-width)) / 2);
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  pointer-events: none;
}

.toast-item {
  padding: 11px 20px;
  border-radius: var(--radius-pill);
  color: #fff;
  background: var(--color-bg-elev2);
  box-shadow: var(--shadow-lg);
  max-width: 80vw;
  font-weight: 500;
}

.toast-success {
  background: var(--color-success);
}
.toast-error {
  background: var(--color-danger);
}
.toast-warning {
  background: var(--color-warning);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

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
  top: 64px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.toast-item {
  padding: 10px 18px;
  border-radius: var(--radius);
  color: #fff;
  background: var(--color-bg-elev2);
  box-shadow: var(--shadow);
  max-width: 80vw;
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

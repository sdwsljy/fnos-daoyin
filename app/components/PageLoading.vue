<template>
  <div v-if="busy" class="page-loading">
    <div class="spinner"/>
    <span v-if="text">{{ text }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ busy?: boolean; text?: string }>()
</script>

<style scoped>
.page-loading {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(2px);
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--color-bg-elev2);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

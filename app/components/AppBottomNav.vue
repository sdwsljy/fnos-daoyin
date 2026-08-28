<template>
  <footer class="bottom-nav">
    <NuxtLink v-for="item in navItems" :key="item.to" :to="item.to" class="bottom-link">
      {{ item.label }}
      <span v-if="item.to === '/queue' && badge > 0" class="badge">{{ badge }}</span>
    </NuxtLink>
  </footer>
</template>

<script setup lang="ts">
import { navItems } from '~/utils/nav'
import { useDownloadBadge } from '~/composables/useDownloadBadge'

const badge = useDownloadBadge()
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  justify-content: space-around;
  background: rgba(15, 23, 42, 0.95);
  border-top: 1px solid var(--color-border);
  padding: 6px 0 calc(6px + env(safe-area-inset-bottom));
}

.bottom-link {
  position: relative;
  padding: 8px 16px;
  color: var(--color-text-dim);
}

.bottom-link.router-link-active {
  color: var(--color-accent);
}

.badge {
  position: absolute;
  top: 2px;
  right: 4px;
  background: var(--color-danger);
  color: #fff;
  border-radius: 10px;
  font-size: 11px;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
  text-align: center;
  padding: 0 4px;
}
</style>

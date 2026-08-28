<template>
  <header class="app-header">
    <div class="header-inner">
      <NuxtLink to="/" class="brand">
        <BrandLogo />
        <span class="brand-name">盗音</span>
      </NuxtLink>
      <nav class="header-nav">
        <NuxtLink v-for="item in navItems" :key="item.to" :to="item.to" class="nav-link">
          {{ item.label }}
        </NuxtLink>
      </nav>
      <div class="header-actions">
        <span v-if="update?.hasUpdate" class="update-dot" title="有新版本">●</span>
        <button v-if="requireLogin" class="btn-ghost" @click="logout">退出</button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { navItems } from '~/utils/nav'
import { useAuth } from '~/composables/useAuth'
import { useAppUpdate } from '~/composables/useAppUpdate'

const { requireLogin, logout } = useAuth()
const { update } = useAppUpdate()
</script>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(15, 23, 42, 0.92);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--color-border);
}

.header-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 16px;
  height: 52px;
  display: flex;
  align-items: center;
  gap: 24px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text);
}

.brand-name {
  font-size: 17px;
  font-weight: 700;
  color: var(--color-accent);
}

.header-nav {
  display: flex;
  gap: 4px;
  flex: 1;
}

.nav-link {
  padding: 6px 12px;
  border-radius: var(--radius);
  color: var(--color-text-dim);
}

.nav-link:hover {
  color: var(--color-text);
  background: var(--color-bg-elev);
}

.nav-link.router-link-active {
  color: var(--color-accent);
  background: rgba(20, 184, 166, 0.12);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.update-dot {
  color: var(--color-warning);
}
</style>

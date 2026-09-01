<template>
  <aside class="app-sidebar">
    <NuxtLink to="/" class="sidebar-brand">
      <BrandLogo />
      <span class="brand-name">盗音</span>
    </NuxtLink>

    <nav class="sidebar-nav">
      <span class="nav-label">音乐库</span>
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="nav-link"
      >
        <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path v-for="(d, i) in iconPaths[item.icon]" :key="i" :d="d" />
        </svg>
        <span class="nav-text">{{ item.label }}</span>
        <span v-if="item.to === '/queue' && badge > 0" class="queue-badge">{{ badge }}</span>
      </NuxtLink>
    </nav>

    <div class="sidebar-footer">
      <div v-if="update?.hasUpdate" class="update-hint" title="有新版本可用">
        <span class="update-dot">●</span>
        <span>新版本 v{{ update.latest?.version }}</span>
      </div>
      <button v-if="requireLogin" class="btn-ghost logout-btn" @click="logout">
        <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
        退出登录
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { navItems } from '~/utils/nav'
import { useAuth } from '~/composables/useAuth'
import { useAppUpdate } from '~/composables/useAppUpdate'
import { useDownloadBadge } from '~/composables/useDownloadBadge'

const { requireLogin, logout } = useAuth()
const { update } = useAppUpdate()
const badge = useDownloadBadge()

const iconPaths: Record<string, string[]> = {
  search: ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M21 21l-4.35-4.35'],
  rank: ['M3 17l6-6 4 4 8-8', 'M14 7h7v7'],
  playlist: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
  queue: ['M12 3v12', 'M8 11l4 4 4-4', 'M4 19h16'],
  sources: ['M12 22v-5', 'M9 7V2', 'M15 7V2', 'M6 7h12v5a6 6 0 0 1-12 0V7z'],
  settings: ['M4 21v-7', 'M4 10V3', 'M12 21v-9', 'M12 8V3', 'M20 21v-5', 'M20 12V3', 'M1 14h6', 'M9 8h6', 'M17 16h6'],
}
</script>

<style scoped>
.app-sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: var(--sidebar-width);
  display: flex;
  flex-direction: column;
  background: rgba(18, 18, 22, 0.72);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-right: 1px solid var(--color-border);
  padding: 20px 14px;
  z-index: 120;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 10px 20px;
  color: var(--color-text);
}

.brand-name {
  font-size: 19px;
  font-weight: 800;
  background: var(--grad-brand);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 0.5px;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  overflow-y: auto;
}

.nav-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-faint);
  padding: 8px 12px 6px;
  font-weight: 600;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius);
  color: var(--color-text-dim);
  font-weight: 500;
  transition: background 0.15s ease, color 0.15s ease;
}

.nav-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.nav-text {
  flex: 1;
}

.nav-link:hover {
  color: var(--color-text);
  background: var(--color-bg-elev2);
}

.nav-link.router-link-active {
  color: var(--color-accent);
  background: var(--color-accent-soft);
  font-weight: 600;
}

.queue-badge {
  background: var(--color-danger);
  color: #fff;
  border-radius: 999px;
  font-size: 11px;
  min-width: 20px;
  height: 20px;
  line-height: 20px;
  text-align: center;
  padding: 0 6px;
  font-weight: 600;
}

.sidebar-footer {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.update-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--color-warning);
  padding: 0 12px;
}

.update-dot {
  font-size: 10px;
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: flex-start;
  width: 100%;
  text-align: left;
}
</style>

<template>
  <div class="app-shell">
    <AppSidebar v-if="!isAuthPage" />
    <div class="app-body" :class="{ full: isAuthPage }">
      <main class="app-main" :class="{ full: isAuthPage }">
        <NuxtPage />
      </main>
    </div>
    <AppToast />
    <PageLoading />
    <PlayerBar v-if="!isAuthPage" />
  </div>
</template>

<script setup lang="ts">
import { useClientSession } from '~/composables/useClientSession'

const route = useRoute()
const isAuthPage = computed(
  () => route.path === '/login' || route.path === '/fnos-auth-callback',
)

const { initSession } = useClientSession()
initSession()
</script>

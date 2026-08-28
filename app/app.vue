<template>
  <div class="app-shell">
    <AppHeader />
    <main class="app-main">
      <NuxtPage />
    </main>
    <AppBottomNav />
    <AppToast />
    <PageLoading />
  </div>
</template>

<script setup lang="ts">
import { useClientSession } from '~/composables/useClientSession'

const { initSession } = useClientSession()
initSession()
</script>

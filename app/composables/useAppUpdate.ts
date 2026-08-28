import type { Ref } from 'vue'

export type AppUpdateManifest = {
  version: string
  tag: string
  releasedAt: string
  changelog: string
  downloads: {
    releasePage: string
    fpk?: string
  }
}

export function useAppUpdate() {
  const update: Ref<{ current: string; hasUpdate: boolean; latest: AppUpdateManifest | null } | null> =
    useState('daoyin-app-update', () => null)

  async function check() {
    try {
      update.value = await $fetch('/api/app/update-check')
    } catch {
      update.value = null
    }
  }

  return {
    update,
    check,
  }
}

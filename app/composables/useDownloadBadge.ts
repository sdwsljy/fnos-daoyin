import { useDownloadEvents } from '~/composables/useDownloadEvents'

export function useDownloadBadge() {
  const { tasks } = useDownloadEvents()
  return computed(() => {
    return tasks.value.filter((t) => t.status === 'queued' || t.status === 'running').length
  })
}

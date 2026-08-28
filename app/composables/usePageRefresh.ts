export function usePageRefresh() {
  const router = useRouter()
  let interval: ReturnType<typeof setInterval> | null = null

  function start(ms = 10000) {
    stop()
    interval = setInterval(() => {
      router.refresh()
    }, ms)
  }

  function stop() {
    if (interval) {
      clearInterval(interval)
      interval = null
    }
  }

  return { start, stop }
}

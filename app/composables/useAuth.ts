import { useClientSession } from './useClientSession'

export function useAuth() {
  const { session, refresh } = useClientSession()
  const loggedIn = useState<boolean>('daoyin-logged-in', () => false)
  const router = useRouter()
  const toast = useToast()

  const requireLogin = computed(() => session.value?.authenticated === true)

  async function ensureInit() {
    await refresh()
  }

  async function login(password: string) {
    try {
      await $fetch('/api/auth/login', {
        method: 'POST',
        body: { password },
      })
      loggedIn.value = true
      await refresh()
      toast.success('登录成功')
      await router.push('/')
      return true
    } catch (e: any) {
      toast.error(e?.data?.statusMessage || e?.message || '登录失败')
      return false
    }
  }

  async function logout() {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      /* ignore */
    }
    loggedIn.value = false
    await refresh()
    await router.push('/login')
  }

  return {
    loggedIn,
    requireLogin,
    ensureInit,
    login,
    logout,
  }
}

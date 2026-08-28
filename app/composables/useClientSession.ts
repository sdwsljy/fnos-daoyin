export type ClientSession = {
  authenticated: boolean
  session: unknown
}

export function useClientSession() {
  const session = useState<ClientSession | null>('daoyin-client-session', () => null)

  async function refresh() {
    try {
      const data = await $fetch<ClientSession>('/api/auth/me')
      session.value = data
    } catch {
      session.value = { authenticated: false, session: null }
    }
  }

  return {
    session,
    refresh,
    initSession: refresh,
  }
}

import { useClientSession } from '~/composables/useClientSession'

export default defineNuxtRouteMiddleware(async (to) => {
  const { session, refresh } = useClientSession()
  if (!session.value) {
    await refresh()
  }
  const authenticated = session.value?.authenticated === true
  const openPages = ['/login', '/fnos-auth-callback']
  if (!authenticated && !openPages.includes(to.path)) {
    return navigateTo('/login')
  }
})

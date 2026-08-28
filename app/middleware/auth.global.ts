import { useClientSession } from '~/composables/useClientSession'

export default defineNuxtRouteMiddleware(async (to) => {
  const { session, refresh } = useClientSession()
  if (!session.value) {
    await refresh()
  }
  const requiresAuth = session.value?.authenticated === true
  const openPages = ['/login', '/fnos-auth-callback']
  if (requiresAuth && !openPages.includes(to.path)) {
    return navigateTo('/login')
  }
})

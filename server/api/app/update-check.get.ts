import { checkAppUpdate } from '~~/server/services/appUpdate'

export default defineEventHandler(async () => {
  const current = String(useRuntimeConfig().public.appVersion || '0.0.0')
  return await checkAppUpdate(current)
})

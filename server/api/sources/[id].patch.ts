import { updateSource } from '~~/server/services/sourceRegistry'

export default defineEventHandler(async (event) => {
  const id = String(getRouterParam(event, 'id') || '')
  const body = await readBody<{ enabled?: boolean; name?: string }>(event)
  return updateSource(id, {
    enabled: typeof body?.enabled === 'boolean' ? body.enabled : undefined,
    name: typeof body?.name === 'string' ? body.name : undefined,
  })
})

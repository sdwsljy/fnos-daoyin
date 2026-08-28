import { readSourceScript } from '~~/server/services/sourceRegistry'

export default defineEventHandler((event) => {
  const id = String(getRouterParam(event, 'id') || '')
  const script = readSourceScript(id)
  return { id, script }
})

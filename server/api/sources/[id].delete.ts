import { deleteSource } from '~~/server/services/sourceRegistry'

export default defineEventHandler((event) => {
  const id = String(getRouterParam(event, 'id') || '')
  return deleteSource(id)
})

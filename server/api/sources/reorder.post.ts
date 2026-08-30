import { reorderSources } from '~~/server/services/sourceRegistry'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ ids?: string[] }>(event)
  if (!Array.isArray(body?.ids) || !body.ids.length) {
    throw createError({ statusCode: 400, statusMessage: 'ids 必填' })
  }
  reorderSources(body.ids)
  return { ok: true }
})

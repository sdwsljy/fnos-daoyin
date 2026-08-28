import { deleteSource } from '~~/server/services/sourceRegistry'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ ids?: string[] }>(event)
  const ids = Array.isArray(body?.ids) ? body.ids : []
  if (!ids.length) throw createError({ statusCode: 400, statusMessage: 'ids 必填' })
  const deleted: string[] = []
  const errors: Array<{ id: string; error: string }> = []
  for (const id of ids) {
    try {
      deleteSource(id)
      deleted.push(id)
    } catch (e: any) {
      errors.push({ id, error: e?.message || String(e) })
    }
  }
  return { deleted, errors }
})

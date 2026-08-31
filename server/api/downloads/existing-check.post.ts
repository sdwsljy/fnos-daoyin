import { checkExistingLocal, type ExistingCheckItem } from '~~/server/services/downloadQueue'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ items?: ExistingCheckItem[] }>(event)
  if (!Array.isArray(body?.items) || !body.items.length) {
    return { results: [] }
  }
  return checkExistingLocal(body.items)
})

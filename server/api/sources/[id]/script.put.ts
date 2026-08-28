import { saveSourceScript } from '~~/server/services/sourceRegistry'

export default defineEventHandler(async (event) => {
  const id = String(getRouterParam(event, 'id') || '')
  const body = await readBody<{ script?: string; name?: string }>(event)
  if (!body?.script) {
    throw createError({ statusCode: 400, statusMessage: 'script 必填' })
  }
  const row = await saveSourceScript(id, { script: body.script, name: body.name })
  return { source: row }
})

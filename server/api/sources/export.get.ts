import { buildSourcesExportZip } from '~~/server/services/sourceBundle'

export default defineEventHandler((event) => {
  const q = getQuery(event)
  const ids = typeof q.ids === 'string' && q.ids ? q.ids.split(',') : undefined
  const result = buildSourcesExportZip(ids?.length ? { ids } : undefined)
  setHeader(event, 'Content-Type', 'application/zip')
  setHeader(
    event,
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(result.filename)}"`,
  )
  return result.buffer
})

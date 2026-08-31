import { cleanupDeadSources } from '~~/server/services/sourceRegistry'
import { runNdjsonBatch, wantsSourceBatchStream  } from '~~/server/utils/ndjsonStream'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const body = await readBody<{ dryRun?: boolean; stream?: boolean }>(event).catch(() => undefined)
  const dryRun = body?.dryRun === true || q.dryRun === '1' || q.dryRun === 'true'

  if (wantsSourceBatchStream(event, body?.stream)) {
    return await runNdjsonBatch(event, async (send) => {
      const result = await cleanupDeadSources(dryRun, {
        onProgress: async (p) => {
          await send({ type: 'progress', ...p })
        },
      })
      return { type: 'done', total: result.count, ...result }
    })
  }

  return await cleanupDeadSources(dryRun)
})

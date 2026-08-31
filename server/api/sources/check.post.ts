import { checkSources } from '~~/server/services/sourceRegistry'
import { runNdjsonBatch, wantsSourceBatchStream  } from '~~/server/utils/ndjsonStream'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ ids?: string[]; stream?: boolean }>(event).catch(() => undefined)
  const ids = Array.isArray(body?.ids) ? body.ids : undefined

  if (wantsSourceBatchStream(event, body?.stream)) {
    return await runNdjsonBatch(event, async (send) => {
      await send({ type: 'start', total: ids?.length || 0 })
      const result = await checkSources(ids, {
        onProgress: async (p) => {
          await send({ type: 'progress', ...p })
        },
        onLog: async (l) => {
          await send({ type: 'log', ...l })
        },
      })
      return { type: 'done', ...result }
    })
  }

  return await checkSources(ids)
})

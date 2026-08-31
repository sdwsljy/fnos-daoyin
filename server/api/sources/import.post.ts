import { runNdjsonBatch, wantsSourceBatchStream  } from '~~/server/utils/ndjsonStream'
import { importSourcesText } from '~~/server/services/sourceRegistry'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ text?: string; stream?: boolean }>(event)
  if (!body?.text) {
    throw createError({ statusCode: 400, statusMessage: 'text 必填' })
  }

  if (wantsSourceBatchStream(event, body.stream)) {
    return await runNdjsonBatch(event, async (send) => {
      await send({ type: 'start', total: 0 })
      const result = await importSourcesText(body.text!, {
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

  return await importSourcesText(body.text!)
})

import { applySourcesBundle, previewSourcesBundle } from '~~/server/services/sourceBundle'
import { runNdjsonBatch } from '~~/server/utils/ndjsonStream'
import { wantsSourceBatchStream } from '~~/server/utils/ndjsonStream'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ zip?: string; onConflict?: 'overwrite' | 'skip'; dryRun?: boolean; stream?: boolean }>(event)
  if (!body?.zip) {
    throw createError({ statusCode: 400, statusMessage: 'zip (base64) 必填' })
  }
  const buffer = Buffer.from(body.zip, 'base64')
  const onConflict = body.onConflict === 'overwrite' ? 'overwrite' : 'skip'

  if (body.dryRun) {
    return previewSourcesBundle(buffer)
  }

  if (wantsSourceBatchStream(event, body.stream)) {
    return await runNdjsonBatch(event, async (send) => {
      const result = await applySourcesBundle(buffer, onConflict, {
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

  return await applySourcesBundle(buffer, onConflict)
})

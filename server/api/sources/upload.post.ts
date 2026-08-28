import {
  addSourceFromScript,
  applySourcesFromFiles,
  previewSourcesFromFiles,
} from '~~/server/services/sourceRegistry'
import { runNdjsonBatch, wantsSourceBatchStream } from '~~/server/utils/ndjsonStream'

function formValue(form: Awaited<ReturnType<typeof readMultipartFormData>> | undefined, name: string): string {
  const part = form?.find((p) => p.name === name)
  if (!part?.data?.length) return ''
  return Buffer.from(part.data).toString('utf8').trim()
}

export default defineEventHandler(async (event) => {
  const contentType = getHeader(event, 'content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    const form = await readMultipartFormData(event)
    if (!form?.length) {
      throw createError({ statusCode: 400, statusMessage: '未收到上传文件' })
    }

    const files: Array<{ name: string; script: string }> = []
    for (const part of form) {
      if (!part.data?.length) continue
      if (part.name !== 'file' && part.name !== 'files' && part.name !== 'files[]') continue
      if (part.filename && !/\.js$/i.test(part.filename)) continue
      files.push({
        name: (part.filename || 'source.js').replace(/\.js$/i, ''),
        script: Buffer.from(part.data).toString('utf8'),
      })
    }
    if (!files.length) {
      throw createError({ statusCode: 400, statusMessage: '未找到 .js 音源文件' })
    }

    const dryRun = formValue(form, 'dryRun')
    const onConflictRaw = formValue(form, 'onConflict')
    const streamRaw = formValue(form, 'stream')
    const dryRunFlag = dryRun === 'true' || dryRun === '1'

    // 单文件且无冲突策略时直接新增（同名自动改名）
    if (files.length === 1 && !dryRunFlag && !onConflictRaw) {
      const row = await addSourceFromScript({
        name: files[0]!.name,
        script: files[0]!.script,
        renameOnConflict: true,
      })
      return { total: 1, imported: 1, renamed: 0, results: [{ ok: true, source: row }], source: row }
    }

    if (dryRunFlag) {
      return previewSourcesFromFiles(files)
    }

    if (onConflictRaw !== 'overwrite' && onConflictRaw !== 'skip') {
      throw createError({
        statusCode: 400,
        statusMessage: '批量上传需指定 onConflict=overwrite|skip，或先 dryRun 预览',
      })
    }

    if (wantsSourceBatchStream(event, streamRaw)) {
      return await runNdjsonBatch(event, async (send) => {
        const result = await applySourcesFromFiles(files, onConflictRaw, {
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
    return await applySourcesFromFiles(files, onConflictRaw)
  }

  // JSON 兼容（文本导入等场景）
  const body = await readBody<{
    files?: Array<{ name: string; script: string }>
    name?: string
    script?: string
    url?: string
    onConflict?: 'overwrite' | 'skip'
    dryRun?: boolean
    stream?: boolean
  }>(event)

  if (body?.name && body?.script) {
    return await addSourceFromScript({
      name: body.name,
      script: body.script,
      url: body.url,
      renameOnConflict: true,
    })
  }

  const files = Array.isArray(body?.files) ? body.files : []
  if (!files.length) {
    throw createError({ statusCode: 400, statusMessage: 'files 必填' })
  }
  const onConflict = body.onConflict === 'overwrite' ? 'overwrite' : 'skip'

  if (body.dryRun) {
    return previewSourcesFromFiles(files)
  }

  if (wantsSourceBatchStream(event, body.stream)) {
    return await runNdjsonBatch(event, async (send) => {
      const result = await applySourcesFromFiles(files, onConflict, {
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

  return await applySourcesFromFiles(files, onConflict)
})

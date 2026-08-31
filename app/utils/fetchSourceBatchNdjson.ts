import type { SourceLogLevel } from '#shared/sourceBatchProgress'

export type SourceBatchResult = {
  total: number
  imported?: number
  overwritten?: number
  skipped?: number
  renamed?: number
  failed?: number
  deleted?: number
  timedOut?: boolean
  results?: Array<Record<string, unknown>>
}

/** 拼上 Nuxt baseURL（飞牛网关下为 /app/daoyin/），与 $fetch 行为一致 */
function apiUrl(path: string) {
  const base = (useRuntimeConfig().app.baseURL || '/').replace(/\/?$/, '/')
  return `${base}${path.replace(/^\//, '')}`
}

export async function fetchSourceBatchNdjson(
  url: string,
  body: Record<string, unknown> | FormData,
  handlers: {
    onProgress?: (p: { index: number; total: number; name: string; status: string; error?: string }) => void
    onLog?: (l: { level: SourceLogLevel; message: string; name?: string; index?: number }) => void
    onError?: (message: string) => void
  },
): Promise<SourceBatchResult | null> {
  try {
    const isForm = body instanceof FormData
    const res = await fetch(apiUrl(url), {
      method: 'POST',
      headers: {
        Accept: 'application/x-ndjson',
        ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      },
      body: isForm ? body : JSON.stringify({ ...body, stream: true }),
    })
    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '')
      handlers.onError?.(text || `HTTP ${res.status}`)
      return null
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let doneResult: SourceBatchResult | null = null
     
    while (true) {
      const { done, value } = await reader.read()
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done })
      let idx
      while ((idx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 1)
        if (!line.trim()) continue
        try {
          const evt = JSON.parse(line)
          if (evt.type === 'progress') handlers.onProgress?.(evt)
          else if (evt.type === 'log') handlers.onLog?.(evt)
          else if (evt.type === 'done') doneResult = evt as SourceBatchResult
          else if (evt.type === 'error') handlers.onError?.(evt.message)
        } catch {
          /* ignore bad line */
        }
      }
      if (done) break
    }
    return doneResult
  } catch (e: any) {
    handlers.onError?.(e?.message || String(e))
    return null
  }
}

import { formatSourceProgressText } from '#shared/sourceBatchProgress'

export function progressText(input: { index: number; total: number; name: string; status: string }) {
  return formatSourceProgressText({
    index: input.index,
    total: input.total,
    name: input.name,
    status: input.status as Parameters<typeof formatSourceProgressText>[0]['status'],
  })
}

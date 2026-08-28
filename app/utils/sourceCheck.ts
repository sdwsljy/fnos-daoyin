import { formatSourceProgressText, SOURCE_PROGRESS_PHASE_LABEL } from '#shared/sourceBatchProgress'

export function sourcePhaseLabel(status: string) {
  return SOURCE_PROGRESS_PHASE_LABEL[status as keyof typeof SOURCE_PROGRESS_PHASE_LABEL] || status
}

export function progressText(input: { index: number; total: number; name: string; status: string }) {
  return formatSourceProgressText({
    index: input.index,
    total: input.total,
    name: input.name,
    status: input.status as Parameters<typeof formatSourceProgressText>[0]['status'],
  })
}

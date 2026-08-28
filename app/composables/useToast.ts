import type { Ref } from 'vue'

export type ToastKind = 'info' | 'success' | 'error' | 'warning'

export type ToastItem = {
  id: number
  kind: ToastKind
  message: string
}

let seq = 0

export function useToast() {
  const toasts: Ref<ToastItem[]> = useState<ToastItem[]>('daoyin-toasts', () => [])

  const push = (kind: ToastKind, message: string, ttl = 3200) => {
    const id = ++seq
    toasts.value.push({ id, kind, message })
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id)
    }, ttl)
  }

  return {
    toasts,
    push,
    info: (m: string) => push('info', m),
    success: (m: string) => push('success', m),
    error: (m: string) => push('error', m),
    warning: (m: string) => push('warning', m),
  }
}

/** 从 $fetch / ofetch 错误中提取可读文案 */
export function apiErrorMessage(err: unknown, fallback = '操作失败') {
  const e = err as any
  return (
    e?.data?.statusMessage ||
    e?.data?.message ||
    e?.statusMessage ||
    e?.message ||
    fallback
  )
}
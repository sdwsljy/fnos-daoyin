import { downloadEvents, listTasks } from '~~/server/services/downloadQueue'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Content-Type', 'text/event-stream; charset=utf-8')
  setHeader(event, 'Cache-Control', 'no-cache, no-transform')
  setHeader(event, 'Connection', 'keep-alive')
  setHeader(event, 'X-Accel-Buffering', 'no')

  const res = event.node.res
  const send = (eventName: string, data: unknown) => {
    try {
      res.write(`event: ${eventName}\n`)
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    } catch {
      /* 客户端已断开，忽略 */
    }
  }

  send('snapshot', { items: listTasks() })

  const onTask = (task: unknown) => send('task', task)
  downloadEvents.on('task', onTask)

  const heartbeat = setInterval(() => {
    try {
      res.write(`: ping ${Date.now()}\n\n`)
    } catch {
      /* ignore */
    }
  }, 15000)

  event.node.req.on('close', () => {
    clearInterval(heartbeat)
    downloadEvents.off('task', onTask)
  })

  // 保持连接
  await new Promise<void>((resolve) => {
    event.node.req.on('close', () => resolve())
  })
})

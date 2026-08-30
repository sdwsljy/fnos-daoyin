import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { mkdtempSync, rmSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let root: string
let dataDir: string
let downDir: string
let db: typeof import('../server/utils/db')
let api: typeof import('../server/services/downloadQueue')

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), 'daoyin-pending-'))
  dataDir = join(root, 'data')
  downDir = join(root, 'downloads')
  mkdirSync(downDir, { recursive: true })
  process.env.DATA_DIR = dataDir
  process.env.DOWNLOAD_DIR = downDir
  db = await import('../server/utils/db')
  api = await import('../server/services/downloadQueue')
})

async function waitWorkerIdle(timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (api.isWorkerIdle()) return
    await new Promise((r) => setTimeout(r, 100))
  }
}

afterAll(async () => {
  await waitWorkerIdle()
  try {
    db.closeDb()
  } catch {
    /* ignore */
  }
  try {
    rmSync(root, { recursive: true, force: true })
  } catch {
    /* ignore */
  }
})

beforeEach(() => {
  db.getDb().prepare('DELETE FROM download_tasks').run()
  db.getDb().prepare('DELETE FROM sources').run()
})

function seedSource(platform: string, id: string) {
  const ts = new Date().toISOString()
  db.getDb()
    .prepare(
      `INSERT INTO sources (id, name, url, mirror_url, local_path, enabled, status, platforms, created_at, updated_at)
       VALUES (?, ?, ?, NULL, NULL, 1, 'ok', ?, ?, ?)`,
    )
    .run(id, `src-${id}`, `http://src/${id}`, JSON.stringify([platform]), ts, ts)
}

describe('pending_confirm（多版本待确认）', () => {
  it('enqueuePendingConfirm 写入待确认并保留已有版本', () => {
    const t = api.enqueuePendingConfirm({
      title: '晴天',
      artist: '林俊杰',
      platform: 'wy',
      versions: [{ name: '晴天 - 周杰伦.flac', path: '/x/晴天 - 周杰伦.flac', size: 1024 }],
    })
    expect(t.status).toBe('pending_confirm')
    expect(t.file_path).toBeNull()
    const mi = JSON.parse(t.music_info_json!)
    expect(mi.__versions).toHaveLength(1)
    expect(mi.__versions[0].name).toBe('晴天 - 周杰伦.flac')
  })

  it('confirmPending 转 queued 并分配音源、可覆盖音质', () => {
    seedSource('wy', 'src-wy-1')
    const t = api.enqueuePendingConfirm({ title: '晴天', artist: '林俊杰', platform: 'wy' })
    const c = api.confirmPending(t.id, { quality: '320k' })
    expect(['queued', 'running']).toContain(c.status)
    expect(c.quality).toBe('320k')
    expect(c.source_id).toBe('src-wy-1')
  })

  it('confirmPending 仅待确认任务可确认', () => {
    seedSource('wy', 'src-wy-2')
    const t = api.enqueuePendingConfirm({ title: 'x', artist: 'y', platform: 'wy' })
    api.confirmPending(t.id)
    expect(() => api.confirmPending(t.id)).toThrow()
  })
})

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let root: string
let dataDir: string
let downDir: string
let db: typeof import('../server/utils/db')
let api: typeof import('../server/services/downloadQueue')
let settings: typeof import('../server/services/settingsService')

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), 'daoyin-mmatch-'))
  dataDir = join(root, 'data')
  downDir = join(root, 'downloads')
  process.env.DATA_DIR = dataDir
  process.env.DOWNLOAD_DIR = downDir
  db = await import('../server/utils/db')
  settings = await import('../server/services/settingsService')
  api = await import('../server/services/downloadQueue')
})

async function waitWorkerIdle(timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs
  let idleStreak = false
  while (Date.now() < deadline) {
    if (api.isWorkerIdle()) {
      if (idleStreak) return
      idleStreak = true
    } else {
      idleStreak = false
    }
    await new Promise((r) => setTimeout(r, 100))
  }
}

afterAll(async () => {
  // 等待后台 worker 收尾，避免关闭 DB 时仍有写入
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

function seedSource(platform: string, id: string) {
  const ts = new Date().toISOString()
  db.getDb()
    .prepare(
      `INSERT INTO sources (id, name, url, mirror_url, local_path, enabled, status, platforms, last_checked_at, last_error, created_at, updated_at)
       VALUES (?, ?, ?, NULL, NULL, 1, 'ok', ?, NULL, NULL, ?, ?)`,
    )
    .run(id, `src-${id}`, `http://src/${id}`, JSON.stringify([platform]), ts, ts)
}

function insertTask(patch: {
  title?: string
  artist?: string
  platform?: string
  status?: string
  externalId?: string | null
  quality?: string | null
  filePath?: string | null
  musicInfo?: Record<string, any>
}) {
  const id = `task-${Math.random().toString(36).slice(2, 10)}`
  const ts = new Date().toISOString()
  db.getDb()
    .prepare(
      `INSERT INTO download_tasks (
        id, title, artist, album, platform, source_id, quality, status, progress,
        external_id, match_method, batch_id, playlist_url, music_info_json, file_path, file_size, created_at, updated_at
      ) VALUES (?, ?, ?, NULL, ?, NULL, ?, ?, 0, ?, NULL, NULL, NULL, ?, ?, NULL, ?, ?)`,
    )
    .run(
      id,
      patch.title || '旧歌',
      patch.artist || '旧歌手',
      patch.platform || 'kw',
      patch.quality ?? null,
      patch.status || 'failed',
      patch.externalId ?? null,
      JSON.stringify(patch.musicInfo || { name: '旧歌', source: 'kw' }),
      patch.filePath || null,
      ts,
      ts,
    )
  return id
}

describe('默认命名规则（1.1.2）', () => {
  it('默认模板为 {title} - {artist}', () => {
    expect(settings.getSettings().nameTemplate).toBe('{title} - {artist}')
  })

  it('生成「歌名 - 歌手」文件名', () => {
    const base = api.applyNameTemplate('{title} - {artist}', { artist: '周杰伦', title: '晴天' })
    expect(base).toBe('晴天 - 周杰伦')
  })
})

describe('队列手动匹配', () => {
  it('failed/cancelled 任务手动匹配后重新入队（1.1.1）', () => {
    seedSource('wy', 'src-wy-1')
    const id = insertTask({
      platform: 'kw',
      status: 'cancelled',
      externalId: 'old-1',
      musicInfo: { name: '旧歌', source: 'kw', __downloadLyric: false },
    })
    const t = api.manualMatchTask(id, {
      title: '新歌',
      artist: '新歌手',
      platform: 'wy',
      externalId: 'new-1',
      musicInfo: { name: '新歌', source: 'wy' },
    })
    // kickWorker 可能已同步把任务置为 running；关键是从 cancelled 回到活动状态
    expect(['queued', 'running']).toContain(t.status)
    expect(t.title).toBe('新歌')
    expect(t.artist).toBe('新歌手')
    expect(t.platform).toBe('wy')
    expect(t.external_id).toBe('new-1')
    expect(t.match_method).toBe('manual')
    expect(t.source_id).toBe('src-wy-1')
    expect(t.quality).toBe('flac24bit')
    const mi = JSON.parse(t.music_info_json!)
    expect(mi.name).toBe('新歌')
    // 保留原任务的歌词设置
    expect(mi.__downloadLyric).toBe(false)
  })

  it('completed 任务支持手动匹配重下（1.1.2），旧文件被清理', () => {
    seedSource('kw', 'src-kw-1')
    const filePath = join(downDir, '旧歌.flac')
    writeFileSync(filePath, 'old', 'utf8')
    const id = insertTask({
      platform: 'kw',
      status: 'completed',
      filePath,
      musicInfo: { name: '旧歌', source: 'kw' },
    })
    const t = api.manualMatchTask(id, {
      title: '换歌',
      artist: '歌手B',
      platform: 'kw',
      externalId: 'new-2',
      musicInfo: { name: '换歌', source: 'kw' },
    })
    expect(['queued', 'running']).toContain(t.status)
    expect(t.title).toBe('换歌')
    expect(t.external_id).toBe('new-2')
    expect(t.match_method).toBe('manual')
    expect(t.file_path).toBeNull()
    expect(existsSync(filePath)).toBe(false)
  })

  it('进行中（queued/running）任务禁止手动匹配', () => {
    seedSource('wy', 'src-wy-2')
    const id = insertTask({ platform: 'wy', status: 'queued', musicInfo: { name: 'X', source: 'wy' } })
    expect(() =>
      api.manualMatchTask(id, {
        title: 'Y',
        artist: 'A',
        platform: 'wy',
        musicInfo: { name: 'Y', source: 'wy' },
      }),
    ).toThrow()
  })
})

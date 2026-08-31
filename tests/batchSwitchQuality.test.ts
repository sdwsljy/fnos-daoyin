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
  root = mkdtempSync(join(tmpdir(), 'daoyin-bsq-'))
  dataDir = join(root, 'data')
  downDir = join(root, 'downloads')
  mkdirSync(downDir, { recursive: true })
  process.env.DATA_DIR = dataDir
  process.env.DOWNLOAD_DIR = downDir
  db = await import('../server/utils/db')
  api = await import('../server/services/downloadQueue')
})

afterAll(async () => {
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

function insertFailed(id: string) {
  const ts = new Date().toISOString()
  db.getDb()
    .prepare(
      `INSERT INTO download_tasks (
        id, title, artist, album, platform, source_id, quality, status, progress,
        external_id, match_method, batch_id, playlist_url, music_info_json, file_path, file_size, created_at, updated_at
      ) VALUES (?, ?, ?, NULL, ?, NULL, ?, 'failed', 0, NULL, NULL, NULL, NULL, '{}', NULL, NULL, ?, ?)`,
    )
    .run(id, '晴天', '周杰伦', 'wy', 'flac', ts, ts)
}

describe('batchSwitchQuality', () => {
  it('批量换音质正常返回 items', () => {
    insertFailed('t1')
    insertFailed('t2')
    let threw: unknown = null
    let result: any = null
    try {
      result = api.batchSwitchQuality(['t1', 't2'], '320k')
    } catch (e) {
      threw = e
    }
    expect(threw).toBeNull()
    expect(result.count).toBe(2)
    expect(result.items).toHaveLength(2)
    expect(result.items[0].error).toBeUndefined()
  })
})

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let root: string
let dataDir: string
let downDir: string
let db: typeof import('../server/utils/db')
let api: typeof import('../server/services/downloadQueue')

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), 'daoyin-diff-'))
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
  api.invalidateScanCache()
  for (const f of readdirSync(downDir)) {
    try {
      rmSync(join(downDir, f), { force: true })
    } catch {
      /* ignore */
    }
  }
})

function insertTask(patch: {
  title?: string
  artist?: string
  status?: string
  quality?: string | null
  filePath?: string | null
}) {
  const id = `task-${Math.random().toString(36).slice(2, 10)}`
  const ts = new Date().toISOString()
  db.getDb()
    .prepare(
      `INSERT INTO download_tasks (
        id, title, artist, album, platform, source_id, quality, status, progress,
        external_id, match_method, batch_id, playlist_url, music_info_json, file_path, file_size, created_at, updated_at
      ) VALUES (?, ?, ?, NULL, ?, NULL, ?, ?, 0, NULL, NULL, NULL, NULL, ?, ?, NULL, ?, ?)`,
    )
    .run(
      id,
      patch.title || '晴天',
      patch.artist || '周杰伦',
      'kw',
      patch.quality ?? null,
      patch.status || 'completed',
      '{}',
      patch.filePath || null,
      ts,
      ts,
    )
  return id
}

describe('diffLocalFiles', () => {
  it('matched：记录 file_path 命中磁盘文件', () => {
    const p = join(downDir, '晴天 - 周杰伦.flac')
    writeFileSync(p, 'x')
    insertTask({ title: '晴天', artist: '周杰伦', status: 'completed', filePath: p })
    const r = api.diffLocalFiles(downDir)
    expect(r.matched).toBe(1)
    expect(r.missing).toHaveLength(0)
    expect(r.renamed).toHaveLength(0)
    expect(r.orphans).toHaveLength(0)
  })

  it('missing：记录 file_path 指向的文件不存在', () => {
    insertTask({ title: '晴天', artist: '周杰伦', status: 'completed', filePath: join(downDir, '晴天 - 周杰伦.flac') })
    const r = api.diffLocalFiles(downDir)
    expect(r.missing).toHaveLength(1)
    expect(r.missing[0].title).toBe('晴天')
    expect(r.missing[0].reason).toBe('file_deleted')
  })

  it('renamed：记录 file_path 失效但存在同名不同后缀文件', () => {
    writeFileSync(join(downDir, '晴天 - 周杰伦.mp3'), 'x')
    insertTask({ title: '晴天', artist: '周杰伦', status: 'completed', filePath: join(downDir, '晴天 - 周杰伦.flac') })
    const r = api.diffLocalFiles(downDir)
    expect(r.renamed).toHaveLength(1)
    expect(r.renamed[0].matchedFile.name).toBe('晴天 - 周杰伦.mp3')
    expect(r.missing).toHaveLength(0)
  })

  it('orphans：磁盘有文件但无任何记录', () => {
    writeFileSync(join(downDir, '孤儿歌曲.flac'), 'x')
    const r = api.diffLocalFiles(downDir)
    expect(r.orphans).toHaveLength(1)
    expect(r.orphans[0].name).toBe('孤儿歌曲.flac')
    expect(r.matched).toBe(0)
  })

  it('忽略歌词与备份文件', () => {
    writeFileSync(join(downDir, 'a.lrc'), 'x')
    writeFileSync(join(downDir, 'a.flac.daoyin-bak-xyz'), 'x')
    writeFileSync(join(downDir, 'a.flac'), 'x')
    const r = api.diffLocalFiles(downDir)
    expect(r.orphans).toHaveLength(1)
    expect(r.orphans[0].name).toBe('a.flac')
  })

  it('shared：同一文件被多条记录引用', () => {
    const p = join(downDir, '晴天 - 周杰伦.flac')
    writeFileSync(p, 'x')
    insertTask({ title: '晴天', artist: '周杰伦', status: 'completed', filePath: p })
    insertTask({ title: '晴天', artist: '周杰伦', status: 'existing', filePath: p })
    insertTask({ title: '晴天', artist: '周杰伦', status: 'existing', filePath: p })
    const r = api.diffLocalFiles(downDir)
    expect(r.totalRecords).toBe(3)
    expect(r.totalFiles).toBe(1)
    expect(r.matched).toBe(3)
    expect(r.shared).toHaveLength(1)
    expect(r.shared[0].records).toHaveLength(3)
    expect(r.missing).toHaveLength(0)
  })

  it('dedupeSharedRecords 保留 completed、删除多余记录', () => {
    const p = join(downDir, '去重 - 测试.flac')
    writeFileSync(p, 'x')
    insertTask({ title: '去重', artist: '测试', status: 'existing', filePath: p })
    insertTask({ title: '去重', artist: '测试', status: 'completed', filePath: p })
    const res = api.dedupeSharedRecords()
    expect(res.deleted).toBe(1)
    const r = api.diffLocalFiles(downDir)
    expect(r.shared).toHaveLength(0)
    expect(r.totalRecords).toBe(1)
    const remaining = api.listTasks()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].status).toBe('completed')
  })
})

describe('checkExistingLocal', () => {
  it('本地已有同名同歌手 → state exists', () => {
    writeFileSync(join(downDir, '晴天 - 周杰伦.flac'), 'x')
    const r = api.checkExistingLocal([{ title: '晴天', artist: '周杰伦' }])
    expect(r.results[0].state).toBe('exists')
    expect(r.results[0].path).toBe(join(downDir, '晴天 - 周杰伦.flac'))
  })

  it('本地没有 → state none', () => {
    const r = api.checkExistingLocal([{ title: '不存在的歌', artist: '某人' }])
    expect(r.results[0].state).toBe('none')
    expect(r.results[0].path).toBeNull()
  })

  it('宽松匹配：同名同歌手不同格式也视为已存在', () => {
    writeFileSync(join(downDir, '晴天 - 周杰伦.mp3'), 'x')
    const r = api.checkExistingLocal([{ title: '晴天', artist: '周杰伦' }])
    expect(r.results[0].state).toBe('exists')
  })

  it('同名不同歌手 → state multi_version 且列出已有版本', () => {
    writeFileSync(join(downDir, '晴天 - 林俊杰.flac'), 'x')
    const r = api.checkExistingLocal([{ title: '晴天', artist: '周杰伦' }])
    expect(r.results[0].state).toBe('multi_version')
    expect(r.results[0].versions).toHaveLength(1)
    expect(r.results[0].versions[0].name).toBe('晴天 - 林俊杰.flac')
  })
})

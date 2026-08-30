import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { classifyMissingFile } from '../server/services/downloadQueue'

let dir = ''

beforeEach(() => {
  dir = join(tmpdir(), `daoyin-missing-${randomUUID()}`)
  mkdirSync(dir, { recursive: true })
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('classifyMissingFile', () => {
  it('returns dir_missing when parent directory is gone', () => {
    expect(classifyMissingFile(join(dir, 'sub', 'a.flac'))).toBe('dir_missing')
  })

  it('returns ext_changed when same stem exists with different audio ext', () => {
    writeFileSync(join(dir, '周杰伦 - 晴天.mp3'), 'x')
    expect(classifyMissingFile(join(dir, '周杰伦 - 晴天.flac'))).toBe('ext_changed')
  })

  it('returns backup_left when a daoyin-bak remnant exists', () => {
    writeFileSync(join(dir, '周杰伦 - 晴天.flac.daoyin-bak-abc'), 'x')
    expect(classifyMissingFile(join(dir, '周杰伦 - 晴天.flac'))).toBe('backup_left')
  })

  it('returns file_deleted when nothing related remains', () => {
    writeFileSync(join(dir, '其他歌.mp3'), 'x')
    expect(classifyMissingFile(join(dir, '周杰伦 - 晴天.flac'))).toBe('file_deleted')
  })
})

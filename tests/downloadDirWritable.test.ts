import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { ensureDownloadDirWritable } from '../server/utils/downloadDir'

let dirs: string[] = []
function tempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'daoyin-dl-'))
  dirs.push(dir)
  return dir
}
afterEach(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true })
  dirs = []
})

describe('downloadDir writable', () => {
  it('succeeds on writable dir', () => {
    const dir = tempDir()
    const resolved = ensureDownloadDirWritable(dir)
    expect(resolved.endsWith('daoyin-dl-')).toBe(false)
    expect(typeof resolved).toBe('string')
  })

  it('creates missing dir recursively', () => {
    const base = tempDir()
    const nested = join(base, 'a', 'b')
    expect(() => ensureDownloadDirWritable(nested)).not.toThrow()
  })
})

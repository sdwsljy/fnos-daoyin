import { describe, it, expect, afterEach } from 'vitest'
import { writeFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { sniffAudioExt } from '../server/utils/audioSniff'

let dirs: string[] = []

function tempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'daoyin-sniff-'))
  dirs.push(dir)
  return dir
}

afterEach(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true })
  dirs = []
})

describe('audioSniff', () => {
  it('detects mp3 via ID3v2', () => {
    const dir = tempDir()
    const f = join(dir, 'a.bin')
    writeFileSync(f, Buffer.from([0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00]))
    expect(sniffAudioExt(f)).toBe('mp3')
  })

  it('detects flac magic', () => {
    const dir = tempDir()
    const f = join(dir, 'a.bin')
    writeFileSync(f, Buffer.from('fLaCxxxxxx'))
    expect(sniffAudioExt(f)).toBe('flac')
  })

  it('detects ogg and m4a', () => {
    const dir = tempDir()
    const o = join(dir, 'o.bin')
    writeFileSync(o, Buffer.from('OggS'))
    expect(sniffAudioExt(o)).toBe('ogg')
    const m = join(dir, 'm.bin')
    writeFileSync(m, Buffer.from('....ftyp'))
    expect(sniffAudioExt(m)).toBe('m4a')
  })

  it('returns null for unknown/short', () => {
    const dir = tempDir()
    const f = join(dir, 'u.bin')
    writeFileSync(f, Buffer.from([1, 2, 3]))
    expect(sniffAudioExt(f)).toBeNull()
    expect(sniffAudioExt(join(dir, 'missing.bin'))).toBeNull()
  })
})

import { describe, it, expect, afterEach } from 'vitest'
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { flacHasPictureBlock } from '../server/services/metadataService'

let dirs: string[] = []
function tempFile(name: string, buf: Buffer) {
  const dir = mkdtempSync(join(tmpdir(), 'daoyin-flac-'))
  dirs.push(dir)
  const f = join(dir, name)
  writeFileSync(f, buf)
  return f
}
afterEach(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true })
  dirs = []
})

describe('flacHasPictureBlock', () => {
  it('detects PICTURE metadata block', () => {
    // fLaC + 一个 type=6 PICTURE block（size=16）
    const header = Buffer.from([0x06, 0x00, 0x00, 0x10])
    const body = Buffer.alloc(16)
    const file = tempFile('with-pic.flac', Buffer.concat([Buffer.from('fLaC'), header, body]))
    expect(flacHasPictureBlock(file)).toBe(true)
  })

  it('returns false without PICTURE block', () => {
    // fLaC + 一个 type=0 STREAMINFO block（size=16，非 last）
    const header = Buffer.from([0x00, 0x00, 0x00, 0x10])
    const body = Buffer.alloc(16)
    const file = tempFile('no-pic.flac', Buffer.concat([Buffer.from('fLaC'), header, body]))
    expect(flacHasPictureBlock(file)).toBe(false)
  })

  it('returns false for non-flac', () => {
    const file = tempFile('x.mp3', Buffer.from('ID3\x03\x00\x00\x00\x00\x00\x00'))
    expect(flacHasPictureBlock(file)).toBe(false)
  })
})

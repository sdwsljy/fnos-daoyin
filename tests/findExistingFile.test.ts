import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { findExistingFile } from '../server/services/downloadQueue'

let dir = ''

beforeEach(() => {
  dir = join(tmpdir(), `daoyin-exist-${randomUUID()}`)
  mkdirSync(dir, { recursive: true })
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('findExistingFile', () => {
  it('finds existing flac by name template', () => {
    writeFileSync(join(dir, '周杰伦 - 晴天.flac'), 'x')
    const hit = findExistingFile({
      nameTemplate: '{artist} - {title}',
      artist: '周杰伦',
      title: '晴天',
      downloadDir: dir,
    })
    expect(hit).toBe(join(dir, '周杰伦 - 晴天.flac'))
  })

  it('finds existing mp3 by name template', () => {
    writeFileSync(join(dir, 'artist - song.mp3'), 'x')
    const hit = findExistingFile({
      nameTemplate: '{artist} - {title}',
      artist: 'artist',
      title: 'song',
      downloadDir: dir,
    })
    expect(hit).toBe(join(dir, 'artist - song.mp3'))
  })

  it('returns null when not exists', () => {
    const hit = findExistingFile({
      nameTemplate: '{artist} - {title}',
      artist: '周杰伦',
      title: '不存在的歌',
      downloadDir: dir,
    })
    expect(hit).toBeNull()
  })

  it('treats all common audio extensions when quality unknown', () => {
    writeFileSync(join(dir, 'a - b.m4a'), 'x')
    const hit = findExistingFile({
      nameTemplate: '{artist} - {title}',
      artist: 'a',
      title: 'b',
      downloadDir: dir,
    })
    expect(hit).toBe(join(dir, 'a - b.m4a'))
  })

  it('does NOT treat mp3 as existing when requesting flac', () => {
    writeFileSync(join(dir, '周杰伦 - 晴天.mp3'), 'x')
    const hit = findExistingFile({
      nameTemplate: '{artist} - {title}',
      artist: '周杰伦',
      title: '晴天',
      quality: 'flac',
      downloadDir: dir,
    })
    expect(hit).toBeNull()
  })

  it('treats flac as existing when requesting flac', () => {
    writeFileSync(join(dir, '周杰伦 - 晴天.flac'), 'x')
    const hit = findExistingFile({
      nameTemplate: '{artist} - {title}',
      artist: '周杰伦',
      title: '晴天',
      quality: 'flac24bit',
      downloadDir: dir,
    })
    expect(hit).toBe(join(dir, '周杰伦 - 晴天.flac'))
  })

  it('treats mp3 as existing when requesting 320k', () => {
    writeFileSync(join(dir, '周杰伦 - 晴天.mp3'), 'x')
    const hit = findExistingFile({
      nameTemplate: '{artist} - {title}',
      artist: '周杰伦',
      title: '晴天',
      quality: '320k',
      downloadDir: dir,
    })
    expect(hit).toBe(join(dir, '周杰伦 - 晴天.mp3'))
  })

  it('does NOT treat same title with different artist as existing', () => {
    writeFileSync(join(dir, '晴天 - 林俊杰.flac'), 'x')
    const hit = findExistingFile({
      nameTemplate: '{title} - {artist}',
      artist: '周杰伦',
      title: '晴天',
      downloadDir: dir,
    })
    expect(hit).toBeNull()
  })
})

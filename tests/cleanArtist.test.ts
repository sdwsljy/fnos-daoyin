import { describe, it, expect } from 'vitest'
import { cleanArtist, parseLooseJson } from '../server/services/platformSearch'

describe('cleanArtist', () => {
  it('strips trailing junk', () => {
    expect(cleanArtist('周杰伦- / A-LNK')).toBe('周杰伦')
    expect(cleanArtist('周杰伦 - / A-LNK')).toBe('周杰伦')
  })

  it('normalizes separators', () => {
    expect(cleanArtist('A / B')).toBe('A / B')
    expect(cleanArtist('  A  /  B  ')).toBe('A / B')
  })

  it('falls back to unknown', () => {
    expect(cleanArtist('')).toBe('未知')
    expect(cleanArtist('   ')).toBe('未知')
  })
})

describe('parseLooseJson', () => {
  it('parses strict json', () => {
    expect(parseLooseJson('{"a":1}')).toEqual({ a: 1 })
  })

  it('parses single-quoted pseudo json', () => {
    expect(parseLooseJson("{'a':'b'}")).toEqual({ a: 'b' })
  })

  it('parses jsonp wrapper', () => {
    expect(parseLooseJson('callback({"a":1})')).toEqual({ a: 1 })
  })

  it('parses try{var jsondata=...} wrapper', () => {
    expect(parseLooseJson('try{var jsondata={"a":1};}catch(e){}')).toEqual({ a: 1 })
  })

  it('throws on garbage', () => {
    expect(() => parseLooseJson('not json at all')).toThrow()
    expect(() => parseLooseJson('')).toThrow()
  })
})

import { describe, it, expect } from 'vitest'
import { applyNameTemplate } from '../server/services/downloadQueue'
import { mergeBilingualLyrics, splitKuwoLrcList, parseLrcLines } from '../server/services/lyricService'

describe('name template', () => {
  it('fills placeholders', () => {
    expect(
      applyNameTemplate('{artist} - {title}', {
        artist: 'A',
        title: 'B',
      }),
    ).toBe('A - B')
  })

  it('replaces illegal filename chars', () => {
    expect(
      applyNameTemplate('{title} {artist}', {
        title: 'a/b:c*?',
        artist: 'x',
      }),
    ).toBe('a_b_c__ x')
  })

  it('handles unknown artist/title', () => {
    expect(applyNameTemplate('{artist}/{title}', { artist: '', title: '' })).toBe('未知_未知')
  })

  it('fills track/id', () => {
    expect(
      applyNameTemplate('{id}-{track}', {
        id: 'abc',
        track: 3,
        artist: 'a',
        title: 't',
      }),
    ).toBe('abc-3')
  })
})

describe('lyric merge', () => {
  it('merges bilingual lyrics by timestamp', () => {
    const orig = '[00:01.00]hello\n[00:02.00]world'
    const trans = '[00:01.00]你好\n[00:02.00]世界'
    const merged = mergeBilingualLyrics(orig, trans)
    expect(merged).toContain('[00:01.00]hello')
    expect(merged).toContain('[00:01.00]你好')
    expect(merged).toContain('[00:02.00]world')
  })

  it('returns original when no translation', () => {
    expect(mergeBilingualLyrics('[00:01.00]hi', '')).toBe('[00:01.00]hi')
  })

  it('splits kuwo repeated timestamps', () => {
    const list = [
      { time: '00:01', lineLyric: 'a' },
      { time: '00:02', lineLyric: 'b' },
      { time: '00:01', lineLyric: 'A' },
    ]
    const { lyric, tlyric } = splitKuwoLrcList(list)
    expect(lyric).toContain('[00:01]a')
    expect(tlyric).toContain('[00:01]A')
  })

  it('parses lrc lines', () => {
    const lines = parseLrcLines('[00:01.00]a\nplain line\n[00:02.00]b')
    expect(lines).toHaveLength(3)
    expect(lines[0]!.time).toBe('00:01.00')
    expect(lines[1]!.time).toBe('')
  })
})

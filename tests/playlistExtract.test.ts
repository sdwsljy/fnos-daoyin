import { describe, it, expect } from 'vitest'
import {
  extractNeteasePlaylistId,
  extractQqPlaylistId,
  extractKugouPlaylistId,
} from '../server/services/playlistService'

describe('netease playlist id extraction', () => {
  it('extracts from pc url', () => {
    expect(extractNeteasePlaylistId('https://music.163.com/playlist?id=1234567&userid=1')).toBe('1234567')
  })

  it('extracts from hash route', () => {
    expect(extractNeteasePlaylistId('https://music.163.com/#/playlist?id=1234567')).toBe('1234567')
  })

  it('extracts from path form', () => {
    expect(extractNeteasePlaylistId('https://music.163.com/playlist/1234567')).toBe('1234567')
  })

  it('accepts plain digits', () => {
    expect(extractNeteasePlaylistId('1234567')).toBe('1234567')
  })

  it('rejects qq links', () => {
    expect(extractNeteasePlaylistId('https://y.qq.com/playlist?id=1234567')).toBeNull()
  })
})

describe('qq playlist id extraction', () => {
  it('extracts from playlist path', () => {
    expect(extractQqPlaylistId('https://y.qq.com/n/ryqq/playlist/7654321')).toBe('7654321')
  })

  it('extracts from query param', () => {
    expect(extractQqPlaylistId('https://i.y.qq.com/v8/playsquare.html?id=7654321')).toBe('7654321')
  })

  it('extracts disstid', () => {
    expect(extractQqPlaylistId('https://y.qq.com/n/yqq/playlist.html#disstid=7654321')).toBe('7654321')
  })

  it('accepts long digit string', () => {
    expect(extractQqPlaylistId('7654321')).toBe('7654321')
  })
})

describe('kugou playlist id extraction', () => {
  it('extracts special/single', () => {
    expect(extractKugouPlaylistId('https://www.kugou.com/yy/special/single/998877.html')).toBe('998877')
  })

  it('extracts mobile plist', () => {
    expect(extractKugouPlaylistId('https://m.kugou.com/plist/list/998877')).toBe('998877')
  })

  it('extracts specialid query', () => {
    expect(extractKugouPlaylistId('https://www.kugou.com/yy/special/single.html?specialid=998877')).toBe('998877')
  })

  it('accepts plain digits', () => {
    expect(extractKugouPlaylistId('998877')).toBe('998877')
  })
})

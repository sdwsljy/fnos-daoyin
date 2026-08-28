import { describe, it, expect } from 'vitest'
import { cleanSourceName, parseSourceText, allocateUniqueName } from '../server/services/sourceImport'

describe('cleanSourceName', () => {
  it('strips wrappers and separators', () => {
    expect(cleanSourceName('【花】')).toBe('花')
    expect(cleanSourceName('- 花 -')).toBe('花')
    expect(cleanSourceName('「花」')).toBe('花')
  })

  it('returns unnamed for empty', () => {
    expect(cleanSourceName('')).toBe('unnamed')
    expect(cleanSourceName('---')).toBe('unnamed')
  })
})

describe('parseSourceText', () => {
  it('parses name + url pairs', () => {
    const text = '花\nhttps://example.com/huabao.js\nLx\nhttps://example.com/lx.js'
    const parsed = parseSourceText(text)
    expect(parsed).toHaveLength(2)
    expect(parsed[0]!.name).toBe('花')
    expect(parsed[0]!.url).toBe('https://example.com/huabao.js')
  })

  it('parses inline name + url', () => {
    const parsed = parseSourceText('花：https://example.com/hua.js')
    expect(parsed[0]!.name).toBe('花')
    expect(parsed[0]!.url).toBe('https://example.com/hua.js')
  })

  it('deduplicates urls', () => {
    const parsed = parseSourceText('https://a.com/x.js\nhttps://a.com/x.js')
    expect(parsed).toHaveLength(1)
  })

  it('skips advertisement hints', () => {
    const parsed = parseSourceText('更多资源请关注公众号\nhttps://a.com/x.js')
    expect(parsed).toHaveLength(1)
  })

  it('returns empty for no urls', () => {
    expect(parseSourceText('nothing here')).toHaveLength(0)
  })
})

describe('allocateUniqueName', () => {
  it('appends (2), (3)...', () => {
    const taken = new Set(['花'])
    expect(allocateUniqueName('花', taken)).toBe('花 (2)')
    taken.add('花 (2)')
    expect(allocateUniqueName('花', taken)).toBe('花 (3)')
  })

  it('keeps unique name', () => {
    expect(allocateUniqueName('花', new Set<string>())).toBe('花')
  })
})

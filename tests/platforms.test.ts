import { describe, it, expect } from 'vitest'
import { PLATFORM_DISPLAY, isPlatformId, platformLabel, platformListText } from '../shared/platforms'

describe('platforms', () => {
  it('defines five platforms', () => {
    expect(Object.keys(PLATFORM_DISPLAY)).toEqual(['wy', 'kw', 'kg', 'tx', 'mg'])
  })

  it('isPlatformId guards', () => {
    expect(isPlatformId('wy')).toBe(true)
    expect(isPlatformId('foo')).toBe(false)
  })

  it('labels known platforms', () => {
    expect(platformLabel('wy')).toBe('网易云')
    expect(platformLabel('nope')).toBe('nope')
  })

  it('joins platform text', () => {
    expect(platformListText(['wy', 'tx'])).toBe('网易云 / QQ音乐')
  })
})

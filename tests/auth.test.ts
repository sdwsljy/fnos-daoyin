import { describe, it, expect } from 'vitest'
import { createSessionToken, verifySession, safeEqualString } from '../server/utils/crypto'

describe('session crypto', () => {
  it('round-trips token', () => {
    const token = createSessionToken('secret')
    expect(verifySession(token, 'secret')).not.toBeNull()
  })

  it('rejects wrong secret', () => {
    const token = createSessionToken('secret')
    expect(verifySession(token, 'other')).toBeNull()
  })

  it('rejects tampered payload', () => {
    const token = createSessionToken('secret')
    const [payload, sig] = token.split('.')
    const tampered = `${Buffer.from('{"exp":9999999999999}').toString('base64url')}.${sig}`
    expect(verifySession(tampered, 'secret')).toBeNull()
  })

  it('rejects garbage', () => {
    expect(verifySession('', 'secret')).toBeNull()
    expect(verifySession('a.b', 'secret')).toBeNull()
  })

  it('safeEqualString constant time compare', () => {
    expect(safeEqualString('abc', 'abc')).toBe(true)
    expect(safeEqualString('abc', 'abd')).toBe(false)
    expect(safeEqualString('abc', 'abcd')).toBe(false)
  })
})

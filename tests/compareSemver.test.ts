import { describe, it, expect } from 'vitest'
import { parseSemver, compareSemver, isNewerVersion } from '../shared/appUpdate'

describe('semver helpers', () => {
  it('parses core versions', () => {
    expect(parseSemver('1.2.3')).toEqual([1, 2, 3])
    expect(parseSemver('v2.0.1')).toEqual([2, 0, 1])
    expect(parseSemver('garbage')).toBeNull()
  })

  it('compares versions', () => {
    expect(compareSemver('1.0.0', '0.9.9')).toBe(1)
    expect(compareSemver('1.0.0', '1.0.0')).toBe(0)
    expect(compareSemver('0.9.0', '1.0.0')).toBe(-1)
  })

  it('detects newer', () => {
    expect(isNewerVersion('1.1.0', '1.0.0')).toBe(true)
    expect(isNewerVersion('1.0.0', '1.1.0')).toBe(false)
  })
})

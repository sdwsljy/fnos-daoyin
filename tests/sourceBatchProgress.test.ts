import { describe, it, expect } from 'vitest'
import { sourceBatchTimeoutMs, formatSourceProgressText } from '../shared/sourceBatchProgress'

describe('source batch progress', () => {
  it('caps batch timeout at 5 minutes', () => {
    expect(sourceBatchTimeoutMs(100)).toBe(5 * 60 * 1000)
    expect(sourceBatchTimeoutMs(2)).toBe(60_000)
  })

  it('formats progress text', () => {
    expect(formatSourceProgressText({ index: 1, total: 3, name: '花', status: 'checking' })).toContain('1/3')
    expect(formatSourceProgressText({ index: 1, total: 3, name: '花', status: 'checking' })).toContain('花')
  })
})

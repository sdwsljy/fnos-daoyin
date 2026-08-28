import { describe, it, expect } from 'vitest'
import { QUALITY_LADDER, buildQualityAttempts, buildGlobalQualityLadder, isHighestQuality, pickQuality, isLosslessUrlActuallyMp3 } from '../server/services/musicUrlResolve'

describe('musicUrlResolve helpers', () => {
  it('has correct quality ladder', () => {
    expect(QUALITY_LADDER).toEqual(['flac24bit', 'flac', '320k', '192k', '128k'])
  })

  it('isHighestQuality treats empty/highest as true', () => {
    expect(isHighestQuality('')).toBe(true)
    expect(isHighestQuality('highest')).toBe(true)
    expect(isHighestQuality('flac')).toBe(false)
  })

  it('builds quality attempts descending for highest', () => {
    expect(buildQualityAttempts(['128k', '320k', 'flac'], 'highest')).toEqual(['flac', '320k', '128k'])
    expect(buildQualityAttempts(['128k'], 'highest')).toEqual(['128k'])
  })

  it('builds single attempt for fixed quality', () => {
    expect(buildQualityAttempts(['128k', '320k'], 'flac')).toEqual(['flac'])
  })

  it('builds global ladder from union', () => {
    expect(buildGlobalQualityLadder('highest', [['128k', '320k'], ['flac']])).toEqual(['flac', '320k', '128k'])
    expect(buildGlobalQualityLadder('320k', [['128k'], ['flac']])).toEqual(['320k'])
  })

  it('picks best available', () => {
    expect(pickQuality(['128k', '320k'], 'highest')).toBe('320k')
    expect(pickQuality(['128k', '320k'], 'flac')).toBe('flac')
  })

  it('detects mp3 URL when requesting lossless', () => {
    expect(isLosslessUrlActuallyMp3('flac', 'https://cdn/x.mp3')).toBe(true)
    expect(isLosslessUrlActuallyMp3('flac', 'https://cdn/x.mp3?sign=1')).toBe(true)
    expect(isLosslessUrlActuallyMp3('flac24bit', 'https://cdn/x.mp3')).toBe(true)
    expect(isLosslessUrlActuallyMp3('flac', 'https://cdn/x.flac')).toBe(false)
    expect(isLosslessUrlActuallyMp3('flac', 'https://cdn/x')).toBe(false)
    expect(isLosslessUrlActuallyMp3('320k', 'https://cdn/x.mp3')).toBe(false)
  })
})

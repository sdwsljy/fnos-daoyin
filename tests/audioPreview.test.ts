import { describe, it, expect } from 'vitest'
import {
  parseIntervalToSeconds,
  expectedDurationFromMusicInfo,
  isLikelyPreviewClip,
  isLikelyPreviewByAbsoluteDuration,
  isLikelyPreviewUrl,
  minFullTrackBytes,
} from '../server/utils/audioPreview'

describe('interval parsing', () => {
  it('parses mm:ss and hh:mm:ss', () => {
    expect(parseIntervalToSeconds('4:28')).toBe(268)
    expect(parseIntervalToSeconds('1:02:03')).toBe(3723)
  })

  it('parses seconds and millis', () => {
    expect(parseIntervalToSeconds(268)).toBe(268)
    expect(parseIntervalToSeconds(268000)).toBe(268)
    expect(parseIntervalToSeconds('268')).toBe(268)
  })

  it('returns null for garbage', () => {
    expect(parseIntervalToSeconds('abc')).toBeNull()
    expect(parseIntervalToSeconds('')).toBeNull()
  })
})

describe('expected duration from music info', () => {
  it('reads interval first', () => {
    expect(expectedDurationFromMusicInfo({ interval: '4:28', duration: 999 })).toBe(268)
  })

  it('falls back to duration/dt', () => {
    expect(expectedDurationFromMusicInfo({ duration: '3:00' })).toBe(180)
    expect(expectedDurationFromMusicInfo({ dt: 240000 })).toBe(240)
  })
})

describe('preview detection', () => {
  it('flags short clip relative to expected', () => {
    expect(isLikelyPreviewClip(30, 240)).toBe(true)
  })

  it('flags 60s clip for long track', () => {
    expect(isLikelyPreviewClip(60, 240)).toBe(true)
  })

  it('accepts full track', () => {
    expect(isLikelyPreviewClip(238, 240)).toBe(false)
  })

  it('absolute duration fallback', () => {
    expect(isLikelyPreviewByAbsoluteDuration(60, 1_000_000)).toBe(true)
    expect(isLikelyPreviewByAbsoluteDuration(60, 20_000_000)).toBe(false)
  })

  it('detects preview urls', () => {
    expect(isLikelyPreviewUrl('https://a.com/preview/1.mp3')).toBe(true)
    expect(isLikelyPreviewUrl('https://a.com/trial?id=1')).toBe(true)
    expect(isLikelyPreviewUrl('https://a.com/song/1.mp3')).toBe(false)
  })

  it('computes min track bytes', () => {
    expect(minFullTrackBytes(240, '128k')).toBeGreaterThan(0)
    expect(minFullTrackBytes(240, 'flac')).toBeGreaterThan(minFullTrackBytes(240, '128k'))
  })
})

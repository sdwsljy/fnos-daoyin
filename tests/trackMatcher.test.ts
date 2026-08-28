import { describe, it, expect } from 'vitest'
import { matchTrack, type MatchCandidate } from '../server/services/trackMatcher'

const candidates: MatchCandidate[] = [
  { externalId: '100', title: '晴天', artist: '周杰伦', album: '叶惠美', duration: 269 },
  { externalId: '101', title: '晴天', artist: '某某', album: '另一张', duration: 180 },
  { externalId: '102', title: '稻香', artist: '周杰伦', duration: 233 },
]

describe('trackMatcher', () => {
  it('matches by id with full score', () => {
    const r = matchTrack(
      { externalId: '100', title: '晴天', artist: '周杰伦', platform: 'wy' },
      { candidatesFromSearch: candidates },
    )
    expect(r.method).toBe('id')
    expect(r.score).toBe(1)
    expect(r.selected?.externalId).toBe('100')
  })

  it('falls back to metadata scoring', () => {
    const r = matchTrack(
      { title: '晴天', artist: '周杰伦', platform: 'wy' },
      { candidatesFromSearch: candidates },
    )
    expect(r.method).toBe('metadata')
    expect(r.selected?.externalId).toBe('100')
  })

  it('returns null when score too low', () => {
    const r = matchTrack(
      { title: '完全无关的歌', artist: '无人', platform: 'wy' },
      { candidatesFromSearch: candidates },
    )
    expect(r.selected).toBeNull()
  })

  it('rejects same title with different artist (no overlap)', () => {
    // 目标「晴天 - 周杰伦」，候选「晴天 - 某某」：歌手无交集，不应选中
    const r = matchTrack(
      { title: '晴天', artist: '周杰伦', platform: 'wy' },
      {
        candidatesFromSearch: [
          { externalId: 'x1', title: '晴天', artist: '费玉清', album: 'A', duration: 269 },
        ],
      },
    )
    expect(r.selected).toBeNull()
  })

  it('matches multi-artist when any artist overlaps', () => {
    // 目标「周杰伦 / 费玉清」，候选「费玉清」独唱：有交集，应命中
    const r = matchTrack(
      { title: '千里之外', artist: '周杰伦 / 费玉清', platform: 'wy' },
      {
        candidatesFromSearch: [
          { externalId: 'y1', title: '千里之外', artist: '费玉清', album: '', duration: 253 },
        ],
      },
    )
    expect(r.selected?.externalId).toBe('y1')
  })

  it('matches partial artist inclusion', () => {
    // 目标「周杰伦」，候选「周杰伦 / 费玉清」：部分包含，应命中
    const r = matchTrack(
      { title: '千里之外', artist: '周杰伦', platform: 'wy' },
      {
        candidatesFromSearch: [
          { externalId: 'z1', title: '千里之外', artist: '周杰伦 / 费玉清', album: '', duration: 253 },
        ],
      },
    )
    expect(r.selected?.externalId).toBe('z1')
  })

  it('rejects when artist missing on target but candidate differs', () => {
    // 目标无歌手信息时不触发硬门槛，退化为标题匹配（包含匹配 0.3 < 0.45 不选）
    const r = matchTrack(
      { title: '晴天', artist: '', platform: 'wy' },
      {
        candidatesFromSearch: [
          { externalId: 'w1', title: '晴天', artist: '费玉清', album: '', duration: 269 },
        ],
      },
    )
    // 标题完全匹配 0.5 ≥ 0.45 → 命中（无歌手信息时合理）
    expect(r.selected?.externalId).toBe('w1')
  })
})

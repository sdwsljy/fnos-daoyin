import { describe, it, expect, vi, beforeEach } from 'vitest'

// mock searchPlatform 以隔离网络
vi.mock('../server/services/platformSearch', () => ({
  searchPlatform: vi.fn(),
}))

import { searchPlatform } from '../server/services/platformSearch'
import { matchPlaylistTracks } from '../server/services/playlistService'

const mockSearchPlatform = searchPlatform as unknown as ReturnType<typeof vi.fn>

function track(over: Record<string, unknown> = {}) {
  return {
    externalId: 'wy:100',
    title: '晴天',
    artist: '周杰伦',
    platform: 'wy',
    ...over,
  }
}

beforeEach(() => {
  mockSearchPlatform.mockReset()
})

describe('playlist cross-platform matching', () => {
  it('uses primary platform when hit found', async () => {
    mockSearchPlatform.mockImplementation(async (platform: string) => {
      if (platform === 'wy') {
        return [{ externalId: '100', title: '晴天', artist: '周杰伦', album: '', duration: 269, platform: 'wy', qualitys: [], musicInfo: { name: '晴天', source: 'wy' } }]
      }
      return []
    })
    const rows = await matchPlaylistTracks([track()])
    expect(rows[0]!.crossPlatform).toBe(false)
    expect(rows[0]!.matchPlatform).toBe('wy')
    expect(rows[0]!.needsConfirm).toBe(false)
    expect(rows[0]!.track.musicInfo?.source).toBe('wy')
  })

  it('falls back to another platform when primary has no hit', async () => {
    mockSearchPlatform.mockImplementation(async (platform: string) => {
      if (platform === 'tx') {
        return [{ externalId: 'tx:55', title: '晴天', artist: '周杰伦', album: '', duration: 269, platform: 'tx', qualitys: [], musicInfo: { name: '晴天', source: 'tx' } }]
      }
      return []
    })
    const rows = await matchPlaylistTracks([track()])
    expect(rows[0]!.crossPlatform).toBe(true)
    expect(rows[0]!.matchPlatform).toBe('tx')
    expect(rows[0]!.needsConfirm).toBe(false)
    // musicInfo 已合并进 track，且 platform 更新为命中平台
    expect(rows[0]!.track.platform).toBe('tx')
    expect(rows[0]!.track.musicInfo?.source).toBe('tx')
  })

  it('keeps needsConfirm when no platform matches', async () => {
    mockSearchPlatform.mockResolvedValue([])
    const rows = await matchPlaylistTracks([track()])
    expect(rows[0]!.needsConfirm).toBe(true)
    expect(rows[0]!.crossPlatform).toBe(false)
  })

  it('prefers primary even when cross has slightly higher', async () => {
    // 原平台有命中即返回，不跨平台
    mockSearchPlatform.mockImplementation(async (platform: string) => {
      if (platform === 'wy') {
        return [{ externalId: '100', title: '晴天', artist: '周杰伦', album: '', duration: 269, platform: 'wy', qualitys: [], musicInfo: { name: '晴天', source: 'wy' } }]
      }
      return []
    })
    const rows = await matchPlaylistTracks([track()])
    expect(rows[0]!.crossPlatform).toBe(false)
    expect(rows[0]!.matchPlatform).toBe('wy')
  })

  it('searches all platforms even when primary has a low-score hit', async () => {
    // 原平台低分命中（歌手不符仅标题匹配），另一平台高分命中 → 应选另一平台
    mockSearchPlatform.mockImplementation(async (platform: string) => {
      if (platform === 'wy') {
        // 歌手不符 → scoreMeta 返回 0 → 不命中，仅标题相同
        return [{ externalId: 'wy-low', title: '晴天', artist: '某某', album: '', duration: 180, platform: 'wy', qualitys: [], musicInfo: { name: '晴天', source: 'wy' } }]
      }
      if (platform === 'tx') {
        // 歌手正确 → 高分命中
        return [{ externalId: 'tx-best', title: '晴天', artist: '周杰伦', album: '叶惠美', duration: 269, platform: 'tx', qualitys: [], musicInfo: { name: '晴天', source: 'tx' } }]
      }
      return []
    })
    const rows = await matchPlaylistTracks([track()])
    expect(rows[0]!.crossPlatform).toBe(true)
    expect(rows[0]!.matchPlatform).toBe('tx')
    expect(rows[0]!.track.musicInfo?.source).toBe('tx')
  })
})

import { parseLooseJson } from './platformSearch'
import { parsePlaylistById, type PlaylistTrackDraft } from './playlistService'

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export type PlaylistBoard = {
  id: string
  name: string
  cover?: string
  count?: number
  playCount?: number
  collectCount?: number
  creator?: string
}

export type PlaylistBoardTrack = {
  title: string
  artist: string
  album: string
  duration: number
  externalId: string
  musicInfo: Record<string, any>
}

async function fetchText(url: string, init?: RequestInit, timeoutMs = 15000): Promise<string> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { 'User-Agent': UA, ...(init?.headers || {}) },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(t)
  }
}

async function fetchJson(url: string, init?: RequestInit, timeoutMs = 15000): Promise<any> {
  return parseLooseJson(await fetchText(url, init, timeoutMs))
}

function formatInterval(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function trackToMusicInfo(track: PlaylistTrackDraft): Record<string, any> {
  const ext = track.externalId || ''
  return {
    name: track.title,
    singer: track.artist,
    albumName: track.album || '',
    songmid: ext,
    hash: ext,
    source: track.platform,
    interval: track.duration ? formatInterval(track.duration) : undefined,
  }
}

const PAGE_SIZE = 30

/* ---------------- 网易云歌单 ---------------- */

async function listWyBoards(): Promise<PlaylistBoard[]> {
  const data = await fetchJson(
    'https://music.163.com/api/playlist/highquality/list?cat=%E5%85%A8%E9%83%A8&limit=30',
    { headers: { Referer: 'https://music.163.com/' } },
  )
  const list = data?.playlists || []
  return list
    .map((p: any) => ({
      id: String(p.id),
      name: String(p.name || '').trim(),
      cover: p.coverImgUrl || undefined,
      count: Number(p.trackCount || 0),
      playCount: Number(p.playCount || 0),
      collectCount: Number(p.subscribedCount || 0),
      creator: p.creator?.nickname || undefined,
    }))
    .filter((b: PlaylistBoard) => b.id && b.name)
}

/* ---------------- QQ 歌单 ---------------- */

async function listTxBoards(): Promise<PlaylistBoard[]> {
  // 按分类获取歌单（categoryId=10000000 全部）；需指定 UTF-8，否则 dissname 返回 GBK 乱码
  const data = await fetchJson(
    'https://c.y.qq.com/splcloud/fcgi-bin/fcg_get_diss_by_tag.fcg?categoryId=10000000&sortId=5&sin=0&ein=30&format=json&inCharset=utf-8&outCharset=utf-8',
    { headers: { Referer: 'https://y.qq.com/' } },
  )
  const list = data?.data?.list || []
  const boards: PlaylistBoard[] = list
    .map((p: any) => ({
      id: String(p.dissid),
      name: String(p.dissname || '').trim(),
      cover: p.imgurl || undefined,
      playCount: Number(p.listennum || 0),
      creator: p.creator?.name || undefined,
    }))
    .filter((b) => b.id && b.name)

  // 列表接口无歌曲数，通过 musicu 批量补 songnum
  if (boards.length) {
    const body: Record<string, any> = { comm: { ct: 24, cv: 0 } }
    boards.forEach((b, i) => {
      body[`req_${i}`] = {
        module: 'music.srfDissInfo.aiDissInfo',
        method: 'uniform_get_Dissinfo',
        param: { disstid: Number(b.id), userinfo: 0, tag: 0, song_begin: 0, song_num: 0 },
      }
    })
    try {
      const detail = await fetchJson(
        'https://u.y.qq.com/cgi-bin/musicu.fcg',
        {
          method: 'POST',
          headers: { Referer: 'https://y.qq.com/', 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
        20000,
      )
      boards.forEach((b, i) => {
        const songnum = detail?.[`req_${i}`]?.data?.dirinfo?.songnum
        if (songnum) b.count = Number(songnum)
      })
    } catch {
      /* 歌曲数获取失败不影响歌单列表 */
    }
  }
  return boards
}

/* ---------------- 酷狗歌单 ---------------- */

async function listKgBoards(): Promise<PlaylistBoard[]> {
  // 移动端歌单广场 JSON 接口（API v3 playlist/list 已被反爬）
  const data = await fetchJson('http://m.kugou.com/plist/index?json=true', {
    headers: {
      Referer: 'http://m.kugou.com/',
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    },
  })
  const list = data?.plist?.list?.info || []
  return list
    .map((p: any) => ({
      id: String(p.specialid),
      name: String(p.specialname || '').trim(),
      cover: p.imgurl ? String(p.imgurl).replace('{size}', '240') : undefined,
      count: Number(p.songcount || 0),
      playCount: Number(p.playcount || 0),
      collectCount: Number(p.collectcount || 0),
      creator: p.username || undefined,
    }))
    .filter((b: PlaylistBoard) => b.id && b.name)
}

/* ---------------- 缓存 ---------------- */

const TTL_MS = 10 * 60 * 1000
const CACHE_MAX = 200
const cache = new Map<string, { at: number; value: any }>()

function getCached<T>(key: string): T | undefined {
  const hit = cache.get(key)
  if (!hit) return undefined
  if (Date.now() - hit.at < TTL_MS) {
    cache.delete(key)
    cache.set(key, hit)
    return hit.value
  }
  cache.delete(key)
  return undefined
}

function setCached(key: string, value: unknown) {
  cache.set(key, { at: Date.now(), value })
  if (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value
    if (oldest) cache.delete(oldest)
  }
}

export function clearPlaylistBoardCache() {
  cache.clear()
}

/* ---------------- 对外 ---------------- */

export async function listPlaylistBoards(platform: string, refresh = false): Promise<PlaylistBoard[]> {
  const key = `boards:${platform}`
  if (refresh) cache.delete(key)
  const cached = getCached<PlaylistBoard[]>(key)
  if (cached) return cached
  let boards: PlaylistBoard[]
  if (platform === 'wy') boards = await listWyBoards()
  else if (platform === 'tx') boards = await listTxBoards()
  else if (platform === 'kg') boards = await listKgBoards()
  else throw createError({ statusCode: 400, statusMessage: `暂不支持该平台歌单: ${platform}` })
  setCached(key, boards)
  return boards
}

export async function getPlaylistTracks(
  platform: string,
  playlistId: string,
  page = 1,
  refresh = false,
): Promise<{ items: PlaylistBoardTrack[]; hasMore: boolean }> {
  const key = `tracks:${platform}:${playlistId}:${page}`
  if (refresh) cache.delete(key)
  const cached = getCached<{ items: PlaylistBoardTrack[]; hasMore: boolean }>(key)
  if (cached) return cached

  const draft = await parsePlaylistById(platform, playlistId)
  const tracks = draft.tracks || []
  const start = (page - 1) * PAGE_SIZE
  const slice = tracks.slice(start, start + PAGE_SIZE)
  const items = slice.map((t) => ({
    title: t.title,
    artist: t.artist,
    album: t.album || '',
    duration: t.duration || 0,
    externalId: t.externalId || '',
    musicInfo: trackToMusicInfo(t),
  }))
  const result = { items, hasMore: start + slice.length < tracks.length }
  setCached(key, result)
  return result
}

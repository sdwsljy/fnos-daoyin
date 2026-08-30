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
  desc?: string
}

export type PlaylistBoardSort = 'hot' | 'new'

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
  const info: Record<string, any> = {
    name: track.title,
    singer: track.artist,
    albumName: track.album || '',
    songmid: ext,
    hash: ext,
    source: track.platform,
    interval: track.duration ? formatInterval(track.duration) : undefined,
  }
  if (track.platform === 'mg') {
    info.copyrightId = ext
  }
  return info
}

const PAGE_SIZE = 30

/* ---------------- 网易云歌单 ---------------- */

async function listWyBoards(page: number, sort: PlaylistBoardSort): Promise<{ items: PlaylistBoard[]; hasMore: boolean }> {
  const order = sort === 'new' ? 'new' : 'hot'
  const data = await fetchJson(
    `https://music.163.com/api/playlist/list?cat=${encodeURIComponent('全部')}&order=${order}&limit=30&offset=${(page - 1) * 30}`,
    { headers: { Referer: 'https://music.163.com/' } },
  )
  const list = data?.playlists || []
  const items = list
    .map((p: any) => ({
      id: String(p.id),
      name: String(p.name || '').trim(),
      cover: p.coverImgUrl || undefined,
      count: Number(p.trackCount || 0),
      playCount: Number(p.playCount || 0),
      collectCount: Number(p.subscribedCount || 0),
      creator: p.creator?.nickname || undefined,
      desc: p.description || undefined,
    }))
    .filter((b: PlaylistBoard) => b.id && b.name)
  return { items, hasMore: list.length >= 30 }
}

/* ---------------- QQ 歌单 ---------------- */

async function listTxBoards(page: number, sort: PlaylistBoardSort): Promise<{ items: PlaylistBoard[]; hasMore: boolean }> {
  // QQ 歌单广场：musicu PlayListPlazaServer（GET），一次返回歌曲数/播放量/作者/封面
  const limit = 30
  const order = sort === 'new' ? 2 : 5
  const payload = {
    comm: { cv: 1602, ct: 20 },
    playlist: {
      method: 'get_playlist_by_tag',
      param: { id: 10000000, sin: limit * (page - 1), size: limit, order, cur_page: page },
      module: 'playlist.PlayListPlazaServer',
    },
  }
  const url = `https://u.y.qq.com/cgi-bin/musicu.fcg?format=json&data=${encodeURIComponent(JSON.stringify(payload))}`
  const data = await fetchJson(url, { headers: { Referer: 'https://y.qq.com/' } })
  const list = data?.playlist?.data?.v_playlist || []
  const items = list
    .map((p: any) => ({
      id: String(p.tid),
      name: String(p.title || '').trim(),
      cover: p.cover_url_medium || p.cover_url_big || undefined,
      count: Number(p.song_ids?.length || 0),
      playCount: Number(p.access_num || 0),
      creator: p.creator_info?.nick || undefined,
      desc: p.desc || undefined,
    }))
    .filter((b: PlaylistBoard) => b.id && b.name)
  return { items, hasMore: list.length >= limit }
}

/* ---------------- 酷狗歌单 ---------------- */

async function listKgBoards(page: number, sort: PlaylistBoardSort): Promise<{ items: PlaylistBoard[]; hasMore: boolean }> {
  // 酷狗歌单广场：yueku 接口（比 m.kugou.com 更稳，支持排序）
  const sortMap: Record<PlaylistBoardSort, string> = { hot: '6', new: '7' }
  const t = sortMap[sort] || '6'
  const data = await fetchJson(`http://www2.kugou.kugou.com/yueku/v9/special/getSpecial?is_ajax=1&cdn=cdn&t=${t}&c=&p=${page}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  })
  const list = data?.special_db || []
  const items = list
    .map((p: any) => ({
      id: String(p.specialid),
      name: String(p.specialname || '').trim(),
      cover: p.imgurl ? String(p.imgurl).replace('{size}', '400') : undefined,
      count: Number(p.songcount || 0),
      playCount: Number(p.play_count || p.total_play_count || 0),
      creator: p.nickname || p.singername || undefined,
      desc: p.intro || undefined,
    }))
    .filter((b: PlaylistBoard) => b.id && b.name)
  return { items, hasMore: list.length >= 30 }
}

/* ---------------- 咪咕歌单 ---------------- */

async function listMgBoards(page: number): Promise<{ items: PlaylistBoard[]; hasMore: boolean }> {
  const data = await fetchJson(
    `https://app.c.nf.migu.cn/pc/bmw/page-data/playlist-square-recommend/v1.0?templateVersion=2&pageNo=${page}`,
    {
      headers: {
        Referer: 'https://m.music.migu.cn/',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      },
    },
  )
  const items: PlaylistBoard[] = []
  const seen = new Set<string>()
  const walk = (contents: any[]) => {
    for (const item of contents || []) {
      if (item.contents?.length) walk(item.contents)
      const id = item.resId || item.txt4 || (item.viewId?.startsWith('4006-') ? item.viewId.split('-')[1] : '')
      if (id && item.txt && !seen.has(String(id))) {
        seen.add(String(id))
        items.push({
          id: String(id),
          name: String(item.txt || '').trim(),
          cover: item.img || item.img2 || item.txt5 || undefined,
        })
      }
    }
  }
  walk(data?.data?.contents || [])
  return { items, hasMore: false }
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

export async function listPlaylistBoards(
  platform: string,
  refresh = false,
  page = 1,
  sort: PlaylistBoardSort = 'hot',
): Promise<{ items: PlaylistBoard[]; hasMore: boolean }> {
  const key = `boards:${platform}:${page}:${sort}`
  if (refresh) cache.delete(key)
  const cached = getCached<{ items: PlaylistBoard[]; hasMore: boolean }>(key)
  if (cached) return cached
  let result: { items: PlaylistBoard[]; hasMore: boolean }
  if (platform === 'wy') result = await listWyBoards(page, sort)
  else if (platform === 'tx') result = await listTxBoards(page, sort)
  else if (platform === 'kg') result = await listKgBoards(page, sort)
  else if (platform === 'mg') result = await listMgBoards(page)
  else throw createError({ statusCode: 400, statusMessage: `暂不支持该平台歌单: ${platform}` })
  setCached(key, result)
  return result
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

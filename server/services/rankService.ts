import { parseLooseJson, cleanArtist } from './platformSearch'

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const WY_MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 CloudMusic/8.9.10'

export type RankBoard = { id: string; name: string; cover?: string }

export type RankTrack = {
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
  const text = await fetchText(url, init, timeoutMs)
  return parseLooseJson(text)
}

function artistsJoin(list: any): string {
  if (!list) return '未知'
  if (typeof list === 'string') return cleanArtist(list)
  if (Array.isArray(list)) {
    return cleanArtist(list.map((a) => a?.name || a?.title || a).filter(Boolean).join(' / ') || '未知')
  }
  return cleanArtist(String(list))
}

function formatIntervalFromSec(secRaw: number): string {
  const sec = Math.max(0, Math.round(secRaw || 0))
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const PAGE_SIZE = 30

/* ---------------- 网易云 ---------------- */

async function listWyBoards(): Promise<RankBoard[]> {
  const data = await fetchJson('https://music.163.com/api/toplist', {
    headers: { Referer: 'https://music.163.com/' },
  })
  const list = data?.list || []
  return list
    .map((b: any) => ({
      id: String(b.id),
      name: String(b.name || '').trim(),
      cover: b.coverImgUrl || b.picUrl || undefined,
    }))
    .filter((b: RankBoard) => b.id && b.name)
}

async function getWyTracks(boardId: string, page: number): Promise<{ items: RankTrack[]; hasMore: boolean }> {
  // 移动端 v6 接口 + 移动 UA，PC 端 playlist/detail 常返回空
  const data = await fetchJson(
    `https://music.163.com/api/v6/playlist/detail?id=${boardId}&n=100000&s=0`,
    {
      headers: { 'User-Agent': WY_MOBILE_UA, Referer: 'https://music.163.com/m/' },
    },
  )
  let tracks = data?.playlist?.tracks || []
  // tracks 空时按 trackIds 拉取详情
  if (!tracks.length) {
    const trackIds: string[] = (data?.playlist?.trackIds || [])
      .map((t: any) => String(t?.id ?? t))
      .filter((x: string) => /^\d+$/.test(x))
    if (trackIds.length) {
      tracks = await fetchWySongsByIds(trackIds)
    }
  }
  const start = (page - 1) * PAGE_SIZE
  const slice = tracks.slice(start, start + PAGE_SIZE)
  const items = slice.map((s: any) => {
    const id = String(s.id)
    const artist = artistsJoin(s.ar || s.artists)
    const album = s.al?.name || s.album?.name || ''
    return {
      title: s.name || '未知',
      artist,
      album,
      duration: Math.round((s.dt || s.duration || 0) / 1000),
      externalId: id,
      musicInfo: {
        name: s.name,
        singer: artist,
        albumName: album,
        songmid: id,
        hash: id,
        source: 'wy',
        img: s.al?.picUrl || s.album?.picUrl,
        interval: formatIntervalFromSec(Math.round((s.dt || s.duration || 0) / 1000)),
      },
    }
  })
  return { items, hasMore: start + slice.length < tracks.length }
}

async function fetchWySongsByIds(ids: string[]): Promise<any[]> {
  const BATCH = 200
  const byId = new Map<string, any>()
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH)
    const c = JSON.stringify(batch.map((sid) => ({ id: Number(sid) })))
    const data = await fetchJson(`https://music.163.com/api/v3/song/detail?c=${encodeURIComponent(c)}`, {
      headers: { 'User-Agent': WY_MOBILE_UA, Referer: 'https://music.163.com/' },
    })
    for (const s of data?.songs || []) {
      if (s?.id) byId.set(String(s.id), s)
    }
  }
  return ids.map((sid) => byId.get(sid)).filter(Boolean) as any[]
}

/* ---------------- QQ 音乐 ---------------- */

async function listTxBoards(): Promise<RankBoard[]> {
  const data = await fetchJson(
    'https://c.y.qq.com/v8/fcg-bin/fcg_myqq_toplist.fcg?format=json&inCharset=utf-8&outCharset=utf-8&platform=h5&needNewCode=1',
    { headers: { Referer: 'https://y.qq.com/' } },
  )
  const list = data?.data?.topList || []
  return list
    .map((b: any) => ({
      id: String(b.id),
      name: String(b.topTitle || b.name || '').trim(),
      cover: b.headPicUrl || b.picUrl || undefined,
    }))
    .filter((b: RankBoard) => b.id && b.name)
}

async function getTxTracks(boardId: string, page: number): Promise<{ items: RankTrack[]; hasMore: boolean }> {
  const data = await fetchJson(
    `https://c.y.qq.com/v8/fcg-bin/fcg_v8_toplist_cp.fcg?topid=${boardId}&page=${page}&num=${PAGE_SIZE}&format=json&inCharset=utf-8&outCharset=utf-8&platform=h5&needNewCode=1`,
    { headers: { Referer: 'https://y.qq.com/' } },
  )
  const list = data?.songlist || []
  const items = list.map((r: any) => {
    const s = r?.data || r || {}
    const mid = String(s.songmid || s.mid || '')
    const artist = artistsJoin(s.singer || s.singers)
    const album = s.albumname || s.album?.name || ''
    return {
      title: s.songname || s.name || '未知',
      artist,
      album,
      duration: Number(s.interval || s.duration || 0),
      externalId: mid,
      musicInfo: {
        name: s.songname || s.name,
        singer: artist,
        albumName: album,
        songmid: mid,
        hash: mid,
        songid: s.songid || s.id,
        strMediaMid: s.strMediaMid,
        source: 'tx',
        interval: formatIntervalFromSec(Number(s.interval || 0)),
      },
    }
  })
  return { items, hasMore: list.length >= PAGE_SIZE }
}

/* ---------------- 酷狗 ---------------- */

async function listKgBoards(): Promise<RankBoard[]> {
  const data = await fetchJson(
    'http://mobilecdnbj.kugou.com/api/v3/rank/list?version=9108&plat=0&showtype=2&parentid=0&apiver=6&withsong=0',
    { headers: { Referer: 'https://www.kugou.com/' } },
  )
  const list = data?.data?.info || []
  return list
    .map((b: any) => ({
      id: String(b.rankid),
      name: String(b.rankname || b.classify || '').trim(),
      cover: b.bannerurl || b.imgurl || undefined,
    }))
    .filter((b: RankBoard) => b.id && b.name)
}

async function fetchKgRankJson(url: string): Promise<any> {
  const text = await fetchText(url, {
    headers: { 'KG-RC': '1', Referer: 'http://m.kugou.com/' },
  })
  // 酷狗反爬：JSON 被 HTML 注释包裹，需剥离
  const m = text.match(/<!--KG_TAG_RES_START-->([\s\S]*?)<!--KG_TAG_RES_END-->/)
  return parseLooseJson(m ? m[1] : text)
}

async function getKgTracks(boardId: string, page: number): Promise<{ items: RankTrack[]; hasMore: boolean }> {
  const data = await fetchKgRankJson(
    `http://mobilecdn.kugou.com/api/v3/rank/song?version=9108&rankid=${boardId}&page=${page}&pagesize=${PAGE_SIZE}&area_code=1&plat=0&with_res_tag=1`,
  )
  const list = data?.data?.info || []
  const items = list.map((s: any) => {
    const hash = String(s.hash || '')
    const artist =
      (s.authors || [])
        .map((a: any) => a?.author_name || a?.name)
        .filter(Boolean)
        .join(' / ') || cleanArtist(s.singername || s.singer || '')
    return {
      title: s.songname || s.filename || '未知',
      artist,
      album: s.album_name || '',
      duration: Number(s.duration || 0),
      externalId: hash,
      musicInfo: {
        name: s.songname || s.filename,
        singer: artist,
        albumName: s.album_name || '',
        hash,
        songmid: hash,
        source: 'kg',
        img: s.album_sizable_cover?.replace('{size}', '240'),
        interval: formatIntervalFromSec(Number(s.duration || 0)),
      },
    }
  })
  return { items, hasMore: list.length >= PAGE_SIZE }
}

/* ---------------- 对外 ---------------- */

export async function listRankBoards(platform: string): Promise<RankBoard[]> {
  if (platform === 'wy') return listWyBoards()
  if (platform === 'tx') return listTxBoards()
  if (platform === 'kg') return listKgBoards()
  throw createError({ statusCode: 400, statusMessage: `暂不支持排行榜平台: ${platform}` })
}

export async function getRankTracks(
  platform: string,
  boardId: string,
  page = 1,
): Promise<{ items: RankTrack[]; hasMore: boolean }> {
  if (platform === 'wy') return getWyTracks(boardId, page)
  if (platform === 'tx') return getTxTracks(boardId, page)
  if (platform === 'kg') return getKgTracks(boardId, page)
  throw createError({ statusCode: 400, statusMessage: `暂不支持排行榜平台: ${platform}` })
}

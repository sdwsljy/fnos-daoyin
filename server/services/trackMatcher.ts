export type MatchCandidate = {
  externalId?: string
  title: string
  artist: string
  album?: string
  duration?: number
  musicInfo?: Record<string, any>
}

export type MatchInput = {
  externalId?: string
  title: string
  artist: string
  album?: string
  duration?: number
  platform: string
}

export type MatchResult = {
  method: 'id' | 'metadata' | 'manual'
  score: number
  selected: MatchCandidate | null
  candidates: Array<MatchCandidate & { score: number }>
}

function norm(s: string) {
  return (s || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[（(].*?[）)]/g, '')
}

/** 把歌手字符串拆成独立歌手集合（处理 /、& 和 等分隔） */
function splitArtists(raw: string): string[] {
  return String(raw || '')
    .split(/(?:feat\.|ft\.|[\/、,&和])+/i)
    .map((a) => norm(a))
    .filter((a) => a && a !== '未知')
}

/** 目标与候选歌手是否存在交集（任一歌手匹配即通过） */
function artistOverlap(target: string, cand: string): boolean {
  const a = splitArtists(target)
  const b = splitArtists(cand)
  if (!a.length || !b.length) return false
  for (const x of a) {
    for (const y of b) {
      if (x === y) return true
      // 部分包含（如「周杰伦」⊂「周杰伦 陈奕迅」）
      if ((x.length >= 2 && y.includes(x)) || (y.length >= 2 && x.includes(y))) return true
    }
  }
  return false
}

function scoreMeta(track: MatchInput, cand: MatchCandidate) {
  // 歌手硬性门槛：目标与候选歌手无任何交集 → 直接 0 分，不选中
  if (track.artist && cand.artist && !artistOverlap(track.artist, cand.artist)) {
    return 0
  }

  let score = 0
  if (norm(track.title) && norm(track.title) === norm(cand.title)) score += 0.5
  else if (norm(cand.title).includes(norm(track.title)) || norm(track.title).includes(norm(cand.title))) score += 0.3

  // 歌手命中（已通过门槛）加分
  if (track.artist && cand.artist && artistOverlap(track.artist, cand.artist)) score += 0.4
  if (track.album && cand.album && norm(track.album) === norm(cand.album)) score += 0.1
  if (track.duration && cand.duration && Math.abs(track.duration - cand.duration) <= 3) score += 0.05
  return Math.min(1, score)
}

/**
 * ID 优先 + 元数据回退（一期供单曲/二期歌单复用）
 */
export function matchTrack(
  track: MatchInput,
  opts: { candidatesFromSearch: MatchCandidate[] },
): MatchResult {
  const candidates = opts.candidatesFromSearch || []
  if (track.externalId) {
    const hit = candidates.find((c) => c.externalId && String(c.externalId) === String(track.externalId))
    if (hit) {
      return {
        method: 'id',
        score: 1,
        selected: hit,
        candidates: candidates.map((c) => ({ ...c, score: c === hit ? 1 : scoreMeta(track, c) })),
      }
    }
  }

  const scored = candidates
    .map((c) => ({ ...c, score: scoreMeta(track, c) }))
    .sort((a, b) => b.score - a.score)

  const best = scored[0]
  if (!best || best.score < 0.45) {
    return { method: 'metadata', score: best?.score || 0, selected: null, candidates: scored }
  }
  return {
    method: 'metadata',
    score: best.score,
    selected: best,
    candidates: scored,
  }
}

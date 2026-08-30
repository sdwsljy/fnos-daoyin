/** 解析「歌手 - 歌名」文件名（支持 - – — _ 分隔符），含互换形态用于匹配评分 */
export function parseFilename(fileName: string): {
  title: string
  artist: string
  keyword: string
  swapped?: { title: string; artist: string; keyword: string }
} {
  const base = String(fileName || '').replace(/\.[^.]+$/, '').trim()
  if (!base) return { title: '', artist: '', keyword: '' }

  const sepMatch = base.match(/^(.+?)\s*[-–—_]\s*(.+)$/)
  if (sepMatch) {
    const left = sepMatch[1]!.trim()
    const right = sepMatch[2]!.trim()
    return {
      title: right,
      artist: left,
      keyword: `${left} ${right}`,
      swapped: { title: left, artist: right, keyword: `${right} ${left}` },
    }
  }
  return { title: base, artist: '', keyword: base }
}

/** 匹配评分：歌手/歌名命中越多分越高，互换形态取更高分 */
export function scoreFilenameMatch(
  item: { name?: string; singer?: string },
  parsed: ReturnType<typeof parseFilename>,
): number {
  const scoreOne = (name: string, singer: string, title: string, artist: string) => {
    let score = 0
    const n = name.toLowerCase()
    const s = singer.toLowerCase()
    const t = title.toLowerCase()
    const a = artist.toLowerCase()
    if (t && n.includes(t)) score += 3
    if (a && s.includes(a)) score += 3
    if (t && n === t) score += 2
    if (a && s === a) score += 2
    if (t && a && n.includes(t) && s.includes(a)) score += 4
    return score
  }
  const name = item.name || ''
  const singer = item.singer || ''
  let score = scoreOne(name, singer, parsed.title, parsed.artist)
  if (parsed.swapped) {
    score = Math.max(score, scoreOne(name, singer, parsed.swapped.title, parsed.swapped.artist))
  }
  return score
}

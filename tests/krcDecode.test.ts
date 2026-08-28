import { describe, it, expect } from 'vitest'
import { deflateSync } from 'node:zlib'
import { decodeKrcBase64 } from '../server/utils/krcDecode'

const ENC_KEY = Buffer.from([
  0x40, 0x47, 0x61, 0x77, 0x5e, 0x32, 0x74, 0x47, 0x51, 0x36, 0x31, 0x2d, 0xce, 0xd2, 0x6e, 0x69,
])

function encodeKrc(content: string): string {
  const raw = Buffer.from(content, 'utf8')
  const compressed = deflateSync(raw)
  const xor = Buffer.from(compressed)
  for (let i = 0; i < xor.length; i++) {
    xor[i] = xor[i]! ^ ENC_KEY[i % 16]!
  }
  const full = Buffer.concat([Buffer.from('krc1'), xor])
  return full.toString('base64')
}

describe('decodeKrcBase64', () => {
  it('decodes lyric lines and strips krc tags', () => {
    const content =
      '[id:$00000000]\n' +
      '[ar:歌手]\n' +
      '[ti:歌曲]\n' +
      '[hash:abc]\n' +
      '[language:eyJjb250ZW50IjpbeyJ0eXBlIjowLCJseXJpY0NvbnRlbnQiOltbIlRyYW5zbGF0ZWQiXV19XX0=]\n' +
      '[0,1000]你好<0,100,0>\n' +
      '[1000,1000]世界<0,100,0>\n'
    const result = decodeKrcBase64(encodeKrc(content))
    expect(result.lyric).toContain('[00:00.000]你好')
    expect(result.lyric).toContain('[00:01.000]世界')
    // language block 中包含 type=0 的翻译行
    expect(result.rlyric).toContain('Translated')
  })

  it('returns empty for short payload', () => {
    expect(decodeKrcBase64('')).toEqual({ lyric: '', tlyric: '', rlyric: '' })
  })
})

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { zipSync, strToU8, strFromU8, unzipSync } from 'fflate'
import { buildSourcesExportZip, parseSourcesBundle, previewSourcesBundle, BUNDLE_VERSION } from '../server/services/sourceBundle'
import { closeDb } from '../server/utils/db'

let dataDir = ''
let dirs: string[] = []

beforeEach(() => {
  dataDir = mkdtempSync(join(tmpdir(), 'daoyin-bundle-data-'))
  dirs.push(dataDir)
  process.env.DATA_DIR = dataDir
})

afterEach(() => {
  delete process.env.DATA_DIR
  closeDb()
  for (const d of dirs) rmSync(d, { recursive: true, force: true })
  dirs = []
})

function makeZip(): Buffer {
  const files: Record<string, Uint8Array> = {
    'manifest.json': strToU8(
      JSON.stringify({
        version: BUNDLE_VERSION,
        exportedAt: new Date().toISOString(),
        sources: [
          { id: 'abc123', name: '示例源', url: 'https://example.com/x.js', script: 'scripts/abc123.js', enabled: true },
        ],
      }),
    ),
    'scripts/abc123.js': strToU8('const { EVENT_NAMES, on, send } = globalThis.lx\non(EVENT_NAMES.request, async () => "http://a.com/x.mp3")\nsend(EVENT_NAMES.inited, { sources: { wy: { qualitys: ["128k"] } } })\n'),
  }
  return Buffer.from(zipSync(files, { level: 6 }))
}

describe('source bundle', () => {
  it('parses a valid bundle', () => {
    const items = parseSourcesBundle(makeZip())
    expect(items).toHaveLength(1)
    expect(items[0]!.name).toBe('示例源')
    expect(items[0]!.script).toContain('EVENT_NAMES')
  })

  it('previews with conflict detection on empty db', () => {
    const preview = previewSourcesBundle(makeZip())
    expect(preview.total).toBe(1)
    expect(preview.newCount).toBe(1)
    expect(preview.conflictCount).toBe(0)
  })

  it('rejects invalid zip', () => {
    expect(() => parseSourcesBundle(Buffer.from('not a zip'))).toThrow()
  })

  it('round-trips export through unzip', () => {
    const { buffer, filename } = buildSourcesExportZip()
    expect(filename).toMatch(/\.zip$/)
    const unzipped = unzipSync(new Uint8Array(buffer))
    expect(unzipped['manifest.json']).toBeTruthy()
    const manifest = JSON.parse(strFromU8(unzipped['manifest.json']))
    expect(Array.isArray(manifest.sources)).toBe(true)
  })
})

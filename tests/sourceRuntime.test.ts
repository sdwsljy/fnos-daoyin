import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  runSandboxedSync,
  resetSourceRuntimeState,
  loadLxSource,
  parseScriptHeader,
  isBenignSourceNetworkError,
  isBenignSourceScriptError,
  acquireSourceRejectionGuard,
  settleSourceNetworkErrors,
} from '../server/services/sourceRuntime'

let dirs: string[] = []

function tempScript(code: string, name = 'src.js') {
  const dir = mkdtempSync(join(tmpdir(), 'daoyin-src-'))
  dirs.push(dir)
  const file = join(dir, name)
  writeFileSync(file, code, 'utf8')
  return file
}

beforeEach(() => resetSourceRuntimeState())
afterEach(() => {
  resetSourceRuntimeState()
  for (const d of dirs) rmSync(d, { recursive: true, force: true })
  dirs = []
})

describe('source sandbox', () => {
  it('kills sync infinite loop via vm timeout', () => {
    expect(() => runSandboxedSync('while(true){}', 50)).toThrow()
  })

  it('rejects blocked require', async () => {
    const file = tempScript(`
      const { EVENT_NAMES, on, send } = globalThis.lx
      require('fs')
      send(EVENT_NAMES.inited, { status: true, sources: { wy: { qualitys: ['128k'] } } })
      `)
    await expect(loadLxSource(file, { bypassCache: true })).rejects.toThrow(/禁止 require/)
  })

  it('times out hanging getMusicUrl', async () => {
    const file = tempScript(`
      const { EVENT_NAMES, on, send } = globalThis.lx
      on(EVENT_NAMES.request, () => new Promise(() => {}))
      send(EVENT_NAMES.inited, { status: true, sources: { wy: { qualitys: ['128k'] } } })
      `)
    const handle = await loadLxSource(file, { bypassCache: true })
    await expect(handle.getMusicUrl('wy', { songmid: '1' }, '128k')).rejects.toThrow(/超时/)
  }, 5000)

  it('exposes currentScriptInfo from header', async () => {
    const file = tempScript(`/**
 * @name 测试源
 * @version 1.2.3
 * @author demo
 */
const { EVENT_NAMES, on, send, currentScriptInfo } = globalThis.lx
if (!currentScriptInfo.rawScript || currentScriptInfo.name !== '测试源') throw new Error('missing script info')
on(EVENT_NAMES.request, async () => 'http://example.com/a.mp3')
send(EVENT_NAMES.inited, { sources: { wy: { qualitys: ['128k'] } } })
`)
    const handle = await loadLxSource(file, { bypassCache: true })
    expect(handle.platforms).toContain('wy')
  })

  it('parses script header fields', () => {
    const info = parseScriptHeader('/**\n * @name 花\n * @version 1\n */\n')
    expect(info.name).toBe('花')
    expect(info.version).toBe('1')
  })

  it('waits for async inited', async () => {
    const file = tempScript(`
      const { EVENT_NAMES, on, send } = globalThis.lx
      on(EVENT_NAMES.request, async () => 'http://example.com/a.mp3')
      setTimeout(() => {
        send(EVENT_NAMES.inited, { sources: { tx: { qualitys: ['128k', '320k'] } } })
      }, 30)
      `)
    const handle = await loadLxSource(file, { bypassCache: true })
    expect(handle.platforms).toEqual(['tx'])
  }, 5000)

  it('returns music url from string and object', async () => {
    const file = tempScript(`
      const { EVENT_NAMES, on, send } = globalThis.lx
      on(EVENT_NAMES.request, async (payload) => {
        if (payload.info.type === 'flac') return 'https://example.com/a.flac'
        return { url: 'https://example.com/b.mp3' }
      })
      send(EVENT_NAMES.inited, { sources: { wy: { qualitys: ['128k', 'flac'] } } })
      `)
    const handle = await loadLxSource(file, { bypassCache: true })
    expect(handle.qualityMap['wy']).toContain('flac')
    await expect(handle.getMusicUrl('wy', { songmid: '1' }, 'flac')).resolves.toBe('https://example.com/a.flac')
    await expect(handle.getMusicUrl('wy', { songmid: '1' }, '128k')).resolves.toBe('https://example.com/b.mp3')
  })

  it('classifies DNS failures as benign network errors', () => {
    const err = Object.assign(new Error('getaddrinfo ENOTFOUND api.example.com'), {
      code: 'ENOTFOUND',
    })
    expect(isBenignSourceNetworkError(err)).toBe(true)
    expect(isBenignSourceNetworkError(new Error('业务逻辑错误'))).toBe(false)
  })

  it('classifies undefined property access as benign script errors', () => {
    const err = new Error("Cannot read properties of undefined (reading '0')")
    expect(isBenignSourceScriptError(err)).toBe(true)
    expect(isBenignSourceNetworkError(err)).toBe(false)
    expect(isBenignSourceScriptError(new Error('业务逻辑错误'))).toBe(false)
  })

  it('captures fire-and-forget checkUpdate network rejection', async () => {
    const file = tempScript(`
      const { EVENT_NAMES, on, send, request } = globalThis.lx
      on(EVENT_NAMES.request, async () => 'http://example.com/a.mp3')
      send(EVENT_NAMES.inited, { sources: { wy: { qualitys: ['128k'] } } })
      // 模拟音源未 catch 的 checkUpdate（本地端口拒绝连接，快速失败）
      Promise.resolve().then(() =>
        request('http://127.0.0.1:1/check', { method: 'GET' }),
      )
      `)
    const guard = acquireSourceRejectionGuard()
    try {
      await loadLxSource(file, { bypassCache: true })
      const errs = await settleSourceNetworkErrors(guard, 3000)
      expect(errs.length).toBeGreaterThan(0)
      expect(isBenignSourceNetworkError(errs[0])).toBe(true)
    } finally {
      guard.release()
    }
  }, 15000)
})

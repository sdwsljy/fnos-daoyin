import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getAuthToken, getSessionSecret, getDownloadDirEnv } from '../server/utils/runtimeEnv'

describe('runtimeEnv', () => {
  const prev = { ...process.env }

  beforeEach(() => {
    delete process.env.AUTH_TOKEN
    delete process.env.NUXT_AUTH_TOKEN
    delete process.env.SESSION_SECRET
    delete process.env.NUXT_SESSION_SECRET
    delete process.env.DOWNLOAD_DIR
    delete process.env.NUXT_DOWNLOAD_DIR
  })

  afterEach(() => {
    process.env = { ...prev }
  })

  it('reads empty AUTH_TOKEN for open mode', () => {
    process.env.AUTH_TOKEN = ''
    expect(getAuthToken()).toBe('')
  })

  it('reads AUTH_TOKEN when set', () => {
    process.env.AUTH_TOKEN = 'secret-from-wizard'
    expect(getAuthToken()).toBe('secret-from-wizard')
  })

  it('reads DOWNLOAD_DIR from process env', () => {
    process.env.DOWNLOAD_DIR = '/vol1/music'
    expect(getDownloadDirEnv()).toBe('/vol1/music')
  })

  it('returns empty session secret when unset (fail-closed)', () => {
    expect(getSessionSecret()).toBe('')
  })

  it('reads session secret from env', () => {
    process.env.SESSION_SECRET = 'a-random-secret'
    expect(getSessionSecret()).toBe('a-random-secret')
  })
})

import { describe, it, expect } from 'vitest'
import { classifySourceError } from '../server/services/sourceProbe'

describe('classifySourceError', () => {
  it('classifies DNS failure', () => {
    expect(classifySourceError('getaddrinfo ENOTFOUND api.example.com')).toContain('DNS')
  })

  it('classifies 404', () => {
    expect(classifySourceError('HTTP 404')).toContain('404')
  })

  it('classifies rate limiting', () => {
    expect(classifySourceError('Too many requests')).toContain('限流')
    expect(classifySourceError('请求过速')).toContain('限流')
  })

  it('classifies suspended service', () => {
    expect(classifySourceError('Service has been suspended')).toContain('停服')
  })

  it('classifies invalid key', () => {
    expect(classifySourceError('invalid api-key')).toContain('Key')
    expect(classifySourceError('key 失效')).toContain('Key')
  })

  it('classifies init timeout', () => {
    expect(classifySourceError('音源初始化超时（10000ms 内未发送 inited）')).toContain('初始化超时')
  })

  it('keeps generic unknown', () => {
    expect(classifySourceError('')).toBe('未知错误')
  })

  it('appends update alerts', () => {
    expect(classifySourceError('HTTP 404', { updateAlerts: ['请升级到最新版本'] })).toContain('请升级到最新版本')
  })
})

import { describe, it, expect } from 'vitest'
import { assertSafePublicUrl, resolveSafeUrl } from '../server/utils/ssrfGuard'

describe('ssrfGuard', () => {
  it('拦截 IPv4 回环地址', async () => {
    await expect(assertSafePublicUrl('http://127.0.0.1/')).rejects.toThrow('禁止访问')
  })

  it('拦截内网段', async () => {
    await expect(assertSafePublicUrl('http://192.168.1.1/')).rejects.toThrow('禁止访问')
    await expect(assertSafePublicUrl('http://10.0.0.1/')).rejects.toThrow('禁止访问')
    await expect(assertSafePublicUrl('http://172.16.0.1/')).rejects.toThrow('禁止访问')
  })

  it('拦截 IPv4-mapped IPv6 回环（防绕过）', async () => {
    await expect(assertSafePublicUrl('http://[::ffff:127.0.0.1]/')).rejects.toThrow('禁止访问')
    await expect(assertSafePublicUrl('http://[::ffff:192.168.1.1]/')).rejects.toThrow('禁止访问')
  })

  it('拦截 localhost 与内网域名后缀', async () => {
    await expect(assertSafePublicUrl('http://localhost/')).rejects.toThrow('禁止访问')
    await expect(assertSafePublicUrl('http://foo.local/')).rejects.toThrow('禁止访问')
    await expect(assertSafePublicUrl('http://foo.internal/')).rejects.toThrow('禁止访问')
  })

  it('拦截非 http/https 协议', async () => {
    await expect(assertSafePublicUrl('ftp://example.com/')).rejects.toThrow('仅允许')
    await expect(assertSafePublicUrl('file:///etc/passwd')).rejects.toThrow('仅允许')
  })

  it('拦截云元数据地址', async () => {
    await expect(assertSafePublicUrl('http://169.254.169.254/')).rejects.toThrow('禁止访问')
  })

  it('拦截广播地址', async () => {
    await expect(assertSafePublicUrl('http://255.255.255.255/')).rejects.toThrow('禁止访问')
  })

  it('resolveSafeUrl 对公网 IP 返回解析结果', async () => {
    const r = await resolveSafeUrl('https://1.1.1.1/')
    expect(r.hostname).toBe('1.1.1.1')
    expect(r.ips).toEqual(['1.1.1.1'])
  })
})

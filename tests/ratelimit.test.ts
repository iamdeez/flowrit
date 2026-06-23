import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('checkLoginRateLimit', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('no-ops when Upstash env vars are missing', async () => {
    const { checkLoginRateLimit } = await import('@/lib/ratelimit')

    await expect(checkLoginRateLimit('127.0.0.1')).resolves.toEqual({ limited: false })
  })
})

describe('login rate limit', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('uses trusted request headers and returns guidance when limited', async () => {
    const checkLoginRateLimit = vi.fn().mockResolvedValue({ limited: true, retryAfter: 60 })
    const signIn = vi.fn()

    vi.doMock('@/lib/ratelimit', () => ({ checkLoginRateLimit }))
    vi.doMock('@/lib/auth', () => ({ signIn, signOut: vi.fn() }))
    vi.doMock('@/lib/db', () => ({ prisma: {} }))
    vi.doMock('@/lib/email', () => ({ sendPasswordResetEmail: vi.fn() }))
    vi.doMock('@/lib/default-workflow-templates', () => ({ seedDefaultWorkflowTemplates: vi.fn() }))
    vi.doMock('next/headers', () => ({
      headers: vi.fn(async () => new Headers({
        'x-forwarded-for': '203.0.113.10, 10.0.0.1',
        'x-real-ip': '198.51.100.20',
      })),
    }))

    const { login } = await import('@/lib/actions/auth')
    const formData = new FormData()
    formData.set('email', 'user@example.com')
    formData.set('password', 'password123')

    await expect(login({}, formData)).resolves.toEqual({
      error: '시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.',
    })
    expect(checkLoginRateLimit).toHaveBeenCalledWith('203.0.113.10')
    expect(signIn).not.toHaveBeenCalled()
  })
})

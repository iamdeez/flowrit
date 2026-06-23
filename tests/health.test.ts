import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = {
  $queryRaw: vi.fn(),
}

vi.mock('@/lib/db', () => ({ prisma: prismaMock }))
vi.mock('@/lib/ops-alert', () => ({ sendOpsAlert: vi.fn() }))

const REQUIRED_ENV = {
  DATABASE_URL: 'postgres://test',
  AUTH_SECRET: 'secret',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  RESEND_API_KEY: 're_test',
  R2_ACCOUNT_ID: 'r2-account',
  R2_ACCESS_KEY_ID: 'r2-access',
  R2_SECRET_ACCESS_KEY: 'r2-secret',
  R2_BUCKET_NAME: 'flowrit',
  R2_PUBLIC_URL: 'https://r2.example',
  NICEPAY_SECRET_KEY: 'nice-secret',
  NEXT_PUBLIC_NICEPAY_CLIENT_ID: 'S2_client',
  CRON_SECRET: 'cron-secret',
  HEALTHCHECK_TOKEN: 'health-token',
}

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    for (const [key, value] of Object.entries(REQUIRED_ENV)) {
      vi.stubEnv(key, value)
    }
    prismaMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }])
  })

  it('returns a public summary without sensitive details', async () => {
    const { GET } = await import('@/app/api/health/route')
    const response = await GET(new Request('http://localhost/api/health'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.status).toBe('ok')
    expect(body.service).toBe('flowrit')
    expect(body.checks).toBeUndefined()
  })

  it('returns detailed checks with a valid token', async () => {
    const { GET } = await import('@/app/api/health/route')
    const response = await GET(
      new Request('http://localhost/api/health', {
        headers: { authorization: 'Bearer health-token' },
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.checks.database.status).toBe('ok')
    expect(body.checks.env.missing).toEqual([])
  })

  it('returns degraded when database check fails', async () => {
    prismaMock.$queryRaw.mockRejectedValueOnce(new Error('db down'))

    const { GET } = await import('@/app/api/health/route')
    const response = await GET(
      new Request('http://localhost/api/health', {
        headers: { authorization: 'Bearer health-token' },
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.status).toBe('degraded')
    expect(body.checks.database.status).toBe('degraded')
    expect(body.checks.database.error).toBe('db down')
  })

  it('rejects invalid detailed tokens', async () => {
    const { GET } = await import('@/app/api/health/route')
    const response = await GET(
      new Request('http://localhost/api/health', {
        headers: { authorization: 'Bearer wrong' },
      }),
    )

    expect(response.status).toBe(401)
  })
})

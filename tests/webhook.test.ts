import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockDeep, mockReset } from 'vitest-mock-extended'
import { NextRequest } from 'next/server'
import type { PrismaClient } from '@/app/generated/prisma/client'

const prismaMock = mockDeep<PrismaClient>()

vi.mock('@/lib/db', () => ({ prisma: prismaMock }))
vi.mock('@/lib/email', () => ({ sendNewInquiryEmail: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/notifications', () => ({ sendNotification: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/ratelimit', () => ({
  checkWebhookRateLimit: vi.fn().mockResolvedValue({ limited: false }),
}))

const TEST_SECRET = 'test-webhook-secret-abc'

function makeRequest(body: unknown, authHeader?: string, slug = 'my-workspace') {
  const req = new NextRequest(`http://localhost/api/webhooks/intake/${slug}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader !== undefined ? { Authorization: authHeader } : {}),
      'x-forwarded-for': '127.0.0.1',
    },
    body: JSON.stringify(body),
  })
  return req
}

const makeParams = (slug = 'my-workspace') =>
  Promise.resolve({ workspaceSlug: slug })

beforeEach(() => {
  mockReset(prismaMock)
  process.env.WEBHOOK_SECRET = TEST_SECRET
})

describe('POST /api/webhooks/intake/[workspaceSlug]', () => {
  it('유효한 요청 → 201 + Inquiry 생성', async () => {
    prismaMock.workspace.findUnique.mockResolvedValue({ id: 'ws1', slug: 'my-workspace' } as never)
    prismaMock.inquiry.create.mockResolvedValue({ id: 'inq-webhook-1' } as never)
    prismaMock.workspaceMember.findMany.mockResolvedValue([])

    const { POST } = await import('@/app/api/webhooks/intake/[workspaceSlug]/route')
    const res = await POST(makeRequest({ name: '홍길동', content: '촬영 문의드립니다.' }, `Bearer ${TEST_SECRET}`), { params: makeParams() })
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.ok).toBe(true)
    expect(json.inquiryId).toBe('inq-webhook-1')
    expect(prismaMock.inquiry.create).toHaveBeenCalledOnce()
  })

  it('Authorization 헤더 없음 → 401', async () => {
    const { POST } = await import('@/app/api/webhooks/intake/[workspaceSlug]/route')
    const res = await POST(makeRequest({ name: '홍길동', content: '내용' }), { params: makeParams() })
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.ok).toBe(false)
  })

  it('잘못된 Bearer 토큰 → 401', async () => {
    const { POST } = await import('@/app/api/webhooks/intake/[workspaceSlug]/route')
    const res = await POST(makeRequest({ name: '홍길동', content: '내용' }, 'Bearer wrong-token'), { params: makeParams() })

    expect(res.status).toBe(401)
  })

  it('name 필드 누락 → 422', async () => {
    const { POST } = await import('@/app/api/webhooks/intake/[workspaceSlug]/route')
    const res = await POST(makeRequest({ content: '내용만 있음' }, `Bearer ${TEST_SECRET}`), { params: makeParams() })
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.ok).toBe(false)
  })

  it('content 필드 누락 → 422', async () => {
    const { POST } = await import('@/app/api/webhooks/intake/[workspaceSlug]/route')
    const res = await POST(makeRequest({ name: '홍길동' }, `Bearer ${TEST_SECRET}`), { params: makeParams() })

    expect(res.status).toBe(422)
  })

  it('content 10,000자 초과 → 422', async () => {
    const { POST } = await import('@/app/api/webhooks/intake/[workspaceSlug]/route')
    const res = await POST(
      makeRequest({ name: '홍길동', content: 'a'.repeat(10001) }, `Bearer ${TEST_SECRET}`),
      { params: makeParams() }
    )

    expect(res.status).toBe(422)
  })

  it('존재하지 않는 워크스페이스 → 404', async () => {
    prismaMock.workspace.findUnique.mockResolvedValue(null)

    const { POST } = await import('@/app/api/webhooks/intake/[workspaceSlug]/route')
    const res = await POST(makeRequest({ name: '홍길동', content: '내용' }, `Bearer ${TEST_SECRET}`), { params: makeParams('nonexistent') })

    expect(res.status).toBe(404)
  })

  it('source 파라미터가 content 앞에 소스 레이블로 추가된다', async () => {
    prismaMock.workspace.findUnique.mockResolvedValue({ id: 'ws1' } as never)
    prismaMock.inquiry.create.mockResolvedValue({ id: 'inq-1' } as never)
    prismaMock.workspaceMember.findMany.mockResolvedValue([])

    const { POST } = await import('@/app/api/webhooks/intake/[workspaceSlug]/route')
    await POST(
      makeRequest({ name: '홍길동', content: '인스타 DM 문의', source: 'instagram' }, `Bearer ${TEST_SECRET}`),
      { params: makeParams() }
    )

    expect(prismaMock.inquiry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content: '[인스타그램 DM]\n인스타 DM 문의',
        }),
      })
    )
  })

  it('WEBHOOK_SECRET 미설정 → 503', async () => {
    delete process.env.WEBHOOK_SECRET

    const { POST } = await import('@/app/api/webhooks/intake/[workspaceSlug]/route')
    const res = await POST(makeRequest({ name: '홍길동', content: '내용' }, `Bearer ${TEST_SECRET}`), { params: makeParams() })

    expect(res.status).toBe(503)
  })

  it('rate limit 초과 → 429', async () => {
    const { checkWebhookRateLimit } = await import('@/lib/ratelimit')
    vi.mocked(checkWebhookRateLimit).mockResolvedValueOnce({ limited: true, retryAfter: 30 })

    const { POST } = await import('@/app/api/webhooks/intake/[workspaceSlug]/route')
    const res = await POST(makeRequest({ name: '홍길동', content: '내용' }, `Bearer ${TEST_SECRET}`), { params: makeParams() })

    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('30')
  })
})

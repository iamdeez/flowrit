import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockDeep, mockReset } from 'vitest-mock-extended'
import type { PrismaClient } from '@/app/generated/prisma/client'

const prismaMock = mockDeep<PrismaClient>()
vi.mock('@/lib/db', () => ({ prisma: prismaMock }))
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))

const OWNER_SESSION = {
  user: { id: 'u1', workspaceId: 'ws1', email: 'owner@example.com', name: 'Owner', role: 'OWNER' },
} as never

const MEMBER_SESSION = {
  user: { id: 'u2', workspaceId: 'ws1', email: 'member@example.com', name: 'Member', role: 'MEMBER' },
} as never

beforeEach(async () => {
  mockReset(prismaMock)
  const { auth } = await import('@/lib/auth')
  vi.mocked(auth).mockResolvedValue(OWNER_SESSION)
})

// SC-010: 구독 취소 (기간 말 해지)
describe('cancelSubscription (SC-010)', () => {
  it('OWNER + PRO 구독: cancelAtPeriodEnd = true로 업데이트', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({
      id: 'sub1',
      plan: 'pro',
      status: 'active',
    } as never)
    prismaMock.subscription.update.mockResolvedValue({} as never)

    const { cancelSubscription } = await import('@/lib/actions/billing')
    const result = await cancelSubscription()

    expect(result.success).toBe(true)
    expect(prismaMock.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId: 'ws1' },
        data: { cancelAtPeriodEnd: true },
      })
    )
  })

  it('MEMBER 역할: Forbidden 에러 반환', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValue(MEMBER_SESSION)

    const { cancelSubscription } = await import('@/lib/actions/billing')
    const result = await cancelSubscription()

    expect(result.success).toBe(false)
    expect(result.error).toBe('Forbidden')
    expect(prismaMock.subscription.update).not.toHaveBeenCalled()
  })

  it('PRO 구독 없음: 에러 반환', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(null)

    const { cancelSubscription } = await import('@/lib/actions/billing')
    const result = await cancelSubscription()

    expect(result.success).toBe(false)
    expect(result.error).toBe('No active PRO subscription')
  })

  it('FREE 플랜 구독 취소 시도: 에러 반환', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({
      id: 'sub1',
      plan: 'free',
      status: 'active',
    } as never)

    const { cancelSubscription } = await import('@/lib/actions/billing')
    const result = await cancelSubscription()

    expect(result.success).toBe(false)
    expect(result.error).toBe('No active PRO subscription')
  })

  it('미인증: Unauthorized 에러 반환', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValue(null as never)

    const { cancelSubscription } = await import('@/lib/actions/billing')
    const result = await cancelSubscription()

    expect(result.success).toBe(false)
    expect(result.error).toBe('Unauthorized')
  })
})

// SC-009: getNextPeriodEnd 계산 검증
describe('getNextPeriodEnd', () => {
  it('monthly: 정확히 1개월 후 날짜 반환', async () => {
    const { getNextPeriodEnd } = await import('@/lib/billing')
    const from = new Date('2026-01-15')
    const end = getNextPeriodEnd('monthly', from)
    expect(end.getFullYear()).toBe(2026)
    expect(end.getMonth()).toBe(1) // February (0-indexed)
    expect(end.getDate()).toBe(15)
  })

  it('yearly: 정확히 1년 후 날짜 반환', async () => {
    const { getNextPeriodEnd } = await import('@/lib/billing')
    const from = new Date('2026-03-01')
    const end = getNextPeriodEnd('yearly', from)
    expect(end.getFullYear()).toBe(2027)
    expect(end.getMonth()).toBe(2) // March (0-indexed)
    expect(end.getDate()).toBe(1)
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockDeep, mockReset } from 'vitest-mock-extended'
import type { PrismaClient } from '@/app/generated/prisma/client'

const prismaMock = mockDeep<PrismaClient>()
vi.mock('@/lib/db', () => ({ prisma: prismaMock }))

beforeEach(() => mockReset(prismaMock))

// SC-006: FREE 플랜 프로젝트 생성 제한 (최대 3개)
describe('checkProjectLimit (SC-006)', () => {
  it('FREE 플랜 프로젝트 2개: 한도 미초과 → 에러 없음', async () => {
    prismaMock.workspace.findUnique.mockResolvedValue({ plan: 'free' } as never)
    prismaMock.project.count.mockResolvedValue(2)

    const { checkProjectLimit } = await import('@/lib/plan')
    await expect(checkProjectLimit('ws1')).resolves.toBeUndefined()
  })

  it('FREE 플랜 프로젝트 3개: 한도 초과 → PLAN_LIMIT_EXCEEDED:PROJECT 에러', async () => {
    prismaMock.workspace.findUnique.mockResolvedValue({ plan: 'free' } as never)
    prismaMock.project.count.mockResolvedValue(3)

    const { checkProjectLimit } = await import('@/lib/plan')
    await expect(checkProjectLimit('ws1')).rejects.toThrow('PLAN_LIMIT_EXCEEDED:PROJECT')
  })

  it('PRO 플랜: 프로젝트 수 무관하게 에러 없음', async () => {
    prismaMock.workspace.findUnique.mockResolvedValue({ plan: 'pro' } as never)
    prismaMock.project.count.mockResolvedValue(100)

    const { checkProjectLimit } = await import('@/lib/plan')
    await expect(checkProjectLimit('ws1')).resolves.toBeUndefined()
  })
})

// SC-007: FREE 플랜 멤버 초대 제한 (최대 1명 — OWNER만)
describe('checkMemberLimit (SC-007)', () => {
  it('FREE 플랜 멤버 1명: 한도 초과 → PLAN_LIMIT_EXCEEDED:MEMBER 에러', async () => {
    prismaMock.workspace.findUnique.mockResolvedValue({ plan: 'free' } as never)
    prismaMock.workspaceMember.count.mockResolvedValue(1)

    const { checkMemberLimit } = await import('@/lib/plan')
    await expect(checkMemberLimit('ws1')).rejects.toThrow('PLAN_LIMIT_EXCEEDED:MEMBER')
  })

  it('FREE 플랜 멤버 0명: 한도 미초과 → 에러 없음', async () => {
    prismaMock.workspace.findUnique.mockResolvedValue({ plan: 'free' } as never)
    prismaMock.workspaceMember.count.mockResolvedValue(0)

    const { checkMemberLimit } = await import('@/lib/plan')
    await expect(checkMemberLimit('ws1')).resolves.toBeUndefined()
  })

  it('PRO 플랜 멤버 4명: 한도 미초과 → 에러 없음', async () => {
    prismaMock.workspace.findUnique.mockResolvedValue({ plan: 'pro' } as never)
    prismaMock.workspaceMember.count.mockResolvedValue(4)

    const { checkMemberLimit } = await import('@/lib/plan')
    await expect(checkMemberLimit('ws1')).resolves.toBeUndefined()
  })

  it('PRO 플랜 멤버 5명: 한도 초과 → PLAN_LIMIT_EXCEEDED:MEMBER 에러', async () => {
    prismaMock.workspace.findUnique.mockResolvedValue({ plan: 'pro' } as never)
    prismaMock.workspaceMember.count.mockResolvedValue(5)

    const { checkMemberLimit } = await import('@/lib/plan')
    await expect(checkMemberLimit('ws1')).rejects.toThrow('PLAN_LIMIT_EXCEEDED:MEMBER')
  })
})

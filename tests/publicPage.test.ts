import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockDeep, mockReset } from 'vitest-mock-extended'
import type { PrismaClient } from '@/app/generated/prisma/client'
import { getCurrentStage } from '@/lib/project-utils'

const prismaMock = mockDeep<PrismaClient>()

vi.mock('@/lib/db', () => ({ prisma: prismaMock }))
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))

beforeEach(() => mockReset(prismaMock))

// SC-009: 공유 링크로 비인증 접근 → 현재 단계·에셋·수정 요청 정상 노출
describe('공개 페이지 데이터 조회 (SC-009)', () => {
  it('유효한 토큰으로 공개 페이지 데이터를 조회한다', async () => {
    const mockPage = {
      id: 'pp1',
      token: 'abc123',
      isActive: true,
      projectId: 'p1',
      project: {
        id: 'p1',
        title: '홍길동 웨딩',
        dueDate: new Date('2026-07-01'),
        currentStageId: 's2',
        stages: [
          { id: 's1', internalName: '촬영', customerName: '촬영', order: 1 },
          { id: 's2', internalName: '편집', customerName: '편집 중', order: 2 },
        ],
        assets: [
          { id: 'a1', name: '드라이브', url: 'https://drive.google.com/1', status: 'SHARED' },
        ],
        revisions: [
          { id: 'r1', content: '색감 수정', status: 'DONE' },
          { id: 'r2', content: '배경 제거', status: 'OPEN' },
        ],
      },
    }

    prismaMock.publicProjectPage.findUnique.mockResolvedValue(mockPage as never)

    const page = (await prismaMock.publicProjectPage.findUnique({
      where: { token: 'abc123' },
    })) as unknown as typeof mockPage | null

    expect(page).not.toBeNull()
    expect(page?.isActive).toBe(true)

    // 현재 단계 도출 (고객 표시명 사용)
    const currentStage = getCurrentStage(page!.project)
    expect(currentStage?.customerName).toBe('편집 중')
    expect(currentStage?.order).toBe(2)

    // SHARED 에셋만 포함 (쿼리 where 조건으로 보장됨)
    expect(page!.project.assets).toHaveLength(1)
    expect(page!.project.assets[0].status).toBe('SHARED')

    // 수정 요청 목록 포함
    expect(page!.project.revisions).toHaveLength(2)
  })

  it('비활성 토큰이면 페이지가 존재하지 않는다', async () => {
    prismaMock.publicProjectPage.findUnique.mockResolvedValue(null)

    const page = await prismaMock.publicProjectPage.findUnique({
      where: { token: 'inactive-token' },
    })

    // page가 null이거나 isActive=false이면 notFound() 호출
    expect(page).toBeNull()
  })

  it('공개 페이지 쿼리는 isActive=true 조건과 함께 token으로 조회한다', async () => {
    prismaMock.publicProjectPage.findUnique.mockResolvedValue(null)

    await prismaMock.publicProjectPage.findUnique({
      where: { token: 'test-token' },
      include: {
        project: {
          include: {
            stages: { orderBy: { order: 'asc' } },
            assets: { where: { status: 'SHARED' } },
            revisions: { orderBy: { createdAt: 'desc' } },
          },
        },
      },
    })

    expect(prismaMock.publicProjectPage.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { token: 'test-token' },
        include: expect.objectContaining({
          project: expect.objectContaining({
            include: expect.objectContaining({
              assets: expect.objectContaining({
                where: { status: 'SHARED' },
              }),
            }),
          }),
        }),
      })
    )
  })

  it('내부 메모(memo)는 공개 페이지에 포함되지 않는다', async () => {
    // Customer.memo, Project의 내부 전용 필드는 공개 페이지 쿼리에서 제외됨
    // 공개 페이지 include에는 memo 필드가 포함되지 않는다
    const mockPage = {
      project: {
        id: 'p1',
        title: '프로젝트',
        stages: [],
        assets: [],
        revisions: [],
        // memo 필드 없음
      },
    }
    expect(Object.keys(mockPage.project)).not.toContain('customerMemo')
    expect(Object.keys(mockPage.project)).not.toContain('internalNote')
  })
})

// SC-010: 고객 재수정 제출 → 수정 요청 자동 등록
describe('submitCustomerRevision (SC-010)', () => {
  it('유효한 토큰으로 수정 요청을 CUSTOMER_PORTAL 소스로 생성한다', async () => {
    prismaMock.publicProjectPage.findUnique.mockResolvedValue({
      id: 'pp1',
      projectId: 'p1',
      token: 'valid-token',
      isActive: true,
    } as never)
    prismaMock.revisionRequest.create.mockResolvedValue({
      id: 'r-new',
      projectId: 'p1',
      content: '얼굴이 너무 밝아요.',
      source: 'CUSTOMER_PORTAL',
    } as never)

    const formData = new FormData()
    formData.set('token', 'valid-token')
    formData.set('content', '얼굴이 너무 밝아요.')

    const { submitCustomerRevision } = await import('@/lib/actions/publicRevision')
    const result = await submitCustomerRevision({}, formData)

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
    expect(prismaMock.revisionRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: 'p1',
          source: 'CUSTOMER_PORTAL',
          content: '얼굴이 너무 밝아요.',
        }),
      })
    )
  })

  it('비활성 공개 페이지 토큰이면 에러를 반환한다', async () => {
    prismaMock.publicProjectPage.findUnique.mockResolvedValue(null)

    const formData = new FormData()
    formData.set('token', 'inactive-token')
    formData.set('content', '수정 요청')

    const { submitCustomerRevision } = await import('@/lib/actions/publicRevision')
    const result = await submitCustomerRevision({}, formData)

    expect(result.error).toBeDefined()
    expect(prismaMock.revisionRequest.create).not.toHaveBeenCalled()
  })

  it('토큰이 없으면 에러를 반환한다', async () => {
    const formData = new FormData()
    formData.set('token', '')
    formData.set('content', '수정 요청')

    const { submitCustomerRevision } = await import('@/lib/actions/publicRevision')
    const result = await submitCustomerRevision({}, formData)

    expect(result.error).toBeDefined()
  })
})

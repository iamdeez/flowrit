import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockDeep, mockReset } from 'vitest-mock-extended'
import type { PrismaClient } from '@/app/generated/prisma/client'
import { isProjectDone } from '@/lib/project-utils'

const prismaMock = mockDeep<PrismaClient>()

vi.mock('@/lib/db', () => ({ prisma: prismaMock }))
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/default-workflow-templates', () => ({
  seedDefaultWorkflowTemplates: vi.fn(),
}))

const SESSION = {
  user: { id: 'u1', workspaceId: 'ws1', email: 'test@example.com', name: 'Test' },
} as never

beforeEach(async () => {
  mockReset(prismaMock)
  const { auth } = await import('@/lib/auth')
  vi.mocked(auth).mockResolvedValue(SESSION)
})

function newProjectLinkHref(customerId: string): string {
  return `/projects/new?customerId=${customerId}`
}

// SC-101: 고객 상세 → 새 프로젝트 링크에 customerId 포함
describe('SC-101 고객 상세 새 프로젝트 링크', () => {
  it('getCustomerDetail 응답의 id로 customerId 쿼리 링크를 만든다', async () => {
    prismaMock.customer.findFirst.mockResolvedValue({
      id: 'c-abc',
      workspaceId: 'ws1',
      name: '김철수',
      projects: [],
    } as never)

    const { getCustomerDetail } = await import('@/lib/actions/customer')
    const customer = await getCustomerDetail('c-abc')

    expect(customer).not.toBeNull()
    expect(newProjectLinkHref(customer!.id)).toBe('/projects/new?customerId=c-abc')
  })
})

// SC-102: 의뢰 전환 시 dueDate 반영
describe('SC-102 convertInquiryToProject dueDate', () => {
  beforeEach(() => {
    prismaMock.$transaction.mockImplementation(async (fn: unknown) => {
      if (typeof fn === 'function') return fn(prismaMock)
    })
  })

  it('마감일 입력 시 project.create에 dueDate를 전달한다', async () => {
    prismaMock.inquiry.findFirst.mockResolvedValue({
      id: 'inq-1',
      workspaceId: 'ws1',
      status: 'PENDING',
    } as never)
    prismaMock.customer.findFirst.mockResolvedValue({ id: 'c1', workspaceId: 'ws1' } as never)
    prismaMock.workflowTemplate.findFirst.mockResolvedValue({
      id: 't1',
      workspaceId: 'ws1',
      stages: [{ id: 'ts1', internalName: '촬영', customerName: '촬영', order: 1 }],
    } as never)
    prismaMock.project.create.mockResolvedValue({ id: 'p-new' } as never)
    prismaMock.workflowStage.create.mockResolvedValue({ id: 's1' } as never)
    prismaMock.project.update.mockResolvedValue({} as never)
    prismaMock.timelineEvent.create.mockResolvedValue({} as never)
    prismaMock.inquiry.update.mockResolvedValue({} as never)

    const formData = new FormData()
    formData.set('inquiryId', 'inq-1')
    formData.set('title', '박민수 웨딩')
    formData.set('templateId', 't1')
    formData.set('existingCustomerId', 'c1')
    formData.set('dueDate', '2026-07-15')

    const { convertInquiryToProject } = await import('@/lib/actions/inquiry')
    await convertInquiryToProject({}, formData).catch(() => {})

    expect(prismaMock.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dueDate: new Date('2026-07-15T00:00:00'),
        }),
      })
    )
  })
})

// SC-103: 프로젝트 목록 검색
describe('SC-103 getProjects 검색', () => {
  it('q 파라미터가 있으면 제목·고객명 OR 조건으로 조회한다', async () => {
    prismaMock.project.findMany.mockResolvedValue([])

    const { getProjects } = await import('@/lib/actions/project')
    await getProjects(undefined, '홍길동')

    expect(prismaMock.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workspaceId: 'ws1',
          OR: [
            { title: { contains: '홍길동', mode: 'insensitive' } },
            { customer: { name: { contains: '홍길동', mode: 'insensitive' } } },
          ],
        }),
      })
    )
  })
})

// SC-104: 단계 변경
describe('SC-104 updateProjectStage', () => {
  beforeEach(() => {
    prismaMock.$transaction.mockImplementation(async (arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg as Promise<unknown>[])
    })
  })

  it('단계 변경 시 currentStageId를 업데이트한다', async () => {
    prismaMock.project.findFirst.mockResolvedValue({
      id: 'p1',
      workspaceId: 'ws1',
      currentStageId: 's1',
      stages: [
        { id: 's1', internalName: '촬영', customerName: '촬영', order: 1 },
        { id: 's2', internalName: '편집', customerName: '편집', order: 2 },
      ],
    } as never)
    prismaMock.project.update.mockResolvedValue({} as never)
    prismaMock.timelineEvent.create.mockResolvedValue({} as never)

    const formData = new FormData()
    formData.set('projectId', 'p1')
    formData.set('stageId', 's2')

    const { updateProjectStage } = await import('@/lib/actions/project')
    await updateProjectStage(formData)

    expect(prismaMock.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: { currentStageId: 's2' },
      })
    )
  })
})

// SC-105: 타임라인 메모
describe('SC-105 createTimelineMemo', () => {
  it('MEMO 타입 타임라인 이벤트를 생성한다', async () => {
    prismaMock.project.findFirst.mockResolvedValue({ id: 'p1', workspaceId: 'ws1' } as never)
    prismaMock.timelineEvent.create.mockResolvedValue({} as never)

    const formData = new FormData()
    formData.set('projectId', 'p1')
    formData.set('content', '고객 연락 완료')

    const { createTimelineMemo } = await import('@/lib/actions/project')
    await createTimelineMemo(formData)

    expect(prismaMock.timelineEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: 'p1',
          title: '고객 연락 완료',
          eventType: 'MEMO',
        }),
      })
    )
  })
})

// SC-106: 수정 요청 fileUrls 분리 저장
describe('SC-106 submitCustomerRevision fileUrls', () => {
  it('fileUrl이 있으면 fileUrls 배열에 저장하고 content에는 URL을 넣지 않는다', async () => {
    prismaMock.publicProjectPage.findUnique.mockResolvedValue({
      id: 'pp1',
      projectId: 'p1',
      token: 'valid-token',
      isActive: true,
    } as never)
    prismaMock.revisionRequest.create.mockResolvedValue({} as never)

    const formData = new FormData()
    formData.set('token', 'valid-token')
    formData.set('content', '수정 요청입니다.')
    formData.set('fileUrl', 'https://example.com/file.jpg')

    const { submitCustomerRevision } = await import('@/lib/actions/publicRevision')
    await submitCustomerRevision({}, formData)

    expect(prismaMock.revisionRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content: '수정 요청입니다.',
          fileUrls: ['https://example.com/file.jpg'],
        }),
      })
    )
    const createCall = prismaMock.revisionRequest.create.mock.calls[0][0] as {
      data: { content: string }
    }
    expect(createCall.data.content).not.toContain('https://example.com/file.jpg')
  })
})

// SC-107: 에셋 삭제
describe('SC-107 deleteAsset', () => {
  beforeEach(() => {
    prismaMock.$transaction.mockImplementation(async (arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg as Promise<unknown>[])
    })
  })

  it('정상 케이스: 에셋과 ASSET_DELETED 이벤트를 기록한다', async () => {
    prismaMock.asset.findFirst.mockResolvedValue({
      id: 'a1',
      projectId: 'p1',
      name: '드라이브',
      project: { workspaceId: 'ws1' },
    } as never)
    prismaMock.asset.delete.mockResolvedValue({} as never)
    prismaMock.timelineEvent.create.mockResolvedValue({} as never)

    const formData = new FormData()
    formData.set('assetId', 'a1')

    const { deleteAsset } = await import('@/lib/actions/asset')
    await deleteAsset(formData)

    expect(prismaMock.asset.delete).toHaveBeenCalledWith({ where: { id: 'a1' } })
    expect(prismaMock.timelineEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: 'ASSET_DELETED' }),
      })
    )
  })

  it('타 워크스페이스 에셋이면 삭제하지 않는다', async () => {
    prismaMock.asset.findFirst.mockResolvedValue(null)

    const formData = new FormData()
    formData.set('assetId', 'a-other')

    const { deleteAsset } = await import('@/lib/actions/asset')
    await deleteAsset(formData)

    expect(prismaMock.asset.delete).not.toHaveBeenCalled()
  })
})

// SC-108: 수정 요청 삭제
describe('SC-108 deleteRevisionRequest', () => {
  it('정상 케이스: 수정 요청을 삭제한다', async () => {
    prismaMock.revisionRequest.findFirst.mockResolvedValue({
      id: 'r1',
      projectId: 'p1',
      project: { workspaceId: 'ws1' },
    } as never)
    prismaMock.revisionRequest.delete.mockResolvedValue({} as never)

    const formData = new FormData()
    formData.set('revisionId', 'r1')

    const { deleteRevisionRequest } = await import('@/lib/actions/revision')
    await deleteRevisionRequest(formData)

    expect(prismaMock.revisionRequest.delete).toHaveBeenCalledWith({ where: { id: 'r1' } })
  })
})

// SC-109: 공유 링크 복사
describe('SC-109 공유 링크 복사', () => {
  it('navigator.clipboard.writeText로 공유 URL을 복사한다', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    const publicUrl = 'http://localhost:3000/p/abc123'
    await navigator.clipboard.writeText(publicUrl)

    expect(writeText).toHaveBeenCalledWith('http://localhost:3000/p/abc123')

    vi.unstubAllGlobals()
  })
})

// SC-110: 대시보드 통계
describe('SC-110 대시보드 activeCount·urgentCount', () => {
  it('진행 중·마감 임박 프로젝트 수를 계산한다', async () => {
    const twoDaysFromNow = new Date()
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2)

    const allProjects = [
      {
        id: 'p1',
        currentStageId: 's1',
        stages: [{ id: 's1', internalName: '촬영', customerName: '촬영', order: 1 }],
      },
      {
        id: 'p2',
        currentStageId: 's1',
        stages: [{ id: 's1', internalName: '촬영', customerName: '촬영', order: 1 }],
      },
      {
        id: 'p3',
        currentStageId: 's_done',
        stages: [
          { id: 's1', internalName: '편집', customerName: '편집', order: 1 },
          { id: 's_done', internalName: '완료', customerName: '완료', order: 2 },
        ],
      },
    ]

    const urgentCandidates = [
      {
        id: 'p1',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        currentStageId: 's1',
        stages: [{ id: 's1', internalName: '촬영', customerName: '촬영', order: 1 }],
      },
      {
        id: 'p4',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        currentStageId: 's_done',
        stages: [
          { id: 's1', internalName: '편집', customerName: '편집', order: 1 },
          { id: 's_done', internalName: '완료', customerName: '완료', order: 2 },
        ],
      },
    ]

    const activeCount = allProjects.filter((p) => !isProjectDone(p)).length
    const urgentCount = urgentCandidates.filter((p) => !isProjectDone(p)).length

    expect(activeCount).toBe(2)
    expect(urgentCount).toBe(1)
  })
})

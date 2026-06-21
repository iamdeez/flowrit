import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockDeep, mockReset } from 'vitest-mock-extended'
import type { PrismaClient } from '@/app/generated/prisma/client'

const prismaMock = mockDeep<PrismaClient>()

vi.mock('@/lib/db', () => ({ prisma: prismaMock }))
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))

const SESSION = {
  user: { id: 'u1', workspaceId: 'ws1', email: 'test@example.com', name: 'Test' },
} as never

beforeEach(async () => {
  mockReset(prismaMock)
  const { auth } = await import('@/lib/auth')
  vi.mocked(auth).mockResolvedValue(SESSION)
})

// SC-006: 수정 요청 등록 → 상태 변경 (OPEN → IN_PROGRESS → DONE)
describe('createRevisionRequest (SC-006)', () => {
  beforeEach(() => {
    prismaMock.$transaction.mockImplementation(async (arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg as Promise<unknown>[])
      if (typeof arg === 'function') return (arg as (tx: typeof prismaMock) => Promise<unknown>)(prismaMock)
    })
  })

  it('수정 요청을 source=MANUAL로 생성하고 타임라인 이벤트를 기록한다', async () => {
    prismaMock.project.findFirst.mockResolvedValue({
      id: 'p1',
      workspaceId: 'ws1',
    } as never)
    prismaMock.revisionRequest.create.mockResolvedValue({
      id: 'r1',
      projectId: 'p1',
      content: '배경 수정 요청',
      priority: 'MEDIUM',
    } as never)
    prismaMock.timelineEvent.create.mockResolvedValue({} as never)

    const formData = new FormData()
    formData.set('projectId', 'p1')
    formData.set('content', '배경 수정 요청')
    formData.set('priority', 'MEDIUM')

    const { createRevisionRequest } = await import('@/lib/actions/revision')
    const result = await createRevisionRequest({}, formData)

    expect(result.error).toBeUndefined()
    expect(prismaMock.revisionRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: 'p1',
          content: '배경 수정 요청',
          source: 'MANUAL',
        }),
      })
    )
    expect(prismaMock.timelineEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: 'REVISION_CREATED' }),
      })
    )
  })

  it('내용이 없으면 에러를 반환한다', async () => {
    const formData = new FormData()
    formData.set('projectId', 'p1')
    formData.set('content', '')

    const { createRevisionRequest } = await import('@/lib/actions/revision')
    const result = await createRevisionRequest({}, formData)

    expect(result.error).toBeDefined()
    expect(prismaMock.revisionRequest.create).not.toHaveBeenCalled()
  })

  it('잘못된 우선순위이면 에러를 반환한다', async () => {
    const formData = new FormData()
    formData.set('projectId', 'p1')
    formData.set('content', '내용')
    formData.set('priority', 'INVALID')

    const { createRevisionRequest } = await import('@/lib/actions/revision')
    const result = await createRevisionRequest({}, formData)

    expect(result.error).toBeDefined()
  })
})

describe('updateRevisionStatus (SC-006)', () => {
  beforeEach(() => {
    prismaMock.$transaction.mockImplementation(async (arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg as Promise<unknown>[])
      if (typeof arg === 'function') return (arg as (tx: typeof prismaMock) => Promise<unknown>)(prismaMock)
    })
  })

  it('OPEN → IN_PROGRESS로 상태를 변경한다', async () => {
    prismaMock.revisionRequest.findFirst.mockResolvedValue({
      id: 'r1',
      projectId: 'p1',
      status: 'OPEN',
      project: { workspaceId: 'ws1' },
    } as never)
    prismaMock.revisionRequest.update.mockResolvedValue({ id: 'r1', status: 'IN_PROGRESS' } as never)
    prismaMock.timelineEvent.create.mockResolvedValue({} as never)

    const formData = new FormData()
    formData.set('revisionId', 'r1')
    formData.set('status', 'IN_PROGRESS')

    const { updateRevisionStatus } = await import('@/lib/actions/revision')
    await updateRevisionStatus(formData)

    expect(prismaMock.revisionRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'r1' },
        data: { status: 'IN_PROGRESS' },
      })
    )
    expect(prismaMock.timelineEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: 'REVISION_STATUS_CHANGE' }),
      })
    )
  })

  it('IN_PROGRESS → DONE으로 상태를 변경한다', async () => {
    prismaMock.revisionRequest.findFirst.mockResolvedValue({
      id: 'r1',
      projectId: 'p1',
      status: 'IN_PROGRESS',
      project: { workspaceId: 'ws1' },
    } as never)
    prismaMock.revisionRequest.update.mockResolvedValue({ id: 'r1', status: 'DONE' } as never)
    prismaMock.timelineEvent.create.mockResolvedValue({} as never)

    const formData = new FormData()
    formData.set('revisionId', 'r1')
    formData.set('status', 'DONE')

    const { updateRevisionStatus } = await import('@/lib/actions/revision')
    await updateRevisionStatus(formData)

    expect(prismaMock.revisionRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'DONE' } })
    )
  })

  it('잘못된 상태값이면 업데이트하지 않는다', async () => {
    const formData = new FormData()
    formData.set('revisionId', 'r1')
    formData.set('status', 'INVALID_STATUS')

    const { updateRevisionStatus } = await import('@/lib/actions/revision')
    await updateRevisionStatus(formData)

    expect(prismaMock.revisionRequest.update).not.toHaveBeenCalled()
  })
})

// SC-007: 고객이 고객용 페이지에서 제출한 수정 요청 → source=CUSTOMER_PORTAL
describe('submitCustomerRevision (SC-007)', () => {
  it('유효한 토큰으로 CUSTOMER_PORTAL 수정 요청을 생성한다', async () => {
    prismaMock.publicProjectPage.findUnique.mockResolvedValue({
      id: 'pp1',
      projectId: 'p1',
      token: 'valid-token',
      isActive: true,
    } as never)
    prismaMock.revisionRequest.create.mockResolvedValue({
      id: 'r-new',
      projectId: 'p1',
      source: 'CUSTOMER_PORTAL',
    } as never)

    const formData = new FormData()
    formData.set('token', 'valid-token')
    formData.set('content', '배경을 더 밝게 수정해 주세요.')

    const { submitCustomerRevision } = await import('@/lib/actions/publicRevision')
    const result = await submitCustomerRevision({}, formData)

    expect(result.success).toBe(true)
    expect(prismaMock.revisionRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: 'p1',
          source: 'CUSTOMER_PORTAL',
        }),
      })
    )
  })

  it('유효하지 않은 토큰이면 에러를 반환한다', async () => {
    prismaMock.publicProjectPage.findUnique.mockResolvedValue(null)

    const formData = new FormData()
    formData.set('token', 'invalid-token')
    formData.set('content', '수정 요청 내용')

    const { submitCustomerRevision } = await import('@/lib/actions/publicRevision')
    const result = await submitCustomerRevision({}, formData)

    expect(result.error).toBeDefined()
    expect(prismaMock.revisionRequest.create).not.toHaveBeenCalled()
  })

  it('내용이 없으면 에러를 반환한다', async () => {
    const formData = new FormData()
    formData.set('token', 'valid-token')
    formData.set('content', '')

    const { submitCustomerRevision } = await import('@/lib/actions/publicRevision')
    const result = await submitCustomerRevision({}, formData)

    expect(result.error).toBeDefined()
    expect(prismaMock.revisionRequest.create).not.toHaveBeenCalled()
  })

  it('첨부 파일 URL이 있으면 fileUrls에 저장하고 content에는 포함하지 않는다', async () => {
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
  })
})

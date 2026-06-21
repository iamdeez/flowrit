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

// SC-004: 프로젝트 생성 → 워크플로우 템플릿 적용 → 단계 변경 → 타임라인 이력 기록
describe('createProject (SC-004)', () => {
  beforeEach(() => {
    prismaMock.$transaction.mockImplementation(async (fn: unknown) => {
      if (typeof fn === 'function') return fn(prismaMock)
    })
  })

  it('고객·템플릿 선택 시 프로젝트와 단계를 생성하고 타임라인 이벤트를 기록한다', async () => {
    prismaMock.customer.findFirst.mockResolvedValue({ id: 'c1', workspaceId: 'ws1' } as never)
    prismaMock.workflowTemplate.findFirst.mockResolvedValue({
      id: 't1',
      workspaceId: 'ws1',
      name: '웨딩 기본',
      stages: [
        { id: 'ts1', internalName: '촬영', customerName: '촬영', order: 1 },
        { id: 'ts2', internalName: '편집', customerName: '편집', order: 2 },
      ],
    } as never)
    prismaMock.project.create.mockResolvedValue({ id: 'p-new', workspaceId: 'ws1', title: '홍길동 웨딩' } as never)
    prismaMock.workflowStage.create
      .mockResolvedValueOnce({ id: 's1', internalName: '촬영', order: 1 } as never)
      .mockResolvedValueOnce({ id: 's2', internalName: '편집', order: 2 } as never)
    prismaMock.project.update.mockResolvedValue({ id: 'p-new', currentStageId: 's1' } as never)
    prismaMock.timelineEvent.create.mockResolvedValue({} as never)

    const formData = new FormData()
    formData.set('customerId', 'c1')
    formData.set('title', '홍길동 웨딩')
    formData.set('templateId', 't1')

    const { createProject } = await import('@/lib/actions/project')
    await createProject({}, formData).catch(() => {}) // redirect throws

    expect(prismaMock.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ workspaceId: 'ws1', title: '홍길동 웨딩' }),
      })
    )
    expect(prismaMock.workflowStage.create).toHaveBeenCalledTimes(2)
    expect(prismaMock.timelineEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: 'PROJECT_CREATED' }),
      })
    )
  })

  it('고객 선택이 없으면 에러를 반환한다', async () => {
    const formData = new FormData()
    formData.set('customerId', '')
    formData.set('title', '프로젝트')
    formData.set('templateId', 't1')

    const { createProject } = await import('@/lib/actions/project')
    const result = await createProject({}, formData)

    expect(result.error).toBeDefined()
    expect(prismaMock.project.create).not.toHaveBeenCalled()
  })

  it('템플릿 선택이 없으면 에러를 반환한다', async () => {
    const formData = new FormData()
    formData.set('customerId', 'c1')
    formData.set('title', '프로젝트')
    formData.set('templateId', '')

    const { createProject } = await import('@/lib/actions/project')
    const result = await createProject({}, formData)

    expect(result.error).toBeDefined()
  })
})

describe('updateProjectStage (SC-004)', () => {
  beforeEach(() => {
    prismaMock.$transaction.mockImplementation(async (arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg as Promise<unknown>[])
    })
  })

  it('단계를 변경하면 currentStageId를 업데이트하고 STAGE_CHANGE 이벤트를 기록한다', async () => {
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
    expect(prismaMock.timelineEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'STAGE_CHANGE',
          metadata: expect.objectContaining({ nextStageId: 's2' }),
        }),
      })
    )
  })

  it('이미 현재 단계이면 업데이트하지 않는다', async () => {
    prismaMock.project.findFirst.mockResolvedValue({
      id: 'p1',
      workspaceId: 'ws1',
      currentStageId: 's1',
      stages: [{ id: 's1', internalName: '촬영', customerName: '촬영', order: 1 }],
    } as never)

    const formData = new FormData()
    formData.set('projectId', 'p1')
    formData.set('stageId', 's1') // 이미 현재 단계

    const { updateProjectStage } = await import('@/lib/actions/project')
    await updateProjectStage(formData)

    expect(prismaMock.project.update).not.toHaveBeenCalled()
  })
})

// SC-005: 워크플로우 템플릿 생성 및 단계 설정
describe('createWorkflowTemplate (SC-005)', () => {
  it('템플릿과 단계를 생성한다', async () => {
    prismaMock.workflowTemplate.findFirst.mockResolvedValue(null)
    prismaMock.workflowTemplate.create.mockResolvedValue({
      id: 't-new',
      workspaceId: 'ws1',
      name: '사진 기본',
    } as never)

    const formData = new FormData()
    formData.set('name', '사진 기본')
    formData.set('industry', '사진')
    formData.append('stageInternalName', '촬영')
    formData.append('stageCustomerName', '촬영')
    formData.append('stageInternalName', '보정')
    formData.append('stageCustomerName', '보정 중')
    formData.append('stageInternalName', '완료')
    formData.append('stageCustomerName', '완료')

    const { createWorkflowTemplate } = await import('@/lib/actions/template')
    const result = await createWorkflowTemplate({}, formData)

    expect(result.error).toBeUndefined()
    expect(prismaMock.workflowTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workspaceId: 'ws1',
          name: '사진 기본',
          stages: {
            create: [
              expect.objectContaining({ internalName: '촬영', customerName: '촬영', order: 1 }),
              expect.objectContaining({ internalName: '보정', customerName: '보정 중', order: 2 }),
              expect.objectContaining({ internalName: '완료', customerName: '완료', order: 3 }),
            ],
          },
        }),
      })
    )
  })

  it('템플릿 이름이 없으면 에러를 반환한다', async () => {
    const formData = new FormData()
    formData.set('name', '')
    formData.append('stageInternalName', '촬영')
    formData.append('stageCustomerName', '촬영')

    const { createWorkflowTemplate } = await import('@/lib/actions/template')
    const result = await createWorkflowTemplate({}, formData)

    expect(result.error).toBeDefined()
    expect(prismaMock.workflowTemplate.create).not.toHaveBeenCalled()
  })

  it('단계가 없으면 에러를 반환한다', async () => {
    const formData = new FormData()
    formData.set('name', '템플릿')

    const { createWorkflowTemplate } = await import('@/lib/actions/template')
    const result = await createWorkflowTemplate({}, formData)

    expect(result.error).toBeDefined()
  })

  it('단계 내부명 또는 고객 표시명이 없으면 에러를 반환한다', async () => {
    const formData = new FormData()
    formData.set('name', '템플릿')
    formData.append('stageInternalName', '촬영')
    formData.append('stageCustomerName', '') // 고객 표시명 없음

    const { createWorkflowTemplate } = await import('@/lib/actions/template')
    const result = await createWorkflowTemplate({}, formData)

    expect(result.error).toBeDefined()
  })
})

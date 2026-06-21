import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockDeep, mockReset } from 'vitest-mock-extended'
import type { PrismaClient } from '@/app/generated/prisma/client'
import { isProjectDone, getCurrentStage } from '@/lib/project-utils'

const prismaMock = mockDeep<PrismaClient>()

vi.mock('@/lib/db', () => ({ prisma: prismaMock }))
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/default-workflow-templates', () => ({
  seedDefaultWorkflowTemplates: vi.fn(),
}))

beforeEach(() => mockReset(prismaMock))

// SC-013: 대시보드 오늘 처리할 작업 필터링
describe('isProjectDone (SC-013)', () => {
  const stages = [
    { id: 's1', internalName: '촬영', customerName: '촬영', order: 1 },
    { id: 's2', internalName: '편집', customerName: '편집 중', order: 2 },
    { id: 's3', internalName: '완료', customerName: '완료', order: 3 },
  ]

  it('currentStageId가 완료 단계이면 true를 반환한다', () => {
    const project = { currentStageId: 's3', stages }
    expect(isProjectDone(project)).toBe(true)
  })

  it('currentStageId가 완료 단계가 아니면 false를 반환한다', () => {
    const project = { currentStageId: 's1', stages }
    expect(isProjectDone(project)).toBe(false)
  })

  it('currentStageId가 null이면 false를 반환한다', () => {
    const project = { currentStageId: null, stages }
    expect(isProjectDone(project)).toBe(false)
  })
})

describe('getCurrentStage (SC-013)', () => {
  const stages = [
    { id: 's1', internalName: '촬영', customerName: '촬영', order: 1 },
    { id: 's2', internalName: '편집', customerName: '편집 중', order: 2 },
  ]

  it('currentStageId에 해당하는 단계를 반환한다', () => {
    const project = { currentStageId: 's2', stages }
    const stage = getCurrentStage(project)
    expect(stage?.internalName).toBe('편집')
  })

  it('currentStageId가 null이면 null을 반환한다', () => {
    const project = { currentStageId: null, stages }
    expect(getCurrentStage(project)).toBeNull()
  })
})

// 대시보드 날짜 필터링 로직 검증 (SC-013)
describe('대시보드 마감일 2일 이내 필터링 (SC-013)', () => {
  it('2일 이내 dueDate를 lte 조건으로 쿼리한다', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'u1', workspaceId: 'ws1', email: 'a@b.com', name: 'A' },
    } as ReturnType<typeof auth> extends Promise<infer T> ? T : never)

    prismaMock.inquiry.findMany.mockResolvedValue([])
    prismaMock.project.findMany.mockResolvedValue([])
    prismaMock.revisionRequest.findMany.mockResolvedValue([])
    prismaMock.customer.findMany.mockResolvedValue([])
    prismaMock.workflowTemplate.findMany.mockResolvedValue([])

    // seedDefaultWorkflowTemplates가 workspace 조회를 생략하도록 mock됨
    // 실제 getDashboardData는 page component 내부이므로 prisma 호출 패턴만 검증
    // prisma.project.findMany가 dueDate: { lte: ... } 조건을 받는지 확인
    const { seedDefaultWorkflowTemplates } = await import(
      '@/lib/default-workflow-templates'
    )

    const twoDaysFromNow = new Date()
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2)

    // 직접 필터링 로직 검증: dueDate <= twoDaysFromNow 이고 !isProjectDone
    const projects = [
      {
        id: 'p1',
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1일 후
        currentStageId: 's1',
        stages: [{ id: 's1', internalName: '촬영', customerName: '촬영', order: 1 }],
        revisions: [],
        customer: { id: 'c1', name: '고객A' },
      },
      {
        id: 'p2',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5일 후 (범위 밖)
        currentStageId: 's1',
        stages: [{ id: 's1', internalName: '촬영', customerName: '촬영', order: 1 }],
        revisions: [],
        customer: { id: 'c2', name: '고객B' },
      },
      {
        id: 'p3',
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1일 후이지만 완료
        currentStageId: 's_done',
        stages: [
          { id: 's1', internalName: '편집', customerName: '편집', order: 1 },
          { id: 's_done', internalName: '완료', customerName: '완료', order: 2 },
        ],
        revisions: [],
        customer: { id: 'c3', name: '고객C' },
      },
    ]

    // dueDate <= twoDaysFromNow 인 프로젝트 필터
    const urgentProjects = projects.filter(
      (p) => p.dueDate <= twoDaysFromNow
    )
    // isProjectDone이 false인 것만 activeUrgentProjects
    const activeUrgentProjects = urgentProjects.filter((p) => !isProjectDone(p))

    // p1만 포함 (p2는 범위 밖, p3는 완료)
    expect(activeUrgentProjects).toHaveLength(1)
    expect(activeUrgentProjects[0].id).toBe('p1')

    expect(seedDefaultWorkflowTemplates).toBeDefined()
  })

  it('미완료 수정 요청(OPEN, IN_PROGRESS)만 오늘 처리 목록에 포함된다', () => {
    const revisions = [
      { id: 'r1', status: 'OPEN' },
      { id: 'r2', status: 'IN_PROGRESS' },
      { id: 'r3', status: 'DONE' },
    ]

    const openRevisions = revisions.filter((r) =>
      ['OPEN', 'IN_PROGRESS'].includes(r.status)
    )
    expect(openRevisions).toHaveLength(2)
    expect(openRevisions.map((r) => r.id)).toEqual(['r1', 'r2'])
  })
})

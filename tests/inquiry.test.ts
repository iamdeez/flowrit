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

// SC-011: 신규 의뢰 접수 → 대시보드 신규 접수 목록 → 프로젝트 전환
describe('submitInquiry (SC-011)', () => {
  it('유효한 슬러그로 의뢰를 제출하면 Inquiry를 생성한다', async () => {
    prismaMock.workspace.findUnique.mockResolvedValue({
      id: 'ws1',
      slug: 'my-workspace',
    } as never)
    prismaMock.inquiry.create.mockResolvedValue({
      id: 'inq-1',
      workspaceId: 'ws1',
      name: '박민수',
      content: '웨딩 촬영 문의드립니다.',
      status: 'PENDING',
    } as never)

    const formData = new FormData()
    formData.set('name', '박민수')
    formData.set('contact', '010-9999-8888')
    formData.set('content', '웨딩 촬영 문의드립니다.')

    const { submitInquiry } = await import('@/lib/actions/inquiry')
    const result = await submitInquiry('my-workspace', {}, formData)

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
    expect(prismaMock.inquiry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workspaceId: 'ws1',
          name: '박민수',
          content: '웨딩 촬영 문의드립니다.',
        }),
      })
    )
  })

  it('존재하지 않는 워크스페이스 슬러그이면 에러를 반환한다', async () => {
    prismaMock.workspace.findUnique.mockResolvedValue(null)

    const formData = new FormData()
    formData.set('name', '이름')
    formData.set('content', '내용')

    const { submitInquiry } = await import('@/lib/actions/inquiry')
    const result = await submitInquiry('nonexistent-slug', {}, formData)

    expect(result.error).toBeDefined()
    expect(prismaMock.inquiry.create).not.toHaveBeenCalled()
  })

  it('이름이 없으면 에러를 반환한다', async () => {
    prismaMock.workspace.findUnique.mockResolvedValue({ id: 'ws1' } as never)

    const formData = new FormData()
    formData.set('name', '')
    formData.set('content', '내용')

    const { submitInquiry } = await import('@/lib/actions/inquiry')
    const result = await submitInquiry('my-workspace', {}, formData)

    expect(result.error).toBeDefined()
  })

  it('의뢰 내용이 없으면 에러를 반환한다', async () => {
    prismaMock.workspace.findUnique.mockResolvedValue({ id: 'ws1' } as never)

    const formData = new FormData()
    formData.set('name', '박민수')
    formData.set('content', '')

    const { submitInquiry } = await import('@/lib/actions/inquiry')
    const result = await submitInquiry('my-workspace', {}, formData)

    expect(result.error).toBeDefined()
  })

  it('첨부 파일 URL 목록이 있으면 저장한다', async () => {
    prismaMock.workspace.findUnique.mockResolvedValue({ id: 'ws1' } as never)
    prismaMock.inquiry.create.mockResolvedValue({ id: 'inq-1' } as never)

    const fileUrls = ['https://drive.google.com/1', 'https://drive.google.com/2']
    const formData = new FormData()
    formData.set('name', '박민수')
    formData.set('content', '내용')
    formData.set('fileUrls', JSON.stringify(fileUrls))

    const { submitInquiry } = await import('@/lib/actions/inquiry')
    await submitInquiry('my-workspace', {}, formData)

    expect(prismaMock.inquiry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fileUrls,
        }),
      })
    )
  })
})

describe('getPendingInquiries (SC-011)', () => {
  it('PENDING 상태인 의뢰 목록을 반환한다', async () => {
    const inquiries = [
      { id: 'inq-1', name: '박민수', status: 'PENDING', workspaceId: 'ws1' },
      { id: 'inq-2', name: '이영희', status: 'PENDING', workspaceId: 'ws1' },
    ]
    prismaMock.inquiry.findMany.mockResolvedValue(inquiries as never)

    const { getPendingInquiries } = await import('@/lib/actions/inquiry')
    const result = await getPendingInquiries()

    expect(prismaMock.inquiry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workspaceId: 'ws1',
          status: 'PENDING',
        }),
      })
    )
    expect(result).toHaveLength(2)
  })
})

describe('convertInquiryToProject (SC-011)', () => {
  beforeEach(() => {
    prismaMock.$transaction.mockImplementation(async (fn: unknown) => {
      if (typeof fn === 'function') return fn(prismaMock)
    })
  })

  it('기존 고객을 선택하여 프로젝트로 전환한다', async () => {
    prismaMock.inquiry.findFirst.mockResolvedValue({
      id: 'inq-1',
      workspaceId: 'ws1',
      name: '박민수',
      status: 'PENDING',
    } as never)
    prismaMock.customer.findFirst.mockResolvedValue({
      id: 'c1',
      workspaceId: 'ws1',
    } as never)
    prismaMock.workflowTemplate.findFirst.mockResolvedValue({
      id: 't1',
      workspaceId: 'ws1',
      stages: [
        { id: 'ts1', internalName: '촬영', customerName: '촬영', order: 1 },
      ],
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

    const { convertInquiryToProject } = await import('@/lib/actions/inquiry')
    await convertInquiryToProject({}, formData).catch(() => {}) // redirect throws

    expect(prismaMock.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workspaceId: 'ws1',
          customerId: 'c1',
          title: '박민수 웨딩',
        }),
      })
    )
    // 의뢰 상태가 CONVERTED로 변경됨
    expect(prismaMock.inquiry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'CONVERTED' }),
      })
    )
  })

  it('제목이 없으면 에러를 반환한다', async () => {
    const formData = new FormData()
    formData.set('inquiryId', 'inq-1')
    formData.set('title', '')
    formData.set('templateId', 't1')
    formData.set('existingCustomerId', 'c1')

    const { convertInquiryToProject } = await import('@/lib/actions/inquiry')
    const result = await convertInquiryToProject({}, formData)

    expect(result.error).toBeDefined()
  })
})

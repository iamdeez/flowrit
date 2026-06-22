import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockDeep, mockReset } from 'vitest-mock-extended'
import type { PrismaClient } from '@/app/generated/prisma/client'

const prismaMock = mockDeep<PrismaClient>()

vi.mock('@/lib/db', () => ({ prisma: prismaMock }))
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/email', () => ({ sendRevisionCommentReplyEmail: vi.fn() }))
vi.mock('@/lib/notifications', () => ({ sendNotification: vi.fn() }))

const SESSION = {
  user: { id: 'u1', workspaceId: 'ws1', email: 'worker@example.com', name: '작업자' },
} as never

beforeEach(async () => {
  mockReset(prismaMock)
  vi.clearAllMocks()
  const { auth } = await import('@/lib/auth')
  vi.mocked(auth).mockResolvedValue(SESSION)
})

// ────────────────────────────────────────────
// addRevisionComment (작업자 — 인증 필요)
// ────────────────────────────────────────────

// SC-003: 인증된 작업자가 최상위 댓글 작성 → DB 저장, authorType=WORKER, authorName=세션이름
describe('addRevisionComment — SC-003', () => {
  it('test_addRevisionComment_creates_worker_top_level_comment', async () => {
    /**
     * SC-003: 인증된 작업자가 댓글 본문을 작성하고 제출하면,
     * DB에 저장되고 authorType='WORKER', authorName=세션이름으로 기록된다.
     */
    prismaMock.revisionRequest.findFirst.mockResolvedValue({
      id: 'r1',
      projectId: 'p1',
      content: '원본 수정 요청 내용',
      project: {
        workspaceId: 'ws1',
        assigneeId: null,
        publicPage: null,
      },
    } as never)
    prismaMock.revisionComment.create.mockResolvedValue({
      id: 'c1',
      revisionId: 'r1',
      parentId: null,
      authorType: 'WORKER',
      authorName: '작업자',
      content: '댓글 내용입니다',
    } as never)

    const formData = new FormData()
    formData.set('revisionId', 'r1')
    formData.set('content', '댓글 내용입니다')

    const { addRevisionComment } = await import('@/lib/actions/revisionComment')
    const result = await addRevisionComment({}, formData)

    expect(result.error).toBeUndefined()
    expect(prismaMock.revisionComment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          revisionId: 'r1',
          parentId: null,
          authorType: 'WORKER',
          authorName: '작업자',
          content: '댓글 내용입니다',
        }),
      })
    )
  })
})

// SC-004: 인증된 작업자가 기존 댓글에 답글 작성 → parentId 설정됨
describe('addRevisionComment — SC-004', () => {
  it('test_addRevisionComment_creates_worker_reply_with_parentId', async () => {
    /**
     * SC-004: 인증된 작업자가 기존 댓글에 답글을 제출하면,
     * parentId가 원댓글 ID로 설정되어 DB에 저장된다.
     */
    prismaMock.revisionRequest.findFirst.mockResolvedValue({
      id: 'r1',
      projectId: 'p1',
      content: '원본 수정 요청 내용',
      project: {
        workspaceId: 'ws1',
        assigneeId: null,
        publicPage: null,
      },
    } as never)
    // 부모 댓글 — 루트 댓글(parentId: null)이어야 답글 가능 (NFR-005)
    prismaMock.revisionComment.findFirst.mockResolvedValue({
      id: 'c1',
      parentId: null,
      authorType: 'CLIENT',
      authorEmail: null,
    } as never)
    prismaMock.revisionComment.create.mockResolvedValue({
      id: 'c2',
      revisionId: 'r1',
      parentId: 'c1',
      authorType: 'WORKER',
      authorName: '작업자',
      content: '답글 내용입니다',
    } as never)

    const formData = new FormData()
    formData.set('revisionId', 'r1')
    formData.set('content', '답글 내용입니다')
    formData.set('parentId', 'c1')

    const { addRevisionComment } = await import('@/lib/actions/revisionComment')
    const result = await addRevisionComment({}, formData)

    expect(result.error).toBeUndefined()
    expect(prismaMock.revisionComment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          parentId: 'c1',
          authorType: 'WORKER',
        }),
      })
    )
  })
})

// SC-008: 작업자가 클라이언트 댓글(이메일 있음)에 답글 → 이메일 발송
//         이메일 없으면 미발송
describe('addRevisionComment — SC-008', () => {
  it('test_addRevisionComment_reply_to_client_sends_email', async () => {
    /**
     * SC-008 (Happy Path): 작업자가 authorEmail이 있는 클라이언트 댓글에 답글을 달면,
     * sendRevisionCommentReplyEmail이 클라이언트 이메일 주소로 호출된다.
     */
    prismaMock.revisionRequest.findFirst.mockResolvedValue({
      id: 'r1',
      projectId: 'p1',
      content: '원본 수정 요청 내용',
      project: {
        workspaceId: 'ws1',
        assigneeId: null,
        publicPage: { token: 'tok123' },
      },
    } as never)
    // 부모 댓글이 CLIENT이고 authorEmail이 있는 경우
    prismaMock.revisionComment.findFirst.mockResolvedValue({
      id: 'c1',
      parentId: null,
      authorType: 'CLIENT',
      authorEmail: 'client@example.com',
    } as never)
    prismaMock.revisionComment.create.mockResolvedValue({ id: 'c2' } as never)

    const formData = new FormData()
    formData.set('revisionId', 'r1')
    formData.set('content', '작업자 답글')
    formData.set('parentId', 'c1')

    const { addRevisionComment } = await import('@/lib/actions/revisionComment')
    await addRevisionComment({}, formData)

    const { sendRevisionCommentReplyEmail } = await import('@/lib/email')
    expect(sendRevisionCommentReplyEmail).toHaveBeenCalledWith(
      'client@example.com',
      expect.objectContaining({
        authorName: '작업자',
        replyContent: '작업자 답글',
      })
    )
  })

  it('test_addRevisionComment_reply_to_client_no_email_skips_send', async () => {
    /**
     * SC-008 (Edge Case): 부모 댓글의 authorEmail이 null이면 이메일을 발송하지 않는다.
     * 클라이언트가 이메일을 입력하지 않은 경우이다.
     */
    prismaMock.revisionRequest.findFirst.mockResolvedValue({
      id: 'r1',
      projectId: 'p1',
      content: '원본 수정 요청 내용',
      project: {
        workspaceId: 'ws1',
        assigneeId: null,
        publicPage: null,
      },
    } as never)
    // 부모 댓글이 CLIENT이지만 authorEmail 없음
    prismaMock.revisionComment.findFirst.mockResolvedValue({
      id: 'c1',
      parentId: null,
      authorType: 'CLIENT',
      authorEmail: null,
    } as never)
    prismaMock.revisionComment.create.mockResolvedValue({ id: 'c2' } as never)

    const formData = new FormData()
    formData.set('revisionId', 'r1')
    formData.set('content', '작업자 답글')
    formData.set('parentId', 'c1')

    const { addRevisionComment } = await import('@/lib/actions/revisionComment')
    await addRevisionComment({}, formData)

    const { sendRevisionCommentReplyEmail } = await import('@/lib/email')
    expect(sendRevisionCommentReplyEmail).not.toHaveBeenCalled()
  })
})

// SC-012: 댓글 본문 공란·2001자 초과 거부 (작업자)
describe('addRevisionComment — SC-012', () => {
  it('test_addRevisionComment_rejects_empty_content', async () => {
    /**
     * SC-012 (Error Case): 작업자가 본문을 공란으로 제출하면 거부된다.
     */
    const formData = new FormData()
    formData.set('revisionId', 'r1')
    formData.set('content', '')

    const { addRevisionComment } = await import('@/lib/actions/revisionComment')
    const result = await addRevisionComment({}, formData)

    expect(result.error).toBeDefined()
    expect(prismaMock.revisionComment.create).not.toHaveBeenCalled()
  })

  it('test_addRevisionComment_rejects_content_over_2000_chars', async () => {
    /**
     * SC-012 (Error Case): 작업자가 본문을 2001자 이상으로 제출하면 거부된다.
     * spec NFR-002: 댓글 본문은 1자 이상 2,000자 이하여야 한다.
     */
    const formData = new FormData()
    formData.set('revisionId', 'r1')
    formData.set('content', 'a'.repeat(2001))

    const { addRevisionComment } = await import('@/lib/actions/revisionComment')
    const result = await addRevisionComment({}, formData)

    expect(result.error).toBeDefined()
    expect(prismaMock.revisionComment.create).not.toHaveBeenCalled()
  })
})

// SC-014: 답글(depth=1)에 재답글 시도 거부 (작업자)
describe('addRevisionComment — SC-014', () => {
  it('test_addRevisionComment_rejects_reply_to_depth1_comment', async () => {
    /**
     * SC-014 (Error Case): 이미 답글(parentId가 null이 아닌)인 댓글에
     * 다시 답글을 달려는 요청은 거부된다.
     * spec NFR-005: 댓글 스레드 depth는 최대 1단계로 제한한다.
     */
    prismaMock.revisionRequest.findFirst.mockResolvedValue({
      id: 'r1',
      projectId: 'p1',
      content: '원본 수정 요청 내용',
      project: { workspaceId: 'ws1', assigneeId: null, publicPage: null },
    } as never)
    // 부모 댓글이 이미 답글(parentId가 null이 아님) — depth=1
    prismaMock.revisionComment.findFirst.mockResolvedValue({
      id: 'c2',
      parentId: 'c1', // 이미 depth=1인 댓글
    } as never)

    const formData = new FormData()
    formData.set('revisionId', 'r1')
    formData.set('content', '재답글 시도')
    formData.set('parentId', 'c2')

    const { addRevisionComment } = await import('@/lib/actions/revisionComment')
    const result = await addRevisionComment({}, formData)

    expect(result.error).toBeDefined()
    expect(prismaMock.revisionComment.create).not.toHaveBeenCalled()
  })
})

// ────────────────────────────────────────────
// getRevisionComments (작업자 — 인증 필요)
// ────────────────────────────────────────────

// SC-009: DONE 상태 수정 요청에 달린 댓글 정상 조회
describe('getRevisionComments — SC-009', () => {
  it('test_getRevisionComments_returns_comments_for_done_status_revision', async () => {
    /**
     * SC-009: 수정 요청 상태가 DONE으로 변경된 후에도 댓글이 정상 조회된다.
     * spec FR-012: 수정 요청이 DONE 또는 REJECTED 상태여도 댓글은 삭제되지 않고 조회 가능하다.
     */
    const mockComments = [
      {
        id: 'c1',
        revisionId: 'r1',
        parentId: null,
        authorType: 'WORKER',
        authorName: '작업자',
        content: '댓글',
        createdAt: new Date('2026-06-22T10:00:00Z'),
        replies: [],
      },
    ]
    prismaMock.revisionComment.findMany.mockResolvedValue(mockComments as never)

    const { getRevisionComments } = await import('@/lib/actions/revisionComment')
    const result = await getRevisionComments('r1')

    expect(result).toEqual(mockComments)
    expect(prismaMock.revisionComment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ revisionId: 'r1' }),
      })
    )
  })
})

// SC-015: 댓글 목록이 createdAt 오름차순으로 반환됨
describe('getRevisionComments — SC-015', () => {
  it('test_getRevisionComments_orders_by_createdAt_asc', async () => {
    /**
     * SC-015: getRevisionComments 호출 시 createdAt 오름차순(asc) orderBy 쿼리가 사용된다.
     * spec NFR-006: 댓글 목록은 최신 작성일시 기준 오름차순으로 정렬된다.
     */
    prismaMock.revisionComment.findMany.mockResolvedValue([] as never)

    const { getRevisionComments } = await import('@/lib/actions/revisionComment')
    await getRevisionComments('r1')

    expect(prismaMock.revisionComment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'asc' },
        include: expect.objectContaining({
          replies: expect.objectContaining({
            orderBy: { createdAt: 'asc' },
          }),
        }),
      })
    )
  })
})

// ────────────────────────────────────────────
// addClientRevisionComment (클라이언트 — 비인증, 토큰 기반)
// ────────────────────────────────────────────

// SC-005: 클라이언트 댓글 작성 → DB 저장, authorType=CLIENT, authorName=입력값
describe('addClientRevisionComment — SC-005', () => {
  it('test_addClientRevisionComment_creates_client_comment', async () => {
    /**
     * SC-005: 클라이언트가 이름·이메일·본문을 입력하고 댓글을 제출하면,
     * DB에 authorType='CLIENT', authorName=입력값으로 저장된다.
     */
    prismaMock.publicProjectPage.findUnique.mockResolvedValue({
      id: 'pp1',
      projectId: 'p1',
      token: 'valid-token',
      isActive: true,
    } as never)
    prismaMock.revisionRequest.findFirst.mockResolvedValue({
      id: 'r1',
      projectId: 'p1',
    } as never)
    prismaMock.revisionComment.create.mockResolvedValue({
      id: 'c1',
      revisionId: 'r1',
      parentId: null,
      authorType: 'CLIENT',
      authorName: '클라이언트',
      authorEmail: 'client@example.com',
      content: '클라이언트 댓글',
    } as never)
    prismaMock.project.findFirst.mockResolvedValue({
      id: 'p1',
      workspaceId: 'ws1',
      assigneeId: 'u2',
    } as never)

    const formData = new FormData()
    formData.set('token', 'valid-token')
    formData.set('revisionId', 'r1')
    formData.set('authorName', '클라이언트')
    formData.set('authorEmail', 'client@example.com')
    formData.set('content', '클라이언트 댓글')

    const { addClientRevisionComment } = await import('@/lib/actions/publicRevisionComment')
    const result = await addClientRevisionComment({}, formData)

    expect(result.error).toBeUndefined()
    expect(prismaMock.revisionComment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          authorType: 'CLIENT',
          authorName: '클라이언트',
          authorEmail: 'client@example.com',
          content: '클라이언트 댓글',
        }),
      })
    )
  })
})

// SC-006: 클라이언트 답글 작성 → parentId 설정됨
describe('addClientRevisionComment — SC-006', () => {
  it('test_addClientRevisionComment_creates_client_reply_with_parentId', async () => {
    /**
     * SC-006: 클라이언트가 기존 댓글에 답글을 제출하면,
     * parentId가 원댓글 ID로 설정되어 DB에 저장된다.
     */
    prismaMock.publicProjectPage.findUnique.mockResolvedValue({
      id: 'pp1',
      projectId: 'p1',
      token: 'valid-token',
      isActive: true,
    } as never)
    prismaMock.revisionRequest.findFirst.mockResolvedValue({
      id: 'r1',
      projectId: 'p1',
    } as never)
    // 부모 댓글 — 루트 댓글이어야 답글 가능
    prismaMock.revisionComment.findFirst.mockResolvedValue({
      id: 'c1',
      parentId: null,
    } as never)
    prismaMock.revisionComment.create.mockResolvedValue({
      id: 'c2',
      parentId: 'c1',
    } as never)
    prismaMock.project.findFirst.mockResolvedValue({
      id: 'p1',
      workspaceId: 'ws1',
      assigneeId: 'u2',
    } as never)

    const formData = new FormData()
    formData.set('token', 'valid-token')
    formData.set('revisionId', 'r1')
    formData.set('authorName', '클라이언트')
    formData.set('content', '클라이언트 답글')
    formData.set('parentId', 'c1')

    const { addClientRevisionComment } = await import('@/lib/actions/publicRevisionComment')
    const result = await addClientRevisionComment({}, formData)

    expect(result.error).toBeUndefined()
    expect(prismaMock.revisionComment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          parentId: 'c1',
          authorType: 'CLIENT',
        }),
      })
    )
  })
})

// SC-007: 클라이언트 댓글 → sendNotification 호출, type=REVISION_COMMENT, userIds=[assigneeId]
describe('addClientRevisionComment — SC-007', () => {
  it('test_addClientRevisionComment_notifies_assignee', async () => {
    /**
     * SC-007 (Happy Path): 클라이언트가 댓글을 작성하면,
     * 프로젝트 assigneeId가 있을 때 해당 사용자에게 REVISION_COMMENT 인앱 알림이 생성된다.
     */
    // production 코드가 publicProjectPage.findUnique를 include: { project }로 조인 조회함
    prismaMock.publicProjectPage.findUnique.mockResolvedValue({
      id: 'pp1',
      projectId: 'p1',
      token: 'valid-token',
      isActive: true,
      project: { id: 'p1', workspaceId: 'ws1', assigneeId: 'u2' },
    } as never)
    prismaMock.revisionRequest.findFirst.mockResolvedValue({
      id: 'r1',
      projectId: 'p1',
    } as never)
    prismaMock.revisionComment.create.mockResolvedValue({ id: 'c1' } as never)

    const formData = new FormData()
    formData.set('token', 'valid-token')
    formData.set('revisionId', 'r1')
    formData.set('authorName', '클라이언트')
    formData.set('content', '새 댓글입니다')

    const { addClientRevisionComment } = await import('@/lib/actions/publicRevisionComment')
    await addClientRevisionComment({}, formData)

    const { sendNotification } = await import('@/lib/notifications')
    expect(sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'REVISION_COMMENT',
        userIds: ['u2'],
        workspaceId: 'ws1',
      })
    )
  })

  it('test_addClientRevisionComment_notifies_owner_when_no_assignee', async () => {
    /**
     * SC-007 (Edge Case): assigneeId가 없으면 워크스페이스 OWNER에게 알림이 전송된다.
     * spec FR-010: assignee 없는 경우 워크스페이스 OWNER에게 인앱 알림 생성.
     */
    // production 코드가 publicProjectPage.findUnique를 include: { project }로 조인 조회함
    // assigneeId가 null — OWNER 목록으로 대체
    prismaMock.publicProjectPage.findUnique.mockResolvedValue({
      id: 'pp1',
      projectId: 'p1',
      token: 'valid-token',
      isActive: true,
      project: { id: 'p1', workspaceId: 'ws1', assigneeId: null },
    } as never)
    prismaMock.revisionRequest.findFirst.mockResolvedValue({
      id: 'r1',
      projectId: 'p1',
    } as never)
    prismaMock.revisionComment.create.mockResolvedValue({ id: 'c1' } as never)
    prismaMock.workspaceMember.findMany.mockResolvedValue([
      { userId: 'owner1' },
      { userId: 'owner2' },
    ] as never)

    const formData = new FormData()
    formData.set('token', 'valid-token')
    formData.set('revisionId', 'r1')
    formData.set('authorName', '클라이언트')
    formData.set('content', '새 댓글입니다')

    const { addClientRevisionComment } = await import('@/lib/actions/publicRevisionComment')
    await addClientRevisionComment({}, formData)

    const { sendNotification } = await import('@/lib/notifications')
    expect(sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'REVISION_COMMENT',
        userIds: expect.arrayContaining(['owner1', 'owner2']),
        workspaceId: 'ws1',
      })
    )
  })
})

// SC-010: 클라이언트 이름 빈값·101자 초과 거부
describe('addClientRevisionComment — SC-010', () => {
  it('test_addClientRevisionComment_rejects_empty_name', async () => {
    /**
     * SC-010 (Error Case): 클라이언트가 이름을 공란으로 두면 댓글 제출이 거부된다.
     * spec NFR-001: 이름 필드는 1자 이상 100자 이하여야 한다.
     */
    const formData = new FormData()
    formData.set('token', 'valid-token')
    formData.set('revisionId', 'r1')
    formData.set('authorName', '')
    formData.set('content', '댓글 내용')

    const { addClientRevisionComment } = await import('@/lib/actions/publicRevisionComment')
    const result = await addClientRevisionComment({}, formData)

    expect(result.error).toBeDefined()
    expect(prismaMock.revisionComment.create).not.toHaveBeenCalled()
  })

  it('test_addClientRevisionComment_rejects_name_over_100_chars', async () => {
    /**
     * SC-010 (Error Case): 클라이언트가 이름을 101자 이상 입력하면 댓글 제출이 거부된다.
     * spec NFR-001: 이름 필드는 1자 이상 100자 이하여야 한다.
     */
    const formData = new FormData()
    formData.set('token', 'valid-token')
    formData.set('revisionId', 'r1')
    formData.set('authorName', 'a'.repeat(101))
    formData.set('content', '댓글 내용')

    const { addClientRevisionComment } = await import('@/lib/actions/publicRevisionComment')
    const result = await addClientRevisionComment({}, formData)

    expect(result.error).toBeDefined()
    expect(prismaMock.revisionComment.create).not.toHaveBeenCalled()
  })
})

// SC-011: RFC 5321 형식 아닌 이메일 거부
describe('addClientRevisionComment — SC-011', () => {
  it('test_addClientRevisionComment_rejects_invalid_email_format', async () => {
    /**
     * SC-011 (Error Case): 클라이언트가 RFC 5321 형식이 아닌 이메일을 입력하면
     * 댓글 제출이 거부된다.
     * spec NFR-001: 이메일 필드는 RFC 5321 형식이어야 한다.
     */
    const formData = new FormData()
    formData.set('token', 'valid-token')
    formData.set('revisionId', 'r1')
    formData.set('authorName', '클라이언트')
    formData.set('authorEmail', 'not-an-email')
    formData.set('content', '댓글 내용')

    const { addClientRevisionComment } = await import('@/lib/actions/publicRevisionComment')
    const result = await addClientRevisionComment({}, formData)

    expect(result.error).toBeDefined()
    expect(prismaMock.revisionComment.create).not.toHaveBeenCalled()
  })
})

// SC-012: 댓글 본문 공란·2001자 초과 거부 (클라이언트)
describe('addClientRevisionComment — SC-012', () => {
  it('test_addClientRevisionComment_rejects_empty_content', async () => {
    /**
     * SC-012 (Error Case): 클라이언트가 본문을 공란으로 제출하면 거부된다.
     * spec NFR-002: 댓글 본문은 1자 이상 2,000자 이하여야 한다.
     */
    const formData = new FormData()
    formData.set('token', 'valid-token')
    formData.set('revisionId', 'r1')
    formData.set('authorName', '클라이언트')
    formData.set('content', '')

    const { addClientRevisionComment } = await import('@/lib/actions/publicRevisionComment')
    const result = await addClientRevisionComment({}, formData)

    expect(result.error).toBeDefined()
    expect(prismaMock.revisionComment.create).not.toHaveBeenCalled()
  })
})

// SC-013: 유효하지 않은 토큰으로 클라이언트 댓글 거부
describe('addClientRevisionComment — SC-013', () => {
  it('test_addClientRevisionComment_rejects_invalid_token', async () => {
    /**
     * SC-013 (Error Case): 유효하지 않은 프로젝트 토큰으로 클라이언트 댓글 작성을 요청하면 거부된다.
     * spec NFR-003: 토큰이 유효하지 않으면 댓글 작성이 거부된다.
     */
    prismaMock.publicProjectPage.findUnique.mockResolvedValue(null)

    const formData = new FormData()
    formData.set('token', 'invalid-token')
    formData.set('revisionId', 'r1')
    formData.set('authorName', '클라이언트')
    formData.set('content', '댓글 내용')

    const { addClientRevisionComment } = await import('@/lib/actions/publicRevisionComment')
    const result = await addClientRevisionComment({}, formData)

    expect(result.error).toBeDefined()
    expect(prismaMock.revisionComment.create).not.toHaveBeenCalled()
  })
})

// SC-014: 답글(depth=1)에 재답글 시도 거부 (클라이언트)
describe('addClientRevisionComment — SC-014', () => {
  it('test_addClientRevisionComment_rejects_reply_to_depth1_comment', async () => {
    /**
     * SC-014 (Error Case): 이미 답글(depth=1)인 댓글에 다시 답글을 달려는
     * 클라이언트 요청은 거부된다.
     * spec NFR-005: 댓글 스레드 depth는 최대 1단계로 제한한다.
     */
    prismaMock.publicProjectPage.findUnique.mockResolvedValue({
      id: 'pp1',
      projectId: 'p1',
      token: 'valid-token',
      isActive: true,
    } as never)
    prismaMock.revisionRequest.findFirst.mockResolvedValue({
      id: 'r1',
      projectId: 'p1',
    } as never)
    // 유효성 검사 통과 후 부모 댓글 조회 — parentId가 null이 아님(depth=1)
    prismaMock.revisionComment.findFirst.mockResolvedValue({
      id: 'c2',
      parentId: 'c1', // 이미 depth=1인 댓글
    } as never)

    const formData = new FormData()
    formData.set('token', 'valid-token')
    formData.set('revisionId', 'r1')
    formData.set('authorName', '클라이언트')
    formData.set('content', '재답글 시도')
    formData.set('parentId', 'c2')

    const { addClientRevisionComment } = await import('@/lib/actions/publicRevisionComment')
    const result = await addClientRevisionComment({}, formData)

    expect(result.error).toBeDefined()
    expect(prismaMock.revisionComment.create).not.toHaveBeenCalled()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockDeep, mockReset } from 'vitest-mock-extended'
import type { PrismaClient } from '@/app/generated/prisma/client'

const prismaMock = mockDeep<PrismaClient>()

vi.mock('@/lib/db', () => ({ prisma: prismaMock }))
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}))
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
    compare: vi.fn(),
  },
}))
vi.mock('@/lib/default-workflow-templates', () => ({
  seedDefaultWorkflowTemplates: vi.fn(),
}))
vi.mock('@/lib/email', () => ({
  sendInviteEmail: vi.fn().mockResolvedValue(undefined),
}))

beforeEach(() => mockReset(prismaMock))

// SC-001: 회원가입 → 워크스페이스 자동 생성
describe('register (SC-001)', () => {
  beforeEach(() => {
    prismaMock.$transaction.mockImplementation(async (fn: unknown) => {
      if (typeof fn === 'function') return fn(prismaMock)
    })
  })

  it('유효한 정보로 가입하면 User + Workspace + Member를 생성한다', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.user.create.mockResolvedValue({
      id: 'u-new',
      email: 'newuser@example.com',
      name: '신규사용자',
      password: 'hashed-password',
      createdAt: new Date(),
    } as never)
    prismaMock.workspace.create.mockResolvedValue({
      id: 'ws-new',
      name: '신규사용자의 워크스페이스',
      slug: 'workspace-abc12',
      plan: 'beta',
      createdAt: new Date(),
    } as never)
    prismaMock.workspaceMember.create.mockResolvedValue({} as never)

    const { signIn } = await import('@/lib/auth')
    vi.mocked(signIn).mockResolvedValue(undefined)

    const formData = new FormData()
    formData.set('name', '신규사용자')
    formData.set('email', 'newuser@example.com')
    formData.set('password', 'password123')

    const { register } = await import('@/lib/actions/auth')
    const result = await register({}, formData)

    expect(result.error).toBeUndefined()
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'newuser@example.com',
          name: '신규사용자',
        }),
      })
    )
    expect(prismaMock.workspace.create).toHaveBeenCalled()
    expect(prismaMock.workspaceMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: 'OWNER' }),
      })
    )
  })

  it('이미 사용 중인 이메일이면 에러를 반환한다', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'existing-u',
      email: 'existing@example.com',
    } as never)

    const formData = new FormData()
    formData.set('name', '이름')
    formData.set('email', 'existing@example.com')
    formData.set('password', 'password123')

    const { register } = await import('@/lib/actions/auth')
    const result = await register({}, formData)

    expect(result.error).toBeDefined()
    expect(prismaMock.user.create).not.toHaveBeenCalled()
  })

  it('비밀번호가 8자 미만이면 에러를 반환한다', async () => {
    const formData = new FormData()
    formData.set('name', '이름')
    formData.set('email', 'user@example.com')
    formData.set('password', 'short')

    const { register } = await import('@/lib/actions/auth')
    const result = await register({}, formData)

    expect(result.error).toBeDefined()
    expect(prismaMock.user.create).not.toHaveBeenCalled()
  })

  it('필수 항목이 비어 있으면 에러를 반환한다', async () => {
    const formData = new FormData()
    formData.set('name', '')
    formData.set('email', '')
    formData.set('password', '')

    const { register } = await import('@/lib/actions/auth')
    const result = await register({}, formData)

    expect(result.error).toBeDefined()
  })
})

// SC-002: 팀원 초대 → 수락 → 워크스페이스 접근
describe('inviteTeamMember (SC-002)', () => {
  it('Owner가 팀원을 초대하면 WorkspaceInvite를 생성한다', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'u1', workspaceId: 'ws1', email: 'owner@example.com', name: 'Owner' },
    } as never)

    prismaMock.workspaceMember.findFirst.mockResolvedValue({
      role: 'OWNER',
    } as never)
    prismaMock.workspace.findUnique.mockResolvedValue({
      id: 'ws1',
      name: 'Owner 워크스페이스',
      members: [],
    } as never)
    prismaMock.workspaceInvite.findFirst.mockResolvedValue(null)
    prismaMock.workspaceInvite.create.mockResolvedValue({
      id: 'inv1',
      token: 'invite-token-abc',
      email: 'member@example.com',
    } as never)

    const formData = new FormData()
    formData.set('email', 'member@example.com')
    formData.set('role', 'MEMBER')

    const { inviteTeamMember } = await import('@/lib/actions/team')
    const result = await inviteTeamMember({}, formData)

    expect(result.error).toBeUndefined()
    expect(prismaMock.workspaceInvite.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'member@example.com',
          workspaceId: 'ws1',
          role: 'MEMBER',
        }),
      })
    )
  })
})

describe('registerAndAcceptInvite (SC-002)', () => {
  beforeEach(() => {
    prismaMock.$transaction.mockImplementation(async (fn: unknown) => {
      if (typeof fn === 'function') return fn(prismaMock)
    })
  })

  it('초대 수락 시 User 생성 후 워크스페이스 Member로 등록한다', async () => {
    prismaMock.workspaceInvite.findUnique.mockResolvedValue({
      id: 'inv1',
      token: 'invite-token-abc',
      email: 'member@example.com',
      workspaceId: 'ws1',
      role: 'MEMBER',
      status: 'PENDING',
    } as never)
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.user.create.mockResolvedValue({
      id: 'u-new',
      email: 'member@example.com',
      name: '신규멤버',
    } as never)
    prismaMock.workspaceMember.create.mockResolvedValue({} as never)
    prismaMock.workspaceInvite.update.mockResolvedValue({} as never)

    const { signIn } = await import('@/lib/auth')
    vi.mocked(signIn).mockResolvedValue(undefined)

    const formData = new FormData()
    formData.set('token', 'invite-token-abc')
    formData.set('name', '신규멤버')
    formData.set('password', 'password123')

    const { registerAndAcceptInvite } = await import('@/lib/actions/invite')
    const result = await registerAndAcceptInvite({}, formData)

    expect(result.error).toBeUndefined()
    expect(prismaMock.workspaceMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workspaceId: 'ws1',
          role: 'MEMBER',
        }),
      })
    )
    expect(prismaMock.workspaceInvite.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'ACCEPTED' },
      })
    )
  })

  it('이미 사용된 초대 링크이면 에러를 반환한다', async () => {
    prismaMock.workspaceInvite.findUnique.mockResolvedValue({
      id: 'inv1',
      token: 'used-token',
      status: 'ACCEPTED',
    } as never)

    const formData = new FormData()
    formData.set('token', 'used-token')
    formData.set('name', '이름')
    formData.set('password', 'password123')

    const { registerAndAcceptInvite } = await import('@/lib/actions/invite')
    const result = await registerAndAcceptInvite({}, formData)

    expect(result.error).toBeDefined()
    expect(prismaMock.user.create).not.toHaveBeenCalled()
  })

  it('유효하지 않은 초대 토큰이면 에러를 반환한다', async () => {
    prismaMock.workspaceInvite.findUnique.mockResolvedValue(null)

    const formData = new FormData()
    formData.set('token', 'nonexistent-token')
    formData.set('name', '이름')
    formData.set('password', 'password123')

    const { registerAndAcceptInvite } = await import('@/lib/actions/invite')
    const result = await registerAndAcceptInvite({}, formData)

    expect(result.error).toBeDefined()
  })
})

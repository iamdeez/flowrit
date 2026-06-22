'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendInviteEmail } from '@/lib/email'
import type { WorkspaceRole } from '@/lib/types'

async function getMemberRole(userId: string, workspaceId: string): Promise<WorkspaceRole | null> {
  const member = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId },
    select: { role: true },
  })
  return (member?.role as WorkspaceRole) ?? null
}

function requireRole(current: WorkspaceRole, minimum: WorkspaceRole): void {
  const hierarchy: Record<WorkspaceRole, number> = { OWNER: 3, ADMIN: 2, MEMBER: 1 }
  if (hierarchy[current] < hierarchy[minimum]) {
    throw new Error('권한이 없습니다.')
  }
}

export type InviteState = {
  error?: string
  success?: string
  inviteUrl?: string
  emailError?: string
}

export async function inviteTeamMember(
  _prevState: InviteState,
  formData: FormData
): Promise<InviteState> {
  const session = await auth()
  if (!session?.user?.workspaceId) {
    return { error: '로그인이 필요합니다.' }
  }

  const currentRole = await getMemberRole(session.user.id, session.user.workspaceId)
  if (!currentRole) return { error: '팀 멤버 정보를 찾을 수 없습니다.' }
  try {
    requireRole(currentRole, 'ADMIN')
  } catch {
    return { error: '권한이 없습니다.' }
  }

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const rawRole = (formData.get('role') as string) || 'MEMBER'
  const role = rawRole === 'OWNER' ? 'MEMBER' : rawRole

  if (!email) {
    return { error: '이메일을 입력해 주세요.' }
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: session.user.workspaceId },
    include: {
      members: { include: { user: true } },
    },
  })

  if (!workspace) return { error: '워크스페이스를 찾을 수 없습니다.' }

  const alreadyMember = workspace.members.some((m) => m.user.email === email)
  if (alreadyMember) {
    return { error: '이미 팀원인 사용자입니다.' }
  }

  const existing = await prisma.workspaceInvite.findFirst({
    where: { workspaceId: workspace.id, email, status: 'PENDING' },
  })
  if (existing) {
    return { error: '이미 초대가 발송된 이메일입니다.' }
  }

  const invite = await prisma.workspaceInvite.create({
    data: { workspaceId: workspace.id, email, role },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const inviteUrl = `${appUrl}/invite/${invite.token}`

  try {
    await sendInviteEmail({
      to: email,
      inviterName: session.user.name ?? '워크스페이스 관리자',
      workspaceName: workspace.name,
      inviteToken: invite.token,
    })
    revalidatePath('/team')
    return { success: `${email}로 초대 이메일을 발송했습니다.` }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[invite] 이메일 발송 실패:', message)
    revalidatePath('/team')
    return {
      success: `초대 링크가 생성되었습니다. 이메일 발송에 실패했으니 아래 링크를 직접 전달해 주세요.`,
      inviteUrl,
      emailError: message,
    }
  }
}

export async function cancelInvite(inviteId: string): Promise<void> {
  const session = await auth()
  if (!session?.user?.workspaceId) return

  const currentRole = await getMemberRole(session.user.id, session.user.workspaceId)
  if (!currentRole) return
  try {
    requireRole(currentRole, 'ADMIN')
  } catch {
    return
  }

  await prisma.workspaceInvite.updateMany({
    where: { id: inviteId, workspaceId: session.user.workspaceId, status: 'PENDING' },
    data: { status: 'CANCELLED' },
  })

  revalidatePath('/team')
}

export async function changeMemberRole(targetMemberId: string, newRole: WorkspaceRole): Promise<void> {
  const session = await auth()
  if (!session?.user?.workspaceId) return

  const currentRole = await getMemberRole(session.user.id, session.user.workspaceId)
  if (!currentRole) return
  requireRole(currentRole, 'OWNER')

  if (newRole === 'OWNER') {
    await transferOwnership(targetMemberId)
    return
  }

  const targetMember = await prisma.workspaceMember.findFirst({
    where: { id: targetMemberId, workspaceId: session.user.workspaceId },
  })
  if (!targetMember) throw new Error('멤버를 찾을 수 없습니다.')
  if (targetMember.userId === session.user.id) throw new Error('자신의 역할은 변경할 수 없습니다.')

  await prisma.workspaceMember.update({
    where: { id: targetMemberId },
    data: { role: newRole },
  })

  revalidatePath('/team')
}

export async function removeMember(targetMemberId: string): Promise<void> {
  const session = await auth()
  if (!session?.user?.workspaceId) return

  const currentRole = await getMemberRole(session.user.id, session.user.workspaceId)
  if (!currentRole) return
  requireRole(currentRole, 'ADMIN')

  const targetMember = await prisma.workspaceMember.findFirst({
    where: { id: targetMemberId, workspaceId: session.user.workspaceId },
    select: { id: true, userId: true, role: true },
  })
  if (!targetMember) throw new Error('멤버를 찾을 수 없습니다.')
  if (targetMember.userId === session.user.id) throw new Error('자기 자신은 제거할 수 없습니다.')
  if (targetMember.role === 'OWNER') throw new Error('오너는 제거할 수 없습니다.')
  if (currentRole === 'ADMIN' && targetMember.role === 'ADMIN') {
    throw new Error('어드민은 다른 어드민을 제거할 수 없습니다.')
  }

  await prisma.$transaction([
    prisma.workspaceMember.delete({ where: { id: targetMemberId } }),
    prisma.project.updateMany({
      where: { workspaceId: session.user.workspaceId, assigneeId: targetMember.userId },
      data: { assigneeId: null },
    }),
    prisma.revisionRequest.updateMany({
      where: {
        project: { workspaceId: session.user.workspaceId },
        assigneeId: targetMember.userId,
      },
      data: { assigneeId: null },
    }),
  ])

  revalidatePath('/team')
}

export async function transferOwnership(targetMemberId: string): Promise<void> {
  const session = await auth()
  if (!session?.user?.workspaceId) return

  const currentRole = await getMemberRole(session.user.id, session.user.workspaceId)
  if (!currentRole) return
  requireRole(currentRole, 'OWNER')

  const currentMember = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id, workspaceId: session.user.workspaceId },
    select: { id: true },
  })
  if (!currentMember) return

  const targetMember = await prisma.workspaceMember.findFirst({
    where: { id: targetMemberId, workspaceId: session.user.workspaceId },
  })
  if (!targetMember) throw new Error('멤버를 찾을 수 없습니다.')
  if (targetMember.userId === session.user.id) throw new Error('자기 자신에게 소유권을 이전할 수 없습니다.')

  await prisma.$transaction([
    prisma.workspaceMember.update({ where: { id: currentMember.id }, data: { role: 'ADMIN' } }),
    prisma.workspaceMember.update({ where: { id: targetMemberId }, data: { role: 'OWNER' } }),
  ])

  revalidatePath('/team')
}

export async function getTeamData() {
  const session = await auth()
  if (!session?.user?.workspaceId) return { members: [], invites: [], currentMember: null }

  const [members, invites, currentMember] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId: session.user.workspaceId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.workspaceInvite.findMany({
      where: { workspaceId: session.user.workspaceId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.workspaceMember.findFirst({
      where: { userId: session.user.id, workspaceId: session.user.workspaceId },
      select: { id: true, role: true, userId: true },
    }),
  ])

  return { members, invites, currentMember }
}

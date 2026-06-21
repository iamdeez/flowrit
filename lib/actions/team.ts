'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendInviteEmail } from '@/lib/email'

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

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const role = (formData.get('role') as string) || 'MEMBER'

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

  await prisma.workspaceInvite.updateMany({
    where: { id: inviteId, workspaceId: session.user.workspaceId, status: 'PENDING' },
    data: { status: 'CANCELLED' },
  })

  revalidatePath('/team')
}

export async function getTeamData() {
  const session = await auth()
  if (!session?.user?.workspaceId) return { members: [], invites: [] }

  const [members, invites] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId: session.user.workspaceId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.workspaceInvite.findMany({
      where: { workspaceId: session.user.workspaceId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return { members, invites }
}

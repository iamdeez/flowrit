'use server'

import bcrypt from 'bcryptjs'
import { signIn } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AuthError } from 'next-auth'

export type AcceptInviteState = {
  error?: string
}

export async function registerAndAcceptInvite(
  _prevState: AcceptInviteState,
  formData: FormData
): Promise<AcceptInviteState> {
  const token = formData.get('token') as string
  const name = (formData.get('name') as string)?.trim()
  const password = formData.get('password') as string

  if (!name || !password) return { error: '모든 항목을 입력해 주세요.' }
  if (password.length < 8) return { error: '비밀번호는 8자 이상이어야 합니다.' }

  const invite = await prisma.workspaceInvite.findUnique({
    where: { token },
  })

  if (!invite || invite.status !== 'PENDING') {
    return { error: '유효하지 않거나 이미 사용된 초대 링크입니다.' }
  }

  const existing = await prisma.user.findUnique({ where: { email: invite.email } })
  if (existing) {
    return { error: '이미 가입된 이메일입니다. 로그인하여 초대를 수락해 주세요.' }
  }

  const hashed = await bcrypt.hash(password, 12)

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name, email: invite.email, password: hashed },
    })

    await tx.workspaceMember.create({
      data: { userId: user.id, workspaceId: invite.workspaceId, role: invite.role },
    })

    await tx.workspaceInvite.update({
      where: { id: invite.id },
      data: { status: 'ACCEPTED' },
    })
  })

  try {
    await signIn('credentials', { email: invite.email, password, redirectTo: '/dashboard' })
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: '가입 후 로그인 중 오류가 발생했습니다. 로그인 페이지에서 다시 시도해 주세요.' }
    }
    throw err
  }

  return {}
}

export async function loginAndAcceptInvite(
  _prevState: AcceptInviteState,
  formData: FormData
): Promise<AcceptInviteState> {
  const token = formData.get('token') as string
  const password = formData.get('password') as string

  if (!password) return { error: '비밀번호를 입력해 주세요.' }

  const invite = await prisma.workspaceInvite.findUnique({
    where: { token },
  })

  if (!invite || invite.status !== 'PENDING') {
    return { error: '유효하지 않거나 이미 사용된 초대 링크입니다.' }
  }

  const user = await prisma.user.findUnique({ where: { email: invite.email } })
  if (!user) {
    return { error: '가입된 계정을 찾을 수 없습니다.' }
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    return { error: '비밀번호가 올바르지 않습니다.' }
  }

  const alreadyMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId: user.id } },
  })

  if (!alreadyMember) {
    await prisma.$transaction(async (tx) => {
      await tx.workspaceMember.create({
        data: { userId: user.id, workspaceId: invite.workspaceId, role: invite.role },
      })
      await tx.workspaceInvite.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED' },
      })
    })
  }

  try {
    await signIn('credentials', { email: invite.email, password, redirectTo: '/dashboard' })
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: '로그인 중 오류가 발생했습니다.' }
    }
    throw err
  }

  return {}
}

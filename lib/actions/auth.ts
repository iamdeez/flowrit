'use server'

import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { signIn, signOut } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AuthError } from 'next-auth'
import { seedDefaultWorkflowTemplates } from '@/lib/default-workflow-templates'
import { sendPasswordResetEmail } from '@/lib/email'

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30) || 'workspace'
  return `${base}-${Math.random().toString(36).slice(2, 7)}`
}

export type RegisterState = {
  error?: string
}

export type LoginState = {
  error?: string
}

export async function register(
  _prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!name?.trim() || !email?.trim() || !password) {
    return { error: '모든 항목을 입력해 주세요.' }
  }

  if (password.length < 8) {
    return { error: '비밀번호는 8자 이상이어야 합니다.' }
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return { error: '이미 사용 중인 이메일입니다.' }
  }

  const hashed = await bcrypt.hash(password, 12)

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name: name.trim(), email, password: hashed },
    })

    const workspace = await tx.workspace.create({
      data: {
        name: `${name.trim()}의 워크스페이스`,
        slug: generateSlug(name.trim()),
      },
    })

    await tx.workspaceMember.create({
      data: { userId: user.id, workspaceId: workspace.id, role: 'OWNER' },
    })

    await seedDefaultWorkflowTemplates(workspace.id, tx)
  })

  try {
    await signIn('credentials', { email, password, redirectTo: '/dashboard' })
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: '가입 후 로그인 중 오류가 발생했습니다. 로그인 페이지에서 다시 시도해 주세요.' }
    }
    throw err
  }

  return {}
}

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email?.trim() || !password) {
    return { error: '이메일과 비밀번호를 입력해 주세요.' }
  }

  try {
    await signIn('credentials', { email, password, redirectTo: '/dashboard' })
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: '이메일 또는 비밀번호가 올바르지 않습니다.' }
    }
    throw err
  }

  return {}
}

export async function logout() {
  await signOut({ redirectTo: '/login' })
}

export type ForgotPasswordState = { error?: string; success?: boolean }

export async function forgotPassword(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = (formData.get('email') as string)?.trim().toLowerCase()

  if (!email) {
    return { error: '이메일을 입력해 주세요.' }
  }

  const user = await prisma.user.findUnique({ where: { email } })

  if (user) {
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1시간

    await prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt },
    })

    await sendPasswordResetEmail(email, token).catch(() => {
      // 이메일 발송 실패는 조용히 처리 — 토큰은 DB에 남음
    })
  }

  // 이메일 열거 방어: 사용자 존재 여부와 무관하게 성공 응답
  return { success: true }
}

export type ResetPasswordState = { error?: string; success?: boolean }

export async function resetPassword(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const token = formData.get('token') as string
  const password = formData.get('password') as string
  const confirm = formData.get('confirm') as string

  if (!password || password.length < 8) {
    return { error: '비밀번호는 8자 이상이어야 합니다.' }
  }

  if (password !== confirm) {
    return { error: '비밀번호가 일치하지 않습니다.' }
  }

  const record = await prisma.passwordResetToken.findUnique({ where: { token } })

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { error: '유효하지 않거나 만료된 링크입니다. 다시 요청해 주세요.' }
  }

  const hashed = await bcrypt.hash(password, 10)

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { password: hashed } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ])

  return { success: true }
}

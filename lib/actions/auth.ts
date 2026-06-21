'use server'

import bcrypt from 'bcryptjs'
import { signIn } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AuthError } from 'next-auth'
import { seedDefaultWorkflowTemplates } from '@/lib/default-workflow-templates'

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

'use server'

import bcrypt from 'bcryptjs'
import { signIn } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AuthError } from 'next-auth'

const PHOTO_TEMPLATE_STAGES = [
  { internalName: '신규 접수', customerName: '의뢰 접수됨', order: 1 },
  { internalName: '주문 확인', customerName: '검토 중', order: 2 },
  { internalName: '원본·자료 확인', customerName: '준비 중', order: 3 },
  { internalName: '작업자 배정', customerName: '준비 중', order: 4 },
  { internalName: '작업 진행 중', customerName: '작업 진행 중', order: 5 },
  { internalName: '1차 결과 업로드', customerName: '1차 결과 전달 완료', order: 6 },
  { internalName: '고객 확인 대기', customerName: '확인 요청', order: 7 },
  { internalName: '재수정 접수', customerName: '수정 작업 중', order: 8 },
  { internalName: '최종 납품', customerName: '납품 완료', order: 9 },
  { internalName: '완료', customerName: '완료', order: 10 },
]

const WEDDING_TEMPLATE_STAGES = [
  { internalName: '신규 접수', customerName: '의뢰 접수됨', order: 1 },
  { internalName: '상담 일정 확인', customerName: '일정 협의 중', order: 2 },
  { internalName: '촬영 준비', customerName: '촬영 준비 중', order: 3 },
  { internalName: '촬영 진행', customerName: '촬영 완료', order: 4 },
  { internalName: '보정 작업 중', customerName: '작업 진행 중', order: 5 },
  { internalName: '1차 결과 업로드', customerName: '1차 결과 전달 완료', order: 6 },
  { internalName: '고객 확인 대기', customerName: '확인 요청', order: 7 },
  { internalName: '재수정 접수', customerName: '수정 작업 중', order: 8 },
  { internalName: '최종 납품', customerName: '납품 완료', order: 9 },
  { internalName: '완료', customerName: '완료', order: 10 },
]

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

    await tx.workflowTemplate.create({
      data: {
        workspaceId: workspace.id,
        name: '사진 기본 워크플로우',
        industry: 'photo',
        isDefault: true,
        stages: { create: PHOTO_TEMPLATE_STAGES },
      },
    })

    await tx.workflowTemplate.create({
      data: {
        workspaceId: workspace.id,
        name: '웨딩 기본 워크플로우',
        industry: 'wedding',
        isDefault: true,
        stages: { create: WEDDING_TEMPLATE_STAGES },
      },
    })
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

'use server'

import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { auth, signOut } from '@/lib/auth'
import { prisma } from '@/lib/db'

// ─── helpers ──────────────────────────────────────────────────────────────

async function requireSession() {
  const session = await auth()
  if (!session?.user?.id || !session.user.workspaceId) {
    throw new Error('로그인이 필요합니다.')
  }
  return session as { user: { id: string; workspaceId: string } }
}

async function getMemberRole(userId: string, workspaceId: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true },
  })
  return member?.role ?? null
}

// ─── T002: updateProfile ──────────────────────────────────────────────────

export type ProfileState = { error?: string; success?: string }

export async function updateProfile(
  _prevState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  try {
    const session = await requireSession()
    const name = (formData.get('name') as string)?.trim()
    const email = (formData.get('email') as string)?.trim().toLowerCase()

    if (!name || !email) return { error: '이름과 이메일을 입력해주세요.' }

    // 이메일 중복 검사 (자신 제외)
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing && existing.id !== session.user.id) {
      return { error: '이미 사용 중인 이메일입니다.' }
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { name, email },
    })

    revalidatePath('/settings')
    return { success: '프로필이 업데이트되었습니다.' }
  } catch {
    return { error: '프로필 업데이트에 실패했습니다.' }
  }
}

// ─── T003: changePassword ─────────────────────────────────────────────────

export type PasswordState = { error?: string; success?: string }

export async function changePassword(
  _prevState: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  try {
    const session = await requireSession()
    const currentPw = formData.get('currentPassword') as string
    const newPw = formData.get('newPassword') as string
    const confirmPw = formData.get('confirmPassword') as string

    if (!currentPw || !newPw || !confirmPw) return { error: '모든 항목을 입력해주세요.' }
    if (newPw !== confirmPw) return { error: '새 비밀번호가 일치하지 않습니다.' }
    if (newPw.length < 8) return { error: '비밀번호는 8자 이상이어야 합니다.' }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    })
    if (!user) return { error: '사용자를 찾을 수 없습니다.' }

    const valid = await bcrypt.compare(currentPw, user.password)
    if (!valid) return { error: '현재 비밀번호가 올바르지 않습니다.' }

    const hash = await bcrypt.hash(newPw, 12)
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hash },
    })

    revalidatePath('/settings')
    return { success: '비밀번호가 변경되었습니다.' }
  } catch {
    return { error: '비밀번호 변경에 실패했습니다.' }
  }
}

// ─── T004: updateWorkspace ────────────────────────────────────────────────

export type WorkspaceState = { error?: string; success?: string }

export async function updateWorkspace(
  _prevState: WorkspaceState,
  formData: FormData,
): Promise<WorkspaceState> {
  try {
    const session = await requireSession()
    const role = await getMemberRole(session.user.id, session.user.workspaceId)
    if (role !== 'OWNER') return { error: '권한이 없습니다.' }

    const name = (formData.get('name') as string)?.trim()
    const slug = (formData.get('slug') as string)?.trim().toLowerCase()

    if (!name || !slug) return { error: '이름과 슬러그를 입력해주세요.' }
    if (!/^[a-z0-9-]+$/.test(slug)) return { error: '슬러그는 영소문자, 숫자, 하이픈만 사용 가능합니다.' }

    const existing = await prisma.workspace.findUnique({ where: { slug } })
    if (existing && existing.id !== session.user.workspaceId) {
      return { error: '이미 사용 중인 슬러그입니다.' }
    }

    await prisma.workspace.update({
      where: { id: session.user.workspaceId },
      data: { name, slug },
    })

    revalidatePath('/settings')
    return { success: '워크스페이스 설정이 저장되었습니다.' }
  } catch {
    return { error: '워크스페이스 설정 저장에 실패했습니다.' }
  }
}

// ─── T005: updateNotificationSettings ────────────────────────────────────

export type NotificationSettingsState = { error?: string; success?: string }

export async function updateNotificationSettings(
  _prevState: NotificationSettingsState,
  formData: FormData,
): Promise<NotificationSettingsState> {
  try {
    const session = await requireSession()

    const settings = {
      notify_new_inquiry: formData.get('notify_new_inquiry') === 'on',
      notify_revision_submitted: formData.get('notify_revision_submitted') === 'on',
      notify_stage_changed: formData.get('notify_stage_changed') === 'on',
      notify_deadline_reminder: formData.get('notify_deadline_reminder') === 'on',
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { notificationSettings: settings },
    })

    revalidatePath('/settings')
    return { success: '알림 설정이 저장되었습니다.' }
  } catch {
    return { error: '알림 설정 저장에 실패했습니다.' }
  }
}

// ─── T006: leaveWorkspace + deleteWorkspace ───────────────────────────────

export type DangerState = { error?: string }

export async function leaveWorkspace(
  _prevState: DangerState,
  _formData: FormData,
): Promise<DangerState> {
  const session = await requireSession()
  const role = await getMemberRole(session.user.id, session.user.workspaceId)

  if (role === 'OWNER') {
    return { error: 'OWNER는 워크스페이스를 탈퇴할 수 없습니다. 소유권을 이전하거나 워크스페이스를 삭제하세요.' }
  }

  await prisma.workspaceMember.delete({
    where: { workspaceId_userId: { workspaceId: session.user.workspaceId, userId: session.user.id } },
  })

  await signOut({ redirectTo: '/login' })
  return {}
}

export async function deleteWorkspace(
  _prevState: DangerState,
  formData: FormData,
): Promise<DangerState> {
  const session = await requireSession()
  const role = await getMemberRole(session.user.id, session.user.workspaceId)

  if (role !== 'OWNER') return { error: '권한이 없습니다.' }

  const workspace = await prisma.workspace.findUnique({
    where: { id: session.user.workspaceId },
    select: { name: true },
  })
  if (!workspace) return { error: '워크스페이스를 찾을 수 없습니다.' }

  const confirmText = formData.get('confirmText') as string
  if (confirmText !== workspace.name) {
    return { error: '워크스페이스 이름이 일치하지 않습니다.' }
  }

  await prisma.workspace.delete({ where: { id: session.user.workspaceId } })
  await signOut({ redirectTo: '/login' })
  return {}
}

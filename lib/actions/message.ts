'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export type MessageFormState = {
  error?: string
  success?: string
}

function stringValue(formData: FormData, key: string): string {
  return ((formData.get(key) as string | null) ?? '').trim()
}

async function requireWorkspaceId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.workspaceId) {
    throw new Error('로그인이 필요합니다.')
  }
  return session.user.workspaceId
}

export async function getMessageTemplates() {
  const workspaceId = await requireWorkspaceId()
  return prisma.messageTemplate.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'asc' },
  })
}

export async function createMessageTemplate(
  _prevState: MessageFormState,
  formData: FormData
): Promise<MessageFormState> {
  const workspaceId = await requireWorkspaceId()
  const name = stringValue(formData, 'name')
  const content = stringValue(formData, 'content')

  if (!name) return { error: '템플릿 이름을 입력해 주세요.' }
  if (!content) return { error: '템플릿 내용을 입력해 주세요.' }

  await prisma.messageTemplate.create({
    data: { workspaceId, name, type: 'GENERAL', content },
  })

  revalidatePath('/messages')
  return { success: '템플릿을 생성했습니다.' }
}

export async function updateMessageTemplate(
  _prevState: MessageFormState,
  formData: FormData
): Promise<MessageFormState> {
  const workspaceId = await requireWorkspaceId()
  const id = stringValue(formData, 'id')
  const name = stringValue(formData, 'name')
  const content = stringValue(formData, 'content')

  if (!id) return { error: '수정할 템플릿을 찾을 수 없습니다.' }
  if (!name) return { error: '템플릿 이름을 입력해 주세요.' }
  if (!content) return { error: '템플릿 내용을 입력해 주세요.' }

  const template = await prisma.messageTemplate.findFirst({
    where: { id, workspaceId },
    select: { id: true },
  })
  if (!template) return { error: '수정할 템플릿을 찾을 수 없습니다.' }

  await prisma.messageTemplate.update({
    where: { id },
    data: { name, content },
  })

  revalidatePath('/messages')
  return { success: '템플릿을 저장했습니다.' }
}

export async function deleteMessageTemplate(formData: FormData): Promise<void> {
  const workspaceId = await requireWorkspaceId()
  const id = stringValue(formData, 'id')
  if (!id) return

  await prisma.messageTemplate.deleteMany({
    where: { id, workspaceId },
  })

  revalidatePath('/messages')
}

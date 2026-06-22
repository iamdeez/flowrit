'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { sendNotification } from '@/lib/notifications'

export type PublicCommentFormState = {
  error?: string
  success?: boolean
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function stringValue(formData: FormData, key: string): string {
  return ((formData.get(key) as string | null) ?? '').trim()
}

export async function addClientRevisionComment(
  _prevState: PublicCommentFormState,
  formData: FormData
): Promise<PublicCommentFormState> {
  const token = stringValue(formData, 'token')
  const revisionId = stringValue(formData, 'revisionId')
  const authorName = stringValue(formData, 'authorName')
  const authorEmailRaw = stringValue(formData, 'authorEmail')
  const authorEmail = authorEmailRaw.length > 0 ? authorEmailRaw : null
  const content = stringValue(formData, 'content')
  const parentId = stringValue(formData, 'parentId') || null

  if (!token) return { error: '잘못된 요청입니다.' }
  if (!revisionId) return { error: '수정 요청을 찾을 수 없습니다.' }

  if (!authorName || authorName.length < 1) return { error: '이름을 입력해 주세요.' }
  if (authorName.length > 100) return { error: '이름은 100자를 초과할 수 없습니다.' }

  if (authorEmail !== null && !EMAIL_REGEX.test(authorEmail)) {
    return { error: '올바른 이메일 형식을 입력해 주세요.' }
  }

  if (!content || content.length < 1) return { error: '댓글 내용을 입력해 주세요.' }
  if (content.length > 2000) return { error: '댓글은 2,000자를 초과할 수 없습니다.' }

  const page = await prisma.publicProjectPage.findUnique({
    where: { token, isActive: true },
    include: {
      project: {
        select: { id: true, workspaceId: true, assigneeId: true },
      },
    },
  })
  if (!page) return { error: '유효하지 않은 공유 링크입니다.' }

  const revision = await prisma.revisionRequest.findFirst({
    where: { id: revisionId, projectId: page.projectId },
  })
  if (!revision) return { error: '수정 요청을 찾을 수 없습니다.' }

  if (parentId) {
    const parentComment = await prisma.revisionComment.findFirst({
      where: { id: parentId, revisionId },
      select: { parentId: true },
    })
    if (!parentComment || parentComment.parentId !== null) {
      return { error: '답글에는 다시 답글을 달 수 없습니다.' }
    }
  }

  await prisma.revisionComment.create({
    data: {
      revisionId,
      parentId: parentId || null,
      authorType: 'CLIENT',
      authorName,
      authorEmail: authorEmail || null,
      content,
    },
  })

  try {
    const { workspaceId, assigneeId } = page.project
    let targetUserIds: string[]

    if (assigneeId) {
      targetUserIds = [assigneeId]
    } else {
      const owners = await prisma.workspaceMember.findMany({
        where: { workspaceId, role: 'OWNER' },
        select: { userId: true },
      })
      targetUserIds = owners.map((o) => o.userId)
    }

    await sendNotification({
      userIds: targetUserIds,
      workspaceId,
      type: 'REVISION_COMMENT',
      title: '수정 요청에 새 댓글이 달렸습니다',
      body: `${authorName}: ${content.slice(0, 80)}`,
      href: `/projects/${page.projectId}?tab=revisions`,
    })
  } catch (error) {
    console.error('[notification] addClientRevisionComment failed', {
      revisionId,
      error,
    })
  }

  revalidatePath(`/p/${token}`)

  return { success: true }
}

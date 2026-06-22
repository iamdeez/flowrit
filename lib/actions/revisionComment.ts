'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendRevisionCommentReplyEmail } from '@/lib/email'

export type CommentFormState = {
  error?: string
  success?: string
}

export type RevisionCommentWithReplies = {
  id: string
  revisionId: string
  parentId: null
  authorType: string
  authorName: string
  authorEmail: string | null
  content: string
  createdAt: Date
  replies: {
    id: string
    authorType: string
    authorName: string
    content: string
    createdAt: Date
    parentId: string
  }[]
}

function stringValue(formData: FormData, key: string): string {
  return ((formData.get(key) as string | null) ?? '').trim()
}

async function requireAuth(): Promise<{ workspaceId: string; userId: string; name: string }> {
  const session = await auth()
  if (!session?.user?.workspaceId) throw new Error('로그인이 필요합니다.')
  return {
    workspaceId: session.user.workspaceId,
    userId: session.user.id,
    name: session.user.name ?? '작업자',
  }
}

export async function getRevisionComments(
  revisionId: string
): Promise<RevisionCommentWithReplies[]> {
  const { workspaceId } = await requireAuth()

  return prisma.revisionComment.findMany({
    where: {
      revisionId,
      parentId: null,
      revision: { project: { workspaceId } },
    },
    include: {
      replies: {
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  }) as Promise<RevisionCommentWithReplies[]>
}

export async function addRevisionComment(
  _prevState: CommentFormState,
  formData: FormData
): Promise<CommentFormState> {
  const { workspaceId, name } = await requireAuth()

  const revisionId = stringValue(formData, 'revisionId')
  const content = stringValue(formData, 'content')
  const parentId = stringValue(formData, 'parentId') || null

  if (!revisionId) return { error: '수정 요청을 찾을 수 없습니다.' }
  if (!content) return { error: '댓글 내용을 입력해 주세요.' }
  if (content.length > 2000) return { error: '댓글은 2,000자를 초과할 수 없습니다.' }

  const revision = await prisma.revisionRequest.findFirst({
    where: { id: revisionId, project: { workspaceId } },
    include: {
      project: {
        include: { publicPage: { select: { token: true } } },
      },
    },
  })
  if (!revision) return { error: '수정 요청을 찾을 수 없습니다.' }

  if (parentId) {
    const parentComment = await prisma.revisionComment.findFirst({
      where: { id: parentId, revisionId },
      select: { parentId: true, authorType: true, authorEmail: true },
    })
    if (!parentComment || parentComment.parentId !== null) {
      return { error: '답글에는 다시 답글을 달 수 없습니다.' }
    }

    await prisma.revisionComment.create({
      data: {
        revisionId,
        parentId,
        authorType: 'WORKER',
        authorName: name,
        content,
      },
    })

    if (parentComment.authorType === 'CLIENT' && parentComment.authorEmail) {
      const portalToken = revision.project.publicPage?.token
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
      await sendRevisionCommentReplyEmail(parentComment.authorEmail, {
        authorName: name,
        revisionContent: revision.content,
        replyContent: content,
        portalUrl: portalToken ? `${appUrl}/p/${portalToken}` : appUrl,
      })
    }
  } else {
    await prisma.revisionComment.create({
      data: {
        revisionId,
        parentId: null,
        authorType: 'WORKER',
        authorName: name,
        content,
      },
    })
  }

  revalidatePath(`/projects/${revision.projectId}`)
  revalidatePath('/revisions')

  return { success: '댓글을 등록했습니다.' }
}

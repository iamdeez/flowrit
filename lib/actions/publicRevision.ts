'use server'

import { prisma } from '@/lib/db'
import { sendRevisionSubmittedEmail } from '@/lib/email'
import { sendNotification } from '@/lib/notifications'

export type CustomerRevisionState = {
  success?: boolean
  error?: string
}

export async function submitCustomerRevision(
  _prevState: CustomerRevisionState,
  formData: FormData
): Promise<CustomerRevisionState> {
  const token = ((formData.get('token') as string | null) ?? '').trim()
  const content = ((formData.get('content') as string | null) ?? '').trim()
  const fileUrl = ((formData.get('fileUrl') as string | null) ?? '').trim()

  if (!token) return { error: '잘못된 요청입니다.' }
  if (!content) return { error: '수정 요청 내용을 입력해 주세요.' }

  const page = await prisma.publicProjectPage.findUnique({
    where: { token, isActive: true },
    include: { project: true },
  })
  if (!page) return { error: '유효하지 않은 공유 링크입니다.' }

  const revision = await prisma.revisionRequest.create({
    data: {
      projectId: page.projectId,
      content,
      fileUrls: fileUrl ? [fileUrl] : [],
      source: 'CUSTOMER_PORTAL',
    },
  })

  try {
    const owners = await prisma.workspaceMember.findMany({
      where: { workspaceId: page.project.workspaceId, role: 'OWNER' },
      select: { userId: true },
    })
    const userIds = page.project.assigneeId
      ? [page.project.assigneeId, ...owners.map((owner) => owner.userId)]
      : owners.map((owner) => owner.userId)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    await sendNotification({
      userIds,
      workspaceId: page.project.workspaceId,
      type: 'REVISION_SUBMITTED',
      title: '수정 요청이 접수되었습니다',
      body: content,
      href: `/projects/${page.projectId}?tab=revisions`,
      emailFn: (to) =>
        sendRevisionSubmittedEmail(to, {
          projectTitle: page.project.title,
          content,
          fileCount: fileUrl ? 1 : 0,
          projectUrl: `${appUrl}/projects/${page.projectId}?tab=revisions`,
        }),
    })
  } catch (error) {
    console.error('[notification] submitCustomerRevision failed', {
      revisionId: revision.id,
      error,
    })
  }

  return { success: true }
}

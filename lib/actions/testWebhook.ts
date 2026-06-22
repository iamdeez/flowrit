'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendNewInquiryEmail } from '@/lib/email'
import { sendNotification } from '@/lib/notifications'

export type TestWebhookState = { success?: boolean; error?: string }

export async function sendTestInquiry(_prev: TestWebhookState, _formData: FormData): Promise<TestWebhookState> {
  const session = await auth()
  if (!session?.user?.workspaceId) return { error: '로그인이 필요합니다.' }

  const workspaceId = session.user.workspaceId

  const inquiry = await prisma.inquiry.create({
    data: {
      workspaceId,
      name: '테스트 고객',
      contact: 'test@flowrit.app',
      content: '[테스트]\n이것은 Webhook 연동 테스트 의뢰입니다. 대시보드에서 정상 접수되었는지 확인하세요.',
      fileUrls: [],
    },
  })

  try {
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: { userId: true },
    })
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    await sendNotification({
      userIds: members.map((m) => m.userId),
      workspaceId,
      type: 'NEW_INQUIRY',
      title: '[테스트] 새 의뢰가 접수되었습니다',
      body: '테스트 고객: Webhook 연동 테스트 의뢰입니다.',
      href: '/dashboard',
      emailFn: (to) =>
        sendNewInquiryEmail(to, {
          submitterName: '테스트 고객',
          contact: 'test@flowrit.app',
          excerpt: 'Webhook 연동 테스트 의뢰입니다.',
          dashboardUrl: `${appUrl}/dashboard`,
        }),
    })
  } catch (error) {
    console.error('[test webhook] notification failed', { inquiryId: inquiry.id, error })
  }

  return { success: true }
}

import { prisma } from '@/lib/db'
import { sendOpsAlert } from '@/lib/ops-alert'

export type NotificationType =
  | 'NEW_INQUIRY'
  | 'REVISION_SUBMITTED'
  | 'STAGE_CHANGED'
  | 'DEADLINE_SOON'
  | 'REVISION_COMMENT'

type NotificationSettings = Record<string, boolean>

type SendNotificationInput = {
  userIds: string[]
  workspaceId: string
  type: NotificationType
  title: string
  body: string
  href: string
  emailFn?: (to: string) => Promise<void>
}

const settingKeys: Record<NotificationType, string> = {
  NEW_INQUIRY: 'notify_new_inquiry',
  REVISION_SUBMITTED: 'notify_revision_submitted',
  STAGE_CHANGED: 'notify_stage_changed',
  DEADLINE_SOON: 'notify_deadline_soon',
  REVISION_COMMENT: 'notify_revision_comment',
}

function settingsEnabled(settings: unknown, type: NotificationType): boolean {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return true
  const value = (settings as NotificationSettings)[settingKeys[type]]
  return value !== false
}

export async function sendNotification({
  userIds,
  workspaceId,
  type,
  title,
  body,
  href,
  emailFn,
}: SendNotificationInput): Promise<void> {
  const uniqueUserIds = [...new Set(userIds)].filter(Boolean)
  if (uniqueUserIds.length === 0) return

  const users = await prisma.user.findMany({
    where: { id: { in: uniqueUserIds } },
    select: { id: true, email: true, notificationSettings: true },
  })

  const recipients = users.filter((user) => settingsEnabled(user.notificationSettings, type))
  if (recipients.length === 0) return

  try {
    await prisma.notification.createMany({
      data: recipients.map((user) => ({
        userId: user.id,
        workspaceId,
        type,
        title,
        body,
        href,
      })),
    })
  } catch (error) {
    await sendOpsAlert({
      level: 'warning',
      title: 'Notification creation failed',
      message: '인앱 알림 생성에 실패했습니다.',
      source: 'notifications.createMany',
      context: {
        workspaceId,
        type,
        recipientCount: recipients.length,
        error,
      },
    })
    throw error
  }

  if (!emailFn) return

  await Promise.all(
    recipients.map(async (user) => {
      try {
        await emailFn(user.email)
      } catch (error) {
        console.error('[notification] email failed', { type, userId: user.id, error })
      }
    })
  )
}

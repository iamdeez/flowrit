import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendDeadlineReminderEmail } from '@/lib/email'
import { sendNotification } from '@/lib/notifications'
import { isProjectDone } from '@/lib/project-utils'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const authorization = request.headers.get('authorization')

  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const from = new Date(now.getTime() + 23 * 60 * 60 * 1000)
  const to = new Date(now.getTime() + 25 * 60 * 60 * 1000)

  const candidates = await prisma.project.findMany({
    where: {
      archivedAt: null,
      dueDate: { gte: from, lte: to },
    },
    include: {
      customer: true,
      stages: { orderBy: { order: 'asc' } },
      revisions: { where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } },
      events: { where: { eventType: 'DEADLINE_NOTIFIED' }, take: 1 },
    },
  })

  let processed = 0
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  for (const project of candidates) {
    if (isProjectDone(project) || project.events.length > 0) continue

    const owners = await prisma.workspaceMember.findMany({
      where: { workspaceId: project.workspaceId, role: 'OWNER' },
      select: { userId: true },
    })
    const userIds = project.assigneeId
      ? [project.assigneeId]
      : owners.map((owner) => owner.userId)

    try {
      await sendNotification({
        userIds,
        workspaceId: project.workspaceId,
        type: 'DEADLINE_SOON',
        title: '프로젝트 마감일이 다가옵니다',
        body: `${project.title} · ${project.dueDate?.toLocaleDateString('ko-KR')}`,
        href: `/projects/${project.id}`,
        emailFn: (toEmail) =>
          sendDeadlineReminderEmail(toEmail, {
            projectTitle: project.title,
            customerName: project.customer.name,
            dueDate: project.dueDate?.toLocaleDateString('ko-KR') ?? '마감일 없음',
            pendingRevisions: project.revisions.length,
            projectUrl: `${appUrl}/projects/${project.id}`,
          }),
      })

      await prisma.timelineEvent.create({
        data: {
          projectId: project.id,
          title: '마감 리마인더 발송',
          eventType: 'DEADLINE_NOTIFIED',
          metadata: { dueDate: project.dueDate },
        },
      })
      processed += 1
    } catch (error) {
      console.error('[cron] deadline reminder failed', { projectId: project.id, error })
    }
  }

  return NextResponse.json({ processed })
}

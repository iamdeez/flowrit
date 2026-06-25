import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendDeadlineReminderEmail } from '@/lib/email'
import { sendNotification } from '@/lib/notifications'
import { sendOpsAlert } from '@/lib/ops-alert'
import { isProjectDone } from '@/lib/project-utils'
import { chargeBillingKey, getNextPeriodEnd, PLAN_PRICES, type BillingCycle } from '@/lib/billing'
import { sendPaymentFailEmail } from '@/lib/email'

const MAX_RETRIES = 3

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  const authorization = request.headers.get('authorization')
  return Boolean(secret && authorization === `Bearer ${secret}`)
}

async function runDeadlineReminder(): Promise<{ processed: number }> {
  const now = new Date()
  const to = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  const candidates = await prisma.project.findMany({
    where: {
      archivedAt: null,
      dueDate: { gte: now, lte: to },
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
      console.error('[cron/daily] deadline reminder failed', { projectId: project.id, error })
      await sendOpsAlert({
        level: 'warning',
        title: 'Deadline reminder failed',
        message: '마감 리마인더 발송 또는 타임라인 기록에 실패했습니다.',
        source: 'cron.daily.deadlineReminder',
        context: {
          workspaceId: project.workspaceId,
          projectId: project.id,
          dueDate: project.dueDate,
          error,
        },
      })
    }
  }

  return { processed }
}

async function runBilling(): Promise<{ charged: number; failed: number; canceledExpired: number }> {
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)

  const subscriptions = await prisma.subscription.findMany({
    where: {
      plan: 'pro',
      status: 'active',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: { gte: todayStart, lte: todayEnd },
    },
    include: {
      workspace: {
        select: {
          name: true,
          members: {
            where: { role: 'OWNER' },
            select: { user: { select: { email: true, name: true } } },
          },
        },
      },
    },
  })

  const canceledExpiredList = await prisma.subscription.findMany({
    where: {
      plan: 'pro',
      cancelAtPeriodEnd: true,
      currentPeriodEnd: { lt: now },
    },
    select: { id: true, workspaceId: true },
  })

  for (const sub of canceledExpiredList) {
    await prisma.$transaction([
      prisma.subscription.update({
        where: { id: sub.id },
        data: { plan: 'free', status: 'active', cancelAtPeriodEnd: false, billingKey: null },
      }),
      prisma.workspace.update({
        where: { id: sub.workspaceId },
        data: { plan: 'free' },
      }),
    ])
  }

  let charged = 0
  let failed = 0

  for (const sub of subscriptions) {
    if (!sub.billingKey || !sub.billingCycle) continue

    const ownerEmail = sub.workspace.members[0]?.user.email ?? ''
    const workspaceName = sub.workspace.name
    const amount = PLAN_PRICES[sub.billingCycle as BillingCycle]
    const orderId = `billing-${sub.workspaceId}-${now.getTime()}`

    try {
      const result = await chargeBillingKey({
        bid: sub.billingKey,
        orderId,
        amount,
        goodsName: `Flowrit Pro (${sub.billingCycle === 'monthly' ? '월정기' : '연정기'})`,
        buyerName: sub.workspace.members[0]?.user.name ?? '',
        buyerEmail: ownerEmail,
      })

      const nextEnd = getNextPeriodEnd(sub.billingCycle as BillingCycle, sub.currentPeriodEnd ?? now)

      await prisma.$transaction([
        prisma.subscription.update({
          where: { id: sub.id },
          data: {
            currentPeriodStart: now,
            currentPeriodEnd: nextEnd,
            retryCount: 0,
          },
        }),
        prisma.payment.create({
          data: {
            workspaceId: sub.workspaceId,
            subscriptionId: sub.id,
            paymentKey: result.tid,
            orderId,
            amount,
            status: 'done',
            method: result.payMethod,
            paidAt: new Date(result.paidAt),
          },
        }),
      ])
      charged += 1
    } catch (err) {
      const failReason = err instanceof Error ? err.message : String(err)
      const newRetryCount = sub.retryCount + 1
      const isFinal = newRetryCount >= MAX_RETRIES

      const updateData = isFinal
        ? { status: 'past_due', retryCount: newRetryCount }
        : { retryCount: newRetryCount }

      await prisma.$transaction(async (tx) => {
        await tx.subscription.update({ where: { id: sub.id }, data: updateData })
        await tx.payment.create({
          data: {
            workspaceId: sub.workspaceId,
            subscriptionId: sub.id,
            paymentKey: `fail-${sub.workspaceId}-${now.getTime()}`,
            orderId,
            amount,
            status: 'failed',
            failReason,
          },
        })
        if (isFinal) {
          await tx.workspace.update({
            where: { id: sub.workspaceId },
            data: { plan: 'free' },
          })
        }
      })

      if (ownerEmail) {
        await sendPaymentFailEmail(ownerEmail, workspaceName, isFinal).catch(() => {})
      }
      await sendOpsAlert({
        level: isFinal ? 'critical' : 'warning',
        title: isFinal ? 'Subscription payment finally failed' : 'Subscription payment failed',
        message: isFinal
          ? '정기 결제가 최대 재시도 횟수까지 실패하여 past_due 처리되었습니다.'
          : '정기 결제에 실패했고 재시도 카운트가 증가했습니다.',
        source: 'cron.daily.billing',
        context: {
          workspaceId: sub.workspaceId,
          subscriptionId: sub.id,
          orderId,
          amount,
          retryCount: newRetryCount,
          isFinal,
          error: err,
        },
      })
      failed += 1
    }
  }

  return { charged, failed, canceledExpired: canceledExpiredList.length }
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [deadlineResult, billingResult] = await Promise.allSettled([
    runDeadlineReminder(),
    runBilling(),
  ])

  return NextResponse.json({
    deadlineReminder:
      deadlineResult.status === 'fulfilled'
        ? deadlineResult.value
        : { error: String(deadlineResult.reason) },
    billing:
      billingResult.status === 'fulfilled'
        ? billingResult.value
        : { error: String(billingResult.reason) },
  })
}

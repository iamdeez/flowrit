import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { chargeBillingKey, getNextPeriodEnd, PLAN_PRICES, type BillingCycle } from '@/lib/billing'
import { sendPaymentFailEmail } from '@/lib/email'
import { sendOpsAlert } from '@/lib/ops-alert'

const MAX_RETRIES = 3

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const authorization = request.headers.get('authorization')

  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)

  // 당일 만료 예정 PRO 구독 조회
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

  // 기간 만료된 취소 구독 → FREE 전환
  const canceledExpired = await prisma.subscription.findMany({
    where: {
      plan: 'pro',
      cancelAtPeriodEnd: true,
      currentPeriodEnd: { lt: now },
    },
    select: { id: true, workspaceId: true },
  })

  for (const sub of canceledExpired) {
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
        await tx.subscription.update({
          where: { id: sub.id },
          data: updateData,
        })
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
        source: 'cron.billing',
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

  return NextResponse.json({ charged, failed, canceledExpired: canceledExpired.length })
}

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  registerBillingKey,
  chargeBillingKey,
  getNextPeriodEnd,
  PLAN_PRICES,
  type BillingCycle,
} from '@/lib/billing'

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const workspaceId = session.user.workspaceId

  let body: { authToken: string; orderId: string; billingCycle: BillingCycle }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { authToken, orderId, billingCycle } = body
  if (!authToken || !orderId || (billingCycle !== 'monthly' && billingCycle !== 'yearly')) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { plan: true },
  })
  if (workspace?.plan === 'pro') {
    return NextResponse.json({ error: 'Already on PRO plan' }, { status: 409 })
  }

  const owner = await prisma.workspaceMember.findFirst({
    where: { workspaceId, role: 'OWNER' },
    select: { user: { select: { email: true, name: true } } },
  })

  // 나이스페이먼츠 빌링키 발급
  let bid: string
  try {
    bid = await registerBillingKey(
      authToken,
      orderId,
      owner?.user.email ?? '',
      owner?.user.name ?? '',
    )
  } catch (err) {
    return NextResponse.json(
      { error: '카드 등록에 실패했습니다.', detail: String(err) },
      { status: 502 },
    )
  }

  // 첫 결제 실행
  const now = new Date()
  const paymentOrderId = `billing-${workspaceId}-${now.getTime()}`
  const amount = PLAN_PRICES[billingCycle]
  const periodEnd = getNextPeriodEnd(billingCycle, now)

  try {
    const result = await chargeBillingKey({
      bid,
      orderId: paymentOrderId,
      amount,
      goodsName: `Flowrit Pro (${billingCycle === 'monthly' ? '월정기' : '연정기'})`,
      buyerName: owner?.user.name ?? '',
      buyerEmail: owner?.user.email ?? '',
    })

    await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.upsert({
        where: { workspaceId },
        create: {
          workspaceId,
          plan: 'pro',
          billingCycle,
          status: 'active',
          billingKey: bid,
          customerKey: workspaceId,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          retryCount: 0,
        },
        update: {
          plan: 'pro',
          billingCycle,
          status: 'active',
          billingKey: bid,
          customerKey: workspaceId,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          retryCount: 0,
        },
      })

      await tx.payment.create({
        data: {
          workspaceId,
          subscriptionId: subscription.id,
          paymentKey: result.tid,
          orderId: paymentOrderId,
          amount,
          status: 'done',
          method: result.payMethod,
          paidAt: new Date(result.paidAt),
        },
      })

      await tx.workspace.update({
        where: { id: workspaceId },
        data: { plan: 'pro' },
      })
    })

    return NextResponse.json({ success: true, plan: 'pro' })
  } catch (err) {
    return NextResponse.json(
      { error: '결제에 실패했습니다.', detail: String(err) },
      { status: 402 },
    )
  }
}

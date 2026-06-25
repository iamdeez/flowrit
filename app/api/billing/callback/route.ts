import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  registerBillingKey,
  getNextPeriodEnd,
  PLAN_PRICES,
  type BillingCycle,
} from '@/lib/billing'
import { sendOpsAlert } from '@/lib/ops-alert'

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const workspaceId = session.user.workspaceId

  let body: { authToken: string; encData?: string; orderId: string; billingCycle: BillingCycle }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { authToken, encData, orderId, billingCycle } = body
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

  // 나이스페이먼츠 빌링키 발급 + 첫 결제 (AUTHNICE popup에서 실제 금액으로 승인됨)
  const now = new Date()
  const amount = PLAN_PRICES[billingCycle]
  const periodEnd = getNextPeriodEnd(billingCycle, now)

  let registration: { bid: string; tid: string; payMethod: string; paidAt: string }
  try {
    registration = await registerBillingKey(
      authToken,
      orderId,
      owner?.user.email ?? '',
      owner?.user.name ?? '',
      encData,
    )
  } catch (err) {
    await sendOpsAlert({
      level: 'critical',
      title: 'Billing key registration failed',
      message: '나이스페이먼츠 빌링키 발급에 실패했습니다.',
      source: 'billing.callback.registerBillingKey',
      context: { workspaceId, orderId, billingCycle, error: err },
    })
    return NextResponse.json(
      { error: `카드 등록에 실패했습니다. ${String(err)}` },
      { status: 502 },
    )
  }

  try {
    await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.upsert({
        where: { workspaceId },
        create: {
          workspaceId,
          plan: 'pro',
          billingCycle,
          status: 'active',
          billingKey: registration.bid,
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
          billingKey: registration.bid,
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
          paymentKey: registration.tid,
          orderId,
          amount,
          status: 'done',
          method: registration.payMethod,
          paidAt: new Date(registration.paidAt),
        },
      })

      await tx.workspace.update({
        where: { id: workspaceId },
        data: { plan: 'pro' },
      })
    })

    return NextResponse.json({ success: true, plan: 'pro' })
  } catch (err) {
    await sendOpsAlert({
      level: 'critical',
      title: 'Subscription DB write failed after payment',
      message: 'Pro 업그레이드 결제 후 DB 저장에 실패했습니다.',
      source: 'billing.callback.db',
      context: { workspaceId, orderId, billingCycle, amount, tid: registration.tid, error: err },
    })
    return NextResponse.json(
      { error: '결제는 완료되었으나 처리 중 오류가 발생했습니다. 고객센터에 문의해 주세요.', detail: String(err) },
      { status: 500 },
    )
  }
}

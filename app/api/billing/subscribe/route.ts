import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  registerBillingKeyDirect,
  chargeBillingKey,
  getNextPeriodEnd,
  PLAN_PRICES,
  type BillingCycle,
  type CardDetails,
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

  let body: { card: CardDetails; billingCycle: BillingCycle }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { card, billingCycle } = body
  if (!card?.cardNo || !card.expYear || !card.expMonth || !card.idNo || !card.cardPw) {
    return NextResponse.json({ error: 'Missing card details' }, { status: 400 })
  }
  if (billingCycle !== 'monthly' && billingCycle !== 'yearly') {
    return NextResponse.json({ error: 'Invalid billingCycle' }, { status: 400 })
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

  const now = new Date()
  const amount = PLAN_PRICES[billingCycle]
  const goodsName = `Flowrit Pro (${billingCycle === 'monthly' ? '월정기' : '연정기'})`
  const orderId = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const periodEnd = getNextPeriodEnd(billingCycle, now)

  let billingReg: { bid: string; cardName?: string; cardNum?: string }
  try {
    billingReg = await registerBillingKeyDirect(
      card,
      `reg-${orderId}`,
      owner?.user.name ?? undefined,
      owner?.user.email ?? undefined,
    )
  } catch (err) {
    await sendOpsAlert({
      level: 'critical',
      title: 'Billing key registration failed',
      message: '빌링키 발급에 실패했습니다.',
      source: 'billing.subscribe.register',
      context: { workspaceId, error: err },
    })
    return NextResponse.json(
      { error: `카드 등록에 실패했습니다. ${String(err)}` },
      { status: 502 },
    )
  }

  let payment: { tid: string; payMethod: string; paidAt: string }
  try {
    payment = await chargeBillingKey({
      bid: billingReg.bid,
      orderId,
      amount,
      goodsName,
      buyerName: owner?.user.name ?? '',
      buyerEmail: owner?.user.email ?? '',
    })
  } catch (err) {
    await sendOpsAlert({
      level: 'critical',
      title: 'First billing charge failed after card registration',
      message: '빌링키 발급 후 첫 결제에 실패했습니다.',
      source: 'billing.subscribe.charge',
      context: { workspaceId, orderId, error: err },
    })
    return NextResponse.json(
      { error: `결제에 실패했습니다. ${String(err)}` },
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
          billingKey: billingReg.bid,
          customerKey: workspaceId,
          cardName: billingReg.cardName ?? null,
          cardNum: billingReg.cardNum ?? null,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          retryCount: 0,
        },
        update: {
          plan: 'pro',
          billingCycle,
          status: 'active',
          billingKey: billingReg.bid,
          customerKey: workspaceId,
          cardName: billingReg.cardName ?? null,
          cardNum: billingReg.cardNum ?? null,
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
          paymentKey: payment.tid,
          orderId,
          amount,
          status: 'done',
          method: payment.payMethod,
          paidAt: new Date(payment.paidAt),
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
      source: 'billing.subscribe.db',
      context: { workspaceId, orderId, amount, tid: payment.tid, error: err },
    })
    return NextResponse.json(
      { error: '결제는 완료되었으나 처리 중 오류가 발생했습니다. 고객센터에 문의해 주세요.' },
      { status: 500 },
    )
  }
}

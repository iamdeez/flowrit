import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { registerCard, cancelBillingKey } from '@/lib/billing'
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

  let body: { authToken: string; orderId: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { authToken, orderId } = body
  if (!authToken || !orderId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const subscription = await prisma.subscription.findUnique({
    where: { workspaceId },
    select: { id: true, plan: true, billingKey: true },
  })

  if (!subscription || subscription.plan !== 'pro') {
    return NextResponse.json({ error: 'No active PRO subscription' }, { status: 409 })
  }

  const owner = await prisma.workspaceMember.findFirst({
    where: { workspaceId, role: 'OWNER' },
    select: { user: { select: { email: true, name: true } } },
  })

  let newCard: { bid: string; cardName?: string; cardNum?: string }
  try {
    newCard = await registerCard(
      authToken,
      orderId,
      owner?.user.email ?? '',
      owner?.user.name ?? '',
    )
  } catch (err) {
    await sendOpsAlert({
      level: 'warning',
      title: 'Card change registration failed',
      message: '카드 변경 중 빌링키 발급에 실패했습니다.',
      source: 'billing.change-card.register',
      context: { workspaceId, orderId, error: err },
    })
    return NextResponse.json(
      { error: `카드 등록에 실패했습니다. ${String(err)}` },
      { status: 502 },
    )
  }

  const oldBid = subscription.billingKey

  await prisma.subscription.update({
    where: { workspaceId },
    data: {
      billingKey: newCard.bid,
      cardName: newCard.cardName ?? null,
      cardNum: newCard.cardNum ?? null,
    },
  })

  if (oldBid) {
    await cancelBillingKey(oldBid)
  }

  return NextResponse.json({ success: true })
}

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { cancelBillingKey } from '@/lib/billing'

export async function POST(request: Request) {
  void request
  const session = await auth()
  if (!session?.user?.workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const workspaceId = session.user.workspaceId

  const subscription = await prisma.subscription.findUnique({
    where: { workspaceId },
    select: { id: true, billingKey: true },
  })

  if (!subscription?.billingKey) {
    return NextResponse.json({ error: 'No registered card' }, { status: 404 })
  }

  await cancelBillingKey(subscription.billingKey)

  await prisma.$transaction([
    prisma.subscription.update({
      where: { workspaceId },
      data: {
        billingKey: null,
        cardName: null,
        cardNum: null,
        plan: 'free',
        status: 'canceled',
        cancelAtPeriodEnd: false,
        billingCycle: null,
        currentPeriodEnd: null,
      },
    }),
    prisma.workspace.update({
      where: { id: workspaceId },
      data: { plan: 'free' },
    }),
  ])

  return NextResponse.json({ success: true })
}

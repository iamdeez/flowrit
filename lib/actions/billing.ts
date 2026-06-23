'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function cancelSubscription(): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.workspaceId) return { success: false, error: 'Unauthorized' }
  if (session.user.role !== 'OWNER') return { success: false, error: 'Forbidden' }

  const workspaceId = session.user.workspaceId

  const subscription = await prisma.subscription.findUnique({
    where: { workspaceId },
    select: { id: true, plan: true, status: true },
  })

  if (!subscription || subscription.plan !== 'pro') {
    return { success: false, error: 'No active PRO subscription' }
  }

  await prisma.subscription.update({
    where: { workspaceId },
    data: { cancelAtPeriodEnd: true },
  })

  revalidatePath('/settings')
  return { success: true }
}

'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

async function ensureSameUser(userId: string): Promise<boolean> {
  const session = await auth()
  return session?.user?.id === userId
}

export async function getNotifications(userId: string) {
  if (!(await ensureSameUser(userId))) return []

  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
}

export async function markNotificationsRead(userId: string): Promise<void> {
  if (!(await ensureSameUser(userId))) return

  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  })

  revalidatePath('/dashboard')
}

'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

async function requireWorkspaceId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.workspaceId) throw new Error('로그인이 필요합니다.')
  return session.user.workspaceId
}

export async function createPublicPage(projectId: string): Promise<void> {
  const workspaceId = await requireWorkspaceId()
  const project = await prisma.project.findFirst({ where: { id: projectId, workspaceId } })
  if (!project) throw new Error('프로젝트를 찾을 수 없습니다.')

  await prisma.publicProjectPage.upsert({
    where: { projectId },
    create: { projectId, isActive: true },
    update: { isActive: true },
  })

  revalidatePath(`/projects/${projectId}`)
}

export async function togglePublicPage(pageId: string, isActive: boolean): Promise<void> {
  const workspaceId = await requireWorkspaceId()
  const page = await prisma.publicProjectPage.findFirst({
    where: { id: pageId, project: { workspaceId } },
  })
  if (!page) throw new Error('공유 페이지를 찾을 수 없습니다.')

  await prisma.publicProjectPage.update({
    where: { id: pageId },
    data: { isActive },
  })

  revalidatePath(`/projects/${page.projectId}`)
}

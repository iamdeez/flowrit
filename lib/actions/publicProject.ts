'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { findCompletionStage } from '@/lib/project-utils'

function stringValue(formData: FormData, key: string): string {
  return ((formData.get(key) as string | null) ?? '').trim()
}

export async function confirmProjectDelivery(formData: FormData): Promise<void> {
  const token = stringValue(formData, 'token')
  if (!token) return

  const page = await prisma.publicProjectPage.findUnique({
    where: { token, isActive: true },
    include: {
      project: {
        include: { stages: { orderBy: { order: 'asc' } } },
      },
    },
  })
  if (!page) return

  const doneStage = findCompletionStage(page.project.stages)
  if (!doneStage || page.project.currentStageId === doneStage.id) return

  const previousStage = page.project.stages.find((stage) => stage.id === page.project.currentStageId)

  await prisma.$transaction([
    prisma.project.update({
      where: { id: page.projectId },
      data: { currentStageId: doneStage.id },
    }),
    prisma.timelineEvent.create({
      data: {
        projectId: page.projectId,
        title: '고객 작업 확정',
        eventType: 'PROJECT_CONFIRMED_BY_CLIENT',
        metadata: {
          previousStageId: previousStage?.id ?? null,
          previousStageName: previousStage?.internalName ?? null,
          nextStageId: doneStage.id,
          nextStageName: doneStage.internalName,
        },
      },
    }),
  ])

  revalidatePath(`/p/${token}`)
  revalidatePath(`/projects/${page.projectId}`)
  revalidatePath('/projects')
}

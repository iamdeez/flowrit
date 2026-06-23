import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getEffectiveStageFromSharedAssets } from '@/lib/project-utils'
import { PublicProjectPortal } from './public-project-portal'

type Props = {
  params: Promise<{ token: string }>
}

export default async function PublicProjectPage({ params }: Props) {
  const { token } = await params
  const now = new Date()

  const page = await prisma.publicProjectPage.findUnique({
    where: { token },
    include: {
      project: {
        include: {
          stages: { orderBy: { order: 'asc' } },
          assets: {
            where: {
              OR: [
                { status: 'SHARED' },
                { shareScheduledAt: { lte: now } },
              ],
            },
            orderBy: { createdAt: 'desc' },
            include: {
              revisionRequest: {
                select: { id: true },
              },
            },
          },
          revisions: {
            orderBy: { createdAt: 'desc' },
            include: {
              assets: {
                where: {
                  OR: [
                    { status: 'SHARED' },
                    { shareScheduledAt: { lte: now } },
                  ],
                },
                orderBy: { createdAt: 'desc' },
              },
              comments: {
                where: { parentId: null },
                select: {
                  id: true,
                  authorType: true,
                  authorName: true,
                  content: true,
                  createdAt: true,
                  parentId: true,
                  replies: {
                    orderBy: { createdAt: 'asc' },
                    select: {
                      id: true,
                      authorType: true,
                      authorName: true,
                      content: true,
                      createdAt: true,
                      parentId: true,
                    },
                  },
                },
                orderBy: { createdAt: 'asc' },
              },
            },
          },
        },
      },
    },
  })

  if (!page || !page.isActive) notFound()

  const { project } = page
  const currentStage = getEffectiveStageFromSharedAssets(project)
  const portalProject = {
    title: project.title,
    dueDate: project.dueDate?.toISOString() ?? null,
    stages: project.stages.map((stage) => ({
      id: stage.id,
      order: stage.order,
      customerName: stage.customerName,
      completedAt: stage.completedAt?.toISOString() ?? null,
    })),
    assets: project.assets.filter((asset) => !asset.revisionRequest).map((asset) => ({
      id: asset.id,
      name: asset.name,
      url: asset.url,
      type: asset.type,
      version: asset.version,
      status: asset.status,
      shareScheduledAt: asset.shareScheduledAt?.toISOString() ?? null,
      expiredAt: asset.expiredAt?.toISOString() ?? null,
      createdAt: asset.createdAt.toISOString(),
      revisionRequest: asset.revisionRequest,
    })),
    revisions: project.revisions.map((revision) => ({
      id: revision.id,
      content: revision.content,
      status: revision.status,
      createdAt: revision.createdAt.toISOString(),
      assets: revision.assets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        url: asset.url,
        type: asset.type,
        version: asset.version,
        status: asset.status,
        shareScheduledAt: asset.shareScheduledAt?.toISOString() ?? null,
        expiredAt: asset.expiredAt?.toISOString() ?? null,
        createdAt: asset.createdAt.toISOString(),
        revisionRequest: { id: revision.id },
      })),
      comments: revision.comments.map((comment) => ({
        ...comment,
        createdAt: comment.createdAt.toISOString(),
        replies: comment.replies.map((reply) => ({
          ...reply,
          createdAt: reply.createdAt.toISOString(),
        })),
      })),
    })),
  }

  return (
    <PublicProjectPortal
      token={token}
      project={portalProject}
      currentStageId={currentStage?.id ?? null}
      currentStageOrder={currentStage?.order ?? 0}
    />
  )
}

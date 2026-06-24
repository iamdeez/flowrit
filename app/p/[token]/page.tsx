import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getEffectiveStageFromSharedAssets } from '@/lib/project-utils'
import { PublicProjectPortal } from './public-project-portal'

type Props = {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const page = await prisma.publicProjectPage.findUnique({
    where: { token },
    select: {
      isActive: true,
      project: {
        select: {
          title: true,
          dueDate: true,
          customer: { select: { name: true } },
        },
      },
    },
  })

  if (!page || !page.isActive) {
    return {
      title: '공유 페이지를 찾을 수 없습니다',
      robots: { index: false, follow: false },
    }
  }

  const dueDate = page.project.dueDate?.toLocaleDateString('ko-KR') ?? '일정 확인 중'
  const title = `${page.project.title} 진행 현황`
  const description = `${page.project.customer.name}님의 프로젝트 진행 단계, 납품 이력, 수정 요청 현황을 확인하는 Flowrit 공유 페이지입니다. 납품 일정: ${dueDate}.`

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
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

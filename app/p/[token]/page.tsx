import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentStage } from '@/lib/project-utils'
import { RevisionCommentForm } from './revision-comment-form'

type Props = {
  params: Promise<{ token: string }>
}

export default async function PublicProjectPage({ params }: Props) {
  const { token } = await params

  const page = await prisma.publicProjectPage.findUnique({
    where: { token },
    include: {
      project: {
        include: {
          stages: { orderBy: { order: 'asc' } },
          assets: {
            where: { status: 'SHARED' },
            orderBy: { createdAt: 'desc' },
          },
          revisions: {
            orderBy: { createdAt: 'desc' },
            include: {
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
  const currentStage = getCurrentStage(project)
  const doneRevisions = project.revisions.filter((r) => r.status === 'DONE').length
  const totalRevisions = project.revisions.length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
            진행상황
          </p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">{project.title}</h1>
          {project.dueDate && (
            <p className="mt-1 text-sm text-gray-500">
              마감일 {project.dueDate.toLocaleDateString('ko-KR')}
            </p>
          )}
        </div>

        {/* 현재 단계 */}
        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
            현재 단계
          </p>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
              {currentStage?.order ?? '-'}
            </span>
            <p className="text-lg font-semibold text-gray-900">
              {currentStage?.customerName ?? '진행 전'}
            </p>
          </div>

          {project.stages.length > 0 && (
            <div className="mt-5 flex gap-1.5">
              {project.stages.map((stage) => (
                <div
                  key={stage.id}
                  title={stage.customerName}
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    stage.order <= (currentStage?.order ?? 0)
                      ? 'bg-indigo-500'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* 수정 요청 현황 */}
        {totalRevisions > 0 && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-white p-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              수정 요청 현황
            </p>
            <p className="text-sm text-gray-700">
              총 {totalRevisions}건 중{' '}
              <span className="font-semibold text-indigo-700">{doneRevisions}건</span> 완료
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-indigo-500 transition-all"
                style={{ width: `${Math.round((doneRevisions / totalRevisions) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* 수정 요청별 댓글 스레드 */}
        {project.revisions.map((revision) => (
          <div key={revision.id} className="mb-4 rounded-xl border border-gray-200 bg-white p-6">
            <p className="mb-2 whitespace-pre-wrap text-sm font-medium text-gray-900">
              {revision.content}
            </p>
            <p className="mb-3 text-xs text-gray-400">
              {new Date(revision.createdAt).toLocaleDateString('ko-KR')} 등록
            </p>
            <RevisionCommentForm
              token={token}
              revisionId={revision.id}
              comments={revision.comments}
            />
          </div>
        ))}

        {/* 공유된 파일·링크 */}
        {project.assets.length > 0 && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-white p-6">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
              공유된 파일·링크
            </p>
            <div className="space-y-3">
              {project.assets.map((asset) => (
                <a
                  key={asset.id}
                  href={asset.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{asset.name}</p>
                    {asset.version && (
                      <p className="mt-0.5 text-xs text-gray-500">{asset.version}</p>
                    )}
                    {asset.expiredAt && (
                      <p className="mt-0.5 text-xs text-gray-500">
                        {asset.expiredAt.toLocaleDateString('ko-KR')} 만료
                      </p>
                    )}
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-gray-400" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 수정 요청 버튼 */}
        <Link
          href={`/p/${token}/revision`}
          className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-4 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          수정 요청하기
        </Link>
      </div>
    </div>
  )
}

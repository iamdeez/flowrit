import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  CalendarDays,
  Copy,
  ExternalLink,
  FileText,
  MessageSquare,
  Share2,
  UserRound,
} from 'lucide-react'
import { assetStatusLabels, assetTypeLabels } from '@/lib/asset-labels'
import { getProjectDetail } from '@/lib/actions/project'
import { getCurrentStage } from '@/lib/project-utils'
import {
  revisionPriorityLabels,
  revisionSourceLabels,
  revisionStatusLabels,
} from '@/lib/revision-labels'
import { AssetForm } from './asset-form'
import { AssetStatusForm } from './asset-status-form'
import { RevisionForm } from './revision-form'
import { RevisionStatusForm } from './revision-status-form'
import { StageForm } from './stage-form'

type ProjectDetailPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

const tabs = [
  { key: 'revisions', label: '수정 요청' },
  { key: 'assets', label: '파일·링크' },
  { key: 'timeline', label: '타임라인' },
  { key: 'messages', label: '메시지' },
]

export default async function ProjectDetailPage({
  params,
  searchParams,
}: ProjectDetailPageProps) {
  const { id } = await params
  const tab = (await searchParams).tab ?? 'revisions'
  const data = await getProjectDetail(id)

  if (!data) notFound()

  const { project, assignee, members } = data
  const currentStage = getCurrentStage(project)

  return (
    <div className="p-8">
      <Link
        href="/projects"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        프로젝트 목록
      </Link>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{project.title}</h1>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <UserRound className="h-4 w-4" />
                {project.customer.name}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                {project.dueDate
                  ? project.dueDate.toLocaleDateString('ko-KR')
                  : '마감일 없음'}
              </span>
              <span>담당자 {assignee?.user.name ?? '미지정'}</span>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-500"
            disabled
          >
            <Share2 className="h-4 w-4" />
            공유 링크 생성
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg bg-gray-50 p-4">
          <div>
            <p className="text-sm font-medium text-gray-900">
              현재 단계: {currentStage?.internalName ?? '대기'}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              고객 표시명: {currentStage?.customerName ?? '대기'}
            </p>
          </div>
          <StageForm
            projectId={project.id}
            currentStageId={project.currentStageId}
            stages={project.stages}
          />
        </div>
      </div>

      <div className="mb-5 flex gap-2 border-b border-gray-200">
        {tabs.map((item) => (
          <Link
            key={item.key}
            href={`/projects/${project.id}?tab=${item.key}`}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              tab === item.key
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {tab === 'revisions' && (
        <section className="space-y-5">
          <RevisionForm projectId={project.id} members={members} />

          {project.revisions.length > 0 ? (
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
              {project.revisions.map((revision) => (
                <div
                  key={revision.id}
                  className="grid gap-4 p-5 md:grid-cols-[1fr_auto]"
                >
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                        {revisionStatusLabels[revision.status] ?? revision.status}
                      </span>
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                        {revisionPriorityLabels[revision.priority] ?? revision.priority}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                        {revisionSourceLabels[revision.source] ?? revision.source}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm font-medium leading-6 text-gray-900">
                      {revision.content}
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                      {revision.createdAt.toLocaleDateString('ko-KR')} 등록
                    </p>
                  </div>
                  <RevisionStatusForm
                    revisionId={revision.id}
                    status={revision.status}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white">
              <EmptyPanel
                icon={<FileText className="h-5 w-5" />}
                title="등록된 수정 요청이 없습니다."
                description="위 폼에서 첫 수정 요청을 등록하세요."
              />
            </div>
          )}
        </section>
      )}

      {tab === 'assets' && (
        <section className="space-y-5">
          <AssetForm projectId={project.id} />

          {project.assets.length > 0 ? (
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
              {project.assets.map((asset) => (
                <div
                  key={asset.id}
                  className="grid gap-4 p-5 md:grid-cols-[1fr_auto]"
                >
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                        {assetStatusLabels[asset.status] ?? asset.status}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                        {assetTypeLabels[asset.type] ?? asset.type}
                      </span>
                      {asset.version && (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                          {asset.version}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900">{asset.name}</p>
                    <a
                      href={asset.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex max-w-full items-center gap-1.5 truncate text-xs font-medium text-indigo-700 hover:text-indigo-900"
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{asset.url}</span>
                    </a>
                    <p className="mt-2 text-xs text-gray-500">
                      {asset.expiredAt
                        ? `${asset.expiredAt.toLocaleDateString('ko-KR')} 만료`
                        : '만료일 없음'}{' '}
                      · {asset.createdAt.toLocaleDateString('ko-KR')} 등록
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <AssetStatusForm assetId={asset.id} status={asset.status} />
                    <a
                      href={asset.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      열기
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white">
              <EmptyPanel
                icon={<ExternalLink className="h-5 w-5" />}
                title="등록된 파일·링크가 없습니다."
                description="위 폼에서 첫 외부 링크를 등록하세요."
              />
            </div>
          )}
        </section>
      )}

      {tab === 'timeline' && (
        <section className="rounded-xl border border-gray-200 bg-white">
          {project.events.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {project.events.map((event) => (
                <div key={event.id} className="p-5">
                  <p className="text-sm font-medium text-gray-900">{event.title}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {event.eventType} · {event.createdAt.toLocaleString('ko-KR')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel
              icon={<CalendarDays className="h-5 w-5" />}
              title="타임라인 기록이 없습니다."
              description="단계를 변경하면 이곳에 기록됩니다."
            />
          )}
        </section>
      )}

      {tab === 'messages' && (
        <section className="rounded-xl border border-gray-200 bg-white">
          <EmptyPanel
            icon={<MessageSquare className="h-5 w-5" />}
            title="메시지 생성 기능은 준비 중입니다."
            description="T030에서 템플릿 변수 치환과 복사가 연결됩니다."
          />
        </section>
      )}
    </div>
  )
}

function EmptyPanel({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="px-5 py-16 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
        {icon}
      </div>
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
  )
}

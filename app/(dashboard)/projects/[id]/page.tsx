import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  FileText,
  MessageSquare,
  Share2,
  UserRound,
} from 'lucide-react'
import { getProjectDetail } from '@/lib/actions/project'
import { getCurrentStage } from '@/lib/project-utils'
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

  const { project, assignee } = data
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
        <section className="rounded-xl border border-gray-200 bg-white">
          {project.revisions.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {project.revisions.map((revision) => (
                <div key={revision.id} className="p-5">
                  <p className="text-sm font-medium text-gray-900">{revision.content}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {revision.status} · {revision.priority} ·{' '}
                    {revision.createdAt.toLocaleDateString('ko-KR')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel
              icon={<FileText className="h-5 w-5" />}
              title="등록된 수정 요청이 없습니다."
              description="T019에서 수정 요청 등록 폼이 연결됩니다."
            />
          )}
        </section>
      )}

      {tab === 'assets' && (
        <section className="rounded-xl border border-gray-200 bg-white">
          {project.assets.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {project.assets.map((asset) => (
                <a
                  key={asset.id}
                  href={asset.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-5 hover:bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{asset.name}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {asset.type} · {asset.status}
                    </p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400" />
                </a>
              ))}
            </div>
          ) : (
            <EmptyPanel
              icon={<ExternalLink className="h-5 w-5" />}
              title="등록된 파일·링크가 없습니다."
              description="T022에서 외부 링크 등록 폼이 연결됩니다."
            />
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

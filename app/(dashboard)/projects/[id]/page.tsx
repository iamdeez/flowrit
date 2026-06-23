import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  Archive,
  CalendarDays,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Link2,
  MessageSquare,
  Paperclip,
  WalletCards,
  UserRound,
} from 'lucide-react'
import { assetStatusLabels, assetTypeLabels } from '@/lib/asset-labels'
import {
  getProjectDetail,
  createTimelineMemo,
  updateProjectBudget,
  archiveProject,
  unarchiveProject,
} from '@/lib/actions/project'
import { getMessageTemplates } from '@/lib/actions/message'
import { getCurrentStage } from '@/lib/project-utils'
import { formatKRW } from '@/lib/utils/analytics'
import {
  revisionPriorityLabels,
  revisionSourceLabels,
  revisionStatusLabels,
} from '@/lib/revision-labels'
import { ImageGallery } from '@/components/image-gallery'
import { AssetForm } from './asset-form'
import { AssetBulkShareForm, AssetStatusForm } from './asset-status-form'
import { DuplicateProjectDialog } from '../duplicate-project-dialog'
import { MessagePanel } from './message-panel'
import { PublicPageForm } from './public-page-form'
import { RevisionCommentSection } from './revision-comment-section'
import { RevisionForm } from './revision-form'
import { RevisionStatusForm } from './revision-status-form'
import { StageForm } from './stage-form'

type ProjectDetailPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

const tabs = [
  { key: 'revisions', label: '수정 관리', description: '고객 요청 확인과 처리 상태' },
  { key: 'assets', label: '납품 이력', description: '1차 납품부터 최종본까지' },
  { key: 'timeline', label: '타임라인', description: '단계 변경과 내부 메모' },
  { key: 'messages', label: '메시지', description: '고객에게 보낼 안내문' },
]

export default async function ProjectDetailPage({
  params,
  searchParams,
}: ProjectDetailPageProps) {
  const { id } = await params
  const tab = (await searchParams).tab ?? 'revisions'

  const [data, messageTemplates] = await Promise.all([
    getProjectDetail(id),
    tab === 'messages' ? getMessageTemplates() : Promise.resolve([]),
  ])

  if (!data) notFound()

  const { project, assignee, members, customers } = data
  const currentStage = getCurrentStage(project)

  const hdrs = await headers()
  const proto = hdrs.get('x-forwarded-proto') ?? 'http'
  const host = hdrs.get('host') ?? 'localhost:3000'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${proto}://${host}`
  const shareLink = project.publicPage?.token
    ? `${appUrl}/p/${project.publicPage.token}`
    : '(공유 링크 없음)'
  const openRevisionCount = project.revisions.filter((revision) =>
    ['OPEN', 'IN_PROGRESS'].includes(revision.status)
  ).length
  const sharedAssetCount = project.assets.filter((asset) => asset.status === 'SHARED').length
  const assetDeliveryLabel = (asset: {
    version: string | null
    status: string
    shareScheduledAt: Date | null
  }) => {
    if (asset.version) return asset.version
    if (asset.shareScheduledAt) {
      return `공유 예약 ${asset.shareScheduledAt.toLocaleString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`
    }
    return assetStatusLabels[asset.status] ?? asset.status
  }

  return (
    <div className="flowrit-page">
      <Link
        href="/projects"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        프로젝트 목록
      </Link>

      <div className="flowrit-panel-padded mb-4">
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
              <span className="inline-flex items-center gap-1.5">
                <WalletCards className="h-4 w-4" />
                {project.budget ? formatKRW(project.budget) : '예산 미입력'}
              </span>
              {project.archivedAt && (
                <span className="inline-flex items-center gap-1.5 text-gray-500">
                  <Archive className="h-4 w-4" />
                  {project.archivedAt.toLocaleDateString('ko-KR')} 아카이브됨
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <form action={project.archivedAt ? unarchiveProject : archiveProject}>
              <input type="hidden" name="projectId" value={project.id} />
              <button
                type="submit"
                className="flowrit-button-secondary min-h-9 px-3 text-xs"
              >
                <Archive className="h-3.5 w-3.5" />
                {project.archivedAt ? '아카이브 해제' : '아카이브'}
              </button>
            </form>
            <DuplicateProjectDialog
              sourceId={project.id}
              sourceTitle={project.title}
              sourceCustomerId={project.customerId}
              customers={customers}
            />
          </div>
        </div>

        <div className="grid gap-4 rounded-lg bg-gray-50 p-4 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="text-sm font-medium text-gray-900">
              현재 단계: {currentStage?.internalName ?? '대기'}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              고객 표시명: {currentStage?.customerName ?? '대기'}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3 lg:justify-end">
            <form action={updateProjectBudget} className="flex items-end gap-2">
              <input type="hidden" name="projectId" value={project.id} />
              <label className="grid gap-1 text-xs font-medium text-gray-500">
                예상 단가
                <input
                  name="budget"
                  type="number"
                  min="0"
                  step="10000"
                  inputMode="numeric"
                  defaultValue={project.budget ?? ''}
                  placeholder="미입력"
                  className="flowrit-input h-9 min-h-9 w-36"
                />
              </label>
              <button
                type="submit"
                className="flowrit-button-secondary min-h-9 px-3 text-xs"
              >
                저장
              </button>
            </form>
            <StageForm
              projectId={project.id}
              currentStageId={project.currentStageId}
              stages={project.stages}
            />
          </div>
        </div>
      </div>

      <section className="mb-6 grid gap-3 md:grid-cols-3">
        <div className="flowrit-panel-padded">
          <div className="mb-3 flex items-center gap-2">
            <span className="flowrit-empty-icon h-9 w-9">
              <Link2 className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--flowrit-text)]">고객 공유 링크</p>
              <p className="text-xs text-[var(--flowrit-text-muted)]">
                {project.publicPage?.isActive ? '고객 확인 가능' : '공유 전'}
              </p>
            </div>
          </div>
          <p className="mb-3 min-w-0 truncate rounded-lg bg-[var(--flowrit-panel-subtle)] px-3 py-2 text-xs text-[var(--flowrit-text-muted)]">
            {shareLink}
          </p>
          <PublicPageForm projectId={project.id} publicPage={project.publicPage ?? null} />
        </div>

        <div className="flowrit-panel-padded">
          <div className="mb-3 flex items-center gap-2">
            <span className="flowrit-empty-icon h-9 w-9">
              <FileText className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--flowrit-text)]">수정 요청함</p>
              <p className="text-xs text-[var(--flowrit-text-muted)]">열린 요청 {openRevisionCount}건</p>
            </div>
          </div>
          <Link href={`/projects/${project.id}?tab=revisions`} className="flowrit-button-secondary min-h-9 px-3 text-xs">
            요청 확인
          </Link>
        </div>

        <div className="flowrit-panel-padded">
          <div className="mb-3 flex items-center gap-2">
            <span className="flowrit-empty-icon h-9 w-9">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--flowrit-text)]">납품 이력</p>
              <p className="text-xs text-[var(--flowrit-text-muted)]">공유됨 {sharedAssetCount}개 / 전체 {project.assets.length}개</p>
            </div>
          </div>
          <Link href={`/projects/${project.id}?tab=assets`} className="flowrit-button-secondary min-h-9 px-3 text-xs">
            이력 관리
          </Link>
        </div>
      </section>

      <div className="mb-5 grid gap-2 border-b border-gray-200 md:grid-cols-4">
        {tabs.map((item) => (
          <Link
            key={item.key}
            href={`/projects/${project.id}?tab=${item.key}`}
            className={`border-b-2 px-3 py-3 text-sm font-medium ${
              tab === item.key
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <span className="block">{item.label}</span>
            <span className="mt-0.5 hidden text-xs font-normal text-[var(--flowrit-text-muted)] lg:block">
              {item.description}
            </span>
          </Link>
        ))}
      </div>

      {tab === 'revisions' && (
        <section className="space-y-5">
          <div className="flowrit-panel-padded">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[var(--flowrit-text)]">고객 수정 요청 관리</p>
                <p className="mt-1 text-sm text-[var(--flowrit-text-muted)]">
                  고객이 공유 페이지에서 남긴 요청을 확인하고 상태, 담당자, 댓글로 처리 흐름을 관리하세요.
                </p>
              </div>
              {project.publicPage?.token ? (
                <Link href={`/p/${project.publicPage.token}`} className="flowrit-button-secondary min-h-9 px-3 text-xs">
                  <ExternalLink className="h-3.5 w-3.5" />
                  고객 화면 열기
                </Link>
              ) : (
                <span className="inline-flex min-h-9 items-center rounded-md border border-[var(--flowrit-border)] px-3 text-xs font-medium text-[var(--flowrit-text-muted)]">
                  공유 페이지 미생성
                </span>
              )}
            </div>
            <details className="mt-4 rounded-lg border border-[var(--flowrit-border)] bg-[var(--flowrit-panel-subtle)]">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-[var(--flowrit-text-secondary)]">
                내부 작업 항목을 직접 추가해야 하나요?
              </summary>
              <div className="border-t border-[var(--flowrit-border)] bg-white p-4">
                <RevisionForm projectId={project.id} members={members} />
              </div>
            </details>
          </div>

          {project.revisions.length > 0 ? (
            <div className="flowrit-panel divide-y divide-gray-100">
              {project.revisions.map((revision) => (
                <div key={revision.id} className="p-5">
                  <div className="grid gap-4 md:grid-cols-[1fr_auto]">
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
                      {(revision.fileUrls as string[]).length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs font-medium text-gray-500">첨부 파일</p>
                          {(revision.fileUrls as string[]).map((url, i) => (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                            >
                              <Paperclip className="h-3 w-3" />
                              {url.split('/').pop() || `첨부파일 ${i + 1}`}
                            </a>
                          ))}
                        </div>
                      )}
                      <p className="mt-2 text-xs text-gray-500">
                        {revision.createdAt.toLocaleDateString('ko-KR')} 등록
                      </p>
                      {revision.assets.length > 0 && (
                        <div className="mt-4 rounded-lg border border-[var(--flowrit-border)] bg-[var(--flowrit-panel-subtle)] p-3">
                          <p className="mb-2 text-xs font-semibold text-[var(--flowrit-text-muted)]">
                            이 요청으로 생성된 납품본 {revision.assets.length}개
                          </p>
                          <div className="space-y-2">
                            {revision.assets.map((asset) => (
                              <div
                                key={asset.id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white px-3 py-2"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-[var(--flowrit-text)]">
                                    {asset.name}
                                  </p>
                                  <p className="mt-0.5 text-xs text-[var(--flowrit-text-muted)]">
                                    {assetStatusLabels[asset.status] ?? asset.status}
                                    {asset.version ? ` · ${asset.version}` : ''}
                                  </p>
                                </div>
                                <div className="flex shrink-0 flex-wrap items-center gap-2">
                                  <AssetStatusForm assetId={asset.id} />
                                  <a
                                    href={asset.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flowrit-button-secondary min-h-9 px-3 text-xs"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    열기
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <RevisionStatusForm
                      revisionId={revision.id}
                      status={revision.status}
                    />
                  </div>
                  <details className="mt-4 rounded-lg border border-[var(--flowrit-border)] bg-[var(--flowrit-panel-subtle)]">
                    <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-[var(--flowrit-text-secondary)]">
                      이 요청에 대한 재수정본 등록
                    </summary>
                    <div className="border-t border-[var(--flowrit-border)] bg-white p-4">
                      <AssetForm projectId={project.id} revisionId={revision.id} compact />
                    </div>
                  </details>
                  <RevisionCommentSection revisionId={revision.id} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flowrit-panel">
              <EmptyPanel
                icon={<FileText className="h-5 w-5" />}
                title="아직 고객 수정 요청이 없습니다."
                description="고객 공유 페이지에서 요청이 접수되면 이곳에 표시됩니다."
              />
            </div>
          )}
        </section>
      )}

      {tab === 'assets' && (
        <section className="space-y-5">
          <AssetForm projectId={project.id} />
          <AssetBulkShareForm
            projectId={project.id}
            hasScheduled={project.assets.some(
              (a) => a.status === 'PREPARING' && a.shareScheduledAt !== null,
            )}
          />

          {project.assets.length > 0 ? (
            <div className="space-y-4">
              {/* 갤러리 타입 이미지 */}
              {(() => {
                const galleryAssets = project.assets.filter((a) => a.type === 'GALLERY')
                if (galleryAssets.length === 0) return null
                return (
                  <div className="flowrit-panel p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-semibold text-[var(--flowrit-text-muted)]">
                        이미지 납품본 · {galleryAssets.length}장
                      </p>
                      <div className="flex items-center gap-2">
                        {galleryAssets.some((a) => a.status !== 'SHARED') && (
                          <span className="flowrit-badge flowrit-badge-pending">비공개 포함</span>
                        )}
                      </div>
                    </div>
                    <ImageGallery
                      images={galleryAssets.map((a) => ({ url: a.url, name: a.name }))}
                    />
                    <div className="mt-3 divide-y divide-[var(--flowrit-border)]">
                      {galleryAssets.map((asset) => (
                        <div key={asset.id} className="flex items-center justify-between gap-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-[var(--flowrit-text-secondary)]">{asset.name}</p>
                            <p className="mt-0.5 text-[11px] text-[var(--flowrit-text-muted)]">
                              {assetDeliveryLabel(asset)}
                              {asset.revisionRequest ? ' · 수정 요청 반영본' : ''}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className={`flowrit-badge ${asset.status === 'SHARED' ? 'flowrit-badge-active' : 'flowrit-badge-pending'}`}>
                              {assetStatusLabels[asset.status] ?? asset.status}
                            </span>
                            <AssetStatusForm assetId={asset.id} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* 링크/문서/기타 타입 */}
              {(() => {
                const linkAssets = project.assets.filter((a) => a.type !== 'GALLERY')
                if (linkAssets.length === 0) return null
                return (
                  <div className="flowrit-panel divide-y divide-[var(--flowrit-border)]">
                    {linkAssets.map((asset) => (
                      <div key={asset.id} className="grid gap-4 p-5 md:grid-cols-[1fr_auto]">
                        <div>
                          <div className="mb-2 flex flex-wrap gap-2">
                            <span className="flowrit-badge flowrit-badge-active">
                              {assetStatusLabels[asset.status] ?? asset.status}
                            </span>
                            <span className="flowrit-badge flowrit-badge-pending">
                              {assetTypeLabels[asset.type] ?? asset.type}
                            </span>
                            {asset.version && (
                              <span className="flowrit-badge bg-amber-50 text-amber-700">{asset.version}</span>
                            )}
                            {asset.revisionRequest && (
                              <span className="flowrit-badge bg-indigo-50 text-indigo-700">수정 요청 반영본</span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-[var(--flowrit-text)]">{asset.name}</p>
                          <a
                            href={asset.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex max-w-full items-center gap-1.5 truncate text-xs font-medium text-[var(--flowrit-primary)] hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{asset.url}</span>
                          </a>
                          <p className="mt-2 text-xs text-[var(--flowrit-text-muted)]">
                            {asset.expiredAt
                              ? `${asset.expiredAt.toLocaleDateString('ko-KR')} 만료`
                              : '만료일 없음'}{' '}
                            · {asset.createdAt.toLocaleDateString('ko-KR')} 등록
                            {asset.revisionRequest ? ' · 수정 요청에서 생성' : ''}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 md:justify-end">
                          <AssetStatusForm assetId={asset.id} />
                          <a
                            href={asset.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flowrit-button-secondary min-h-9 px-3 text-xs"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            열기
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          ) : (
            <div className="flowrit-panel">
              <EmptyPanel
                icon={<ExternalLink className="h-5 w-5" />}
                title="아직 납품 이력이 없습니다."
                description="1차 납품 파일부터 등록하면 고객에게 전달한 흐름을 관리할 수 있습니다."
              />
            </div>
          )}
        </section>
      )}

      {tab === 'timeline' && (
        <section className="space-y-4">
          <form action={createTimelineMemo} className="flowrit-panel-padded">
            <input type="hidden" name="projectId" value={project.id} />
            <textarea
              name="content"
              rows={3}
              placeholder="내부 메모를 입력하세요..."
              className="flowrit-input resize-none"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                className="flowrit-button-primary"
              >
                메모 저장
              </button>
            </div>
          </form>

          <div className="flowrit-panel">
            {project.events.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {project.events.map((event) => (
                  <div key={event.id} className="p-5">
                    {event.eventType === 'MEMO' ? (
                      <>
                        <div className="mb-1 flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5 text-indigo-500" />
                          <span className="text-xs font-medium text-indigo-600">메모</span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-gray-900">{event.title}</p>
                      </>
                    ) : (
                      <p className="text-sm font-medium text-gray-900">{event.title}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      {event.eventType !== 'MEMO' && `${event.eventType} · `}
                      {event.createdAt.toLocaleString('ko-KR')}
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
          </div>
        </section>
      )}

      {tab === 'messages' && (
        <section className="flowrit-panel">
          <MessagePanel
            templates={messageTemplates}
            customerName={project.customer.name}
            stageName={currentStage?.customerName ?? '대기'}
            dueDate={
              project.dueDate
                ? project.dueDate.toLocaleDateString('ko-KR')
                : '마감일 없음'
            }
            shareLink={shareLink}
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
    <div className="flowrit-empty-state border-0">
      <div className="flowrit-empty-icon">
        {icon}
      </div>
      <p className="flowrit-empty-title">{title}</p>
      <p className="flowrit-empty-description">{description}</p>
    </div>
  )
}

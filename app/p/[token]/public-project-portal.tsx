'use client'

import Link from 'next/link'
import type { ComponentType } from 'react'
import { useMemo, useState } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  MessageSquareText,
} from 'lucide-react'
import { ImageGallery } from '@/components/image-gallery'
import { confirmProjectDelivery } from '@/lib/actions/publicProject'
import { RevisionCommentForm } from './revision-comment-form'

type PortalTab = 'stage' | 'deliveries' | 'revisions'

type StageItem = {
  id: string
  order: number
  customerName: string
  completedAt: string | null
}

type AssetItem = {
  id: string
  name: string
  url: string
  type: string
  version: string | null
  status: string
  shareScheduledAt: string | null
  expiredAt: string | null
  createdAt: string
  revisionRequest: { id: string } | null
}

type RevisionComment = {
  id: string
  authorType: string
  authorName: string
  content: string
  createdAt: string
  parentId: string | null
  replies: {
    id: string
    authorType: string
    authorName: string
    content: string
    createdAt: string
    parentId: string | null
  }[]
}

type RevisionItem = {
  id: string
  content: string
  status: string
  createdAt: string
  assets: AssetItem[]
  comments: RevisionComment[]
}

type PublicProjectPortalProps = {
  token: string
  project: {
    title: string
    dueDate: string | null
    stages: StageItem[]
    assets: AssetItem[]
    revisions: RevisionItem[]
  }
  currentStageId: string | null
  currentStageOrder: number
}

const tabItems: Array<{
  key: PortalTab
  label: string
  icon: ComponentType<{ className?: string }>
}> = [
  { key: 'stage', label: '진행 단계 확인', icon: CheckCircle2 },
  { key: 'deliveries', label: '납품 이력 확인', icon: FileText },
  { key: 'revisions', label: '수정 요청 전달', icon: MessageSquareText },
]

const statusLabels: Record<string, string> = {
  OPEN: '접수됨',
  IN_PROGRESS: '진행 중',
  DONE: '완료',
  PREPARING: '준비 중',
  SHARED: '공유됨',
  EXPIRED: '만료됨',
}

function formatDate(value: string | null) {
  if (!value) return '일정 미정'
  return new Date(value).toLocaleDateString('ko-KR')
}

function formatDateTime(value: string | null) {
  if (!value) return ''
  return new Date(value).toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function deliveryLabel(asset: AssetItem) {
  if (asset.version) return asset.version
  if (asset.shareScheduledAt) {
    return `공유 예약 ${formatDateTime(asset.shareScheduledAt)}`
  }
  return statusLabels[asset.status] ?? asset.status
}

function stageStatus(stage: StageItem, currentOrder: number) {
  if (stage.completedAt) return '완료'
  if (stage.order === currentOrder) return '진행 중'
  if (stage.order < currentOrder) return '완료'
  return '예정'
}

export function PublicProjectPortal({
  token,
  project,
  currentStageId,
  currentStageOrder,
}: PublicProjectPortalProps) {
  const [activeTab, setActiveTab] = useState<PortalTab>('stage')
  const effectiveCurrentStageOrder = currentStageOrder || project.stages[0]?.order || 0
  const currentStage = project.stages.find((stage) => stage.id === currentStageId) ?? project.stages[0]
  const latestAsset = project.assets[0] ?? null
  const galleryAssets = project.assets.filter((asset) => asset.type === 'GALLERY')
  const doneRevisions = project.revisions.filter((revision) => revision.status === 'DONE').length
  const isProjectCompleted = currentStage?.customerName === '완료'
  const deliveryCountText = project.assets.length > 0
    ? `${project.assets.length}개 납품본 공유됨`
    : '공유된 납품본 없음'

  const progressPercent = useMemo(() => {
    if (project.stages.length === 0) return 0
    return Math.min(100, Math.round((effectiveCurrentStageOrder / project.stages.length) * 100))
  }, [effectiveCurrentStageOrder, project.stages.length])

  return (
    <div className="min-h-screen bg-[var(--flowrit-panel-subtle)]">
      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        <header className="mb-6">
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--flowrit-text-muted)]">
            Flowrit project portal
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[var(--flowrit-text)] sm:text-3xl">
                {project.title}
              </h1>
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-[var(--flowrit-text-secondary)]">
                <CalendarDays className="h-4 w-4" />
                납품 일정 {formatDate(project.dueDate)}
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[var(--flowrit-primary)] shadow-sm">
              {deliveryCountText}
            </span>
          </div>
        </header>

        <nav className="mb-5 grid gap-2 sm:grid-cols-3" aria-label="고객 페이지 메뉴">
          {tabItems.map((item) => {
            const Icon = item.icon
            const active = activeTab === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(item.key)}
                className={`flex min-h-14 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors ${
                  active
                    ? 'border-[var(--flowrit-primary)] bg-[var(--flowrit-primary)] text-white shadow-sm'
                    : 'border-[var(--flowrit-border)] bg-white text-[var(--flowrit-text-secondary)] hover:border-[var(--flowrit-border-strong)] hover:text-[var(--flowrit-text)]'
                }`}
                aria-pressed={active}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            )
          })}
        </nav>

        {activeTab === 'stage' && (
          <section className="space-y-4">
            <div className="flowrit-panel-padded">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--flowrit-text-muted)]">
                    현재 진행 단계
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-[var(--flowrit-text)]">
                    {currentStage?.customerName ?? '진행 전'}
                  </h2>
                </div>
                <span className="rounded-full bg-[var(--flowrit-primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--flowrit-primary-soft-text)]">
                  {currentStage ? stageStatus(currentStage, effectiveCurrentStageOrder) : '대기'}
                </span>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--flowrit-panel-subtle)]">
                <div
                  className="h-full rounded-full bg-[var(--flowrit-primary)] transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {project.stages.map((stage) => {
                  const isCurrent = currentStage?.id === stage.id
                  const isPast = stage.order < effectiveCurrentStageOrder
                  return (
                    <div
                      key={stage.id}
                      className={`min-h-20 rounded-lg border p-3 text-left transition-colors ${
                        isCurrent
                          ? 'border-[var(--flowrit-primary)] bg-[var(--flowrit-primary-soft)]'
                          : 'border-[var(--flowrit-border)] bg-white'
                      } ${stage.order > effectiveCurrentStageOrder ? 'opacity-55' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[var(--flowrit-text-muted)]">
                          {stage.order}단계
                        </span>
                        {(isCurrent || isPast) && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-[var(--flowrit-primary)]" />
                        )}
                      </div>
                      <p className="mt-2 text-sm font-semibold text-[var(--flowrit-text)]">
                        {stage.customerName}
                      </p>
                      <p className="mt-1 text-xs text-[var(--flowrit-text-muted)]">
                        {stageStatus(stage, effectiveCurrentStageOrder)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flowrit-panel-padded">
                <p className="mb-3 text-sm font-semibold text-[var(--flowrit-text)]">납품 일정</p>
                <div className="flex items-center gap-3 rounded-lg bg-[var(--flowrit-panel-subtle)] px-3 py-3">
                  <Clock3 className="h-4 w-4 text-[var(--flowrit-primary)]" />
                  <div>
                    <p className="text-sm font-medium text-[var(--flowrit-text)]">
                      {formatDate(project.dueDate)}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--flowrit-text-muted)]">
                      프로젝트 기준 납품 일정입니다.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flowrit-panel-padded">
                <p className="mb-3 text-sm font-semibold text-[var(--flowrit-text)]">최근 결과물</p>
                {latestAsset ? (
                  <a
                    href={latestAsset.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-lg border border-[var(--flowrit-border)] px-3 py-3 hover:bg-[var(--flowrit-panel-subtle)]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--flowrit-text)]">{latestAsset.name}</p>
                      <p className="mt-0.5 text-xs text-[var(--flowrit-text-muted)]">
                        {deliveryLabel(latestAsset)}
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 shrink-0 text-[var(--flowrit-text-muted)]" />
                  </a>
                ) : (
                  <p className="rounded-lg bg-[var(--flowrit-panel-subtle)] px-3 py-3 text-sm text-[var(--flowrit-text-muted)]">
                    아직 공유된 결과물이 없습니다.
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'deliveries' && (
          <section className="flowrit-panel-padded">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--flowrit-text-muted)]">
                  납품 이력
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--flowrit-text)]">
                  전달받은 결과물
                </h2>
              </div>
              <span className="rounded-full bg-[var(--flowrit-panel-subtle)] px-3 py-1 text-xs font-semibold text-[var(--flowrit-text-secondary)]">
                {project.assets.length}개
              </span>
            </div>

            {project.assets.length === 0 ? (
              <p className="rounded-lg bg-[var(--flowrit-panel-subtle)] px-3 py-4 text-sm text-[var(--flowrit-text-muted)]">
                아직 공유된 납품 이력이 없습니다.
              </p>
            ) : (
              <div className="space-y-5">
                {!isProjectCompleted && (
                  <form action={confirmProjectDelivery} className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                    <input type="hidden" name="token" value={token} />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-emerald-900">결과물을 확인하셨나요?</p>
                        <p className="mt-1 text-xs text-emerald-700">
                          작업 확정 후 프로젝트가 완료 상태로 변경됩니다.
                        </p>
                      </div>
                      <button type="submit" className="flowrit-button-primary">
                        작업 확정(완료)
                      </button>
                    </div>
                  </form>
                )}

                {galleryAssets.length > 0 && (
                  <ImageGallery images={galleryAssets.map((asset) => ({ url: asset.url, name: asset.name }))} />
                )}

                <div className="space-y-3">
                  {project.assets.map((asset) => (
                    <a
                      key={asset.id}
                      href={asset.url}
                      target="_blank"
                      rel="noreferrer"
                      className="grid gap-3 rounded-lg border border-[var(--flowrit-border)] bg-white p-4 transition-colors hover:bg-[var(--flowrit-panel-subtle)] sm:grid-cols-[1fr_auto]"
                    >
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap gap-2">
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            {deliveryLabel(asset)}
                          </span>
                          {asset.revisionRequest && (
                            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                              수정 요청 반영본
                            </span>
                          )}
                        </div>
                        <p className="truncate text-sm font-semibold text-[var(--flowrit-text)]">{asset.name}</p>
                        <p className="mt-1 text-xs text-[var(--flowrit-text-muted)]">
                          {formatDate(asset.createdAt)} 등록
                          {asset.expiredAt ? ` · ${formatDate(asset.expiredAt)} 만료` : ''}
                        </p>
                      </div>
                      <ExternalLink className="h-4 w-4 self-center text-[var(--flowrit-text-muted)]" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'revisions' && (
          <section className="space-y-4">
            <div className="flowrit-panel-padded">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--flowrit-text-muted)]">
                    수정 요청
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-[var(--flowrit-text)]">
                    요청 전달 및 처리 현황
                  </h2>
                  <p className="mt-2 text-sm text-[var(--flowrit-text-secondary)]">
                    총 {project.revisions.length}건 중 {doneRevisions}건이 완료되었습니다.
                  </p>
                </div>
                <Link href={`/p/${token}/revision`} className="flowrit-button-primary">
                  수정 요청하기
                </Link>
              </div>
            </div>

            {project.revisions.length === 0 ? (
              <div className="flowrit-panel-padded">
                <p className="text-sm text-[var(--flowrit-text-muted)]">
                  아직 접수된 수정 요청이 없습니다.
                </p>
              </div>
            ) : (
              project.revisions.map((revision) => (
                <div key={revision.id} className="flowrit-panel-padded">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className="rounded-full bg-[var(--flowrit-primary-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--flowrit-primary-soft-text)]">
                        {statusLabels[revision.status] ?? revision.status}
                      </span>
                      <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-6 text-[var(--flowrit-text)]">
                        {revision.content}
                      </p>
                    </div>
                    <p className="text-xs text-[var(--flowrit-text-muted)]">
                      {formatDate(revision.createdAt)}
                    </p>
                  </div>

                  {revision.assets.length > 0 && (
                    <div className="mb-4 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3">
                      <p className="mb-2 text-xs font-semibold text-indigo-700">
                        이 요청으로 전달된 납품본
                      </p>
                      <div className="space-y-2">
                        {revision.assets.map((asset) => (
                          <a
                            key={asset.id}
                            href={asset.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 hover:bg-indigo-50"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-gray-900">{asset.name}</p>
                              <p className="mt-0.5 text-xs text-gray-500">
                                {deliveryLabel(asset)}
                              </p>
                            </div>
                            <ExternalLink className="h-4 w-4 shrink-0 text-gray-400" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <RevisionCommentForm
                    token={token}
                    revisionId={revision.id}
                    comments={revision.comments}
                  />
                </div>
              ))
            )}
          </section>
        )}
      </main>
    </div>
  )
}

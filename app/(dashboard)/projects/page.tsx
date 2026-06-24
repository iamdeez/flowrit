import Link from 'next/link'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Download, FilePen, FolderOpen, Plus, UserRound } from 'lucide-react'
import { getProjects, getWorkspaceMembers } from '@/lib/actions/project'
import { getCurrentStage, isProjectDone } from '@/lib/project-utils'
import { ProjectsFilter } from '@/components/projects-filter'

type ProjectsPageProps = {
  searchParams: Promise<{
    status?: string
    q?: string
    archived?: string
    page?: string
    assigneeId?: string
  }>
}

const AVATAR_PALETTE = [
  'bg-violet-100 text-violet-700',
  'bg-indigo-100 text-indigo-700',
  'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700',
  'bg-teal-100 text-teal-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-pink-100 text-pink-700',
]

function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffff
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}

type DueInfo = { text: string; cls: string; urgent: boolean }

function getDueInfo(dueDate: Date | null, done: boolean, archived: boolean): DueInfo | null {
  if (!dueDate) return null
  if (done || archived) {
    return {
      text: dueDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
      cls: 'text-[var(--flowrit-text-muted)]',
      urgent: false,
    }
  }
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diff = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diff < 0) return { text: `D+${-diff} 초과`, cls: 'font-semibold text-red-600', urgent: true }
  if (diff === 0) return { text: '오늘 마감', cls: 'font-semibold text-red-600', urgent: true }
  if (diff === 1) return { text: '내일', cls: 'font-semibold text-orange-600', urgent: true }
  if (diff <= 3) return { text: `D-${diff}`, cls: 'font-semibold text-orange-600', urgent: true }
  return {
    text: dueDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
    cls: 'text-[var(--flowrit-text-muted)]',
    urgent: false,
  }
}

function formatCreatedAt(date: Date): string {
  const now = new Date()
  const value = new Date(date)
  const diffMs = now.getTime() - value.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return '오늘 등록'
  if (diffDays === 1) return '어제 등록'
  if (diffDays < 7) return `${diffDays}일 전 등록`
  return `${value.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} 등록`
}

function getNextShareSchedule(assets: { shareScheduledAt: Date | null }[]): Date | null {
  const now = new Date()
  return assets
    .map((asset) => asset.shareScheduledAt)
    .filter((date): date is Date => Boolean(date))
    .filter((date) => date.getTime() > now.getTime())
    .sort((a, b) => a.getTime() - b.getTime())[0] ?? null
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const { status, q, archived, page: pageParam, assigneeId } = await searchParams
  const isArchivedFilter = archived === 'true' || status === 'archived'
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)

  const [{ projects, totalCount, totalPages, role }, members] = await Promise.all([
    getProjects(
      isArchivedFilter ? undefined : status,
      q,
      isArchivedFilter ? 'true' : undefined,
      page,
      assigneeId,
    ),
    getWorkspaceMembers(),
  ])

  const isAdmin = role !== 'MEMBER'

  const exportParams = new URLSearchParams()
  if (q) exportParams.set('q', q)
  if (!isArchivedFilter && status) exportParams.set('status', status)
  if (isArchivedFilter) exportParams.set('archived', 'true')
  const exportHref = `/api/export/projects${exportParams.size ? `?${exportParams}` : ''}`

  function pageHref(p: number) {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (isArchivedFilter) params.set('archived', 'true')
    else if (status) params.set('status', status)
    if (assigneeId && isAdmin) params.set('assigneeId', assigneeId)
    if (p > 1) params.set('page', String(p))
    return `/projects${params.size ? `?${params}` : ''}`
  }

  return (
    <div className="flowrit-page">
      <div className="flowrit-page-header mb-6">
        <div>
          <h1 className="flowrit-page-title">프로젝트</h1>
          <p className="flowrit-page-description">
            {role === 'MEMBER'
              ? '내가 담당하는 프로젝트를 확인합니다.'
              : '진행 중인 작업을 마감일 순서로 확인합니다.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <a href={exportHref} download className="flowrit-button-secondary inline-flex">
              <Download className="h-4 w-4" />
              CSV
            </a>
          )}
          <Link href="/projects/new" className="flowrit-button-primary">
            <Plus className="h-4 w-4" />
            <span className="hidden md:inline">새 프로젝트</span>
            <span className="md:hidden">추가</span>
          </Link>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-4">
        <ProjectsFilter isAdmin={isAdmin} members={members} />
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[var(--flowrit-text-muted)]">
          총 <span className="font-medium text-[var(--flowrit-text-secondary)]">{totalCount}</span>건
          {q && (
            <>
              {' '}
              · <span className="text-[var(--flowrit-primary-soft-text)]">&ldquo;{q}&rdquo;</span> 검색 결과
            </>
          )}
        </p>
        <p className="hidden text-xs text-[var(--flowrit-text-muted)] md:block">
          마감 임박, 수정 요청, 담당자, 등록일을 함께 표시합니다.
        </p>
      </div>

      {/* Project list */}
      {projects.length > 0 ? (
        <>
          <section className="space-y-2">
            {projects.map((project) => {
              const currentStage = getCurrentStage(project)
              const done = isProjectDone(project)
              const completedStages = project.stages.filter((s) => s.completedAt !== null).length
              const totalStages = project.stages.length
              const openRevisions = project.revisions.length
              const dueInfo = getDueInfo(project.dueDate, done, !!project.archivedAt)
              const color = avatarColor(project.customer.name)
              const createdLabel = formatCreatedAt(project.createdAt)
              const nextShareSchedule = getNextShareSchedule(project.assets)

              const statusBadgeCls = project.archivedAt
                ? 'flowrit-badge-archived'
                : done
                  ? 'flowrit-badge-done'
                  : 'flowrit-badge-active'
              const statusLabel = project.archivedAt
                ? '아카이브됨'
                : done
                  ? '완료'
                  : (currentStage?.internalName ?? '대기')

              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className={`group grid gap-3 rounded-xl border bg-white px-4 py-3.5 transition-all hover:shadow-sm sm:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-4 md:px-5 ${
                    dueInfo?.urgent
                      ? 'border-orange-200 hover:border-orange-300'
                      : 'border-[var(--flowrit-border)] hover:border-indigo-200'
                  }`}
                >
                  {/* Customer avatar */}
                  <div className={`hidden h-10 w-10 items-center justify-center rounded-full text-sm font-bold sm:flex ${color}`}>
                    {project.customer.name.slice(0, 1)}
                  </div>

                  {/* Main content */}
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="min-w-0 truncate text-[15px] font-semibold text-[var(--flowrit-text)] transition-colors group-hover:text-[var(--flowrit-primary)]">
                        {project.title}
                      </p>
                      <span className={`flowrit-badge shrink-0 ${statusBadgeCls}`}>{statusLabel}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--flowrit-text-muted)]">
                      <span className="font-medium text-[var(--flowrit-text-secondary)]">{project.customer.name}</span>
                      {totalStages > 0 && (
                        <>
                          <span className="text-gray-200">·</span>
                          <span>{completedStages}/{totalStages} 단계</span>
                          <div className="flex h-1.5 w-12 gap-0.5">
                            {project.stages.map((s) => (
                              <div
                                key={s.id}
                                className={`flex-1 rounded-full ${
                                  s.completedAt ? 'bg-[var(--flowrit-primary)]' : 'bg-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                      {project.assigneeName && (
                        <>
                          <span className="text-gray-200">·</span>
                          <span className="inline-flex items-center gap-1">
                            <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                            {project.assigneeName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right meta */}
                  <div className="flex flex-wrap items-center gap-2.5 text-xs sm:justify-end md:gap-3">
                    {openRevisions > 0 && (
                      <span className="flex items-center gap-1 font-medium text-rose-500">
                        <FilePen className="h-3.5 w-3.5" />
                        {openRevisions}
                      </span>
                    )}
                    {dueInfo && (
                      <span className={`inline-flex items-center gap-1 ${dueInfo.cls}`}>
                        <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                        {dueInfo.text}
                      </span>
                    )}
                    {nextShareSchedule && (
                      <span className="inline-flex items-center gap-1 font-medium text-indigo-600">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                        공유 예약 {nextShareSchedule.toLocaleString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-[var(--flowrit-text-muted)]">
                      <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {createdLabel}
                    </span>
                  </div>
                </Link>
              )
            })}
          </section>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-[var(--flowrit-text-muted)]">
                {page} / {totalPages} 페이지
              </p>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Link href={pageHref(page - 1)} className="flowrit-button-secondary">
                    <ChevronLeft className="h-4 w-4" />
                    이전
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-300">
                    <ChevronLeft className="h-4 w-4" />
                    이전
                  </span>
                )}
                {page < totalPages ? (
                  <Link href={pageHref(page + 1)} className="flowrit-button-secondary">
                    다음
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-300">
                    다음
                    <ChevronRight className="h-4 w-4" />
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <section className="flowrit-empty-state">
          <div className="flowrit-empty-icon">
            <FolderOpen className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="flowrit-empty-title">표시할 프로젝트가 없습니다.</p>
          <p className="flowrit-empty-description">
            {role === 'MEMBER'
              ? '담당자로 지정된 프로젝트가 없습니다.'
              : '새 프로젝트를 만들어 작업 흐름을 시작하세요.'}
          </p>
          {!q && !isArchivedFilter && role !== 'MEMBER' && (
            <div className="flowrit-empty-actions">
              <Link href="/projects/new" className="flowrit-button-primary">
                <Plus className="h-4 w-4" aria-hidden="true" />
                새 프로젝트
              </Link>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

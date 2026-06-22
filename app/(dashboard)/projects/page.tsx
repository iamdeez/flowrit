import Link from 'next/link'
import Form from 'next/form'
import { Archive, CalendarDays, ChevronLeft, ChevronRight, Download, FolderOpen, Plus, Search, User } from 'lucide-react'
import { getProjects, getWorkspaceMembers } from '@/lib/actions/project'
import { getCurrentStage, isProjectDone } from '@/lib/project-utils'

type ProjectsPageProps = {
  searchParams: Promise<{
    status?: string
    q?: string
    archived?: string
    page?: string
    assigneeId?: string
  }>
}

const filters = [
  { label: '전체', value: undefined },
  { label: '진행 중', value: 'in_progress' },
  { label: '완료', value: 'done' },
  { label: '아카이브됨', value: 'archived' },
]

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

  // 페이지네이션 링크 생성 헬퍼
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
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">프로젝트</h1>
          <p className="mt-1 text-sm text-gray-500">
            {role === 'MEMBER'
              ? '내가 담당하는 프로젝트를 마감일 순서로 확인합니다.'
              : '진행 중인 작업을 마감일 순서로 확인합니다.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <a
              href={exportHref}
              download
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              CSV 내보내기
            </a>
          )}
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            새 프로젝트
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Form action="/projects" className="flex-1">
          {status && !isArchivedFilter && <input type="hidden" name="status" value={status} />}
          {isArchivedFilter && <input type="hidden" name="archived" value="true" />}
          {assigneeId && isAdmin && <input type="hidden" name="assigneeId" value={assigneeId} />}
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              name="q"
              defaultValue={q ?? ''}
              placeholder="프로젝트 제목 또는 고객명 검색"
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </Form>

        {isAdmin && (
          <Form action="/projects">
            {status && !isArchivedFilter && <input type="hidden" name="status" value={status} />}
            {isArchivedFilter && <input type="hidden" name="archived" value="true" />}
            {q && <input type="hidden" name="q" value={q} />}
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                name="assigneeId"
                defaultValue={assigneeId ?? ''}
                className="appearance-none rounded-lg border border-gray-300 py-2 pl-9 pr-8 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">전체 담당자</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.name ?? m.userId}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="ml-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
              적용
            </button>
          </Form>
        )}
      </div>

      <div className="mb-5 flex gap-2">
        {filters.map((filter) => {
          const href =
            filter.value === 'archived'
              ? '/projects?archived=true'
              : filter.value
                ? `/projects?status=${filter.value}`
                : '/projects'
          const active =
            filter.value === 'archived'
              ? isArchivedFilter
              : !isArchivedFilter && (status === filter.value || (!status && !filter.value))
          return (
            <Link
              key={filter.label}
              href={href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {filter.label}
            </Link>
          )
        })}
      </div>

      {projects.length > 0 ? (
        <>
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {projects.map((project) => {
              const currentStage = getCurrentStage(project)
              const done = isProjectDone(project)

              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:bg-gray-50"
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {project.title}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">{project.customer.name}</p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        project.archivedAt
                          ? 'bg-gray-100 text-gray-600'
                          : done
                          ? 'bg-green-50 text-green-700'
                          : 'bg-indigo-50 text-indigo-700'
                      }`}
                    >
                      {project.archivedAt ? '아카이브됨' : done ? '완료' : currentStage?.internalName ?? '대기'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4" />
                      {project.dueDate
                        ? project.dueDate.toLocaleDateString('ko-KR')
                        : '마감일 없음'}
                    </span>
                    <span className="flex items-center gap-3">
                      {project.assigneeName && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                          <User className="h-3.5 w-3.5" />
                          {project.assigneeName}
                        </span>
                      )}
                      <span>
                        {project.archivedAt && (
                          <span className="mr-2 inline-flex items-center gap-1 text-gray-400">
                            <Archive className="h-3.5 w-3.5" />
                            보관
                          </span>
                        )}
                        수정 {project.revisions.length} · 에셋 {project.assets.length}
                      </span>
                    </span>
                  </div>
                </Link>
              )
            })}
          </section>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                총 {totalCount}건 · {page} / {totalPages} 페이지
              </p>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Link
                    href={pageHref(page - 1)}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
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
                  <Link
                    href={pageHref(page + 1)}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
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
        <section className="rounded-xl border border-gray-200 bg-white px-5 py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
            <FolderOpen className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-gray-900">표시할 프로젝트가 없습니다.</p>
          <p className="mt-1 text-sm text-gray-500">
            {role === 'MEMBER'
              ? '담당자로 지정된 프로젝트가 없습니다.'
              : '새 프로젝트를 만들어 작업 흐름을 시작하세요.'}
          </p>
          {!q && !isArchivedFilter && role !== 'MEMBER' && (
            <Link
              href="/projects/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              새 프로젝트
            </Link>
          )}
        </section>
      )}
    </div>
  )
}

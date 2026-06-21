import Link from 'next/link'
import { CalendarDays, FolderOpen, Plus } from 'lucide-react'
import { getProjects } from '@/lib/actions/project'
import { getCurrentStage, isProjectDone } from '@/lib/project-utils'

type ProjectsPageProps = {
  searchParams: Promise<{
    status?: string
  }>
}

const filters = [
  { label: '전체', value: undefined },
  { label: '진행 중', value: 'in_progress' },
  { label: '완료', value: 'done' },
]

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const status = (await searchParams).status
  const projects = await getProjects(status)

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">프로젝트</h1>
          <p className="mt-1 text-sm text-gray-500">
            진행 중인 작업을 마감일 순서로 확인합니다.
          </p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          새 프로젝트
        </Link>
      </div>

      <div className="mb-5 flex gap-2">
        {filters.map((filter) => {
          const href = filter.value ? `/projects?status=${filter.value}` : '/projects'
          const active = status === filter.value || (!status && !filter.value)
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
                      done
                        ? 'bg-green-50 text-green-700'
                        : 'bg-indigo-50 text-indigo-700'
                    }`}
                  >
                    {done ? '완료' : currentStage?.internalName ?? '대기'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4" />
                    {project.dueDate
                      ? project.dueDate.toLocaleDateString('ko-KR')
                      : '마감일 없음'}
                  </span>
                  <span>
                    수정 요청 {project.revisions.length} · 에셋 {project.assets.length}
                  </span>
                </div>
              </Link>
            )
          })}
        </section>
      ) : (
        <section className="rounded-xl border border-gray-200 bg-white px-5 py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
            <FolderOpen className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-gray-900">표시할 프로젝트가 없습니다.</p>
          <p className="mt-1 text-sm text-gray-500">새 프로젝트를 만들어 작업 흐름을 시작하세요.</p>
        </section>
      )}
    </div>
  )
}

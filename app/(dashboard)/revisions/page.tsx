import Link from 'next/link'
import { ArrowUpRight, FileText } from 'lucide-react'
import { getRevisionGroups } from '@/lib/actions/revision'
import {
  revisionPriorityLabels,
  revisionSourceLabels,
  revisionStatusLabels,
} from '@/lib/revision-labels'
import { RevisionStatusForm } from '@/app/(dashboard)/projects/[id]/revision-status-form'

export default async function RevisionsPage() {
  const projects = await getRevisionGroups()
  const totalCount = projects.reduce((sum, project) => sum + project.revisions.length, 0)

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-indigo-700">Revision Requests</p>
          <h1 className="mt-1 text-2xl font-semibold text-gray-900">수정 요청</h1>
          <p className="mt-2 text-sm text-gray-500">
            전체 워크스페이스의 미완료 요청을 프로젝트별로 확인합니다.
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm">
          <span className="font-semibold text-gray-900">{totalCount}</span>
          <span className="ml-1 text-gray-500">개의 미완료 요청</span>
        </div>
      </div>

      {projects.length > 0 ? (
        <div className="space-y-5">
          {projects.map((project) => (
            <section
              key={project.id}
              className="rounded-xl border border-gray-200 bg-white"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    {project.title}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {project.customer.name}
                    {project.dueDate
                      ? ` · ${project.dueDate.toLocaleDateString('ko-KR')} 마감`
                      : ' · 마감일 없음'}
                  </p>
                </div>
                <Link
                  href={`/projects/${project.id}?tab=revisions`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  프로젝트 열기
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="divide-y divide-gray-100">
                {project.revisions.map((revision) => (
                  <div
                    key={revision.id}
                    className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <div className="mb-2 flex flex-wrap gap-2">
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                          {revisionStatusLabels[revision.status] ?? revision.status}
                        </span>
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                          {revisionPriorityLabels[revision.priority] ??
                            revision.priority}
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
                      compact
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
            <FileText className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-gray-900">
            처리할 수정 요청이 없습니다.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            프로젝트 상세에서 등록한 미완료 요청이 이곳에 표시됩니다.
          </p>
        </div>
      )}
    </div>
  )
}

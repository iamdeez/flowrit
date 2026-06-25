import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CalendarDays, FolderOpen, Trash2 } from 'lucide-react'
import { CustomerEditModal } from '../customer-edit-modal'
import { deleteCustomer, getCustomerDetail } from '@/lib/actions/customer'

type CustomerDetailPageProps = {
  params: Promise<{
    id: string
  }>
}

function projectStatusLabel(project: NonNullable<Awaited<ReturnType<typeof getCustomerDetail>>>['projects'][number]) {
  if (!project.currentStageId) return '대기'
  return project.stages.find((stage) => stage.id === project.currentStageId)?.internalName ?? '진행 중'
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { id } = await params
  const customer = await getCustomerDetail(id)

  if (!customer) notFound()

  return (
    <div className="flowrit-page">
      <Link
        href="/customers"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        고객 목록
      </Link>

      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-gray-900">{customer.name}</h1>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-500">
            <span>{customer.contact || '연락처 미입력'}</span>
            <span>등록일 {customer.createdAt.toLocaleDateString('ko-KR')}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <CustomerEditModal customer={customer} />
          <form action={deleteCustomer}>
            <input type="hidden" name="id" value={customer.id} />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              삭제
            </button>
          </form>
        </div>
      </div>

      {customer.memo && (
        <section className="flowrit-panel-padded mb-8">
          <h2 className="mb-2 text-sm font-medium text-gray-700">메모</h2>
          <p className="whitespace-pre-wrap text-sm leading-6 text-gray-600">{customer.memo}</p>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-700">
            프로젝트 ({customer.projects.length}개)
          </h2>
          <Link
            href={`/projects/new?customerId=${customer.id}`}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            새 프로젝트
          </Link>
        </div>

        <div className="flowrit-panel overflow-hidden">
          {customer.projects.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {customer.projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="grid grid-cols-[1.5fr_160px_160px] items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                      <FolderOpen className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{project.title}</p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {projectStatusLabel(project)}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-center text-xs font-medium text-indigo-700">
                    {projectStatusLabel(project)}
                  </span>
                  <span className="inline-flex items-center justify-end gap-1.5 text-sm text-gray-500">
                    <CalendarDays className="h-4 w-4" />
                    {project.dueDate ? project.dueDate.toLocaleDateString('ko-KR') : '마감일 없음'}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flowrit-empty-state border-0">
              <div className="flowrit-empty-icon">
                <FolderOpen className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="flowrit-empty-title">연결된 프로젝트가 없습니다.</p>
              <p className="flowrit-empty-description">새 프로젝트를 만들 때 이 고객을 선택하면 이곳에 연결됩니다.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

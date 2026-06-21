import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getProjectFormData } from '@/lib/actions/project'
import { ProjectForm } from './project-form'

type NewProjectPageProps = {
  searchParams: Promise<{ customerId?: string }>
}

export default async function NewProjectPage({ searchParams }: NewProjectPageProps) {
  const { customers, templates, members } = await getProjectFormData()
  const { customerId } = await searchParams

  return (
    <div className="max-w-2xl p-8">
      <Link
        href="/projects"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        프로젝트 목록
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">프로젝트 생성</h1>
        <p className="mt-1 text-sm text-gray-500">
          고객, 담당자, 워크플로우 템플릿을 선택해 프로젝트 흐름을 시작합니다.
        </p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <ProjectForm
          customers={customers}
          templates={templates}
          members={members}
          defaultCustomerId={customerId}
        />
      </section>
    </div>
  )
}

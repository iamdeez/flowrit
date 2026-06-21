import { Layers, Trash2 } from 'lucide-react'
import { deleteWorkflowTemplate, getWorkflowTemplates } from '@/lib/actions/template'
import { TemplateForm } from './template-form'

export default async function TemplatesPage() {
  const templates = await getWorkflowTemplates()

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">워크플로우 템플릿</h1>
        <p className="mt-1 text-sm text-gray-500">
          프로젝트에 적용할 단계 흐름과 고객 표시명을 관리합니다.
        </p>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(420px,560px)] gap-6">
        <section>
          <h2 className="mb-3 text-sm font-medium text-gray-700">
            템플릿 목록 ({templates.length})
          </h2>
          <div className="space-y-4">
            {templates.map((template) => (
              <article
                key={template.id}
                className="rounded-xl border border-gray-200 bg-white p-5"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-semibold text-gray-900">
                          {template.name}
                        </h2>
                        {template.isDefault && (
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                            기본
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {template.industry || '업종 미지정'} · {template.stages.length}단계
                      </p>
                    </div>
                  </div>
                  <form action={deleteWorkflowTemplate}>
                    <input type="hidden" name="id" value={template.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      삭제
                    </button>
                  </form>
                </div>

                <TemplateForm mode="edit" template={template} />
              </article>
            ))}
          </div>
        </section>

        <aside>
          <div className="sticky top-8">
            <h2 className="mb-3 text-sm font-medium text-gray-700">새 템플릿</h2>
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <TemplateForm mode="create" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

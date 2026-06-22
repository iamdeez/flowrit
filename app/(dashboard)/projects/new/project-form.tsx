'use client'

import { useActionState } from 'react'
import { createProject, type ProjectFormState } from '@/lib/actions/project'
import { useFormToast } from '@/hooks/use-form-toast'

type ProjectFormProps = {
  customers: { id: string; name: string }[]
  templates: { id: string; name: string; stages: { id: string }[] }[]
  members: { userId: string; user: { name: string; email: string } }[]
  defaultCustomerId?: string
}

const initialState: ProjectFormState = {}

export function ProjectForm({ customers, templates, members, defaultCustomerId }: ProjectFormProps) {
  const [state, action, pending] = useActionState(createProject, initialState)
  useFormToast(state)

  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="customerId" className="mb-1 block text-sm font-medium text-gray-700">
          고객
        </label>
        <select
          id="customerId"
          name="customerId"
          required
          defaultValue={defaultCustomerId ?? ''}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="" disabled>
            고객 선택
          </option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="title" className="mb-1 block text-sm font-medium text-gray-700">
          제목
        </label>
        <input
          id="title"
          name="title"
          required
          placeholder="예: 웨딩 본식 사진 보정"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="dueDate" className="mb-1 block text-sm font-medium text-gray-700">
            마감일
          </label>
          <input
            id="dueDate"
            name="dueDate"
            type="date"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="assigneeId" className="mb-1 block text-sm font-medium text-gray-700">
            담당자
          </label>
          <select
            id="assigneeId"
            name="assigneeId"
            defaultValue=""
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">미지정</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.user.name} ({member.user.email})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="budget" className="mb-1 block text-sm font-medium text-gray-700">
          예상 단가
        </label>
        <div className="relative">
          <input
            id="budget"
            name="budget"
            type="number"
            min="0"
            step="10000"
            inputMode="numeric"
            placeholder="예: 500000"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
            원
          </span>
        </div>
      </div>

      <div>
        <label htmlFor="templateId" className="mb-1 block text-sm font-medium text-gray-700">
          워크플로우 템플릿
        </label>
        <select
          id="templateId"
          name="templateId"
          required
          defaultValue=""
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="" disabled>
            템플릿 선택
          </option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name} ({template.stages.length}단계)
            </option>
          ))}
        </select>
      </div>

      {customers.length === 0 && (
        <p className="text-sm text-amber-600">
          프로젝트를 만들려면 먼저 고객을 등록해 주세요.
        </p>
      )}
      <button
        type="submit"
        disabled={pending || customers.length === 0 || templates.length === 0}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? '생성 중...' : '프로젝트 생성'}
      </button>
    </form>
  )
}

'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import type { RevisionFormState } from '@/lib/actions/revision'
import { createRevisionRequest } from '@/lib/actions/revision'

type RevisionFormProps = {
  projectId: string
  members: {
    userId: string
    user: { name: string; email: string }
  }[]
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? '등록 중...' : '수정 요청 등록'}
    </button>
  )
}

export function RevisionForm({ projectId, members }: RevisionFormProps) {
  const [state, formAction] = useActionState<RevisionFormState, FormData>(
    createRevisionRequest,
    {}
  )

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
      <input type="hidden" name="projectId" value={projectId} />
      <div>
        <label htmlFor="content" className="text-sm font-medium text-gray-900">
          수정 요청 내용
        </label>
        <textarea
          id="content"
          name="content"
          rows={4}
          required
          placeholder="고객 요청이나 내부 수정 항목을 입력하세요."
          className="mt-2 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="priority" className="text-sm font-medium text-gray-900">
            우선순위
          </label>
          <select
            id="priority"
            name="priority"
            defaultValue="MEDIUM"
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="HIGH">높음</option>
            <option value="MEDIUM">중간</option>
            <option value="LOW">낮음</option>
          </select>
        </div>

        <div>
          <label htmlFor="assigneeId" className="text-sm font-medium text-gray-900">
            담당자
          </label>
          <select
            id="assigneeId"
            name="assigneeId"
            defaultValue=""
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          등록된 요청은 접수됨 상태로 시작하고 전체 수정 요청 목록에도 표시됩니다.
        </p>
        <SubmitButton />
      </div>

      {state.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}
      {state.success && (
        <p className="text-sm font-medium text-emerald-600">{state.success}</p>
      )}
    </form>
  )
}

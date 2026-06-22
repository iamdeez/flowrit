'use client'

import { useActionState } from 'react'
import { updateWorkspace, type WorkspaceState } from '@/lib/actions/settings'
import { useFormToast } from '@/hooks/use-form-toast'

const initialState: WorkspaceState = {}

export function WorkspaceForm({
  initialName,
  initialSlug,
}: {
  initialName: string
  initialSlug: string
}) {
  const [state, action, pending] = useActionState(updateWorkspace, initialState)
  useFormToast(state)

  return (
    <form action={action} className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">워크스페이스 설정</h2>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">워크스페이스 이름</label>
        <input
          type="text"
          name="name"
          defaultValue={initialName}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">슬러그</label>
        <input
          type="text"
          name="slug"
          defaultValue={initialSlug}
          required
          pattern="[a-z0-9-]+"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          영소문자, 숫자, 하이픈만 사용 가능합니다. 슬러그 변경 시 고객 포털 링크가 변경됩니다.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {pending ? '저장 중...' : '저장'}
      </button>
    </form>
  )
}

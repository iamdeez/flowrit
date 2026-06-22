'use client'

import { useActionState } from 'react'
import { updateProfile, type ProfileState } from '@/lib/actions/settings'
import { useFormToast } from '@/hooks/use-form-toast'

const initialState: ProfileState = {}

export function ProfileForm({
  initialName,
  initialEmail,
}: {
  initialName: string
  initialEmail: string
}) {
  const [state, action, pending] = useActionState(updateProfile, initialState)
  useFormToast(state)

  return (
    <form action={action} className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">프로필 정보</h2>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
        <input
          type="text"
          name="name"
          defaultValue={initialName}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
        <input
          type="email"
          name="email"
          defaultValue={initialEmail}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
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

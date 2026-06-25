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

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">이름</label>
          <input
            type="text"
            name="name"
            defaultValue={initialName}
            required
            className="flowrit-input"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">이메일</label>
          <input
            type="email"
            name="email"
            defaultValue={initialEmail}
            required
            className="flowrit-input"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flowrit-button-primary disabled:opacity-50"
      >
        {pending ? '저장 중...' : '저장'}
      </button>
    </form>
  )
}

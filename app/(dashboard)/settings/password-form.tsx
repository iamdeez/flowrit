'use client'

import { useActionState } from 'react'
import { changePassword, type PasswordState } from '@/lib/actions/settings'
import { useFormToast } from '@/hooks/use-form-toast'

const initialState: PasswordState = {}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, initialState)
  useFormToast(state)

  return (
    <form action={action} className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">비밀번호 변경</h2>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">현재 비밀번호</label>
        <input
          type="password"
          name="currentPassword"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호</label>
        <input
          type="password"
          name="newPassword"
          required
          minLength={8}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <p className="text-xs text-gray-400 mt-1">8자 이상</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호 확인</label>
        <input
          type="password"
          name="confirmPassword"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {pending ? '변경 중...' : '비밀번호 변경'}
      </button>
    </form>
  )
}

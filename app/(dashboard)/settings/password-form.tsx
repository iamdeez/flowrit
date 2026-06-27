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
        <label htmlFor="pw-current" className="block text-sm font-medium text-gray-700 mb-1">현재 비밀번호</label>
        <input
          id="pw-current"
          type="password"
          name="currentPassword"
          required
          className="flowrit-input"
        />
      </div>

      <div>
        <label htmlFor="pw-new" className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호</label>
        <input
          id="pw-new"
          type="password"
          name="newPassword"
          required
          minLength={8}
          className="flowrit-input"
        />
        <p className="text-xs text-gray-400 mt-1">8자 이상</p>
      </div>

      <div>
        <label htmlFor="pw-confirm" className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호 확인</label>
        <input
          id="pw-confirm"
          type="password"
          name="confirmPassword"
          required
          className="flowrit-input"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flowrit-button-primary disabled:opacity-50"
      >
        {pending ? '변경 중...' : '비밀번호 변경'}
      </button>
    </form>
  )
}

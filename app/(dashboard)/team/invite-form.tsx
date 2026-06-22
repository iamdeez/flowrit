'use client'

import { useActionState } from 'react'
import { inviteTeamMember, type InviteState } from '@/lib/actions/team'
import { useFormToast } from '@/hooks/use-form-toast'

const initialState: InviteState = {}

export function InviteForm() {
  const [state, action, pending] = useActionState(inviteTeamMember, initialState)
  useFormToast(state)

  return (
    <form action={action} className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            이메일
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="teammate@example.com"
            className="flowrit-input"
          />
        </div>
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
            역할
          </label>
          <select
            id="role"
            name="role"
            defaultValue="MEMBER"
            className="flowrit-input"
          >
            <option value="MEMBER">멤버</option>
            <option value="ADMIN">어드민</option>
          </select>
        </div>
      </div>

      {state?.inviteUrl && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
              <input
                readOnly
                value={state.inviteUrl}
                className="flex-1 text-xs text-gray-700 bg-transparent outline-none"
              />
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(state.inviteUrl!)}
                className="text-xs text-indigo-600 hover:underline shrink-0"
              >
                복사
              </button>
          </div>
          {state.emailError && (
            <p className="text-xs text-gray-400">발송 실패 원인: {state.emailError}</p>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flowrit-button-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? '초대 발송 중...' : '초대 이메일 발송'}
      </button>
    </form>
  )
}

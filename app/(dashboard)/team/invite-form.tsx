'use client'

import { useActionState } from 'react'
import { inviteTeamMember, type InviteState } from '@/lib/actions/team'

const initialState: InviteState = {}

export function InviteForm() {
  const [state, action, pending] = useActionState(inviteTeamMember, initialState)

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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="MEMBER">멤버</option>
            <option value="OWNER">오너</option>
          </select>
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      {state?.success && (
        <div className="space-y-1">
          <p className="text-sm text-green-600 whitespace-pre-line">{state.success}</p>
          {state.inviteUrl && (
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
          )}
          {state.emailError && (
            <p className="text-xs text-gray-400">발송 실패 원인: {state.emailError}</p>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? '초대 발송 중...' : '초대 이메일 발송'}
      </button>
    </form>
  )
}

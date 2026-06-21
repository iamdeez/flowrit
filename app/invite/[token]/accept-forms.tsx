'use client'

import { useActionState } from 'react'
import {
  registerAndAcceptInvite,
  loginAndAcceptInvite,
  type AcceptInviteState,
} from '@/lib/actions/invite'

const initialState: AcceptInviteState = {}

interface Props {
  token: string
  email: string
  isNewUser: boolean
}

export function AcceptInviteForm({ token, email, isNewUser }: Props) {
  const action = isNewUser ? registerAndAcceptInvite : loginAndAcceptInvite
  const [state, formAction, pending] = useActionState(action, initialState)

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
        <input
          type="email"
          value={email}
          readOnly
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
        />
      </div>

      {isNewUser && (
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            이름
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="홍길동"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      )}

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          비밀번호{isNewUser && ' (8자 이상)'}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={isNewUser ? 8 : 1}
          placeholder={isNewUser ? '8자 이상 설정' : '비밀번호 입력'}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full py-2 px-4 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {pending
          ? '처리 중...'
          : isNewUser
          ? '가입하고 초대 수락'
          : '로그인하고 초대 수락'}
      </button>
    </form>
  )
}

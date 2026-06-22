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
          className="flowrit-input cursor-not-allowed bg-gray-50 text-gray-500"
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
            className="flowrit-input"
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
          className="flowrit-input"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flowrit-button-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
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

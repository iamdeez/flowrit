'use client'

import { useActionState, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
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
  const [registerState, registerAction, registerPending] = useActionState(
    registerAndAcceptInvite,
    initialState,
  )
  const [loginState, loginAction, loginPending] = useActionState(
    loginAndAcceptInvite,
    initialState,
  )

  const [mode, setMode] = useState<'register' | 'login'>(isNewUser ? 'register' : 'login')
  const [showPassword, setShowPassword] = useState(false)

  const isRegister = mode === 'register'
  const formAction = isRegister ? registerAction : loginAction
  const pending = isRegister ? registerPending : loginPending
  const state = isRegister ? registerState : loginState

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <div>
        <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
        <input
          id="invite-email"
          type="email"
          value={email}
          readOnly
          className="flowrit-input cursor-not-allowed bg-gray-50 text-gray-500"
        />
      </div>

      {isRegister && (
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
          비밀번호{isRegister && ' (8자 이상)'}
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={isRegister ? 8 : 1}
            placeholder={isRegister ? '8자 이상 설정' : '비밀번호 입력'}
            className="flowrit-input pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
            aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
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
          : isRegister
          ? '가입하고 초대 수락'
          : '로그인하고 초대 수락'}
      </button>

      {isNewUser && (
        <p className="text-center text-sm text-gray-500">
          {isRegister ? (
            <>
              이미 계정이 있으신가요?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-indigo-600 hover:underline"
              >
                로그인
              </button>
            </>
          ) : (
            <>
              새 계정으로 가입하시겠어요?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                className="text-indigo-600 hover:underline"
              >
                회원가입
              </button>
            </>
          )}
        </p>
      )}
    </form>
  )
}

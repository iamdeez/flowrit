'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { login, type LoginState } from '@/lib/actions/auth'
import { useFormToast } from '@/hooks/use-form-toast'

const initialState: LoginState = {}

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, initialState)
  useFormToast(state)

  return (
    <div className="flowrit-panel-padded">
      <h2 className="mb-6 text-xl font-semibold text-gray-900">로그인</h2>

      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            이메일
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="flowrit-input"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="비밀번호 입력"
            className="flowrit-input"
          />
        </div>

        {state.error && <p className="flowrit-form-error">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="flowrit-button-primary w-full"
        >
          {pending ? '로그인 중...' : '로그인'}
        </button>
      </form>

      <div className="mt-5 flex flex-col items-center gap-2 text-sm text-[var(--flowrit-text-secondary)]">
        <Link href="/forgot-password" className="text-[var(--flowrit-text-muted)] hover:text-[var(--flowrit-primary)] hover:underline">
          비밀번호를 잊으셨나요?
        </Link>
        <span>
          아직 계정이 없으신가요?{' '}
          <Link href="/register" className="font-medium text-[var(--flowrit-primary-soft-text)] hover:underline">
            가입하기
          </Link>
        </span>
      </div>
    </div>
  )
}

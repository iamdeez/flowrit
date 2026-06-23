'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { register, type RegisterState } from '@/lib/actions/auth'
import { useFormToast } from '@/hooks/use-form-toast'

const initialState: RegisterState = {}

export default function RegisterPage() {
  const [state, action, pending] = useActionState(register, initialState)
  useFormToast(state)

  return (
    <div className="flowrit-panel-padded">
      <h2 className="mb-6 text-xl font-semibold text-gray-900">회원가입</h2>

      <form action={action} className="space-y-4">
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
            minLength={8}
            placeholder="8자 이상"
            className="flowrit-input"
          />
          <p className="flowrit-form-help">8자 이상으로 입력해 주세요.</p>
        </div>

        {state.error && <p className="flowrit-form-error">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="flowrit-button-primary w-full"
        >
          {pending ? '가입 중...' : '가입하기'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-[var(--flowrit-text-muted)]">
        가입 시{' '}
        <Link href="/terms" className="text-[var(--flowrit-text-secondary)] hover:underline">이용약관</Link>
        {' '}및{' '}
        <Link href="/privacy" className="text-[var(--flowrit-text-secondary)] hover:underline">개인정보처리방침</Link>
        에 동의하게 됩니다.
      </p>
      <p className="mt-2 text-center text-sm text-[var(--flowrit-text-secondary)]">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="font-medium text-[var(--flowrit-primary-soft-text)] hover:underline">
          로그인
        </Link>
      </p>
    </div>
  )
}

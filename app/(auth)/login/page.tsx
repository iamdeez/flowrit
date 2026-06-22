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

        <button
          type="submit"
          disabled={pending}
          className="flowrit-button-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? '로그인 중...' : '로그인'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        아직 계정이 없으신가요?{' '}
        <Link href="/register" className="text-indigo-600 hover:underline">
          가입하기
        </Link>
      </p>
    </div>
  )
}

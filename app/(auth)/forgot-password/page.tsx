'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { forgotPassword, type ForgotPasswordState } from '@/lib/actions/auth'

const initialState: ForgotPasswordState = {}

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(forgotPassword, initialState)

  if (state.success) {
    return (
      <div className="flowrit-panel-padded text-center">
        <div className="mb-4 text-4xl">📬</div>
        <h2 className="mb-2 text-xl font-semibold text-gray-900">이메일을 확인해 주세요</h2>
        <p className="mb-6 text-sm text-gray-500">
          입력하신 이메일 주소로 비밀번호 재설정 링크를 발송했습니다.
          <br />
          링크는 1시간 후 만료됩니다.
        </p>
        <Link href="/login" className="text-sm text-indigo-600 hover:underline">
          로그인으로 돌아가기
        </Link>
      </div>
    )
  }

  return (
    <div className="flowrit-panel-padded">
      <h2 className="mb-2 text-xl font-semibold text-gray-900">비밀번호 찾기</h2>
      <p className="mb-6 text-sm text-gray-500">
        가입 시 사용한 이메일 주소를 입력하면 재설정 링크를 보내드립니다.
      </p>

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

        {state.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="flowrit-button-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? '발송 중...' : '재설정 링크 받기'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        <Link href="/login" className="text-indigo-600 hover:underline">
          로그인으로 돌아가기
        </Link>
      </p>
    </div>
  )
}

'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { MailCheck } from 'lucide-react'
import { forgotPassword, type ForgotPasswordState } from '@/lib/actions/auth'

const initialState: ForgotPasswordState = {}

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(forgotPassword, initialState)

  if (state.success) {
    return (
      <div className="flowrit-panel-padded text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--flowrit-success-soft)] text-[var(--flowrit-success-text)]">
          <MailCheck className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-[var(--flowrit-text)]">이메일을 확인해 주세요</h2>
        <p className="mb-6 text-sm leading-6 text-[var(--flowrit-text-muted)]">
          입력하신 이메일 주소로 비밀번호 재설정 링크를 발송했습니다.
          <br />
          링크는 1시간 후 만료됩니다.
        </p>
        <Link href="/login" className="flowrit-button-secondary">
          로그인으로 돌아가기
        </Link>
      </div>
    )
  }

  return (
    <div className="flowrit-panel-padded">
      <h2 className="mb-2 text-xl font-semibold text-[var(--flowrit-text)]">비밀번호 찾기</h2>
      <p className="mb-6 text-sm leading-6 text-[var(--flowrit-text-muted)]">
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
          <p className="flowrit-form-error">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="flowrit-button-primary w-full"
        >
          {pending ? '발송 중...' : '재설정 링크 받기'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-[var(--flowrit-text-secondary)]">
        <Link href="/login" className="font-medium text-[var(--flowrit-primary-soft-text)] hover:underline">
          로그인으로 돌아가기
        </Link>
      </p>
    </div>
  )
}

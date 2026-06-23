'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { resetPassword, type ResetPasswordState } from '@/lib/actions/auth'

const initialState: ResetPasswordState = {}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, initialState)

  if (state.success) {
    return (
      <div className="flowrit-panel-padded text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--flowrit-success-soft)] text-[var(--flowrit-success-text)]">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-[var(--flowrit-text)]">비밀번호가 변경되었습니다</h2>
        <p className="mb-6 text-sm text-[var(--flowrit-text-muted)]">새 비밀번호로 로그인하세요.</p>
        <Link href="/login" className="flowrit-button-primary">
          로그인하러 가기
        </Link>
      </div>
    )
  }

  return (
    <div className="flowrit-panel-padded">
      <h2 className="mb-2 text-xl font-semibold text-[var(--flowrit-text)]">새 비밀번호 설정</h2>
      <p className="mb-6 text-sm text-[var(--flowrit-text-muted)]">8자 이상의 새 비밀번호를 입력하세요.</p>

      <form action={action} className="space-y-4">
        <input type="hidden" name="token" value={token} />

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            새 비밀번호
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

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
            비밀번호 확인
          </label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            required
            minLength={8}
            placeholder="비밀번호 재입력"
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
          {pending ? '변경 중...' : '비밀번호 변경'}
        </button>
      </form>
    </div>
  )
}

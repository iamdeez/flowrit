'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="ko">
      <body className="flex min-h-screen flex-col items-center justify-center bg-[#f1f5f9] px-4 py-12 font-sans text-[#0f172a]">
        <div className="w-full max-w-md rounded-[0.625rem] border border-[#e2e8f0] bg-white p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#fef2f2] text-[#991b1b]">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="mb-2 text-sm font-medium text-[#991b1b]">오류 발생</p>
          <h1 className="mb-3 text-2xl font-semibold">문제가 발생했습니다</h1>
          <p className="mx-auto mb-8 max-w-sm text-sm leading-6 text-[#64748b]">
            앱을 불러오는 중 문제가 생겼습니다. 다시 시도해 주세요.
          </p>
          <button
            onClick={reset}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#4f46e5] px-4 py-2 text-sm font-medium text-white hover:bg-[#4338ca]"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            다시 시도
          </button>
        </div>
      </body>
    </html>
  )
}

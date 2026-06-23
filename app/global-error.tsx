'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

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
      <body className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-semibold text-gray-900">문제가 발생했습니다</h1>
          <p className="mb-6 text-sm text-gray-500">
            예기치 않은 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
          </p>
          <button
            onClick={reset}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  )
}

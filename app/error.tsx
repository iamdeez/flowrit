'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <p className="mb-2 text-sm font-medium text-indigo-600">오류 발생</p>
        <h1 className="mb-3 text-2xl font-semibold text-gray-900">문제가 발생했습니다</h1>
        <p className="mb-8 text-sm text-gray-500">
          예기치 않은 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            다시 시도
          </button>
          <Link
            href="/dashboard"
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            대시보드로
          </Link>
        </div>
      </div>
    </div>
  )
}

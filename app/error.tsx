'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--flowrit-panel-subtle)] px-4 py-12">
      <div className="flowrit-panel-padded w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--flowrit-danger-soft)] text-[var(--flowrit-danger-text)]">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="mb-2 text-sm font-medium text-[var(--flowrit-danger-text)]">오류 발생</p>
        <h1 className="mb-3 text-2xl font-semibold text-[var(--flowrit-text)]">문제가 발생했습니다</h1>
        <p className="mx-auto mb-8 max-w-sm text-sm leading-6 text-[var(--flowrit-text-muted)]">
          요청을 처리하는 중 문제가 생겼습니다. 다시 시도하거나 대시보드에서 작업을 이어가세요.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={reset}
            className="flowrit-button-primary"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            다시 시도
          </button>
          <Link
            href="/dashboard"
            className="flowrit-button-secondary"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            대시보드로
          </Link>
        </div>
      </div>
    </div>
  )
}

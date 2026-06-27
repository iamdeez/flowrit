'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import * as Sentry from '@sentry/nextjs'

export default function DashboardError({
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
    <div className="flowrit-page">
      <div className="flowrit-empty-state">
        <div className="flowrit-empty-icon">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>
        <p className="flowrit-empty-title">문제가 발생했습니다</p>
        <p className="flowrit-empty-description">
          일시적인 오류일 수 있습니다. 잠시 후 다시 시도해 주세요.
        </p>
        <div className="flowrit-empty-actions">
          <button type="button" onClick={reset} className="flowrit-button-primary">
            다시 시도
          </button>
        </div>
      </div>
    </div>
  )
}

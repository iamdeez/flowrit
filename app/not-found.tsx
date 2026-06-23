import Link from 'next/link'
import { Home, SearchX } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--flowrit-panel-subtle)] px-4 py-12">
      <div className="flowrit-panel-padded w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--flowrit-primary-soft)] text-[var(--flowrit-primary-soft-text)]">
          <SearchX className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="mb-2 text-sm font-medium text-[var(--flowrit-primary-soft-text)]">404</p>
        <h1 className="mb-3 text-2xl font-semibold text-[var(--flowrit-text)]">페이지를 찾을 수 없습니다</h1>
        <p className="mx-auto mb-8 max-w-sm text-sm leading-6 text-[var(--flowrit-text-muted)]">
          요청하신 페이지가 이동되었거나 접근할 수 없는 링크입니다. 대시보드에서 작업을 다시 확인하세요.
        </p>
        <Link
          href="/dashboard"
          className="flowrit-button-primary"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          대시보드로
        </Link>
      </div>
    </div>
  )
}

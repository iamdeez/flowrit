export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--flowrit-panel-subtle)] px-4">
      <div className="w-full max-w-sm">
        <div className="flowrit-panel-padded space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--flowrit-primary)] text-sm font-bold text-white">
              F
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--flowrit-text)]">Flowrit</p>
              <p className="text-xs text-[var(--flowrit-text-muted)]">작업 공간을 불러오는 중</p>
            </div>
          </div>
          <div className="space-y-3" aria-hidden="true">
            <div className="flowrit-skeleton flowrit-skeleton-line w-3/4" />
            <div className="flowrit-skeleton flowrit-skeleton-line w-full" />
            <div className="flowrit-skeleton flowrit-skeleton-line w-2/3" />
          </div>
        </div>
      </div>
    </div>
  )
}

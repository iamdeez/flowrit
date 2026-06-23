export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--flowrit-panel-subtle)] px-4">
      <div className="w-full max-w-sm px-2 py-10 sm:px-4">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--flowrit-primary)] text-sm font-bold text-white">
            F
          </div>
          <span className="text-2xl font-bold text-[var(--flowrit-text)]">Flowrit</span>
          <p className="mt-2 text-sm text-[var(--flowrit-text-muted)]">
            고객 의뢰와 수정 요청을 한 곳에서 관리하세요.
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--flowrit-panel-subtle)] px-4">
      <div className="w-full max-w-sm px-4">
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold text-[var(--flowrit-primary)]">Flowrit</span>
          <p className="mt-2 text-sm text-[var(--flowrit-text-muted)]">
            고객 의뢰와 수정 요청을 한 곳에서 관리하세요.
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}

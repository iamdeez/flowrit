/**
 * 라우트 진입 시 콘텐츠 형태를 미리 보여주는 스켈레톤.
 * 각 관리 화면의 loading.tsx 에서 재사용한다.
 */
export function PageSkeleton({
  rows = 4,
  className,
}: {
  rows?: number
  className?: string
}) {
  return (
    <div className={`flowrit-page ${className ?? ''}`}>
      <div className="flowrit-page-header">
        <div className="flowrit-skeleton h-7 w-32" />
        <div className="flowrit-skeleton mt-2 h-4 w-72 max-w-full" />
      </div>
      <div className="mt-6 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flowrit-skeleton h-16 w-full" />
        ))}
      </div>
    </div>
  )
}

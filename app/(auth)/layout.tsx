import type { Metadata } from 'next'
import Image from 'next/image'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--flowrit-panel-subtle)] px-4">
      <div className="w-full max-w-sm px-2 py-10 sm:px-4">
        <div className="mb-8 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <Image src="/FLOWRIT_icon_logo.svg" alt="Flowrit 아이콘" width={36} height={36} />
            <Image src="/FLOWRIT_text_logo.svg" alt="Flowrit" width={120} height={20} />
          </div>
          <p className="mt-2 text-sm text-[var(--flowrit-text-muted)]">
            고객 의뢰와 수정 요청을 한 곳에서 관리하세요.
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}

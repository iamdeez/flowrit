import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { OnboardingForm } from './onboarding-form'

export const metadata = { title: 'Flowrit 시작하기' }

export default async function OnboardingPage() {
  const session = await auth()
  if (!session?.user?.workspaceId) redirect('/login')

  const workspace = await prisma.workspace.findUnique({
    where: { id: session.user.workspaceId },
    select: { name: true, slug: true },
  })
  if (!workspace) redirect('/login')

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--flowrit-panel-subtle)] px-4 py-16">
      <div className="mb-10 text-center">
        <span className="text-2xl font-bold text-[var(--flowrit-primary)]">Flowrit</span>
        <h1 className="mt-6 text-2xl font-bold text-[var(--flowrit-text)]">
          워크스페이스를 설정해 볼게요 👋
        </h1>
        <p className="mt-2 text-sm text-[var(--flowrit-text-muted)]">
          나중에 설정 페이지에서 언제든지 변경할 수 있습니다.
        </p>
      </div>

      <div className="w-full max-w-sm">
        <div className="flowrit-panel-padded">
          <OnboardingForm
            defaultName={workspace.name}
            defaultSlug={workspace.slug}
          />
        </div>
      </div>

      <div className="mt-8 grid w-full max-w-sm grid-cols-3 gap-4 text-center">
        {[
          { icon: '📥', label: '의뢰 접수' },
          { icon: '📋', label: '프로젝트 관리' },
          { icon: '📦', label: '납품 링크' },
        ].map((item) => (
          <div key={item.label} className="rounded-lg bg-white border border-[var(--flowrit-border)] px-3 py-4">
            <div className="text-2xl mb-1">{item.icon}</div>
            <p className="text-xs text-[var(--flowrit-text-muted)]">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

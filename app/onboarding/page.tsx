import { redirect } from 'next/navigation'
import { FileCheck2, Inbox, PanelsTopLeft } from 'lucide-react'
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--flowrit-panel-subtle)] px-4 py-16">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--flowrit-primary)] text-sm font-bold text-white">
          F
        </div>
        <span className="text-2xl font-bold text-[var(--flowrit-text)]">Flowrit</span>
        <h1 className="mt-6 text-2xl font-bold text-[var(--flowrit-text)]">
          워크스페이스를 설정해 볼게요
        </h1>
        <p className="mt-2 text-sm text-[var(--flowrit-text-muted)]">
          고객에게 보여줄 이름과 주문서 주소를 먼저 확인하세요.
        </p>
      </div>

      <div className="w-full max-w-md">
        <div className="flowrit-panel-padded">
          <OnboardingForm
            defaultName={workspace.name}
            defaultSlug={workspace.slug}
            appUrl={appUrl}
          />
        </div>
      </div>

      <div className="mt-8 grid w-full max-w-md gap-3 sm:grid-cols-3">
        {[
          { icon: Inbox, label: '주문서 공유', desc: '고객 요청을 접수합니다.' },
          { icon: PanelsTopLeft, label: '프로젝트 전환', desc: '접수 건을 작업으로 바꿉니다.' },
          { icon: FileCheck2, label: '납품 링크', desc: '수정 요청과 파일을 공유합니다.' },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-[var(--flowrit-border)] bg-white px-3 py-4">
            <item.icon className="mb-2 h-5 w-5 text-[var(--flowrit-primary)]" aria-hidden="true" />
            <p className="text-xs font-semibold text-[var(--flowrit-text)]">{item.label}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--flowrit-text-muted)]">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

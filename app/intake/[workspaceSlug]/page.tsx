import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { IntakeForm } from './intake-form'

type Props = {
  params: Promise<{ workspaceSlug: string }>
}

export default async function IntakePage({ params }: Props) {
  const { workspaceSlug } = await params

  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
  })

  if (!workspace) notFound()

  return (
    <div className="min-h-screen bg-[var(--flowrit-panel-subtle)]">
      <div className="mx-auto max-w-lg px-4 py-12">
        <div className="mb-8 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
            일반 문의 접수
          </p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">{workspace.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            아래 양식을 작성해 주시면 담당자가 확인 후 연락드립니다.
          </p>
        </div>

        <section className="flowrit-panel-padded">
          <IntakeForm workspaceSlug={workspaceSlug} />
        </section>

        <p className="mt-6 text-center text-xs text-gray-400">
          Powered by Flowrit
        </p>
      </div>
    </div>
  )
}

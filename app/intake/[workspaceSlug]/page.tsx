import { notFound } from 'next/navigation'
import { Clock3, MessageSquareText } from 'lucide-react'
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
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
            Flowrit intake
          </p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">{workspace.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            문의 내용을 남겨주시면 담당자가 확인 후 필요한 정보를 이어서 안내드립니다.
          </p>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div className="flowrit-panel-padded">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <MessageSquareText className="h-4 w-4 text-[var(--flowrit-primary)]" />
              빠른 문의 접수
            </div>
            <p className="text-xs leading-5 text-gray-500">
              내용과 참고 파일을 함께 남길 수 있습니다.
            </p>
          </div>
          <div className="flowrit-panel-padded">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Clock3 className="h-4 w-4 text-[var(--flowrit-primary)]" />
              확인 후 회신
            </div>
            <p className="text-xs leading-5 text-gray-500">
              담당자가 내용을 검토하고 연락드립니다.
            </p>
          </div>
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

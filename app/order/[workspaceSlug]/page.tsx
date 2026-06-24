import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Clock3, ShieldCheck } from 'lucide-react'
import { prisma } from '@/lib/db'
import { getOrInitOrderFormFields } from '@/lib/actions/form-fields'
import { OrderForm } from './order-form'

type Props = {
  params: Promise<{ workspaceSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspaceSlug: rawSlug } = await params
  const workspaceSlug = decodeURIComponent(rawSlug)
  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    select: { name: true },
  })

  if (!workspace) {
    return {
      title: '주문서를 찾을 수 없습니다',
      robots: { index: false, follow: false },
    }
  }

  const title = `${workspace.name} 주문서`
  const description =
    `${workspace.name}에 프로젝트 의뢰 내용을 안전하게 전달하는 Flowrit 주문서입니다. 필요한 정보와 참고 파일을 한 번에 접수할 수 있습니다.`

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function OrderPage({ params }: Props) {
  const { workspaceSlug: rawSlug } = await params
  const workspaceSlug = decodeURIComponent(rawSlug)

  const workspace = await prisma.workspace.findUnique({ where: { slug: workspaceSlug } })
  if (!workspace) notFound()

  const fields = await getOrInitOrderFormFields(workspace.id)

  return (
    <div className="min-h-screen bg-[var(--flowrit-panel-subtle)]">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400">Flowrit order form</p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">{workspace.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            필요한 내용을 남겨주시면 담당자가 검토한 뒤 일정과 진행 방법을 안내드립니다.
          </p>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div className="flowrit-panel-padded">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <ShieldCheck className="h-4 w-4 text-[var(--flowrit-primary)]" />
              안전한 접수
            </div>
            <p className="text-xs leading-5 text-gray-500">
              제출 내용은 담당자 확인용으로만 사용됩니다.
            </p>
          </div>
          <div className="flowrit-panel-padded">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Clock3 className="h-4 w-4 text-[var(--flowrit-primary)]" />
              다음 단계 안내
            </div>
            <p className="text-xs leading-5 text-gray-500">
              접수 후 검토, 일정 확인, 프로젝트 진행 순서로 이어집니다.
            </p>
          </div>
        </div>

        <section className="flowrit-panel-padded">
          <OrderForm workspaceSlug={workspaceSlug} fields={fields} />
        </section>

        <p className="mt-6 text-center text-xs text-gray-400">Powered by Flowrit</p>
      </div>
    </div>
  )
}

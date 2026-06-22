import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { CustomerRevisionForm } from './revision-form'

type Props = {
  params: Promise<{ token: string }>
}

export default async function CustomerRevisionPage({ params }: Props) {
  const { token } = await params

  const page = await prisma.publicProjectPage.findUnique({
    where: { token },
    include: {
      project: { select: { title: true } },
    },
  })

  if (!page || !page.isActive) notFound()

  return (
    <div className="min-h-screen bg-[var(--flowrit-panel-subtle)]">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8">
          <a
            href={`/p/${token}`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
          >
            ← 진행상황으로 돌아가기
          </a>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">수정 요청</h1>
          <p className="mt-1 text-sm text-gray-500">{page.project.title}</p>
        </div>

        <div className="flowrit-panel-padded">
          <CustomerRevisionForm token={token} />
        </div>
      </div>
    </div>
  )
}

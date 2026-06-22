import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { seedDefaultWorkflowTemplates } from '@/lib/default-workflow-templates'
import { isProjectDone } from '@/lib/project-utils'
import { ConvertDialog } from './convert-dialog'

async function getDashboardData(workspaceId: string) {
  await seedDefaultWorkflowTemplates(workspaceId)

  const twoDaysFromNow = new Date()
  twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2)

  const [inquiries, allProjects, urgentCandidates, openRevisions, customers, templates] = await Promise.all([
    prisma.inquiry.findMany({
      where: { workspaceId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.project.findMany({
      where: { workspaceId, archivedAt: null },
      include: {
        stages: { orderBy: { order: 'asc' } },
        revisions: { where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } },
      },
    }),
    prisma.project.findMany({
      where: {
        workspaceId,
        archivedAt: null,
        dueDate: { lte: twoDaysFromNow },
      },
      include: {
        customer: true,
        stages: { orderBy: { order: 'asc' } },
        revisions: { where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } },
      },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.revisionRequest.findMany({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        project: { workspaceId, archivedAt: null },
      },
      include: { project: { include: { customer: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.customer.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' },
    }),
    prisma.workflowTemplate.findMany({
      where: { workspaceId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    }),
  ])

  const activeProjects = allProjects.filter((p) => !isProjectDone(p))
  const activeUrgentProjects = urgentCandidates.filter((p) => !isProjectDone(p))
  const activeCount = activeProjects.length
  const urgentCount = activeUrgentProjects.length

  return { inquiries, activeUrgentProjects, openRevisions, customers, templates, activeCount, urgentCount }
}

export default async function DashboardPage() {
  const session = await auth()
  const workspaceId = session?.user?.workspaceId ?? ''

  const { inquiries, activeUrgentProjects, openRevisions, customers, templates, activeCount, urgentCount } =
    await getDashboardData(workspaceId)

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">대시보드</h1>
        <Link
          href="/projects/new"
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          새 프로젝트
        </Link>
      </div>

      {/* 현황 요약 */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">진행 중</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{activeCount}</p>
          <p className="mt-1 text-xs text-gray-400">건</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">마감 임박 (2일 이내)</p>
          <p className={`mt-2 text-3xl font-semibold ${urgentCount > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
            {urgentCount}
          </p>
          <p className="mt-1 text-xs text-gray-400">건</p>
        </div>
      </section>

      {/* 신규 접수 */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            신규 접수{' '}
            {inquiries.length > 0 && (
              <span className="ml-1.5 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                {inquiries.length}
              </span>
            )}
          </h2>
        </div>

        {inquiries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center text-sm text-gray-400">
            새로 접수된 의뢰가 없습니다.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
                  <th className="px-4 py-3">이름</th>
                  <th className="px-4 py-3">연락처</th>
                  <th className="px-4 py-3 max-w-xs">의뢰 내용</th>
                  <th className="px-4 py-3">접수일</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {inquiries.map((inquiry) => (
                  <tr key={inquiry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{inquiry.name}</td>
                    <td className="px-4 py-3 text-gray-500">{inquiry.contact ?? '—'}</td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="truncate text-gray-600">{inquiry.content}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {inquiry.createdAt.toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ConvertDialog
                        inquiry={inquiry}
                        customers={customers}
                        templates={templates}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 오늘 처리할 작업 */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">오늘 처리할 작업</h2>

        {activeUrgentProjects.length === 0 && openRevisions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center text-sm text-gray-400">
            급하게 처리할 작업이 없습니다.
          </p>
        ) : (
          <div className="space-y-2">
            {activeUrgentProjects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="flex items-center justify-between rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 hover:bg-orange-100 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{project.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{project.customer.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-orange-700">
                    마감 {project.dueDate?.toLocaleDateString('ko-KR')}
                  </p>
                  {project.revisions.length > 0 && (
                    <p className="mt-0.5 text-xs text-gray-500">
                      미완료 수정 {project.revisions.length}건
                    </p>
                  )}
                </div>
              </Link>
            ))}

            {openRevisions.map((revision) => (
              <Link
                key={revision.id}
                href={`/projects/${revision.projectId}`}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 line-clamp-1">
                    {revision.content}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {revision.project.title} · {revision.project.customer.name}
                  </p>
                </div>
                <span
                  className={`shrink-0 ml-3 rounded-full px-2 py-0.5 text-xs font-medium ${
                    revision.status === 'IN_PROGRESS'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {revision.status === 'IN_PROGRESS' ? '진행 중' : '대기'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

import { redirect } from 'next/navigation'
import { Activity, BadgeDollarSign, CheckCircle2, FilePenLine } from 'lucide-react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isProjectDone } from '@/lib/project-utils'
import {
  formatKRW,
  getPeriodRange,
  getRecentMonthKeys,
  monthKey,
  monthLabel,
  toAnalyticsPeriod,
} from '@/lib/utils/analytics'
import { CompletionChart } from './completion-chart'
import { InquiryTrendChart } from './inquiry-trend-chart'
import { PeriodSelector } from './period-selector'
import { RevisionSourceChart } from './revision-source-chart'
import { TeamWorkloadTable } from './team-workload-table'
import { WorkloadChart } from './workload-chart'

type AnalyticsPageProps = {
  searchParams: Promise<{ period?: string }>
}

function inRange(date: Date, from: Date, to: Date): boolean {
  return date >= from && date <= to
}

function statCard({
  label,
  value,
  caption,
  icon,
}: {
  label: string
  value: string
  caption: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
          {icon}
        </span>
      </div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-400">{caption}</p>
    </div>
  )
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const session = await auth()
  const workspaceId = session?.user?.workspaceId
  if (!workspaceId) redirect('/login')

  const { period: periodParam } = await searchParams
  const period = toAnalyticsPeriod(periodParam)
  const { from, to } = getPeriodRange(period)
  const recentMonths = getRecentMonthKeys(6)
  const recentFrom = new Date(`${recentMonths[0]}-01T00:00:00`)

  const [projects, periodRevisions, recentInquiries, members, openRevisions] =
    await Promise.all([
      prisma.project.findMany({
        where: { workspaceId, archivedAt: null },
        include: {
          stages: { orderBy: { order: 'asc' } },
          revisions: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.revisionRequest.findMany({
        where: {
          project: { workspaceId, archivedAt: null },
          createdAt: { gte: from, lte: to },
        },
      }),
      prisma.inquiry.findMany({
        where: {
          workspaceId,
          createdAt: { gte: recentFrom },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.workspaceMember.findMany({
        where: { workspaceId },
        include: { user: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.revisionRequest.findMany({
        where: {
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          project: { workspaceId, archivedAt: null },
        },
      }),
    ])

  const completedProjects = projects.filter(isProjectDone)
  const completedInPeriod = completedProjects.filter((project) =>
    inRange(project.createdAt, from, to)
  )
  const createdInPeriod = projects.filter((project) => inRange(project.createdAt, from, to))
  const completedWithBudget = completedInPeriod.filter(
    (project) => project.budget !== null
  )
  const estimatedRevenue = completedWithBudget.reduce(
    (sum, project) => sum + (project.budget ?? 0),
    0
  )
  const budgetMissingCount = completedInPeriod.length - completedWithBudget.length
  const averageRevisions =
    completedInPeriod.length > 0
      ? periodRevisions.length / completedInPeriod.length
      : 0

  const completionData = recentMonths.map((key) => {
    const projectsInMonth = projects.filter((project) => monthKey(project.createdAt) === key)
    return {
      month: monthLabel(key),
      created: projectsInMonth.length,
      completed: projectsInMonth.filter(isProjectDone).length,
    }
  })

  const inquiryTrendData = recentMonths.map((key) => ({
    month: monthLabel(key),
    count: recentInquiries.filter((inquiry) => monthKey(inquiry.createdAt) === key).length,
  }))

  const revisionSourceData = periodRevisions.reduce(
    (acc, revision) => {
      if (revision.source === 'MANUAL') acc.manual += 1
      else acc.portal += 1
      return acc
    },
    { manual: 0, portal: 0 }
  )

  const activeProjects = projects.filter((project) => !isProjectDone(project))
  const workloadRows = [
    ...members.map((member) => ({
      name: member.user.name,
      email: member.user.email,
      activeProjects: activeProjects.filter(
        (project) => project.assigneeId === member.userId
      ).length,
      pendingRevisions: openRevisions.filter(
        (revision) => revision.assigneeId === member.userId
      ).length,
    })),
    {
      name: '담당자 미지정',
      activeProjects: activeProjects.filter((project) => !project.assigneeId).length,
      pendingRevisions: openRevisions.filter((revision) => !revision.assigneeId).length,
    },
  ]

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">통계</h1>
          <p className="mt-1 text-sm text-gray-500">
            프로젝트 완료, 수정 요청, 팀 워크로드와 예상 수익을 확인합니다.
          </p>
        </div>
        <PeriodSelector current={period} />
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCard({
          label: '완료 프로젝트',
          value: `${completedInPeriod.length}건`,
          caption: `신규 생성 ${createdInPeriod.length}건`,
          icon: <CheckCircle2 className="h-4 w-4" />,
        })}
        {statCard({
          label: '수정 요청',
          value: `${periodRevisions.length}건`,
          caption: `완료 프로젝트당 평균 ${averageRevisions.toFixed(1)}건`,
          icon: <FilePenLine className="h-4 w-4" />,
        })}
        {statCard({
          label: '예상 수익',
          value: formatKRW(estimatedRevenue),
          caption:
            budgetMissingCount > 0
              ? `예산 미입력 완료 프로젝트 ${budgetMissingCount}건 제외`
              : '예산 입력 완료 프로젝트 합산',
          icon: <BadgeDollarSign className="h-4 w-4" />,
        })}
        {statCard({
          label: '진행 중 작업',
          value: `${activeProjects.length}건`,
          caption: `미완료 수정 요청 ${openRevisions.length}건`,
          icon: <Activity className="h-4 w-4" />,
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900">월별 프로젝트 추이</h2>
            <p className="mt-1 text-xs text-gray-400">최근 6개월 생성·완료 건수</p>
          </div>
          <CompletionChart data={completionData} />
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900">수정 요청 출처</h2>
            <p className="mt-1 text-xs text-gray-400">선택 기간 기준</p>
          </div>
          <RevisionSourceChart data={revisionSourceData} />
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-900">의뢰 접수 추이</h2>
          <p className="mt-1 text-xs text-gray-400">최근 6개월 신규 의뢰 건수</p>
        </div>
        <InquiryTrendChart data={inquiryTrendData} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">팀 워크로드</h2>
          <p className="mt-1 text-xs text-gray-400">
            현재 진행 중인 프로젝트와 미완료 수정 요청 기준
          </p>
        </div>
        <div className="grid gap-5 xl:grid-cols-[minmax(360px,0.75fr)_minmax(0,1.25fr)]">
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <WorkloadChart data={workloadRows} />
          </div>
          <TeamWorkloadTable rows={workloadRows} />
        </div>
      </section>
    </div>
  )
}

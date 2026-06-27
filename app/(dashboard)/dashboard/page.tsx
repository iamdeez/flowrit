import { Suspense } from "react";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  BadgeDollarSign,
  CheckCircle2,
  Clock,
  FilePen,
  FilePenLine,
  Inbox,
  Plus,
  Zap,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { seedDefaultWorkflowTemplates } from "@/lib/default-workflow-templates";
import { isProjectDone } from "@/lib/project-utils";
import {
  formatKRW,
  getPeriodRange,
  getRecentMonthKeys,
  monthKey,
  monthLabel,
  toAnalyticsPeriod,
} from "@/lib/utils/analytics";
import { CompletionChart } from "../analytics/completion-chart";
import { InquiryTrendChart } from "../analytics/inquiry-trend-chart";
import { PeriodSelector } from "../analytics/period-selector";
import { RevisionSourceChart } from "../analytics/revision-source-chart";
import { TeamWorkloadTable } from "../analytics/team-workload-table";
import { WorkloadChart } from "../analytics/workload-chart";
import { ConvertDialog } from "./convert-dialog";

type DashboardPageProps = {
  searchParams: Promise<{ period?: string }>;
};

function inRange(date: Date, from: Date, to: Date): boolean {
  return date >= from && date <= to;
}

function analyticsStatCard({
  label,
  value,
  caption,
  icon,
}: {
  label: string;
  value: string;
  caption: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flowrit-panel-padded">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
          {icon}
        </span>
      </div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-400">{caption}</p>
    </div>
  );
}

async function getOperationalData(workspaceId: string) {
  await seedDefaultWorkflowTemplates(workspaceId);

  const twoDaysFromNow = new Date();
  twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

  const [
    inquiries,
    pendingInquiryCount,
    projectsForStatus,
    urgentCandidates,
    openRevisions,
    openRevisionCount,
    customers,
    templates,
  ] = await Promise.all([
    prisma.inquiry.findMany({
      where: { workspaceId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.inquiry.count({
      where: { workspaceId, status: "PENDING" },
    }),
    prisma.project.findMany({
      where: { workspaceId, archivedAt: null },
      select: {
        id: true,
        currentStageId: true,
        stages: { orderBy: { order: "asc" } },
      },
    }),
    prisma.project.findMany({
      where: {
        workspaceId,
        archivedAt: null,
        dueDate: { lte: twoDaysFromNow },
      },
      include: {
        customer: { select: { name: true } },
        stages: { orderBy: { order: "asc" } },
        revisions: {
          where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
          select: { id: true },
        },
      },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
    prisma.revisionRequest.findMany({
      where: {
        status: { in: ["OPEN", "IN_PROGRESS"] },
        project: { workspaceId, archivedAt: null },
      },
      select: {
        id: true,
        projectId: true,
        content: true,
        status: true,
        project: {
          select: {
            title: true,
            customer: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.revisionRequest.count({
      where: {
        status: { in: ["OPEN", "IN_PROGRESS"] },
        project: { workspaceId, archivedAt: null },
      },
    }),
    prisma.customer.findMany({
      where: { workspaceId },
      orderBy: { name: "asc" },
    }),
    prisma.workflowTemplate.findMany({
      where: { workspaceId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    }),
  ]);

  const activeProjects = projectsForStatus.filter((p) => !isProjectDone(p));
  const activeUrgentProjects = urgentCandidates.filter(
    (p) => !isProjectDone(p),
  );

  return {
    inquiries,
    pendingInquiryCount,
    activeUrgentProjects,
    openRevisions,
    customers,
    templates,
    activeCount: activeProjects.length,
    urgentCount: activeUrgentProjects.length,
    openRevisionCount,
  };
}

async function getAnalyticsData(workspaceId: string, periodParam?: string) {
  const period = toAnalyticsPeriod(periodParam);
  const { from, to } = getPeriodRange(period);
  const recentMonths = getRecentMonthKeys(6);
  const recentFrom = new Date(`${recentMonths[0]}-01T00:00:00`);

  const [
    projects,
    periodRevisionCount,
    revisionSourceGroups,
    recentInquiries,
    members,
    openRevisionAssignees,
  ] = await Promise.all([
    prisma.project.findMany({
      where: { workspaceId, archivedAt: null },
      select: {
        id: true,
        createdAt: true,
        budget: true,
        assigneeId: true,
        currentStageId: true,
        stages: { orderBy: { order: "asc" } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.revisionRequest.count({
      where: {
        project: { workspaceId, archivedAt: null },
        createdAt: { gte: from, lte: to },
      },
    }),
    prisma.revisionRequest.groupBy({
      by: ["source"],
      where: {
        project: { workspaceId, archivedAt: null },
        createdAt: { gte: from, lte: to },
      },
      _count: { _all: true },
    }),
    prisma.inquiry.findMany({
      where: {
        workspaceId,
        createdAt: { gte: recentFrom },
      },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: {
        userId: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.revisionRequest.findMany({
      where: {
        status: { in: ["OPEN", "IN_PROGRESS"] },
        project: { workspaceId, archivedAt: null },
      },
      select: { assigneeId: true },
    }),
  ]);

  const activeProjects = projects.filter((p) => !isProjectDone(p));
  const completedProjects = projects.filter(isProjectDone);
  const completedInPeriod = completedProjects.filter((project) =>
    inRange(project.createdAt, from, to),
  );
  const createdInPeriod = projects.filter((project) =>
    inRange(project.createdAt, from, to),
  );
  const completedWithBudget = completedInPeriod.filter(
    (project) => project.budget !== null,
  );
  const estimatedRevenue = completedWithBudget.reduce(
    (sum, project) => sum + (project.budget ?? 0),
    0,
  );
  const budgetMissingCount =
    completedInPeriod.length - completedWithBudget.length;
  const averageRevisions =
    completedInPeriod.length > 0
      ? periodRevisionCount / completedInPeriod.length
      : 0;
  const openRevisionCount = openRevisionAssignees.length;

  const completionData = recentMonths.map((key) => {
    const projectsInMonth = projects.filter(
      (project) => monthKey(project.createdAt) === key,
    );
    return {
      month: monthLabel(key),
      created: projectsInMonth.length,
      completed: projectsInMonth.filter(isProjectDone).length,
    };
  });

  const inquiryTrendData = recentMonths.map((key) => ({
    month: monthLabel(key),
    count: recentInquiries.filter(
      (inquiry) => monthKey(inquiry.createdAt) === key,
    ).length,
  }));

  const revisionSourceData = {
    manual:
      revisionSourceGroups.find((group) => group.source === "MANUAL")?._count
        ._all ?? 0,
    portal:
      revisionSourceGroups.find((group) => group.source !== "MANUAL")?._count
        ._all ?? 0,
  };

  const workloadRows = [
    ...members.map((member) => ({
      name: member.user.name,
      email: member.user.email,
      activeProjects: activeProjects.filter(
        (project) => project.assigneeId === member.userId,
      ).length,
      pendingRevisions: openRevisionAssignees.filter(
        (revision) => revision.assigneeId === member.userId,
      ).length,
    })),
    {
      name: "담당자 미지정",
      activeProjects: activeProjects.filter((project) => !project.assigneeId)
        .length,
      pendingRevisions: openRevisionAssignees.filter(
        (revision) => !revision.assigneeId,
      ).length,
    },
  ];

  return {
    openRevisionCount,
    activeProjectCount: activeProjects.length,
    completedInPeriodCount: completedInPeriod.length,
    createdInPeriodCount: createdInPeriod.length,
    periodRevisionCount,
    estimatedRevenue,
    budgetMissingCount,
    averageRevisions,
    completionData,
    inquiryTrendData,
    revisionSourceData,
    workloadRows,
  };
}

const getCachedAnalyticsData = unstable_cache(
  async (workspaceId: string, periodParam?: string) =>
    getAnalyticsData(workspaceId, periodParam),
  ["dashboard-analytics"],
  { revalidate: 60 },
);

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const session = await auth();
  const workspaceId = session?.user?.workspaceId;
  if (!workspaceId) redirect("/login");

  const { period: periodParam } = await searchParams;
  const period = toAnalyticsPeriod(periodParam);

  const {
    inquiries,
    pendingInquiryCount,
    activeUrgentProjects,
    openRevisions,
    customers,
    templates,
    activeCount,
    urgentCount,
    openRevisionCount,
  } = await getOperationalData(workspaceId);

  return (
    <div className="flowrit-page space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Workspace overview
          </p>
          <h1 className="flowrit-page-title mt-2">
            대시보드
          </h1>
          <p className="flowrit-page-description">
            오늘 처리할 운영 항목과 기간별 성과 지표를 한 화면에서 확인합니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodSelector current={period} />
          <Link
            href="/projects/new"
            className="flowrit-button-primary inline-flex min-h-9 items-center gap-2"
          >
            <Plus className="h-4 w-4" />새 프로젝트
          </Link>
        </div>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">업무 파이프라인</h2>
          <p className="mt-1 text-sm text-gray-500">
            접수, 진행, 수정, 마감 임박 상태를 빠르게 확인합니다.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="flowrit-panel p-4">
            <div className="flowrit-stat-icon bg-[var(--flowrit-primary-soft)]">
              <Zap className="h-5 w-5 text-[var(--flowrit-primary)]" />
            </div>
            <p className="text-2xl font-bold tracking-tight text-[var(--flowrit-text)]">
              {activeCount}
            </p>
            <p className="mt-0.5 text-xs font-medium text-[var(--flowrit-text-muted)]">
              진행 중
            </p>
          </div>
          <div className="flowrit-panel p-4">
            <div className="flowrit-stat-icon bg-orange-50">
              <Clock
                className={`h-5 w-5 ${urgentCount > 0 ? "text-orange-600" : "text-orange-300"}`}
              />
            </div>
            <p
              className={`text-2xl font-bold tracking-tight ${urgentCount > 0 ? "text-orange-600" : "text-[var(--flowrit-text)]"}`}
            >
              {urgentCount}
            </p>
            <p className="mt-0.5 text-xs font-medium text-[var(--flowrit-text-muted)]">
              마감 임박 (2일)
            </p>
          </div>
          <div className="flowrit-panel p-4">
            <div className="flowrit-stat-icon bg-rose-50">
              <FilePen
                className={`h-5 w-5 ${openRevisionCount > 0 ? "text-rose-600" : "text-rose-300"}`}
              />
            </div>
            <p
              className={`text-2xl font-bold tracking-tight ${openRevisionCount > 0 ? "text-rose-600" : "text-[var(--flowrit-text)]"}`}
            >
              {openRevisionCount}
            </p>
            <p className="mt-0.5 text-xs font-medium text-[var(--flowrit-text-muted)]">
              미완료 수정
            </p>
          </div>
          <div className="flowrit-panel p-4">
            <div className="flowrit-stat-icon bg-sky-50">
              <Inbox
                className={`h-5 w-5 ${pendingInquiryCount > 0 ? "text-sky-600" : "text-sky-300"}`}
              />
            </div>
            <p
              className={`text-2xl font-bold tracking-tight ${pendingInquiryCount > 0 ? "text-sky-700" : "text-[var(--flowrit-text)]"}`}
            >
              {pendingInquiryCount}
            </p>
            <p className="mt-0.5 text-xs font-medium text-[var(--flowrit-text-muted)]">
              미확인 주문
            </p>
          </div>
        </div>
      </section>

      <section
        className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.85fr)]"
        style={{ alignItems: "stretch" }}
      >
        {/* 두 영역의 높이+더보기 버튼 위치를 맞추고, 외곽선으로 시각적 분리 */}
        <div className="flex flex-col h-full border rounded-2xl border-gray-200 bg-white overflow-hidden">
          {(() => {
            const MAX_ITEMS = 7;
            // 작업 리스트 합치기: 프로젝트 먼저, 그 다음 수정
            const workItems = [
              ...activeUrgentProjects.map((project) => ({
                type: "project" as const,
                data: project,
              })),
              ...openRevisions.map((revision) => ({
                type: "revision" as const,
                data: revision,
              })),
            ];
            const showItems = workItems.slice(0, MAX_ITEMS);
            const showMore = workItems.length > MAX_ITEMS;

            return (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="mb-3 px-6 pt-6">
                  <h2 className="text-sm font-semibold text-gray-900">
                    오늘의 우선순위
                  </h2>
                  <p className="mt-1 text-xs text-gray-400">
                    마감 임박 프로젝트와 아직 열려 있는 수정 요청입니다.
                  </p>
                </div>
                <div className="flex-1 flex flex-col px-6 pb-4">
                  {workItems.length === 0 ? (
                    <div className="flowrit-empty-state min-h-[140px] flex-1">
                      <p className="flowrit-empty-title">급하게 처리할 작업이 없습니다.</p>
                      <p className="flowrit-empty-description">마감 임박 프로젝트와 열린 수정 요청이 생기면 이곳에 표시됩니다.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col flex-1">
                      <div className="space-y-2 flex-1">
                        {showItems.map((item) =>
                          item.type === "project" ? (
                            <Link
                              key={item.data.id}
                              href={`/projects/${item.data.id}`}
                              className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 transition-colors hover:bg-orange-100"
                            >
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100">
                                <AlertTriangle className="h-4 w-4 text-orange-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-[var(--flowrit-text)]">
                                  {item.data.title}
                                </p>
                                <p className="mt-0.5 text-xs text-[var(--flowrit-text-muted)]">
                                  {item.data.customer.name}
                                </p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-xs font-semibold text-orange-700">
                                  {item.data.dueDate?.toLocaleDateString(
                                    "ko-KR",
                                  )}{" "}
                                  마감
                                </p>
                                {item.data.revisions.length > 0 && (
                                  <p className="mt-0.5 text-xs text-[var(--flowrit-text-muted)]">
                                    수정 {item.data.revisions.length}건
                                  </p>
                                )}
                              </div>
                            </Link>
                          ) : (
                            <Link
                              key={item.data.id}
                              href={`/projects/${item.data.projectId}`}
                              className="flowrit-panel flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-gray-50"
                            >
                              <div className="min-w-0">
                                <p className="line-clamp-1 text-sm font-medium text-gray-900">
                                  {item.data.content}
                                </p>
                                <p className="mt-0.5 truncate text-xs text-gray-500">
                                  {item.data.project.title} ·{" "}
                                  {item.data.project.customer.name}
                                </p>
                              </div>
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                                  item.data.status === "IN_PROGRESS"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {item.data.status === "IN_PROGRESS"
                                  ? "진행 중"
                                  : "대기"}
                              </span>
                            </Link>
                          ),
                        )}
                      </div>
                      <div className="flex-0 mt-auto">
                        {showMore && (
                          <Link
                            href="/projects?filter=urgent-or-revision"
                            className="flex items-center justify-center gap-1 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors mt-2"
                          >
                            더보기
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        <div className="flex flex-col h-full border rounded-2xl border-gray-200 bg-white overflow-hidden">
          {(() => {
            // 최대 3개만 노출
            const MAX_INQUIRIES_DISPLAY = 3;
            const hasExtra = inquiries.length > MAX_INQUIRIES_DISPLAY;
            const visibleInquiries = inquiries.slice(0, MAX_INQUIRIES_DISPLAY);

            return (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="mb-3 flex items-center justify-between px-6 pt-6">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">
                      최근 접수
                    </h2>
                    <p className="mt-1 text-xs text-gray-400">
                      프로젝트로 전환할 고객 의뢰입니다.
                    </p>
                  </div>
                  <Link
                    href="/orders"
                    className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 hover:bg-indigo-200 transition-colors"
                  >
                    {pendingInquiryCount > 0
                      ? `${pendingInquiryCount}건 보기`
                      : "전체 보기"}
                  </Link>
                </div>
                <div className="flex-1 flex flex-col px-6 pb-4">
                  {inquiries.length === 0 ? (
                    <div className="flowrit-empty-state min-h-[140px] flex-1">
                      <p className="flowrit-empty-title">대기 중인 의뢰가 없습니다.</p>
                      <p className="flowrit-empty-description">주문서나 문의 폼으로 새 요청이 들어오면 이곳에서 프로젝트로 전환할 수 있습니다.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 flex-1 flex flex-col">
                      {visibleInquiries.map((inquiry) => (
                        <div key={inquiry.id} className="flowrit-panel p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sm font-semibold text-sky-700">
                                {inquiry.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[var(--flowrit-text)]">
                                  {inquiry.name}
                                </p>
                                {inquiry.contact && (
                                  <p className="text-xs text-[var(--flowrit-text-muted)]">
                                    {inquiry.contact}
                                  </p>
                                )}
                              </div>
                            </div>
                            <time className="shrink-0 text-xs text-[var(--flowrit-text-muted)]">
                              {inquiry.createdAt.toLocaleDateString("ko-KR")}
                            </time>
                          </div>
                          <p className="mt-3 line-clamp-2 text-sm text-[var(--flowrit-text-secondary)]">
                            {inquiry.content}
                          </p>
                          <div className="mt-3 flex justify-end">
                            <ConvertDialog
                              inquiry={inquiry}
                              customers={customers}
                              templates={templates}
                            />
                          </div>
                        </div>
                      ))}
                      <div className="flex-0 mt-auto">
                        {hasExtra && (
                          <Link
                            href="/orders?filter=pending-inquiry"
                            className="flex items-center justify-center gap-1 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors mt-2"
                          >
                            더보기
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      <Suspense fallback={<DashboardAnalyticsFallback />}>
        <DashboardAnalytics
          workspaceId={workspaceId}
          periodParam={periodParam}
        />
      </Suspense>
    </div>
  );
}

async function DashboardAnalytics({
  workspaceId,
  periodParam,
}: {
  workspaceId: string;
  periodParam?: string;
}) {
  const {
    openRevisionCount,
    activeProjectCount,
    completedInPeriodCount,
    createdInPeriodCount,
    periodRevisionCount,
    estimatedRevenue,
    budgetMissingCount,
    averageRevisions,
    completionData,
    inquiryTrendData,
    revisionSourceData,
    workloadRows,
  } = await getCachedAnalyticsData(workspaceId, periodParam);

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900">성과 분석</h2>
        <p className="mt-1 text-sm text-gray-500">
          상단 기간 선택 기준으로 프로젝트 완료, 수정 요청, 수익 흐름을 봅니다.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {analyticsStatCard({
          label: "완료 프로젝트",
          value: `${completedInPeriodCount}건`,
          caption: `신규 생성 ${createdInPeriodCount}건`,
          icon: <CheckCircle2 className="h-4 w-4" />,
        })}
        {analyticsStatCard({
          label: "수정 요청",
          value: `${periodRevisionCount}건`,
          caption: `완료 프로젝트당 평균 ${averageRevisions.toFixed(1)}건`,
          icon: <FilePenLine className="h-4 w-4" />,
        })}
        {analyticsStatCard({
          label: "예상 수익",
          value: formatKRW(estimatedRevenue),
          caption:
            budgetMissingCount > 0
              ? `예산 미입력 완료 프로젝트 ${budgetMissingCount}건 제외`
              : "예산 입력 완료 프로젝트 합산",
          icon: <BadgeDollarSign className="h-4 w-4" />,
        })}
        {analyticsStatCard({
          label: "진행 중 작업",
          value: `${activeProjectCount}건`,
          caption: `미완료 수정 요청 ${openRevisionCount}건`,
          icon: <Activity className="h-4 w-4" />,
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <div className="flowrit-panel-padded">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900">
              월별 프로젝트 추이
            </h3>
            <p className="mt-1 text-xs text-gray-400">
              최근 6개월 생성·완료 건수
            </p>
          </div>
          <CompletionChart data={completionData} />
        </div>

        <div className="flowrit-panel-padded">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900">
              수정 요청 출처
            </h3>
            <p className="mt-1 text-xs text-gray-400">선택 기간 기준</p>
          </div>
          <RevisionSourceChart data={revisionSourceData} />
        </div>
      </div>

      <div className="flowrit-panel-padded">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900">
            의뢰 접수 추이
          </h3>
          <p className="mt-1 text-xs text-gray-400">최근 6개월 접수 건수</p>
        </div>
        <InquiryTrendChart data={inquiryTrendData} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(360px,0.75fr)_minmax(0,1.25fr)]">
        <div className="flowrit-panel-padded">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900">팀 워크로드</h3>
            <p className="mt-1 text-xs text-gray-400">
              진행 중 프로젝트와 미완료 수정 요청 기준
            </p>
          </div>
          <WorkloadChart data={workloadRows} />
        </div>
        <TeamWorkloadTable rows={workloadRows} />
      </div>
    </section>
  );
}

function DashboardAnalyticsFallback() {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900">성과 분석</h2>
        <p className="mt-1 text-sm text-gray-500">
          상단 기간 선택 기준으로 프로젝트 완료, 수정 요청, 수익 흐름을 봅니다.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flowrit-panel-padded animate-pulse">
            <div className="mb-4 flex items-center justify-between">
              <div className="h-4 w-24 rounded bg-gray-100" />
              <div className="h-9 w-9 rounded-lg bg-gray-100" />
            </div>
            <div className="h-7 w-16 rounded bg-gray-100" />
            <div className="mt-2 h-3 w-32 rounded bg-gray-100" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <div className="flowrit-panel-padded h-72 animate-pulse bg-gray-50" />
        <div className="flowrit-panel-padded h-72 animate-pulse bg-gray-50" />
      </div>
    </section>
  );
}

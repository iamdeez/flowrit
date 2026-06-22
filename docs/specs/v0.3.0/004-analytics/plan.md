# Plan: analytics

## 목차

- [사전 검증 (Constitution Gates)](#사전-검증-constitution-gates)
- [기술 컨텍스트](#기술-컨텍스트)
- [사전 영향도 분석 결과](#사전-영향도-분석-결과)
- [핵심 설계](#핵심-설계)
- [인터페이스 계약](#인터페이스-계약)
- [데이터 모델](#데이터-모델)
- [테스트 전략](#테스트-전략)
- [기타 고려사항](#기타-고려사항)

---

## 사전 검증 (Constitution Gates)

- [x] 성능 원칙: 통계 집계는 Server Component에서 수행하고 결과를 Client 차트 컴포넌트에 전달한다. 초기 로딩 지연이 발생할 수 있으나 Suspense로 처리한다.
- [x] 호환성 원칙: `Project.budget Int?` 신규 선택 필드 추가 — 기존 코드가 budget을 참조하지 않으므로 런타임 에러 없음.
- [x] 테스트 원칙: FR-501~FR-513 모두 SC-501~SC-506에 수용 기준이 있다.
- [x] 스펙 범위 원칙: 구현이 spec.md 범위(통계 페이지, 차트, 예산 필드)를 벗어나지 않는다.

---

## 기술 컨텍스트

- **언어 / 런타임**: TypeScript, Next.js 16 App Router
- **주요 의존성**: recharts (신규), shadcn/ui Chart, Prisma ORM
- **패키지 추가**: `npm install recharts`, `npx shadcn@latest add chart`

---

## 사전 영향도 분석 결과

### 영향 파일 목록

| 파일 | 변경 유형 | 영향 내용 |
|---|---|---|
| `prisma/schema.prisma` | 수정 | `Project.budget Int?` 추가 |
| `components/sidebar-nav.tsx` | 수정 | "통계" 링크 추가 (`/analytics`, BarChart2 아이콘) |
| `app/(dashboard)/analytics/page.tsx` | 신규 | 통계 RSC — 기간 파라미터 기반 집계 |
| `app/(dashboard)/analytics/completion-chart.tsx` | 신규 | 월별 완료 바 차트 (Client) |
| `app/(dashboard)/analytics/revision-source-chart.tsx` | 신규 | 수정 출처 파이 차트 (Client) |
| `app/(dashboard)/analytics/inquiry-trend-chart.tsx` | 신규 | 의뢰 추이 선 그래프 (Client) |
| `app/(dashboard)/analytics/team-workload-table.tsx` | 신규 | 팀 워크로드 표 |
| `app/(dashboard)/analytics/period-selector.tsx` | 신규 | 기간 선택 Client 컴포넌트 |
| `app/(dashboard)/projects/[id]/page.tsx` | 수정 | 예산 표시·편집 UI 추가 |
| `lib/actions/project.ts` | 수정 | `createProject`에 budget 파라미터, `updateBudget` 신규 |
| `components/ui/chart.tsx` | 신규 (shadcn) | recharts 래퍼 |

---

## 핵심 설계

### 페이지 구조

```
/analytics?period=this-month

[기간 선택 탭]
[요약 카드 행: 완료 N건, 수정 N건, 예상 수익 N원]
[월별 완료 바 차트] [수정 출처 파이 차트]
[의뢰 추이 선 그래프]
[팀 워크로드 표]
```

### 데이터 집계 함수 (`app/(dashboard)/analytics/page.tsx`)

```ts
// RSC 내부
export default async function AnalyticsPage({ searchParams }) {
  const period = searchParams?.period ?? 'this-month';
  const { from, to } = getPeriodRange(period);

  // 1. 모든 프로젝트 조회 (기간 내 생성된 것 + 전체 워크로드용)
  const projects = await prisma.project.findMany({
    where: { workspaceId, archivedAt: null },
    include: { stages: true, currentStage: true, revisions: true },
  });

  // 2. isProjectDone()으로 완료 여부 결정
  const completedInPeriod = projects.filter(p =>
    isProjectDone(p) && p.createdAt >= from && p.createdAt <= to
  );

  // 3. 수정 요청 집계
  const revisions = await prisma.revisionRequest.findMany({
    where: { project: { workspaceId }, createdAt: { gte: from, lte: to } },
  });

  // 4. 의뢰 월별 추이
  const inquiries = await prisma.inquiry.findMany({
    where: { workspaceId, createdAt: { gte: subMonths(new Date(), 6) } },
  });

  // 5. 팀 워크로드
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  // projects, revisions 기반 메모리 집계

  return (
    <>
      <PeriodSelector current={period} />
      <SummaryCards completed={completedInPeriod.length} ... />
      <CompletionChart data={monthlyData} />
      <RevisionSourceChart data={sourceData} />
      <InquiryTrendChart data={inquiryData} />
      <TeamWorkloadTable members={workloadData} />
    </>
  );
}
```

### 월별 집계 헬퍼

```ts
function groupByMonth<T extends { createdAt: Date }>(items: T[]): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const key = `${item.createdAt.getFullYear()}-${String(item.createdAt.getMonth() + 1).padStart(2, '0')}`;
    (acc[key] ??= []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
}
```

### 예산 필드 추가

```ts
// lib/actions/project.ts
export async function createProject(prevState, formData: FormData) {
  // 기존 + budget 파라미터
  const budget = formData.get('budget') ? parseInt(formData.get('budget') as string) : null;
  await prisma.project.create({ data: { ..., budget } });
}

export async function updateBudget(projectId: string, budget: number | null) {
  const session = await auth();
  // workspaceId 검증
  await prisma.project.update({ where: { id: projectId }, data: { budget } });
  revalidatePath(`/projects/${projectId}`);
}
```

---

## 인터페이스 계약

- 차트 클라이언트 컴포넌트는 순수하게 데이터를 받아 시각화만 수행한다. 내부에서 fetch나 Server Action을 호출하지 않는다.
- `PeriodSelector`는 URL 쿼리 파라미터(`?period=`)를 변경하는 `Link` 또는 `router.push()`를 사용한다. RSC 페이지가 새 파라미터로 재렌더링된다.
- `updateBudget`은 `projectId` 기반으로 `workspaceId` 소속 검증 후 업데이트한다. 타 워크스페이스 프로젝트 수정 불가.

---

## 데이터 모델

### Project 스키마 변경

```prisma
model Project {
  // 기존 필드 유지
  budget      Int?
}
```

---

## 테스트 전략

| SC 식별자 | 테스트 유형 | 시나리오 요약 | 입력 | 기대 결과 |
|---|---|---|---|---|
| SC-501 | 수동 E2E | 사이드바 "통계" 링크 클릭 | 클릭 | `/analytics` 페이지 이동 |
| SC-502 | 수동 E2E | "이번 달" 필터에서 완료 수 카드 표시 | `?period=this-month` | 이번 달 완료 건수 카드 표시, 바 차트 렌더링 |
| SC-503 | 수동 E2E | 수정 출처 차트 렌더링 | 수정 요청 MANUAL/PORTAL 데이터 존재 | 파이 차트에 MANUAL·PORTAL 비율 표시 |
| SC-504 | 수동 E2E | 팀 워크로드 표 | 멤버에게 프로젝트 할당된 상태 | 팀원별 진행 중 프로젝트 수·미완료 수정 수 표시 |
| SC-505 | 수동 E2E | 예산 입력·저장 | 프로젝트 생성 폼에서 budget 입력 | DB 저장, 상세 헤더에 표시 |
| SC-506 | 수동 E2E | 예상 수익 카드 | 완료 프로젝트에 budget 있는 경우 | 합산 금액 표시, 미입력 건수 안내 |

---

## 기타 고려사항

- **Suspense 활용**: 집계 쿼리가 느릴 수 있으므로 각 섹션을 `<Suspense fallback={<Skeleton />}>`으로 감싸 스트리밍 렌더링한다.
- **date-fns 의존성**: `subMonths`, `startOfMonth`, `endOfMonth`, `format` 사용. `date-fns`가 이미 설치된 경우 그대로 사용. 없으면 직접 Date 계산으로 대체(복잡도 낮음).
- **recharts 번들 크기**: 약 200KB gzip. 통계 페이지에만 사용되므로 route-level code splitting으로 자동 처리됨.

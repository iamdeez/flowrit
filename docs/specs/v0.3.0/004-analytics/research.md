# Research: analytics

## 목차

- [기존 코드베이스 분석](#기존-코드베이스-분석)
- [영향 범위 분석](#영향-범위-분석)
- [기술 선택 조사](#기술-선택-조사)
- [엣지 케이스 및 한계](#엣지-케이스-및-한계)

---

## 기존 코드베이스 분석

### 현재 대시보드 집계 쿼리

`app/(dashboard)/dashboard/page.tsx`:
- 활성 프로젝트 수: `prisma.project.count({ where: { workspaceId, ... } })`
- 마감 임박: dueDate 기반 필터
- 새 의뢰: `prisma.inquiry.findMany(...)` + ConvertDialog

이 패턴을 통계 페이지에서 확장·재사용한다.

### isProjectDone 로직

`lib/project-utils.ts`:

```ts
export function isProjectDone(project: ProjectWithStages): boolean {
  // getCurrentStage() 결과가 없거나 단계 이름이 '완료'이면 true
}
```

통계에서 "완료" 기준은 이 함수를 사용한다. 단, DB 쿼리 레벨에서 필터링하려면 stage name '완료'를 직접 조인 조건으로 사용해야 한다.

**문제**: 현재 `isProjectDone`은 메모리 레벨 함수이며 Prisma 쿼리 조건에서 직접 사용할 수 없다. 월별 완료 집계를 위해서는:

```ts
// 방법 A: raw query
// 방법 B: project + stage join 후 메모리 필터 (소규모 데이터 OK)
// 방법 C: Project.completedAt 필드 추가 (가장 정확하나 scope 확장)
```

**결정**: 방법 B 채택. Prisma include로 currentStage를 함께 조회 후 메모리에서 `isProjectDone` 적용. 초기 1,000건 이하 데이터에서 성능 문제 없음.

### 현재 Project 모델

`budget`과 `archivedAt` 필드가 없다. 두 필드 모두 추가 필요.

### WorkspaceMember와 User 연결

팀 워크로드 집계 시 `Project.assigneeId → User.id → name` 조인이 필요하다.

```ts
const workload = await prisma.workspaceMember.findMany({
  where: { workspaceId },
  include: {
    user: {
      include: {
        assignedProjects: { where: { workspaceId, archivedAt: null } },
        assignedRevisions: { where: { project: { workspaceId } } },
      }
    }
  }
});
```

단, `User.assignedProjects`는 현재 스키마에서 `Project.assigneeId`를 통해 관계가 이미 정의되어 있다.

### recharts / shadcn/ui Chart

`components/ui/chart.tsx`가 존재하는지 확인 필요. 존재하지 않으면 `npx shadcn@latest add chart`로 추가.

recharts는 클라이언트 컴포넌트에서만 사용 가능. 데이터는 Server Component(RSC)에서 가져와 props로 전달.

---

## 영향 범위 분석

### 영향 파일 목록

| 파일 | 변경 유형 | 영향 내용 |
|---|---|---|
| `prisma/schema.prisma` | 수정 | `Project`에 `budget Int?` 추가 |
| `app/(dashboard)/analytics/page.tsx` | 신규 | 통계 RSC — 데이터 집계 후 차트 컴포넌트로 전달 |
| `app/(dashboard)/analytics/completion-chart.tsx` | 신규 | 월별 완료 바 차트 (Client) |
| `app/(dashboard)/analytics/revision-source-chart.tsx` | 신규 | 수정 출처 파이 차트 (Client) |
| `app/(dashboard)/analytics/inquiry-trend-chart.tsx` | 신규 | 의뢰 추이 선 그래프 (Client) |
| `app/(dashboard)/analytics/team-workload-table.tsx` | 신규 | 팀 워크로드 표 (Client 또는 Server) |
| `app/(dashboard)/analytics/period-selector.tsx` | 신규 | 기간 선택 UI (Client) |
| `components/ui/chart.tsx` | 신규 (shadcn) | recharts 래퍼 |
| `components/sidebar-nav.tsx` | 수정 | "통계" 메뉴 항목 추가 |
| `app/(dashboard)/projects/create-project-form.tsx` | 수정 | 예산 입력 필드 추가 |
| `app/(dashboard)/projects/[id]/page.tsx` | 수정 | 프로젝트 상세 헤더에 예산 표시/편집 |
| `lib/actions/project.ts` | 수정 | `createProject`, `updateProjectBudget` |

---

## 기술 선택 조사

### recharts 설치

```bash
npm install recharts
npx shadcn@latest add chart
```

shadcn/ui Chart 컴포넌트는 `recharts` 위에 `ChartContainer`, `ChartTooltip` 등 래퍼를 제공한다.

### 기간 필터 구현

`/analytics?period=this-month` (기본) | `3months` | `6months` | `this-year`

RSC에서 `searchParams.period`를 읽어 날짜 범위 계산:

```ts
function getPeriodRange(period: string): { from: Date; to: Date } {
  const now = new Date();
  switch (period) {
    case '3months': return { from: subMonths(now, 3), to: now };
    case '6months': return { from: subMonths(now, 6), to: now };
    case 'this-year': return { from: startOfYear(now), to: now };
    default: return { from: startOfMonth(now), to: endOfMonth(now) };
  }
}
```

`date-fns` 라이브러리가 이미 설치되어 있는지 확인 필요. 없으면 직접 계산.

### 월별 집계

Prisma에서 월별 그룹핑은 raw query나 메모리 집계로 처리:

```ts
// 메모리 집계 방식 (단순)
const projects = await prisma.project.findMany({
  where: { workspaceId, createdAt: { gte: from, lte: to } },
  include: { stages: { include: { stage: true } } },
});
const byMonth = groupBy(projects, p => format(p.createdAt, 'yyyy-MM'));
```

---

## 엣지 케이스 및 한계

- **`isProjectDone` 메모리 계산**: Prisma include로 `currentStage` 포함 조회 후 메모리 필터. 프로젝트 수 1,000건 이하에서는 성능 문제 없음. 대규모 데이터 시 DB 레벨 집계 필요(범위 외).
- **예산 미입력 프로젝트**: 예상 수익 카드에서 `budget === null`인 프로젝트 제외 + 제외 건수 표시(FR-513).
- **팀원 없는 프로젝트(담당자 미지정)**: `assigneeId === null` 행을 별도로 집계하여 "미지정" 행으로 표시(FR-509).
- **recharts SSR**: recharts 컴포넌트는 `'use client'` 마킹 필수. RSC에서 직접 렌더링하면 에러 발생.

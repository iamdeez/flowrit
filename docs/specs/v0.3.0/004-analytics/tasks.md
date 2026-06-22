# Tasks: analytics

## 목차

- [전제 조건](#전제-조건)
- [태스크 목록](#태스크-목록)
- [구현 완료 기준](#구현-완료-기준)

---

## 전제 조건

- [x] spec.md의 모든 `[NEEDS CLARIFICATION]` 항목이 해소되었는가?
- [x] plan.md의 Constitution Gates가 모두 통과(또는 예외 기재)되었는가?
- [x] CHANGES.md에서 이전 작업의 "후속 작업 시 주의사항"을 확인했는가?

---

## 태스크 목록

### Phase 1. 의존성 설치 및 스키마

- [x] **T001** — recharts + shadcn/ui Chart 컴포넌트 설치
  - 구현 파일: `package.json`, `components/ui/chart.tsx`
  - 상세:
    - `npm install recharts`
    - `npx shadcn@latest add chart` (또는 수동 생성)
    - `components/ui/chart.tsx` 존재 확인
  - 완료 기준: `import { BarChart } from 'recharts'` 타입 오류 없음

- [x] **T002** `[P]` — `Project.budget` 필드 추가 + 마이그레이션
  - 구현 파일: `prisma/schema.prisma`
  - 관련 요구사항: `FR-511`
  - 상세: `budget Int?` 필드 추가 → `npx prisma migrate dev --name add-project-budget`
  - 완료 기준: 마이그레이션 성공, `budget` 컬럼 생성

### Phase 2. 데이터 레이어

- [x] **T003** — 기간 계산 유틸리티 + `isProjectDone` 확인 (T002 완료 후)
  - 구현 파일: `lib/utils/analytics.ts` (신규) 또는 `app/(dashboard)/analytics/page.tsx` 인라인
  - 관련 요구사항: `FR-501`, `FR-502`
  - 상세:
    - `getPeriodRange(period: string): { from: Date; to: Date }` 구현
    - `groupByMonth<T>(items: T[]): Record<string, T[]>` 구현
    - `lib/project-utils.ts`의 `isProjectDone` 함수 확인 + import 방식 결정
  - 완료 기준: 유틸리티 함수 타입 오류 없음

- [x] **T004** `[P]` — `Project.budget` Server Action 추가 (T002 완료 후)
  - 구현 파일: `lib/actions/project.ts`
  - 관련 요구사항: `FR-511`, `FR-512`
  - 상세:
    - `createProject`에 `budget` 파라미터 추가
    - `updateBudget(projectId, budget)` 신규 Server Action
    - `requireWorkspaceId()` + `prisma.project.update({ budget })`
  - 완료 기준: 프로젝트 생성 시 budget 저장, 상세 페이지 업데이트 동작

### Phase 3. 통계 페이지 RSC

- [x] **T005** — `app/(dashboard)/analytics/page.tsx` 신규 (T003 완료 후)
  - 구현 파일: `app/(dashboard)/analytics/page.tsx`
  - 관련 요구사항: `FR-501`~`FR-513`
  - 상세:
    - RSC: `auth()` + `searchParams.period` 파싱
    - 쿼리 1: 전체 프로젝트(stages, revisions 포함) — archivedAt: null
    - 쿼리 2: 기간 내 수정 요청
    - 쿼리 3: 최근 6개월 의뢰 조회
    - 쿼리 4: 워크스페이스 멤버 + assignedProjects 집계
    - `isProjectDone()` 메모리 필터로 완료 프로젝트 분류
    - 각 차트 컴포넌트에 데이터 props 전달
    - Suspense 래핑
  - 완료 기준: 페이지 로딩 후 요약 카드 + 차트 렌더링

### Phase 4. 차트 클라이언트 컴포넌트

- [x] **T006** — `completion-chart.tsx` 신규 — 월별 완료 바 차트 (T001, T005 완료 후)
  - 구현 파일: `app/(dashboard)/analytics/completion-chart.tsx`
  - 관련 요구사항: `FR-503`, `FR-504`
  - 상세:
    - `'use client'` + recharts `BarChart`
    - props: `{ month: string; completed: number; created: number }[]`
    - shadcn/ui ChartContainer 래핑
  - 완료 기준: 바 차트 렌더링, 생성 vs 완료 2개 계열 표시

- [x] **T007** `[P]` — `revision-source-chart.tsx` 신규 — 수정 출처 파이 차트
  - 구현 파일: `app/(dashboard)/analytics/revision-source-chart.tsx`
  - 관련 요구사항: `FR-506`
  - 상세:
    - `'use client'` + recharts `PieChart`
    - props: `{ MANUAL: number; PORTAL: number }`
  - 완료 기준: 파이 차트에 MANUAL/PORTAL 비율 렌더링

- [x] **T008** `[P]` — `inquiry-trend-chart.tsx` 신규 — 의뢰 추이 선 그래프
  - 구현 파일: `app/(dashboard)/analytics/inquiry-trend-chart.tsx`
  - 관련 요구사항: `FR-510`
  - 상세:
    - `'use client'` + recharts `LineChart`
    - props: `{ month: string; count: number }[]`
  - 완료 기준: 최근 6개월 의뢰 추이 선 그래프 렌더링

- [x] **T009** `[P]` — `team-workload-table.tsx` 신규 — 팀 워크로드 표
  - 구현 파일: `app/(dashboard)/analytics/team-workload-table.tsx`
  - 관련 요구사항: `FR-508`, `FR-509`
  - 상세:
    - shadcn/ui `Table`
    - props: `{ name: string; activeProjects: number; pendingRevisions: number }[]`
    - "미지정" 행 포함
  - 완료 기준: 팀원별 데이터 행 렌더링, 미지정 행 표시

- [x] **T010** `[P]` — `period-selector.tsx` 신규 — 기간 선택
  - 구현 파일: `app/(dashboard)/analytics/period-selector.tsx`
  - 관련 요구사항: `FR-501`
  - 상세:
    - `'use client'` + shadcn/ui `Tabs` 또는 `Select`
    - 클릭 시 `router.push(`/analytics?period=${value}`)` 실행
    - 현재 period 강조
  - 완료 기준: 기간 변경 시 페이지 재로딩 및 데이터 갱신

### Phase 5. 기존 화면 수정

- [x] **T011** — 사이드바에 "통계" 메뉴 추가 (T005 완료 후)
  - 구현 파일: `components/sidebar-nav.tsx`
  - 관련 요구사항: `FR-501`
  - 상세: `{ href: '/analytics', label: '통계', icon: BarChart2 }` 항목 추가
  - 완료 기준: 사이드바에 "통계" 링크 표시

- [x] **T012** `[P]` — 프로젝트 생성 폼 + 상세 페이지 예산 필드 추가 (T004 완료 후)
  - 구현 파일: `app/(dashboard)/projects/` 관련 파일, `app/(dashboard)/projects/[id]/page.tsx`
  - 관련 요구사항: `FR-512`
  - 상세:
    - 프로젝트 생성 폼: 예산 숫자 input (선택)
    - 상세 헤더: 예산 표시 + 인라인 편집 (`updateBudget` 호출)
  - 완료 기준: 생성 시 budget 저장, 상세에서 수정 가능

### Phase 6. 테스트 검증

- [x] **T013** — SC-501~SC-506 수동 E2E 검증
  - plan.md 테스트 전략 표 기준으로 시나리오 순서대로 검증
  - 완료 기준: 전체 SC 통과 확인

---

## 구현 완료 기준

- [x] 모든 태스크 체크박스가 완료 처리되었다.
- [x] `/analytics` 페이지가 정상 로딩되고 차트 4종이 모두 렌더링된다.
- [x] 기간 필터 변경 시 데이터가 갱신된다.
- [x] 프로젝트 생성·상세에서 예산 입력·저장이 가능하다.
- [x] recharts 컴포넌트가 SSR 에러 없이 Client 컴포넌트로 동작한다.
- [ ] `git status`에 의도치 않은 파일이 없다.

# Tasks: UX Shell Improvements

> Branch: 001-ux-shell-improvements | Date: 2026-06-22 | Plan: [plan.md](./plan.md)

## 목차

- [전제 조건](#전제-조건)
- [태스크 목록](#태스크-목록)
- [구현 완료 기준](#구현-완료-기준)

## 전제 조건

- [x] spec.md의 모든 `[NEEDS CLARIFICATION]` 항목이 해소되었는가?
- [x] plan.md의 Constitution Gates가 모두 통과(또는 예외 기재)되었는가?
- [ ] CHANGES.md에서 이전 작업의 "후속 작업 시 주의사항"을 확인했는가?
  - v0.3.0 CHANGES.md 확인: `lib/auth.ts`에 `workspaceId` credential 추가됨. `signIn` 시 `workspaceId` 전달이 필요한 경우 주의. 본 스펙은 signOut만 사용하므로 영향 없음.

## 태스크 목록

### Phase 1. 기반 작업

- [x] **T001** — 로그아웃 Server Action 생성
  - 구현 파일: `lib/actions/auth.ts` (신규)
  - 관련 요구사항: `FR-002`
  - 상세: `'use server'` 선언, `signOut({ redirectTo: '/login' })`을 호출하는 `logout()` 함수 export
  - 완료 기준: 파일이 생성되고 `logout` 함수가 export됨

### Phase 2. 글로벌 셸 개선

- [x] **T002** — layout.tsx: 워크스페이스 이름 조회 및 헤더 개선
  - 구현 파일: `app/(dashboard)/layout.tsx`
  - 관련 요구사항: `FR-001`, `FR-003`
  - 상세:
    1. `prisma.notification.count`와 `prisma.workspace.findUnique` 를 `Promise.all`로 병렬 실행
    2. 헤더 고정 바를 `justify-between`으로 변경, 왼쪽에 `workspace?.name` 텍스트 추가
    3. `SidebarNav`에 `userName={session?.user?.name ?? ''}` prop 전달
    4. 사이드바 브랜드 블록의 "나의 작업실"을 `workspace?.name ?? '나의 작업실'`로 교체
  - 완료 기준: 헤더에 워크스페이스 이름이 표시되고, SidebarNav가 userName prop을 수신함

- [x] **T003** — SidebarNav: 사용자 패널 및 로그아웃 버튼 추가
  - 구현 파일: `components/sidebar-nav.tsx`
  - 관련 요구사항: `FR-001`, `FR-002`
  - 상세:
    1. `SidebarNavProps = { userName: string }` 타입 추가
    2. `logout` 액션 import
    3. `LogOut` 아이콘 import (lucide-react)
    4. nav 하단에 `mt-auto pt-3 border-t border-gray-100` 패널 추가
    5. 이니셜 아바타 (h-7 w-7, rounded-full, bg-indigo-50, text-indigo-700), 사용자 이름, 로그아웃 `<form action={logout}>` 버튼 렌더링
    6. 이니셜 계산: `userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()`, 빈 문자열일 때 `'?'` fallback
  - 완료 기준: 사이드바 하단에 아바타·이름·로그아웃 버튼이 표시되고, 로그아웃 클릭 시 `/login`으로 이동함

### Phase 3. 대시보드 KPI 확장

- [x] **T004** — 대시보드: openRevisionCount 쿼리 추가 및 KPI 카드 4개 확장
  - 구현 파일: `app/(dashboard)/dashboard/page.tsx`
  - 관련 요구사항: `FR-004`
  - 상세:
    1. `getDashboardData`의 `Promise.all` 배열에 `prisma.revisionRequest.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] }, project: { workspaceId, archivedAt: null } } })` 추가
    2. 반환값에 `openRevisionCount` 추가
    3. KPI 그리드를 `grid-cols-2 gap-4 sm:grid-cols-4`로 변경
    4. 기존 2개 카드 유지, 신규 2개 카드 추가:
       - "미완료 수정 요청": `openRevisionCount`건, `openRevisionCount > 0`이면 `text-orange-600`
       - "신규 접수": `inquiries.length`건, `inquiries.length > 0`이면 `text-indigo-600`
  - 완료 기준: 대시보드 현황에 4개 카드가 표시되고, 각 수치가 정확히 반영됨

### Phase 4. Empty State CTA 추가

- [x] **T005** `[P]` — 프로젝트 목록 빈 상태 CTA
  - 구현 파일: `app/(dashboard)/projects/page.tsx`
  - 관련 요구사항: `FR-005`
  - 상세:
    - `projects.length === 0`이고 `!q && !isArchivedFilter` 조건에서 (검색 없는 전체 빈 상태) 기존 아이콘+텍스트 아래에 `/projects/new` Link 버튼 추가
    - 검색 결과 없음 케이스(`q` 있을 때)에는 CTA 추가하지 않음
    - 스타일: `mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700`
  - 완료 기준: 프로젝트 없을 때(검색어 없는 상태) "새 프로젝트" 버튼이 빈 상태 내에 표시됨

- [x] **T006** `[P]` — 고객 목록 빈 상태 CTA
  - 구현 파일: `app/(dashboard)/customers/page.tsx`
  - 관련 요구사항: `FR-006`
  - 상세:
    - `customers.length === 0 && !query` 조건의 빈 상태 아래에 `/customers/new` Link 버튼 추가
    - 검색 결과 없음 케이스에는 CTA 추가하지 않음
    - 스타일: 동일 패턴 (indigo CTA 버튼)
  - 완료 기준: 고객 없을 때(검색어 없는 상태) "고객 등록" 버튼이 빈 상태 내에 표시됨

- [x] **T007** `[P]` — 수정 요청 빈 상태 개선
  - 구현 파일: `app/(dashboard)/revisions/page.tsx`
  - 관련 요구사항: `FR-007`
  - 상세:
    - 기존 설명 문구("프로젝트 상세에서 등록한 미완료 요청이 이곳에 표시됩니다.") 아래에 `/projects` 링크 추가
    - 스타일: `mt-4 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50`
    - 텍스트: "프로젝트 목록 보기" + ArrowUpRight 아이콘
  - 완료 기준: 수정 요청 없을 때 빈 상태에 프로젝트 목록 링크가 표시됨

## 구현 완료 기준

- [x] 모든 태스크(T001~T007) 체크박스가 완료 처리되었다.
- [x] `npm run typecheck`가 에러 없이 통과한다.
- [x] `npm run build`가 에러 없이 완료된다.
- [x] `git status`에 의도치 않은 파일이 없다.
- [x] 로컬 브라우저에서 SC-001~SC-007을 직접 확인했다.

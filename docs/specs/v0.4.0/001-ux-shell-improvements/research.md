# Research: UX Shell Improvements

## 기존 코드베이스 분석

### 글로벌 셸 구조

대시보드 레이아웃(`app/(dashboard)/layout.tsx`)이 셸 전체를 담당한다.

```
<div class="flex h-screen bg-gray-50">
  <aside w-60>           ← SidebarNav 컴포넌트 + 브랜드 헤더
  <main flex-1>
    <div sticky top h-14> ← 헤더 바 (현재: NotificationBell만)
    {children}
  </main>
</div>
```

- **SidebarNav** (`components/sidebar-nav.tsx`): `'use client'` Client Component. 현재 9개 nav 항목만 렌더링. 사용자 정보·로그아웃 없음.
- 레이아웃은 `auth()`로 session을 조회하나, `workspaceId`와 `userId`만 사용함. `user.name`도 session에 포함되어 있어 추가 DB 조회 없이 사이드바에 바로 전달 가능.
- 워크스페이스 이름(`workspace.name`)은 session에 포함되지 않으므로 레이아웃에서 `prisma.workspace.findUnique({ where: { id: session.user.workspaceId } })` 추가 조회가 필요하다.

### 인증: signOut

`lib/auth.ts`에서 `signOut`이 export됨:
```ts
export const { handlers, signIn, signOut, auth } = NextAuth({ ... })
```

Next.js App Router에서 서버 액션으로 로그아웃을 구현하는 패턴:
```ts
// app/(dashboard)/actions/auth.ts (신규)
'use server'
import { signOut } from '@/lib/auth'
export async function logout() {
  await signOut({ redirectTo: '/login' })
}
```

`<form action={logout}><button>로그아웃</button></form>` 패턴으로 JS 없이도 동작.

### 대시보드 데이터 흐름

`getDashboardData(workspaceId)`에서 현재 Promise.all로 6개 쿼리 병렬 실행:
1. `inquiry.findMany` (PENDING)
2. `project.findMany` (전체 active)
3. `project.findMany` (마감임박)
4. `revisionRequest.findMany` (OPEN|IN_PROGRESS, take:10)
5. `customer.findMany`
6. `workflowTemplate.findMany`

반환값: `{ inquiries, activeUrgentProjects, openRevisions, customers, templates, activeCount, urgentCount }`

**SC-004 구현을 위한 추가 데이터**:
- `openRevisionCount`: `revisionRequest.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] }, project: { workspaceId, archivedAt: null } } })`
- `pendingInquiryCount`: `inquiry.count({ where: { workspaceId, status: 'PENDING' } })`

기존 `openRevisions`는 take:10으로 제한된 목록이므로 실제 총 건수는 별도 `.count()` 쿼리가 필요하다.
단, `inquiries` 배열은 이미 전체를 가져오므로 `inquiries.length`로 건수 산출 가능 → 별도 카운트 쿼리 불필요.
`openRevisionCount`만 추가 쿼리 필요.

### Empty State 패턴 현황

| 페이지 | 빈 상태 위치 | CTA 존재 |
|---|---|---|
| `projects/page.tsx` | `<section>` 내 EmptyPanel 인라인 | 없음 |
| `customers/page.tsx` | `<div>` 내 인라인 | 없음 |
| `revisions/page.tsx` | `<div>` 내 인라인 | 없음 |
| `projects/[id]/page.tsx` | `EmptyPanel` 컴포넌트 (탭별) | 없음 |

`projects/page.tsx`의 빈 상태는 검색 결과 없음과 전체 없음 두 케이스가 분기됨. CTA는 "전체 없음" 케이스에만 추가해야 한다.

### 영향 파일 목록

| 파일 | 변경 유형 | 변경 내용 |
|---|---|---|
| `app/(dashboard)/layout.tsx` | 수정 | workspace 이름 조회 추가, 헤더에 workspace 이름 표시, SidebarNav에 사용자 정보 prop 전달 |
| `components/sidebar-nav.tsx` | 수정 | 사용자 이름·아바타·로그아웃 UI 추가, props 수신 |
| `app/(dashboard)/dashboard/page.tsx` | 수정 | openRevisionCount 쿼리 추가, KPI 카드 4개로 확장 |
| `app/(dashboard)/projects/page.tsx` | 수정 | 빈 상태에 "새 프로젝트" CTA 버튼 추가 |
| `app/(dashboard)/customers/page.tsx` | 수정 | 빈 상태에 "고객 등록" CTA 버튼 추가 |
| `app/(dashboard)/revisions/page.tsx` | 수정 | 빈 상태 개선 (프로젝트 목록 링크 추가) |
| `lib/actions/auth.ts` (신규) | 신규 | `logout()` Server Action |

### 엣지 케이스 및 한계

- **SidebarNav는 Client Component**: `session.user.name`을 prop으로 받아야 하며, 서버에서 직접 auth()를 호출할 수 없다. layout.tsx(Server Component)에서 prop을 전달하는 패턴을 사용한다.
- **로그아웃 Server Action**: `signOut`은 내부적으로 `redirect()`를 호출하므로 try/catch로 감싸지 않는다.
- **워크스페이스 이름 헤더**: layout.tsx의 헤더 바는 Server Component로 유지하며, workspace 이름을 직접 렌더링한다. 별도 Client Component 분리 불필요.
- **대시보드 KPI 그리드**: 현재 `grid-cols-2`이므로 카드 4개는 `sm:grid-cols-4`(4열) 또는 `grid-cols-2`(2×2)로 배치. DESIGN.md 원칙(compact)을 고려하면 `grid-cols-2 sm:grid-cols-4` 패턴이 적절하다.

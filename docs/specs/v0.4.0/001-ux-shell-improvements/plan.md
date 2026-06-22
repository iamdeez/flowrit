# Plan: UX Shell Improvements

> Branch: 001-ux-shell-improvements | Date: 2026-06-22 | Spec: [spec.md](./spec.md)

## 목차

- [사전 검증 (Constitution Gates)](#사전-검증-constitution-gates)
- [기술 컨텍스트](#기술-컨텍스트)
- [사전 영향도 분석 결과](#사전-영향도-분석-결과)
- [핵심 설계](#핵심-설계)
- [인터페이스 계약](#인터페이스-계약)
- [테스트 전략](#테스트-전략)
- [기타 고려사항](#기타-고려사항)

## 사전 검증 (Constitution Gates)

> constitution.md 없음 → 기본 4개 조항 사용.

- [x] **성능 원칙**: 워크스페이스 이름 조회 1건이 추가되나, 이미 `auth()` 호출이 있는 layout.tsx에 병렬 추가(Promise.all)하므로 추가 왕복이 최소화된다. KPI 카드 추가 쿼리 1건(`revisionRequest.count`)도 기존 Promise.all에 합류. 성능 저하 요인 없음.
- [x] **호환성 원칙**: SidebarNav에 props 추가는 기존 렌더링에 영향 없는 additive 변경. 기존 API·Server Actions 미수정.
- [x] **테스트 원칙**: 모든 FR-XXX에 SC-XXX가 정의됨.
- [x] **스펙 범위 원칙**: 변경이 spec.md 내 FR-001~FR-007 범위 내에 있음.

## 기술 컨텍스트

- **언어 / 런타임**: TypeScript, Next.js 16.2.9 (App Router, Turbopack)
- **주요 의존성**: NextAuth.js (auth, signOut), Prisma (DB), Tailwind CSS, Lucide React
- **렌더링 패턴**: layout.tsx = Server Component, SidebarNav = Client Component

## 사전 영향도 분석 결과

### 영향 파일 목록

| 파일 | 변경 유형 | 영향 내용 |
|---|---|---|
| `app/(dashboard)/layout.tsx` | 수정 | workspace 이름 조회 + 헤더에 이름 표시 + SidebarNav에 userName prop 전달 |
| `components/sidebar-nav.tsx` | 수정 | `userName` prop 수신, 사용자 패널(아바타·이름·로그아웃) 렌더링 추가 |
| `app/(dashboard)/dashboard/page.tsx` | 수정 | `openRevisionCount` 쿼리 추가, KPI 카드 4개로 변경 |
| `app/(dashboard)/projects/page.tsx` | 수정 | 빈 상태(전체 없음 케이스)에 CTA 버튼 추가 |
| `app/(dashboard)/customers/page.tsx` | 수정 | 빈 상태에 CTA 버튼 추가 |
| `app/(dashboard)/revisions/page.tsx` | 수정 | 빈 상태에 프로젝트 목록 링크 추가 |
| `lib/actions/auth.ts` | 신규 | `logout()` Server Action |

## 핵심 설계

### 1. 로그아웃 Server Action (신규 파일)

```ts
// lib/actions/auth.ts
'use server'
import { signOut } from '@/lib/auth'

export async function logout() {
  await signOut({ redirectTo: '/login' })
}
```

### 2. layout.tsx — 워크스페이스 이름 조회 + 헤더 개선

```tsx
// app/(dashboard)/layout.tsx
export default async function DashboardLayout({ children }) {
  const session = await auth()
  const [unreadCount, workspace] = await Promise.all([
    session?.user?.id
      ? prisma.notification.count({ where: { userId: session.user.id, isRead: false } })
      : Promise.resolve(0),
    session?.user?.workspaceId
      ? prisma.workspace.findUnique({
          where: { id: session.user.workspaceId },
          select: { name: true },
        })
      : Promise.resolve(null),
  ])

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-60 shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-200">
          <p className="text-lg font-bold text-indigo-600">Flowrit</p>
          <p className="text-xs text-gray-400 mt-0.5">{workspace?.name ?? '나의 작업실'}</p>
        </div>
        <SidebarNav userName={session?.user?.name ?? ''} />
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-gray-200 bg-gray-50/95 px-8 backdrop-blur">
          <p className="text-sm font-medium text-gray-600">{workspace?.name}</p>
          {session?.user?.id && (
            <NotificationBell userId={session.user.id} initialUnreadCount={unreadCount} />
          )}
        </div>
        {children}
      </main>
    </div>
  )
}
```

### 3. SidebarNav — 사용자 패널 하단 추가

```tsx
// components/sidebar-nav.tsx
'use client'
import { logout } from '@/lib/actions/auth'
import { LogOut } from 'lucide-react'

type SidebarNavProps = { userName: string }

export function SidebarNav({ userName }: SidebarNavProps) {
  const initials = userName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
      {/* 기존 navItems 렌더링 */}
      ...

      {/* 사용자 패널 — 하단 고정 */}
      <div className="mt-auto pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700">
            {initials || '?'}
          </div>
          <span className="flex-1 truncate text-sm font-medium text-gray-700">{userName}</span>
          <form action={logout}>
            <button
              type="submit"
              title="로그아웃"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </nav>
  )
}
```

### 4. 대시보드 KPI 카드 확장

`getDashboardData`에 `openRevisionCount` 쿼리 추가:

```ts
const [inquiries, allProjects, urgentCandidates, openRevisions, customers, templates, openRevisionCount] =
  await Promise.all([
    /* 기존 6개 */,
    prisma.revisionRequest.count({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        project: { workspaceId, archivedAt: null },
      },
    }),
  ])
```

KPI 카드를 `grid-cols-2 sm:grid-cols-4` 그리드로 변경:

```tsx
<section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
  {/* 진행 중 */}
  {/* 마감 임박 */}
  {/* 미완료 수정 요청 */}
  {/* 신규 접수 */}
</section>
```

### 5. Empty State CTA 패턴

3개 페이지 공통으로 빈 상태의 `<p>` 설명 아래에 인라인 버튼을 추가:

```tsx
<Link
  href="/projects/new"
  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
>
  <Plus className="h-4 w-4" />
  새 프로젝트
</Link>
```

## 인터페이스 계약

- `SidebarNav`에 `userName: string` prop이 추가된다. 기존 사용처는 `app/(dashboard)/layout.tsx` 하나뿐이며 동시에 수정하므로 Breaking 없음.
- `logout()` Server Action은 신규이며 기존 코드와 충돌 없음.
- `getDashboardData` 반환 타입에 `openRevisionCount: number`가 추가된다. 이 함수는 같은 파일 내에서만 사용되므로 외부 영향 없음.

## 테스트 전략

| SC 식별자 | 테스트 유형 | 시나리오 요약 | 입력 | 기대 결과 |
|---|---|---|---|---|
| SC-001 | 시각적 검증 | 사이드바 하단 아바타·이름 표시 | 로그인 상태로 페이지 접근 | 이니셜 2자 아바타 + 사용자 이름 표시 |
| SC-002 | 기능 검증 | 로그아웃 버튼 동작 | 로그아웃 버튼 클릭 | 세션 종료 후 `/login` 리다이렉트 |
| SC-003 | 시각적 검증 | 헤더 워크스페이스 이름 표시 | 로그인 상태로 페이지 접근 | 워크스페이스 이름 헤더 왼쪽에 표시 |
| SC-004 | 시각적 검증 | KPI 카드 4개 렌더링 | 대시보드 접근 | 진행 중·마감 임박·미완료 수정·신규 접수 카드 4개 표시 |
| SC-005 | 기능 검증 | 프로젝트 빈 상태 CTA | 프로젝트 없는 워크스페이스 | 빈 상태 패널에 "새 프로젝트" 버튼 렌더링, 클릭 시 /projects/new 이동 |
| SC-006 | 기능 검증 | 고객 빈 상태 CTA | 고객 없는 워크스페이스 | 빈 상태 패널에 "고객 등록" 버튼 렌더링, 클릭 시 /customers/new 이동 |
| SC-007 | 시각적 검증 | 수정 요청 빈 상태 개선 | 미완료 수정 없는 워크스페이스 | 빈 상태에 /projects 링크 표시 |

## 기타 고려사항

- **이니셜 계산**: `userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()`. 한글 이름은 split(' ')으로 분리 시 1~2자리가 나오므로 `.slice(0, 2)`로 커버. 빈 문자열일 때 `'?'` fallback.
- **워크스페이스 이름 fallback**: DB 조회 실패(workspaceId 없음) 시 사이드바는 기존과 동일하게 "나의 작업실" 표시. 헤더는 이름 미표시(null).
- **프로젝트 빈 상태 분기**: 검색 결과 없음(`query` 있을 때)에는 CTA 버튼을 추가하지 않는다. "전체 없음"(`!query` 상태)에만 추가.

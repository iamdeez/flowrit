# Plan: 003-mobile-responsive-improvement

> Branch: 003-mobile-responsive-improvement | Date: 2026-06-25 | Spec: [spec.md](./spec.md)

## 목차

- [사전 검증 (Constitution Gates)](#사전-검증-constitution-gates)
- [기술 컨텍스트](#기술-컨텍스트)
- [사전 영향도 분석 결과](#사전-영향도-분석-결과)
- [핵심 설계](#핵심-설계)
- [인터페이스 계약](#인터페이스-계약)
- [테스트 전략](#테스트-전략)

---

## 사전 검증 (Constitution Gates)

> 아래 항목을 확인한 후 plan 작성을 시작한다.

- [x] **P-001 (워크스페이스 데이터 격리)**: DB 쿼리 없음. CSS·클래스명·레이아웃 변경만 포함.
- [x] **P-002 (RBAC 역할 경계)**: 역할 기반 접근 제어 변경 없음. UI 레이아웃 수정만.
- [x] **P-003 (NextAuth JWT 세션)**: 인증 상태 변경 없음.
- [x] **P-004 (Next.js 버전 준수)**: `usePathname`은 `next/navigation`의 App Router 표준 훅. `'use client'` 올바르게 사용. deprecated API 미사용.
- [x] **P-005 (파일 업로드 크기)**: 파일 업로드 관련 없음.
- [x] **P-006 (테스트 원칙)**: 신규 Server Action 없음. 기존 Playwright E2E 34개 회귀 없음을 목표로 하며, TypeScript 검증(`npx tsc --noEmit`, SC-020)으로 정적 검사 대체.

**예외 사항**:
- **P-006**: 이 스펙은 순수 UI/CSS 변경으로 신규 Server Action이나 비즈니스 로직을 추가하지 않는다. Vitest 단위 테스트 대신 `npx tsc --noEmit`(SC-020) 통과로 코드 정합성을 검증하며, constitution 조항의 "핵심 비즈니스 로직" 범위에 해당하지 않는 것으로 판단한다.

---

## 기술 컨텍스트

- **언어 / 런타임**: TypeScript 5 / Next.js 16.2.9 App Router / React 19
- **스타일링**: Tailwind CSS v4 — 유틸리티 클래스만 사용, 신규 패키지 없음 (NFR-003)
- **주요 의존성**: `next/navigation` (`usePathname`), Lucide React(아이콘)
- **Tailwind 브레이크포인트**: sm 640px / md 768px / lg 1024px / xl 1280px
- **기존 CSS 설계 패턴**:
  - `.flowrit-page`: 반응형 패딩 (모바일 16px / 데스크탑 32px)
  - `.flowrit-page-header`: `flex; justify-content: space-between` → 모바일 `flex-direction: column; align-items: stretch` (`@media max-width: 767px`)
  - `.flowrit-page-title`, `.flowrit-page-description`: 제목·설명 Typography 클래스
- **레이아웃 구조**: `app/(dashboard)/layout.tsx` — sticky top bar(h-14) + 스크롤 컨테이너(`pb-[calc(56px+...)]`) + MobileTabBar

---

## 사전 영향도 분석 결과

### 영향 파일 목록

| 파일 | 변경 유형 | 내용 |
|---|---|---|
| `components/mobile-page-title.tsx` | **신규** | usePathname 기반 페이지명 렌더링 클라이언트 컴포넌트 (FR-011) |
| `app/(dashboard)/layout.tsx` | 수정 | 모바일 상단 바 — Flowrit 로고 블록 → MobilePageTitle (FR-011) |
| `app/(dashboard)/projects/[id]/page.tsx` | 수정 | 탭 내비·헤더·정보 카드 모바일 레이아웃 (FR-001, FR-002, FR-003) |
| `app/(dashboard)/dashboard/page.tsx` | 수정 | xl: → lg: 브레이크포인트 6곳 (FR-004) |
| `app/(dashboard)/analytics/team-workload-table.tsx` | 수정 | overflow-x-auto 래퍼 추가 (FR-005) |
| `app/(dashboard)/messages/page.tsx` | 수정 | flowrit-page 클래스 적용 (FR-007) |
| `app/(dashboard)/messages/messages-page-client.tsx` | 수정 | 모바일 폼 우선 배치 (FR-006) |
| `app/(dashboard)/team/page.tsx` | 수정 | flowrit-page-header 클래스·멤버 행 버튼 줄바꿈 (FR-008, FR-009) |
| `app/(dashboard)/revisions/page.tsx` | 수정 | 설명 텍스트 hidden md:block 제거 (FR-010) |
| `app/(dashboard)/customers/page.tsx` | 수정 | 설명 텍스트 hidden md:block 제거 (FR-010) |
| 주요 CTA 포함 페이지들 | 수정 | 터치 타겟 min-h-9 보장 (FR-012) |

---

## 핵심 설계

### FR-011: 모바일 상단 바 페이지명 표시

**문제**: `app/(dashboard)/layout.tsx`는 서버 컴포넌트이므로 `usePathname()`을 직접 사용할 수 없다.

**해결**: `components/mobile-page-title.tsx` 신규 클라이언트 컴포넌트를 생성한다.

```tsx
// components/mobile-page-title.tsx
'use client'
import { usePathname } from 'next/navigation'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':   '대시보드',
  '/projects':    '프로젝트',
  '/revisions':   '수정 요청',
  '/customers':   '고객',
  '/messages':    '메시지',
  '/analytics':   '성과 분석',
  '/team':        '팀',
  '/settings':    '설정',
  '/billing':     '빌링',
  '/notifications': '알림',
}

export function MobilePageTitle() {
  const pathname = usePathname()
  const title =
    PAGE_TITLES[pathname] ??
    Object.entries(PAGE_TITLES).find(([key]) => pathname.startsWith(key + '/'))?.[1] ??
    'Flowrit'
  return (
    <span className="text-[15px] font-semibold text-[var(--flowrit-text)]">{title}</span>
  )
}
```

`layout.tsx`의 `md:hidden` 영역(현재 Flowrit 로고 블록)을 `<MobilePageTitle />`로 교체한다.
데스크탑용 `hidden md:block` 워크스페이스명은 변경하지 않는다.

**동적 경로 처리**: `/projects/abc123`처럼 알 수 없는 경로는 `/projects` prefix로 매칭 →
"프로젝트" 표시. 프로젝트명은 이미 페이지 콘텐츠에 표시되어 중복이 아니다.

---

### FR-001: 프로젝트 상세 탭 — 가로 스크롤

```tsx
// 변경 전
<div className="mb-5 grid gap-2 border-b border-gray-200 md:grid-cols-4">
// 변경 후
<div className="mb-5 flex overflow-x-auto border-b border-gray-200 [&::-webkit-scrollbar]:hidden">
```

각 탭 아이템에 `flex-shrink-0`을 추가하여 탭이 압축되지 않도록 한다.

---

### FR-002: 프로젝트 상세 헤더 — 버튼 줄바꿈

```tsx
// 변경 전
<div className="mb-5 flex items-start justify-between gap-4">
// 변경 후
<div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
```

---

### FR-003: 프로젝트 상세 정보 카드 — sm: 2열

```tsx
// 변경 전
<div className="mb-6 grid gap-3 md:grid-cols-3">
// 변경 후
<div className="mb-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3">

// 첫 번째 카드(고객 공유 링크)
<div className="... sm:col-span-2 md:col-span-1">
```

---

### FR-004: 대시보드 — xl: → lg: 브레이크포인트

6곳의 `xl:` 접두사를 `lg:`로 교체. 1024px 이상 기기에서 2열·4열 레이아웃 활성화.

| 위치 | 변경 전 | 변경 후 |
|---|---|---|
| line 447 | `xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.85fr)]` | `lg:grid-cols-[...]` |
| line 696 | `md:grid-cols-2 xl:grid-cols-4` | `md:grid-cols-2 lg:grid-cols-4` |
| line 726 | `xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]` | `lg:grid-cols-[...]` |
| line 760 | `xl:grid-cols-[minmax(360px,0.75fr)_minmax(0,1.25fr)]` | `lg:grid-cols-[...]` |
| line 785 | `md:grid-cols-2 xl:grid-cols-4` | `md:grid-cols-2 lg:grid-cols-4` |
| line 797 | `xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]` | `lg:grid-cols-[...]` |

---

### FR-005: TeamWorkloadTable — overflow-x-auto 래퍼

```tsx
// 변경 전
<table className="w-full text-sm">

// 변경 후
<div className="overflow-x-auto">
  <table className="w-full min-w-[360px] text-sm">
    ...
  </table>
</div>
```

---

### FR-006: 메시지 페이지 — 모바일 폼 우선 배치

`flex-col-reverse`를 사용하면 DOM 순서(목록 → 폼)는 유지하면서 모바일에서 폼이 상단에 보인다.
`md:grid`가 적용되면 flex direction이 무효화되어 데스크탑에서는 DOM 순서(목록 좌 / 폼 우)가 복원된다.

```tsx
// 변경 전
<div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(360px,480px)]">
  <main>{/* 목록 */}</main>   {/* 모바일 상단 */}
  <aside>{/* 폼 */}</aside>   {/* 모바일 하단 */}
</div>

// 변경 후
<div className="flex flex-col-reverse gap-6 md:grid md:grid-cols-[minmax(0,1fr)_minmax(360px,480px)]">
  <main>{/* 목록 */}</main>   {/* flex-col-reverse → 화면 하단 / grid → 좌열 */}
  <aside>{/* 폼 */}</aside>   {/* flex-col-reverse → 화면 상단 / grid → 우열 */}
</div>
```

---

### FR-007: messages/page.tsx — flowrit-page 클래스

```tsx
// 변경 전
<div className="p-8">
// 변경 후
<div className="flowrit-page">
```

---

### FR-008: 팀 멤버 행 — 버튼 줄바꿈

OWNER 권한 행의 버튼 컨테이너에 `flex-wrap` 추가:

```tsx
// 변경 전
<div className="flex items-center gap-2">
// 변경 후
<div className="flex flex-wrap items-center gap-2">
```

---

### FR-009: team/page.tsx — flowrit-page-header 클래스

```tsx
// 변경 전
<div className="mb-8">
  <h1 className="text-2xl font-semibold text-gray-900">팀</h1>
  <p className="text-sm text-gray-500 mt-1">...</p>
</div>

// 변경 후
<div className="flowrit-page-header">
  <div>
    <h1 className="flowrit-page-title">팀</h1>
    <p className="flowrit-page-description">...</p>
  </div>
</div>
```

---

### FR-010: revisions·customers — 설명 텍스트 노출

`hidden md:block` 제거 후 텍스트 길이에 따라 `line-clamp-2` 적용 여부를 판단한다.

---

### FR-012: 터치 타겟 감사

각 페이지에서 CTA 버튼 높이를 확인한다. Tailwind 기준:
- `h-9` = 36px ← 최소 기준
- `h-10` = 40px
- `h-11` = 44px ← Apple HIG 권장

이미 `h-9` 이상인 버튼은 그대로 유지. 미달 버튼에 `min-h-9` 추가.

---

## 인터페이스 계약

- **`MobilePageTitle`**: props 없음. layout.tsx에서 import하여 `md:hidden` 영역 내에서 렌더링.
- **기존 컴포넌트 시그니처 변경 없음**: 모든 Server Action, API Route 인터페이스 동일.
- **`messages-page-client.tsx`**: 그리드 클래스만 변경. 상위(`messages/page.tsx`)에서 내려주는 props 변경 없음.
- **`team-workload-table.tsx`**: `<table>` 래핑 div 추가만. 내부 렌더링 로직 및 props 변경 없음.

---

## 테스트 전략

모든 SC는 브라우저 DevTools에서 viewport 크기를 지정하여 시각 검증한다.

| SC 식별자 | 검증 viewport | 시나리오 | 기대 결과 |
|---|---|---|---|
| SC-001 | 390px | `/projects/[id]` 접속 | 탭 4개 가로 1줄 스크롤 |
| SC-002 | 390px | 탭 클릭 | 하이라이트 유지 |
| SC-003 | 390px | 탭 영역 | 스크롤바 미표시 |
| SC-004 | 390px | `/projects/[id]` 헤더 | 아카이브·복제 버튼이 제목 아래 |
| SC-005 | 640px | `/projects/[id]` 헤더 | 버튼 그룹 우측 배치 |
| SC-006 | 640px | `/projects/[id]` 상단 카드 | 공유링크 전폭 + 하단 2카드 2열 |
| SC-007 | 768px | `/projects/[id]` 상단 카드 | 3열 배치 |
| SC-008 | 1024px | `/dashboard` | 파이프라인 + 접수 2열 |
| SC-009 | 1024px | `/dashboard` | 지표 카드 4열 |
| SC-010 | 1024px | `/dashboard` | 성과 분석 2열 |
| SC-011 | 1280px+ | `/dashboard` | 기존 레이아웃 동일 |
| SC-012 | 390px | 팀 워크로드 테이블 | overflow 없이 가로 스크롤 |
| SC-013 | 390px | `/messages` | 폼이 목록 상단 위치 |
| SC-014 | 768px | `/messages` | 목록(좌)·폼(우) 2열 |
| SC-015 | 390px | `/messages` 패딩 | 좌우 16px |
| SC-016 | 390px | `/team` OWNER 행 | 버튼 잘림·겹침 없음 |
| SC-017 | 390px | `/team` vs `/projects` 상단 여백 | 동일 |
| SC-018 | 390px | `/revisions` | 설명 텍스트 1줄 표시 |
| SC-019 | 390px | `/customers` | 설명 텍스트 표시 |
| SC-020 | — | `npx tsc --noEmit` | 에러 0 |
| SC-021 | 390px | `/dashboard` 상단 바 | "대시보드" 텍스트 |
| SC-022 | 390px | `/projects` 상단 바 | "프로젝트" 텍스트 |
| SC-023 | 390px | `/messages` 상단 바 | "메시지" 텍스트 |
| SC-024 | 768px+ | 모든 페이지 상단 바 | 워크스페이스명·알림 벨만 |
| SC-025 | DevTools | 주요 CTA 버튼 높이 | 36px 이상 |

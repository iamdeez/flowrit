# Tasks: 003-mobile-responsive-improvement

> Branch: 003-mobile-responsive-improvement | Date: 2026-06-25 | Plan: [plan.md](./plan.md)

## 목차

- [전제 조건](#전제-조건)
- [태스크 목록](#태스크-목록)
  - [Phase 1: 페이지 프레임 정비](#phase-1-페이지-프레임-정비)
  - [Phase 2: 프로젝트 상세](#phase-2-프로젝트-상세)
  - [Phase 3: 대시보드](#phase-3-대시보드)
  - [Phase 4: 메시지·팀](#phase-4-메시지팀)
  - [Phase 5: 앱형 모바일 상단 바](#phase-5-앱형-모바일-상단-바)
  - [Phase 6: 터치 타겟 감사](#phase-6-터치-타겟-감사)
  - [Phase 7: 최종 검증](#phase-7-최종-검증)
- [구현 완료 기준](#구현-완료-기준)

---

## 전제 조건

- [x] spec.md의 모든 `[NEEDS CLARIFICATION]` 항목이 해소되었는가? — 없음
- [x] plan.md의 Constitution Gates가 모두 통과(또는 예외 기재)되었는가? — 통과
- [x] CHANGES.md에서 이전 작업의 "후속 작업 시 주의사항"을 확인했는가? — 해당 버전 첫 스펙, 없음

---

## 태스크 목록

> **[P]** 표시: 이전 태스크와 병렬 실행 가능 (독립 파일)

### Phase 1: 페이지 프레임 정비

T001–T003은 서로 다른 파일을 건드리므로 모두 병렬 실행 가능하다.

- [x] **T001** `[P]` — FR-007: messages/page.tsx flowrit-page 클래스 적용
  - 구현 파일: `app/(dashboard)/messages/page.tsx`
  - 관련 요구사항: `FR-007`
  - 상세: 최상위 래퍼 `<div className="p-8">` → `<div className="flowrit-page">`
  - 완료 기준: SC-015 (390px에서 좌우 패딩 16px)

- [x] **T002** `[P]` — FR-009: team/page.tsx 헤더 CSS 클래스 교체
  - 구현 파일: `app/(dashboard)/team/page.tsx`
  - 관련 요구사항: `FR-009`
  - 상세: `<div className="mb-8">`, `<h1 className="text-2xl font-semibold ...">` 등 인라인 Typography →
    `flowrit-page-header`, `flowrit-page-title`, `flowrit-page-description` 클래스로 교체
  - 완료 기준: SC-017 (상단 여백이 타 대시보드 페이지와 일치)

- [x] **T003** `[P]` — FR-010: revisions·customers 설명 텍스트 노출
  - 구현 파일: `app/(dashboard)/revisions/page.tsx`, `app/(dashboard)/customers/page.tsx`
  - 관련 요구사항: `FR-010`
  - 상세: 설명 텍스트 `<p>` 또는 `<span>`의 `hidden md:block` 제거.
    텍스트가 2줄 초과 가능성 있으면 `line-clamp-2` 추가
  - 완료 기준: SC-018, SC-019

---

### Phase 2: 프로젝트 상세

T004–T006은 같은 파일(`projects/[id]/page.tsx`)의 다른 DOM 영역이다. 순서 무관하게 처리.

- [x] **T004** — FR-001: 탭 내비 가로 스크롤
  - 구현 파일: `app/(dashboard)/projects/[id]/page.tsx`
  - 관련 요구사항: `FR-001`
  - 상세:
    - 탭 컨테이너: `grid gap-2 border-b border-gray-200 md:grid-cols-4`
      → `flex overflow-x-auto border-b border-gray-200 [&::-webkit-scrollbar]:hidden`
    - 각 탭 아이템(`button` 또는 링크): `flex-shrink-0` 추가
  - 완료 기준: SC-001 (탭 가로 1줄), SC-002 (하이라이트 유지), SC-003 (스크롤바 미표시)

- [x] **T005** `[P]` — FR-002: 프로젝트 헤더 버튼 줄바꿈
  - 구현 파일: `app/(dashboard)/projects/[id]/page.tsx`
  - 관련 요구사항: `FR-002`
  - 상세: 헤더 래퍼 `flex items-start justify-between gap-4`
    → `flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between`
  - 완료 기준: SC-004, SC-005

- [x] **T006** `[P]` — FR-003: 정보 카드 sm: 2열 시작
  - 구현 파일: `app/(dashboard)/projects/[id]/page.tsx`
  - 관련 요구사항: `FR-003`
  - 상세:
    - 카드 컨테이너: `grid gap-3 md:grid-cols-3` → `grid gap-3 sm:grid-cols-2 md:grid-cols-3`
    - 첫 번째 카드(고객 공유 링크): `sm:col-span-2 md:col-span-1` 추가
  - 완료 기준: SC-006, SC-007

---

### Phase 3: 대시보드

T007–T008은 독립 파일이므로 병렬 실행 가능하다.

- [x] **T007** `[P]` — FR-004: 대시보드 xl: → lg: 브레이크포인트
  - 구현 파일: `app/(dashboard)/dashboard/page.tsx`
  - 관련 요구사항: `FR-004`
  - 상세: plan.md의 6개 위치 모두 `xl:grid-cols-[...]` / `xl:grid-cols-4` → `lg:grid-cols-[...]` / `lg:grid-cols-4`
  - 완료 기준: SC-008, SC-009, SC-010, SC-011

- [x] **T008** `[P]` — FR-005: TeamWorkloadTable overflow-x-auto 래퍼
  - 구현 파일: `app/(dashboard)/analytics/team-workload-table.tsx`
  - 관련 요구사항: `FR-005`
  - 상세: `<table className="w-full text-sm">` → `<div className="overflow-x-auto"><table className="w-full min-w-[360px] text-sm">...</table></div>`
  - 완료 기준: SC-012

---

### Phase 4: 메시지·팀

T009–T010은 독립 파일이므로 병렬 실행 가능하다.

- [x] **T009** `[P]` — FR-006: 메시지 폼 모바일 우선 배치
  - 구현 파일: `app/(dashboard)/messages/messages-page-client.tsx`
  - 관련 요구사항: `FR-006`
  - 상세: 그리드 래퍼
    `grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(360px,480px)]`
    → `flex flex-col-reverse gap-6 md:grid md:grid-cols-[minmax(0,1fr)_minmax(360px,480px)]`
  - 완료 기준: SC-013, SC-014

- [x] **T010** `[P]` — FR-008: 팀 멤버 행 버튼 flex-wrap
  - 구현 파일: `app/(dashboard)/team/page.tsx`
  - 관련 요구사항: `FR-008`
  - 상세: 멤버 행 우측 버튼 컨테이너 `flex items-center gap-2`
    → `flex flex-wrap items-center gap-2`
  - 완료 기준: SC-016

---

### Phase 5: 앱형 모바일 상단 바

T011 완료 후 T012 진행 (T012는 T011 컴포넌트를 import).

- [x] **T011** — FR-011: MobilePageTitle 컴포넌트 생성
  - 구현 파일: `components/mobile-page-title.tsx` (신규 파일)
  - 관련 요구사항: `FR-011`
  - 상세:
    - `'use client'` 선언
    - `usePathname()` 훅으로 현재 경로 획득
    - 정적 매핑 딕셔너리 `PAGE_TITLES`: `/dashboard` → "대시보드", `/projects` → "프로젝트",
      `/revisions` → "수정 요청", `/customers` → "고객", `/messages` → "메시지",
      `/analytics` → "성과 분석", `/team` → "팀", `/settings` → "설정",
      `/billing` → "빌링", `/notifications` → "알림"
    - 정확 매칭 우선, 없으면 prefix 매칭(`startsWith(key + '/')`)
    - fallback: "Flowrit"
    - `<span className="text-[15px] font-semibold text-[var(--flowrit-text)]">` 렌더링
  - 완료 기준: TypeScript 에러 없음, named export `MobilePageTitle` 존재

- [x] **T012** — FR-011: layout.tsx 상단 바 업데이트 (T011 완료 후)
  - 구현 파일: `app/(dashboard)/layout.tsx`
  - 관련 요구사항: `FR-011`
  - 상세:
    - `MobilePageTitle`을 `components/mobile-page-title` 에서 import
    - 기존 `md:hidden` 블록(Flowrit 아이콘 + 텍스트 로고 + 워크스페이스명 `<p>`) 제거
    - 해당 위치에 `<MobilePageTitle />` 배치
    - 데스크탑용 `hidden md:block` 워크스페이스명 `<p>` 는 그대로 유지
  - 완료 기준: SC-021, SC-022, SC-023, SC-024

---

### Phase 6: 터치 타겟 감사

- [x] **T013** — FR-012: 주요 CTA 버튼 터치 타겟 보완
  - 구현 파일: `app/(dashboard)/projects/page.tsx`, `app/(dashboard)/customers/page.tsx`,
    `app/(dashboard)/revisions/page.tsx`, `app/(dashboard)/messages/messages-page-client.tsx`
  - 관련 요구사항: `FR-012`
  - 상세:
    1. 각 페이지의 primary CTA 버튼(`새 프로젝트`, `고객 등록`, `납품 파일 추가` 등) 높이 확인
    2. `h-9`(36px) 미만인 경우 `min-h-9` 또는 `h-9` 클래스 추가
    3. 이미 `h-9` 이상이면 변경 없음
  - 완료 기준: SC-025 (주요 CTA 높이 36px 이상)

---

### Phase 7: 최종 검증

- [x] **T014** — TypeScript 타입 검증
  - 상세: `npx tsc --noEmit` 실행하여 에러 0 확인
  - 검증: 현재 셸에 `npx`/`node` PATH가 없어 `PATH="/Users/krystal/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/tsc --noEmit`로 동일 검증 통과
  - 완료 기준: SC-020

---

## 구현 완료 기준

- [x] 모든 태스크 체크박스(T001–T014)가 완료 처리되었다.
- [x] `npx tsc --noEmit`이 에러 0으로 통과한다.
- [x] 데스크탑(1280px 이상) 시각 레이아웃이 변경 전과 동일하다.
- [x] 390px에서 모바일 상단 바에 현재 페이지명이 표시된다.
- [x] `git status`에 의도치 않은 파일이 없다. — `docs/.obsidian/workspace.json`은 로컬 Obsidian 상태 파일로 판단하여 제외

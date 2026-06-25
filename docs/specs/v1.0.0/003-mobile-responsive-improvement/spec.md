# Spec: 003-mobile-responsive-improvement

> Branch: 003-mobile-responsive-improvement | Date: 2026-06-25 | Version: v1.0.0

## 목차

- [배경 및 목적](#배경-및-목적)
- [진단 요약 — 기기별 문제 현황](#진단-요약--기기별-문제-현황)
- [사용자 스토리 (User Stories)](#사용자-스토리-user-stories)
- [기능 요구사항 (Functional Requirements)](#기능-요구사항-functional-requirements)
- [비기능 요구사항 (Non-Functional Requirements)](#비기능-요구사항-non-functional-requirements)
- [수용 기준 (Acceptance Criteria)](#수용-기준-acceptance-criteria)
- [범위 외 (Out of Scope)](#범위-외-out-of-scope)
- [미결 사항 (Open Questions)](#미결-사항-open-questions)

---

## 배경 및 목적

코드베이스 전수 조사 결과, 모바일 반응형 문제는 원래 파악한 4개보다 더 광범위하게 존재한다.
문제는 크게 세 카테고리로 나뉜다.

1. **레이아웃 깨짐**: `overflow-x-auto` 래퍼 누락으로 내용물이 뷰포트를 벗어남
2. **UX 가독성 저하**: 탭이 세로로 쌓이거나, 액션 버튼이 좁은 화면에서 cramped
3. **디바이스 계층 미대응**: `xl:` 브레이크포인트 과의존으로 768~1279px 기기에서 단일 컬럼 레이아웃이 유지되어 페이지가 지나치게 길어짐

이 스펙은 코드에서 직접 확인된 문제 전체를 기기 계층별로 정리하고 수정 범위를 정의한다.

---

## 진단 요약 — 기기별 문제 현황

> **기기 기준**: 소형 모바일 390px / 대형 모바일 430px / 태블릿 세로 768px / 태블릿 가로·소형 노트북 1024px
>
> **Tailwind 브레이크포인트**: sm 640px / md 768px / lg 1024px / xl 1280px

### 소형 모바일 (390px) — 심각

| 페이지 | 문제 | 심각도 |
|---|---|---|
| `/projects/[id]` | 탭 내비 `md:grid-cols-4` → 4개 탭이 세로 스택, ≈200px 수직 공간 낭비 | 🔴 HIGH |
| `/projects/[id]` | 헤더 패널 내 아카이브·복제 버튼이 `flex items-start justify-between`으로 제목과 한 행 → 긴 제목에서 버튼 그룹이 매우 좁아짐 | 🟡 MED |
| `/projects/[id]` | 정보 카드 3개(공유링크·수정요청·납품) `md:grid-cols-3` → 768px 미만에서 1열 3장 세로 나열 | 🟡 MED |
| `/messages` | 모바일에서 새 템플릿 폼(`<aside>`)이 전체 목록 하단에 위치 → 폼에 도달하기 위해 전체 스크롤 필요 | 🔴 HIGH |
| `/messages` | `p-8` 고정 패딩 (32px) 사용 → `flowrit-page` 클래스 미적용, 반응형 패딩(16px) 미적용 | 🟡 MED |
| `/team` | OWNER 권한 멤버 행에 역할변경 드롭다운 + 오너이전 버튼 + 삭제 버튼이 동시에 우측에 배치 → 모바일에서 cramped | 🟡 MED |
| `/team` | `flowrit-page` 클래스 미사용, 직접 `mb-8 text-2xl` 지정 → 다른 페이지 대비 상단 여백 불일치 | 🟠 LOW |
| `/settings` | 7개 탭 `overflow-x-auto` 처리됨이나 우측에 더 있다는 시각적 단서 없음 | 🟠 LOW |

### 태블릿·소형 노트북 (768~1279px) — 심각

| 페이지 | 문제 | 심각도 |
|---|---|---|
| `/dashboard` | `xl:grid-cols-[...]` 4개 섹션 모두 단일 컬럼 → 대시보드 전체가 매우 긴 1열 스크롤 | 🔴 HIGH |
| `/dashboard` | 지표 카드 `md:grid-cols-2 xl:grid-cols-4` → 768~1279px에서 2열만 유지 | 🟡 MED |
| `/dashboard` | TeamWorkloadTable `<table>` overflow-x-auto 래퍼 없음 → 팀원 많을 시 overflow | 🟡 MED |
| `/projects` | 어드민 필터 3요소(상태 pill, 검색 입력, 담당자 선택) `flex flex-wrap` → 중간 크기 화면에서 줄바꿈 발생 가능 | 🟠 LOW |

### 전반적(모든 기기 공통)

| 대상 | 문제 |
|---|---|
| `/revisions`, `/customers` | 페이지 설명 텍스트 `hidden md:block` — 모바일 사용자에게 페이지 목적 미전달 (설명이 없어 처음 접하는 사용자가 맥락 파악 어려움) |

---

## 사용자 스토리 (User Stories)

- **US-001**: 스마트폰으로 프로젝트 상세 페이지를 열었을 때, 탭 4개가 한 줄에 보여 원하는 탭으로 즉시 이동하고 싶다.
- **US-002**: 태블릿(1024px)으로 대시보드를 볼 때, 업무 파이프라인과 분석 차트가 옆에 나란히 보여 한 화면에서 현황을 파악하고 싶다.
- **US-003**: 모바일에서 메시지 템플릿을 추가할 때, 목록을 전부 스크롤하지 않고 바로 입력 폼에 접근하고 싶다.
- **US-004**: 팀 관리 화면에서 팀원 역할·권한 변경 버튼이 모바일에서도 명확하게 보이고 탭하기 편했으면 한다.
- **US-005**: 스마트폰으로 처음 수정 요청 / 고객 페이지에 접속했을 때, 이 페이지가 무엇을 하는 공간인지 짧게 안내를 받고 싶다.
- **US-006**: 프로젝트 상세에서 위에 있는 공유 링크·수정 요청·납품 카드가 모바일에서 너무 길게 쌓이지 않고, 탭 영역까지 빠르게 내려가고 싶다.
- **US-007**: 스마트폰으로 앱을 사용할 때, 상단 바를 보면 내가 어떤 화면에 있는지 바로 알고 싶다.
- **US-008**: 터치로 버튼을 누를 때 손가락 크기 때문에 잘못 탭하는 일이 없었으면 한다.

---

## 기능 요구사항 (Functional Requirements)

### FR-001 프로젝트 상세 탭 — 가로 스크롤 내비게이션

`/projects/[id]` 탭 내비게이션을 모바일(768px 미만)에서 가로 스크롤 가능한 형태로 변경한다.

- **현재**: `grid gap-2 border-b border-gray-200 md:grid-cols-4` — 모바일에서 4개 탭 세로 스택
- **변경 후**: `flex overflow-x-auto border-b border-gray-200` — 한 줄 가로 스크롤
- 탭 아이템: `flex-shrink-0`으로 축소 방지, CSS `[&::-webkit-scrollbar]:hidden` 으로 스크롤바 숨김

### FR-002 프로젝트 상세 헤더 버튼 — 모바일 줄바꿈

`/projects/[id]` 헤더 패널에서 아카이브·복제 버튼 그룹이 모바일에서 제목 아래로 줄바꿈되도록 변경한다.

- **현재**: `flex items-start justify-between gap-4` — 모바일에서 제목과 한 행
- **변경 후**: 헤더 섹션을 `flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between` 로 변경 → 640px 미만에서 버튼 그룹이 제목 아래에 위치

### FR-003 프로젝트 상세 정보 카드 — sm: 2열 시작

`/projects/[id]` 상단 정보 카드 3개의 그리드 시작 브레이크포인트를 `sm:` (640px)로 낮춘다.

- **현재**: `grid gap-3 md:grid-cols-3` — 768px 미만에서 1열
- **변경 후**: `grid gap-3 sm:grid-cols-2 md:grid-cols-3`
  - 첫 번째 카드(고객 공유 링크)에 `sm:col-span-2 md:col-span-1` 추가

### FR-004 대시보드 — lg: 브레이크포인트 적용

`/dashboard` 2열 레이아웃 분기점을 `xl:` → `lg:` (1024px)로 낮추어 소형 노트북·태블릿에서 2열 배치가 적용되도록 한다.

대상 클래스 (모두 `xl:` → `lg:`로 변경):
1. `xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.85fr)]` — 업무 파이프라인 + 최근 접수 (line 447)
2. `xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]` — 성과 분석 차트 × 2개 섹션 (line 726, 797)
3. `xl:grid-cols-[minmax(360px,0.75fr)_minmax(0,1.25fr)]` — 팀 워크로드 (line 760)
4. `md:grid-cols-2 xl:grid-cols-4` → `md:grid-cols-2 lg:grid-cols-4` — 지표 카드 × 2개 행 (line 696, 785)

### FR-005 TeamWorkloadTable — overflow-x-auto 래퍼 추가

`app/(dashboard)/analytics/team-workload-table.tsx`의 `<table>` 요소를 `overflow-x-auto` 래퍼로 감싸 모바일 overflow를 방지한다.

- **변경 후**: `<div className="overflow-x-auto"><table className="w-full text-sm min-w-[360px]">…</div>`

### FR-006 메시지 페이지 — 모바일 폼 우선 배치

`/messages` 페이지에서 모바일(768px 미만)일 때 새 템플릿 폼(`<aside>`)이 목록보다 먼저 보이도록 레이아웃 순서를 변경한다.

- **현재**: `grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(360px,480px)]` — 목록 → 폼 순서
- **변경 후**: 그리드 순서는 유지하되 모바일에서 `order-first` / `order-last`를 활용하거나, `flex flex-col-reverse md:grid md:grid-cols-[...]`로 변경 — 모바일에서 폼이 상단에 표시

### FR-007 메시지 페이지 — flowrit-page 클래스 적용

`app/(dashboard)/messages/page.tsx`의 래퍼 `div`에 `flowrit-page` 클래스를 적용하여 반응형 패딩(16px 모바일 / 32px 데스크탑)을 일관되게 사용한다.

- **현재**: `<div className="p-8">` — 모바일에서 32px 고정 패딩
- **변경 후**: `<div className="flowrit-page">`

### FR-008 팀 페이지 — 멤버 행 모바일 레이아웃

`/team` 팀원 행에서 OWNER 권한 시 우측에 집중되는 액션 버튼(역할변경 + 오너이전 + 삭제)을 모바일에서 가독성 있게 배치한다.

- **현재**: `flex items-center justify-between px-5 py-4` — 멤버 정보 + 버튼 전부 한 행
- **변경 후**: 버튼 그룹을 `flex flex-wrap gap-2`로 줄바꿈 허용. 또는 멤버 행 자체를 `flex flex-col sm:flex-row` 2단으로 구성

### FR-009 팀 페이지 — flowrit-page 클래스 적용

`app/(dashboard)/team/page.tsx`의 래퍼 `div`에 `flowrit-page` 클래스를 적용하여 다른 페이지와 최상단 여백을 일치시킨다.

- **현재**: `<div className="flowrit-page max-w-2xl">` 내부에 `mb-8 h1 text-2xl` 직접 커스텀
- **변경 후**: `flowrit-page-header`·`flowrit-page-title`·`flowrit-page-description` CSS 클래스를 사용

### FR-010 수정 요청·고객 페이지 — 모바일 설명 텍스트 노출

`/revisions`, `/customers` 페이지의 설명 텍스트에서 `hidden md:block`을 제거하여 모바일에서도 한 줄 안내를 표시한다.

단, 텍스트가 길어 두 줄 이상이 되는 경우 `line-clamp-1` 또는 `text-xs`로 축약한다.

### FR-011 모바일 상단 바 — 현재 페이지명 표시

모바일(768px 미만) 상단 바의 Flowrit 로고·워크스페이스명 영역을 **현재 페이지명**으로 교체하여 네이티브 앱과 같은 컨텍스트 인식을 제공한다.

- **현재**: `md:hidden` 영역에 Flowrit 아이콘 로고 + 텍스트 로고 + 워크스페이스명 표시
- **변경 후**: 현재 pathname에 대응하는 한국어 페이지명 표시 (예: `/dashboard` → "대시보드", `/projects` → "프로젝트")
- 동적 경로(`/projects/[id]` 등)는 상위 섹션명으로 표시 (예: "프로젝트")
- 데스크탑(768px 이상)은 기존 워크스페이스명 표시를 그대로 유지한다
- 커버 대상 경로: `/dashboard`, `/orders`, `/projects`, `/revisions`, `/customers`, `/messages`, `/analytics`, `/templates`, `/team`, `/settings`, `/notifications`

### FR-012 터치 타겟 최소 크기 보장

주요 인터랙티브 요소(버튼, 링크, 드롭다운 트리거)의 탭 가능 높이를 36px 이상으로 보장한다.

- 새 프로젝트·고객 등록·납품 파일 추가 등 primary CTA 버튼을 우선 적용 대상으로 한다
- Tailwind 클래스 기준: `min-h-9` (36px) 이상

---

## 비기능 요구사항 (Non-Functional Requirements)

- **NFR-001**: 모든 변경 후 데스크탑(1280px 이상) UI는 변경 전과 동일하게 유지되어야 한다.
- **NFR-002**: `npx tsc --noEmit`이 에러 없이 통과해야 한다.
- **NFR-003**: 추가 npm 의존성을 설치하지 않는다. Tailwind CSS 기존 유틸리티만 활용한다.
- **NFR-004**: 탭 스크롤바 숨김은 JS 없이 CSS만으로 처리한다.
- **NFR-005**: 하단 탭 바(56px + safe-area-inset) 위에 콘텐츠가 가려지지 않아야 한다. 레이아웃 변경 시 스크롤 컨테이너의 `pb-[calc(56px+env(safe-area-inset-bottom,0px))]`가 유지됨을 확인한다.
- **NFR-006**: `MobilePageTitle` 클라이언트 컴포넌트 추가로 JS 번들 크기가 실질적으로 증가하지 않는다. (pathname 매핑 딕셔너리는 경량 정적 객체)

---

## 수용 기준 (Acceptance Criteria)

### FR-001 관련
- **SC-001**: `/projects/[id]`를 390px에서 열었을 때, 탭 4개가 한 줄 가로 스크롤로 표시된다.
- **SC-002**: 탭 선택 시 `border-indigo-600 text-indigo-700` 하이라이트가 정상 유지된다.
- **SC-003**: 탭 바에 스크롤바가 표시되지 않는다.

### FR-002 관련
- **SC-004**: `/projects/[id]`를 390px에서 열었을 때, 아카이브·복제 버튼이 프로젝트 제목 아래에 위치한다.
- **SC-005**: 640px 이상에서는 버튼 그룹이 제목과 같은 행 우측에 배치된다.

### FR-003 관련
- **SC-006**: `/projects/[id]`를 640px에서 열었을 때, 공유 링크 카드가 전폭을 차지하고 수정 요청·납품 카드가 2열로 배치된다.
- **SC-007**: 768px 이상에서 3개 카드가 3열로 배치된다.

### FR-004 관련
- **SC-008**: `/dashboard`를 1024px에서 열었을 때, 업무 파이프라인 + 최근 접수가 2열로 나란히 표시된다.
- **SC-009**: `/dashboard`를 1024px에서 열었을 때, 지표 카드 행이 4열로 표시된다.
- **SC-010**: `/dashboard`를 1024px에서 열었을 때, 성과 분석 차트가 2열로 배치된다.
- **SC-011**: `/dashboard`를 1280px 이상에서 열었을 때 기존 레이아웃과 동일하다.

### FR-005 관련
- **SC-012**: `/dashboard` 성과 분석 섹션을 390px에서 열었을 때, 팀 워크로드 테이블이 overflow없이 가로 스크롤된다.

### FR-006 관련
- **SC-013**: `/messages`를 390px에서 열었을 때, 새 템플릿 폼이 템플릿 목록보다 상단에 표시된다.
- **SC-014**: 768px 이상에서는 기존과 동일하게 목록(좌)·폼(우) 2열로 표시된다.

### FR-007 관련
- **SC-015**: `/messages`를 390px에서 열었을 때 좌우 패딩이 16px이다.

### FR-008 관련
- **SC-016**: `/team`에서 OWNER 권한 멤버 행을 390px에서 볼 때, 역할변경·오너이전·삭제 버튼이 잘리거나 겹치지 않는다.

### FR-009 관련
- **SC-017**: `/team` 페이지의 상단 여백이 `/projects`·`/customers` 등 다른 대시보드 페이지와 일치한다.

### FR-010 관련
- **SC-018**: `/revisions`를 390px에서 열었을 때, 페이지 설명 텍스트가 1줄 표시된다.
- **SC-019**: `/customers`를 390px에서 열었을 때, 페이지 설명 텍스트가 표시된다.

### FR-011 관련
- **SC-021**: `/dashboard`를 390px에서 열었을 때, 상단 바에 "대시보드" 텍스트가 표시된다.
- **SC-022**: `/projects`를 390px에서 열었을 때, 상단 바에 "프로젝트" 텍스트가 표시된다.
- **SC-023**: `/messages`를 390px에서 열었을 때, 상단 바에 "메시지" 텍스트가 표시된다.
- **SC-023b**: `/orders`를 390px에서 열었을 때, 상단 바에 "주문서 관리" 텍스트가 표시된다.
- **SC-023c**: `/templates`를 390px에서 열었을 때, 상단 바에 "템플릿" 텍스트가 표시된다.
- **SC-024**: 768px 이상에서 상단 바는 기존과 동일하게 워크스페이스명·알림 벨만 표시되고, Flowrit 로고가 나타나지 않는다.

### FR-012 관련
- **SC-025**: 각 주요 페이지의 primary CTA 버튼(새 프로젝트, 고객 등록, 템플릿 추가 등)의 렌더링 높이가 36px 이상이다.

### 공통
- **SC-020**: `npx tsc --noEmit`이 에러 없이 통과한다.

---

## 범위 외 (Out of Scope)

- 고객 주문서·납품 공개 페이지(`/intake/`, `/order/`, `/p/`) — 별도 공개 도메인, 이 스펙 제외
- 다크 모드
- 모바일 전용 bottom navigation bar 추가 UI 기능 (이미 구현된 MobileTabBar 수정 제외)
- 드래그·스와이프 제스처 인터랙션
- 공개 랜딩 페이지(`/`)의 반응형 개선 — 현재 모바일 대응이 별도 존재하며 MVP에서 우선순위 낮음
- 프린트 CSS
- `/notifications` 페이지 — 코드 미확인 상태로 이 스펙에서 제외

---

## 미결 사항 (Open Questions)

미결 사항 없음.

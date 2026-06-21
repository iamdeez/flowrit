# Research: ux-upgrade

> Branch: 001-ux-upgrade | Date: 2026-06-22

## 목차

- [기존 코드베이스 분석](#기존-코드베이스-분석)
- [핵심 발견사항](#핵심-발견사항)
- [영향 범위 분석](#영향-범위-분석)
- [엣지 케이스 및 한계](#엣지-케이스-및-한계)

---

## 기존 코드베이스 분석

### 프로젝트 구조 요약

```
app/
  (dashboard)/
    dashboard/         — 대시보드 (page.tsx, convert-dialog.tsx)
    customers/         — 고객 목록/상세/신규
    projects/          — 프로젝트 목록/상세/신규
    revisions/         — 전체 수정 요청 목록
    templates/         — 워크플로우 템플릿
    messages/          — 메시지 템플릿
    team/              — 팀 초대·관리
  p/[token]/           — 고객용 공개 페이지 (진행상황, 수정 요청 폼)
  intake/[workspaceSlug]/ — 신규 의뢰 접수 폼
lib/
  actions/             — 서버 액션 (asset.ts, revision.ts, inquiry.ts 등)
  auth.ts, db.ts       — 인증, Prisma 클라이언트
prisma/schema.prisma   — 데이터 모델
```

---

## 핵심 발견사항

### F-001. 고객 연계 프로젝트 생성 흐름 단절
**파일**: `app/(dashboard)/customers/[id]/page.tsx:69`

```tsx
<Link href="/projects/new">새 프로젝트</Link>
```

고객 ID를 파라미터로 전달하지 않아 프로젝트 생성 폼에서 고객이 자동 선택되지 않는다.

**수정 대상**:
- `customers/[id]/page.tsx` — 링크를 `/projects/new?customerId={customer.id}`로 변경
- `projects/new/page.tsx` — `searchParams.customerId` 읽기 및 `<ProjectForm>`에 `defaultCustomerId` prop 전달
- `projects/new/project-form.tsx` — `defaultCustomerId` prop을 받아 `<select>`의 `defaultValue`에 적용

### F-002. 프로젝트 목록에 검색 기능 없음
**파일**: `app/(dashboard)/projects/page.tsx`

고객 목록(`customers/page.tsx`)에는 `?q=` 파라미터 기반 서버사이드 검색이 구현되어 있지만, 프로젝트 목록에는 없다.

**수정 대상**:
- `projects/page.tsx` — `next/form` 기반 검색 폼 추가, `searchParams.q` 읽기
- `lib/actions/project.ts` — `getProjects(status?, q?)` 시그니처 확장, Prisma where에 `OR: [{ title: contains }, { customer: { name: contains } }]` 추가

### F-003. 단계 표시가 선택 드롭다운
**파일**: `app/(dashboard)/projects/[id]/page.tsx:97-111`, `projects/[id]/stage-form.tsx`

현재 단계 이름만 표시하고 `<StageForm>`이 `<select>` 드롭다운으로 단계 변경을 처리한다. 전체 단계 흐름을 시각적으로 보여주지 않는다.

**수정 대상**:
- `projects/[id]/stage-form.tsx` — 시각적 스테퍼 UI로 교체 (각 단계를 pill 버튼으로 나열, 선택 시 form submit)
- `projects/[id]/page.tsx` — 기존 stage 영역 레이아웃 조정

### F-004. 파일 URL이 수정 요청 content에 합쳐짐
**파일**: `lib/actions/publicRevision.ts:30`

```ts
const fullContent = fileUrl ? `${content}\n\n첨부 파일: ${fileUrl}` : content
```

`RevisionRequest` 모델에 `fileUrls` 필드가 없어 파일 URL을 텍스트로 content에 이어붙인다. 사업자 화면에서 파일과 내용을 구분할 수 없다.

**수정 대상**:
- `prisma/schema.prisma` — `RevisionRequest`에 `fileUrls Json @default("[]")` 필드 추가
- `lib/actions/publicRevision.ts` — `fullContent` 합치기 제거, `fileUrls: fileUrl ? [fileUrl] : []` 로 분리 저장
- `app/(dashboard)/projects/[id]/page.tsx` — 수정 요청 렌더링에 첨부 파일 섹션 추가
- `app/(dashboard)/revisions/page.tsx` — 동일하게 첨부 파일 섹션 추가

### F-005. 에셋 삭제 액션 없음
**파일**: `lib/actions/asset.ts`

`createAsset`, `updateAssetStatus`만 존재. `deleteAsset` 없음.

**수정 대상**:
- `lib/actions/asset.ts` — `deleteAsset` 서버 액션 추가 (워크스페이스 소유 검증 포함)
- `app/(dashboard)/projects/[id]/asset-status-form.tsx` — 삭제 버튼 추가 또는 새 `AssetDeleteButton` 컴포넌트 생성

### F-006. 수정 요청 삭제 액션 없음
**파일**: `lib/actions/revision.ts`

`createRevisionRequest`, `updateRevisionStatus`, `getRevisionGroups`만 존재. `deleteRevisionRequest` 없음.

**수정 대상**:
- `lib/actions/revision.ts` — `deleteRevisionRequest` 서버 액션 추가
- `app/(dashboard)/projects/[id]/revision-status-form.tsx` — 삭제 버튼 추가 또는 새 컴포넌트 생성

### F-007. 공유 링크 복사 버튼 없음
**파일**: `app/(dashboard)/projects/[id]/page.tsx:62-64`

```ts
const shareLink = project.publicPage?.token
  ? `${proto}://${host}/p/${project.publicPage.token}`
  : '(공유 링크 없음)'
```

shareLink 텍스트가 `<PublicPageForm>`에 전달되지 않고 페이지 상단에서만 계산된다. `PublicPageForm`은 비활성/활성 토글만 담당한다.

**수정 대상**:
- `projects/[id]/public-page-form.tsx` — `shareLink?: string` prop 추가, 링크가 있을 때 클립보드 복사 버튼 렌더링 (client component이므로 `navigator.clipboard.writeText` 사용 가능)
- `projects/[id]/page.tsx` — `shareLink`를 `<PublicPageForm>`에 전달

### F-008. 타임라인 메모 기능 없음
**파일**: `app/(dashboard)/projects/[id]/page.tsx:248-270` (timeline tab)

타임라인 탭에 입력 UI가 없다. `TimelineEvent.eventType`에 `MEMO` 타입이 없지만 스키마가 String이므로 추가 마이그레이션 없이 사용 가능하다.

**수정 대상**:
- `lib/actions/project.ts` — `createTimelineMemo` 서버 액션 추가
- `projects/[id]/page.tsx` — 타임라인 탭에 메모 입력 폼 추가 (또는 별도 컴포넌트)

### F-009. 의뢰 전환 대화상자에 마감일 없음
**파일**: `app/(dashboard)/dashboard/convert-dialog.tsx`

`ConvertDialog`에 마감일 입력 필드가 없다. `convertInquiryToProject` action의 `createProject` 호출에도 `dueDate`가 없다.

**수정 대상**:
- `convert-dialog.tsx` — 마감일 `<input type="date">` 필드 추가
- `lib/actions/inquiry.ts` — `convertInquiryToProject`에서 `dueDate` 파라미터 처리 추가

### F-010. 대시보드에 진행 현황 요약 없음
**파일**: `app/(dashboard)/dashboard/page.tsx`

`getDashboardData`가 긴급 프로젝트, 미완료 수정 요청, 신규 접수만 반환한다. 전체 진행 중 프로젝트 수 카운트가 없다.

**수정 대상**:
- `dashboard/page.tsx` — `getDashboardData`에 전체 진행 중 프로젝트 카운트 추가, 상단 통계 카드 섹션 추가

---

## 영향 범위 분석

### 영향 파일 목록

| 파일 | 변경 유형 | FR |
|---|---|---|
| `prisma/schema.prisma` | 수정 (필드 추가) | FR-106 |
| `lib/actions/asset.ts` | 수정 (deleteAsset 추가) | FR-108 |
| `lib/actions/revision.ts` | 수정 (deleteRevisionRequest 추가) | FR-109 |
| `lib/actions/project.ts` | 수정 (getProjects 검색 파라미터, createTimelineMemo 추가) | FR-103, FR-105 |
| `lib/actions/inquiry.ts` | 수정 (dueDate 파라미터 추가) | FR-102 |
| `lib/actions/publicRevision.ts` | 수정 (fileUrls 분리 저장) | FR-106 |
| `app/(dashboard)/customers/[id]/page.tsx` | 수정 (링크 파라미터 추가) | FR-101 |
| `app/(dashboard)/projects/new/page.tsx` | 수정 (searchParams.customerId 읽기) | FR-101 |
| `app/(dashboard)/projects/new/project-form.tsx` | 수정 (defaultCustomerId prop) | FR-101 |
| `app/(dashboard)/projects/page.tsx` | 수정 (검색 폼, searchParams.q) | FR-103 |
| `app/(dashboard)/projects/[id]/page.tsx` | 수정 (스테퍼, 메모 폼, 파일 링크, shareLink prop 전달) | FR-104, FR-105, FR-107, FR-110 |
| `app/(dashboard)/projects/[id]/stage-form.tsx` | 수정 (스테퍼 UI로 교체) | FR-104 |
| `app/(dashboard)/projects/[id]/public-page-form.tsx` | 수정 (복사 버튼 추가) | FR-110 |
| `app/(dashboard)/projects/[id]/revision-status-form.tsx` | 수정 (삭제 버튼 추가) | FR-109 |
| `app/(dashboard)/projects/[id]/asset-status-form.tsx` | 수정 (삭제 버튼 추가) | FR-108 |
| `app/(dashboard)/revisions/page.tsx` | 수정 (첨부 파일 섹션) | FR-107 |
| `app/(dashboard)/dashboard/page.tsx` | 수정 (통계 카드 추가) | FR-111 |
| `app/(dashboard)/dashboard/convert-dialog.tsx` | 수정 (마감일 필드 추가) | FR-102 |

### 간접 영향 파일 (배제 판단)

| 파일 | 배제 사유 |
|---|---|
| `app/(dashboard)/revisions/page.tsx:revision-status-form` | 수정 요청 삭제는 project 상세에서만 제공 (revisions 페이지는 상태 변경만 유지) |
| `tests/` 기존 테스트 파일 | 기존 SC-001~SC-013 테스트는 action 시그니처 변경으로 일부 영향 받으나, `getProjects` mock 수정이 필요한 경우만 해당 |

---

## 엣지 케이스 및 한계

### 기존 데이터 하위 호환 (F-004 관련)
`RevisionRequest.fileUrls` 필드 추가 전에 저장된 데이터는 `fileUrls = []`(기본값)이다. 일부 기존 수정 요청의 `content`에는 `\n\n첨부 파일: {url}` 패턴이 텍스트로 포함되어 있다. 이 데이터는 마이그레이션하지 않고 그대로 유지한다. `content`에서 첨부 파일 패턴을 파싱하는 역파싱 로직은 구현하지 않는다.

### 스테퍼 단계 변경 (F-003 관련)
단계 클릭 시 `updateProjectStage` Server Action이 호출된다. 현재 이 액션은 배열 형태의 `$transaction`을 사용하며 테스트에서 두 형태 모두 처리해야 한다 (CHANGES.md 주의사항 참조).

### 검색 쿼리 인젝션 방지 (F-002 관련)
Prisma의 `contains` 필터는 파라미터 바인딩을 사용하므로 SQL 인젝션 위험이 없다. 별도 이스케이프 처리 불필요.

### 스테퍼 단계 없는 프로젝트
`stages`가 비어있는 프로젝트(템플릿 없이 생성된 경우)에서 스테퍼가 빈 상태를 올바르게 처리해야 한다. 현재 `getCurrentStage`가 `undefined`를 반환하는 케이스와 동일하게 "대기" 표시.

### Clipboard API 지원
`navigator.clipboard.writeText`는 Secure Context(HTTPS 또는 localhost)에서만 동작한다. 개발 환경(localhost)과 Vercel 배포 환경(HTTPS) 모두 해당되므로 폴백 불필요. 단, `typescript.md`에 따라 `crypto.randomUUID()`와 동일 맥락의 HTTP 접근 환경에서는 실패할 수 있음을 인지.

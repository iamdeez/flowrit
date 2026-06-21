# Plan: ux-upgrade

> Branch: 001-ux-upgrade | Date: 2026-06-22 | Spec: [spec.md](./spec.md) | Research: [research.md](./research.md)

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

constitution.md가 존재하지 않으므로 기본 4개 조항을 사용한다.

- [x] **성능 원칙**: 프로젝트 검색(FR-103)은 Prisma `contains` + `OR` 조건으로 DB 인덱스를 활용한다. N+1 없이 단일 쿼리. 성능 저하 요인 없음.
- [x] **호환성 원칙**: `getProjects(status?)` → `getProjects(status?, q?)` 시그니처 확장 시 기본값 `q = ''`으로 기존 호출 코드 영향 없음. `RevisionRequest.fileUrls` 추가는 기존 레코드에 `[]` 기본값 적용으로 영향 없음.
- [x] **테스트 원칙**: SC-101~SC-110 모두 spec.md에 정의됨.
- [x] **스펙 범위 원칙**: 모든 변경이 FR-101~FR-111 범위 내. 리팩토링이나 무관한 기능 추가 없음.

**예외 사항**: 없음.

---

## 기술 컨텍스트

- **언어 / 런타임**: TypeScript, Next.js 15 App Router, Node.js
- **주요 의존성**: Prisma (PostgreSQL/Neon), NextAuth.js v5, shadcn/ui + Tailwind CSS, Cloudflare R2 (파일 업로드)
- **테스트 프레임워크**: Vitest (tests/\*\*.test.ts), vitest-mock-extended, Prisma mock

---

## 사전 영향도 분석 결과

research.md §영향 범위 분석 참조. 18개 파일 수정, 신규 파일 없음.

### 영향 파일 목록

| 파일 | 변경 유형 | 관련 FR |
|---|---|---|
| `prisma/schema.prisma` | 수정 (RevisionRequest에 fileUrls 필드 추가) | FR-106 |
| `lib/actions/asset.ts` | 수정 (deleteAsset 추가) | FR-108 |
| `lib/actions/revision.ts` | 수정 (deleteRevisionRequest 추가) | FR-109 |
| `lib/actions/project.ts` | 수정 (getProjects 검색 확장, createTimelineMemo 추가) | FR-103, FR-105 |
| `lib/actions/inquiry.ts` | 수정 (convertInquiryToProject에 dueDate 추가) | FR-102 |
| `lib/actions/publicRevision.ts` | 수정 (fileUrls 분리 저장) | FR-106 |
| `app/(dashboard)/customers/[id]/page.tsx` | 수정 (링크에 ?customerId 추가) | FR-101 |
| `app/(dashboard)/projects/new/page.tsx` | 수정 (searchParams.customerId 읽기) | FR-101 |
| `app/(dashboard)/projects/new/project-form.tsx` | 수정 (defaultCustomerId prop 추가) | FR-101 |
| `app/(dashboard)/projects/page.tsx` | 수정 (검색 폼 추가, searchParams.q) | FR-103 |
| `app/(dashboard)/projects/[id]/page.tsx` | 수정 (스테퍼 연결, 메모 폼, 파일 링크, shareLink 전달) | FR-104, FR-105, FR-107, FR-110 |
| `app/(dashboard)/projects/[id]/stage-form.tsx` | 수정 (시각적 스테퍼 UI로 교체) | FR-104 |
| `app/(dashboard)/projects/[id]/public-page-form.tsx` | 수정 (shareLink prop 및 복사 버튼 추가) | FR-110 |
| `app/(dashboard)/projects/[id]/revision-status-form.tsx` | 수정 (삭제 버튼 추가) | FR-109 |
| `app/(dashboard)/projects/[id]/asset-status-form.tsx` | 수정 (삭제 버튼 추가) | FR-108 |
| `app/(dashboard)/revisions/page.tsx` | 수정 (첨부 파일 표시 섹션 추가) | FR-107 |
| `app/(dashboard)/dashboard/page.tsx` | 수정 (통계 카드, getDashboardData 확장) | FR-111 |
| `app/(dashboard)/dashboard/convert-dialog.tsx` | 수정 (마감일 필드 추가) | FR-102 |

---

## 핵심 설계

### A. 데이터 레이어 (RevisionRequest.fileUrls)

`fileUrls` 필드는 JSON 배열로 문자열 URL 목록을 저장한다.

```prisma
model RevisionRequest {
  // 기존 필드 유지
  fileUrls  Json  @default("[]")
}
```

마이그레이션 후 Prisma 타입 `fileUrls: Prisma.JsonValue`는 런타임에서 `string[]`으로 캐스팅하여 사용한다.

```ts
const fileUrls = (revision.fileUrls ?? []) as string[]
```

### B. 프로젝트 검색 (getProjects)

```ts
async function getProjects(status?: string, q?: string) {
  const where: Prisma.ProjectWhereInput = { workspaceId }
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { customer: { name: { contains: q, mode: 'insensitive' } } },
    ]
  }
  // 기존 상태 필터 로직 유지
}
```

### C. 단계 시각화 스테퍼 (StageForm 교체)

기존 `<select>` 드롭다운을 제거하고 각 단계를 클릭 가능한 pill 버튼으로 교체한다. 각 버튼은 독립적인 `<form>`으로 감싸 해당 단계의 `stageId`를 POST한다. 선택된 단계는 활성 스타일, 이전 단계는 완료 스타일, 이후 단계는 비활성 스타일을 적용한다.

```tsx
// stage-form.tsx 개요
export function StageForm({ projectId, currentStageId, stages }) {
  return (
    <div className="flex flex-wrap gap-2">
      {stages.map((stage, idx) => {
        const isCurrent = stage.id === currentStageId
        const isPast = idx < currentIndex
        return (
          <form key={stage.id} action={updateProjectStage}>
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="stageId" value={stage.id} />
            <button type="submit" className={stepperButtonStyle(isCurrent, isPast)}>
              {isPast && <CheckIcon />}
              {stage.internalName}
            </button>
          </form>
        )
      })}
    </div>
  )
}
```

현재 단계 인덱스는 `stages.findIndex(s => s.id === currentStageId)`로 계산한다. `currentStageId`가 null이면 `currentIndex = -1`로 모든 단계가 비활성 상태.

### D. 타임라인 메모 (createTimelineMemo)

```ts
export async function createTimelineMemo(formData: FormData): Promise<void> {
  const workspaceId = await requireWorkspaceId()
  const projectId = ...
  const content = ...
  // 프로젝트 소속 워크스페이스 검증
  await prisma.timelineEvent.create({
    data: { projectId, title: content, eventType: 'MEMO' }
  })
  revalidatePath(`/projects/${projectId}`)
}
```

타임라인 탭에 `<textarea>` + 저장 버튼을 추가한다. `useActionState` 또는 단순 `<form action={createTimelineMemo}>`를 사용한다.

### E. 공유 링크 복사 버튼

`PublicPageForm`은 이미 `'use client'` 컴포넌트이다. `shareLink` prop을 추가하고, 공유 링크가 있는 경우 복사 버튼을 렌더링한다.

```tsx
function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handleCopy}>
      {copied ? '복사됨' : '링크 복사'}
    </button>
  )
}
```

`projects/[id]/page.tsx`에서 계산된 `shareLink`를 `<PublicPageForm shareLink={shareLink} ...>`로 전달한다.

### F. 에셋·수정 요청 삭제

두 삭제 액션 모두 동일한 패턴:
1. 요청 사용자의 워크스페이스 확인
2. 대상 레코드가 해당 워크스페이스 소속인지 검증
3. 삭제 실행

에셋 삭제 시 타임라인에 `ASSET_DELETED` 이벤트 추가. 수정 요청 삭제는 타임라인 이벤트 없음.

---

## 인터페이스 계약

### getProjects 시그니처 변경

**기존**: `getProjects(status?: string)`
**변경**: `getProjects(status?: string, q?: string)`

호출 측 변경:
- `app/(dashboard)/projects/page.tsx` — `getProjects(status, q)` 호출로 변경
- 기존 `getProjects(status)` 호출은 `q = ''`이 기본값이므로 동작 동일 (하위 호환)

### ProjectForm props 변경

**기존**: `{ customers, templates, members }`
**변경**: `{ customers, templates, members, defaultCustomerId?: string }`

기존 호출 측(`/projects/new/page.tsx`)은 `defaultCustomerId` 미전달 시 `undefined`로 기존 동작 유지.

### PublicPageForm props 변경

**기존**: `{ projectId, publicPage }`
**변경**: `{ projectId, publicPage, shareLink?: string }`

기존 호출 측은 `shareLink` 미전달 시 복사 버튼 미렌더링으로 기존 동작 유지.

---

## 데이터 모델

### RevisionRequest 변경

```prisma
model RevisionRequest {
  id         String   @id @default(cuid())
  projectId  String
  content    String
  priority   String   @default("MEDIUM")
  status     String   @default("OPEN")
  assigneeId String?
  source     String   @default("MANUAL")
  fileUrls   Json     @default("[]")   // 신규 추가
  createdAt  DateTime @default(now())
  project    Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
}
```

마이그레이션 명: `add_file_urls_to_revision_request`

기존 레코드: 마이그레이션 시 `fileUrls = '[]'` (Prisma default) 자동 적용.

---

## 테스트 전략

| SC 식별자 | 테스트 유형 | 시나리오 요약 | 입력 | 기대 결과 |
|---|---|---|---|---|
| SC-101 | 단위 (action) | getCustomerDetail 응답으로 링크 href 확인 | customerId가 있는 고객 | `/projects/new?customerId={id}` 형태 |
| SC-102 | 단위 (action) | convertInquiryToProject에 dueDate 전달 | inquiryId, dueDate | 생성된 Project.dueDate 일치 |
| SC-103 | 단위 (action) | getProjects with q 파라미터 | q='웨딩', 일치하는 프로젝트 존재 | 해당 프로젝트만 반환 |
| SC-104 | 단위 (action) | updateProjectStage → stage 변경 검증 | projectId, stageId | project.currentStageId 업데이트 |
| SC-105 | 단위 (action) | createTimelineMemo | projectId, content | TimelineEvent eventType='MEMO' 생성 |
| SC-106 | 단위 (action) | submitCustomerRevision with fileUrl | token, content, fileUrl | RevisionRequest.fileUrls=[fileUrl], content에 URL 미포함 |
| SC-107 | 단위 (action) | deleteAsset 워크스페이스 검증 | 타 워크스페이스의 assetId | 삭제 거부 (throw 또는 early return) |
| SC-107b | 단위 (action) | deleteAsset 정상 케이스 | 소속 워크스페이스의 assetId | asset 삭제 + ASSET_DELETED 타임라인 이벤트 |
| SC-108 | 단위 (action) | deleteRevisionRequest | 소속 워크스페이스의 revisionId | revisionRequest 삭제 |
| SC-109 | 단위 (UI mock) | CopyLinkButton 복사 동작 | navigator.clipboard mock | writeText 호출 확인 |
| SC-110 | 단위 (action) | getDashboardData 통계 | 진행 중 3개, 마감 임박 1개 | counts.active=3, counts.urgent=1 |

---

## 기타 고려사항

### 스테퍼 overflow 처리
단계가 많은 경우(8개 이상) pill 버튼이 wrap될 수 있다. `flex-wrap`으로 자연스럽게 처리한다. 모바일에서는 줄바꿈이 발생하지만 수용 가능한 범위.

### 타임라인 메모 textarea 초기화
Server Action 성공 후 textarea를 초기화해야 한다. `useActionState`의 상태 변화를 감지하거나, form key를 바꿔 리셋하는 방식 중 형태가 단순한 `key={Date.now()}` 패턴을 피하고 `useRef`로 직접 초기화한다. 단순하게는 `<form>` 에 `ref`를 걸어 `form.reset()` 호출.

### RevisionRequest 타입 생성
`prisma generate` 후 `RevisionRequest` 타입의 `fileUrls`는 `Prisma.JsonValue`로 나온다. action 코드와 UI 코드에서 `(revision.fileUrls as string[] | null) ?? []` 캐스팅을 사용한다.

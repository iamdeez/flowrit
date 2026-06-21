# Tasks: ux-upgrade

> Branch: 001-ux-upgrade | Date: 2026-06-22 | Plan: [plan.md](./plan.md)

## 목차

- [전제 조건](#전제-조건)
- [태스크 목록](#태스크-목록)
- [구현 완료 기준](#구현-완료-기준)

---

## 전제 조건

- [x] spec.md의 모든 `[NEEDS CLARIFICATION]` 항목이 해소되었는가? → 없음
- [x] plan.md의 Constitution Gates가 모두 통과(또는 예외 기재)되었는가? → 4개 통과
- [x] CHANGES.md에서 이전 작업의 "후속 작업 시 주의사항"을 확인했는가?
  - `tests/setup.ts`에 `vi.mock('next-auth', ...)` 전역 mock 필수 — 신규 Server Action에도 동일 적용
  - `prisma.$transaction` 배열형·함수형 두 형태 모두 mock 처리 필요 (`updateProjectStage`, 신규 `deleteAsset`)
  - SESSION mock은 `as never` 단언 사용

---

## 태스크 목록

> [P] 표시: 이전 태스크와 병렬 실행 가능

### Phase 1. 데이터 레이어

- [x] **T101** — RevisionRequest.fileUrls 필드 추가 (스키마 마이그레이션)
  - 구현 파일: `prisma/schema.prisma`
  - 관련 요구사항: `FR-106`
  - 상세:
    ```prisma
    model RevisionRequest {
      // 기존 필드 ...
      fileUrls  Json  @default("[]")
    }
    ```
    `prisma migrate dev --name add_file_urls_to_revision_request` 실행 후 `prisma generate`로 클라이언트 재생성
    (실제 적용: 기존 DB가 migration history 없이 운영되어 `20260101000000_init` baseline으로 히스토리 정리, `RevisionRequest.fileUrls` 포함)
  - 완료 기준: `prisma/migrations/` 폴더에 마이그레이션 파일 생성, `app/generated/prisma` 타입에 `fileUrls` 포함

### Phase 2. 도메인 레이어 (Server Actions)

- [x] **T102** `[P]` — deleteAsset 서버 액션 구현
  - 구현 파일: `lib/actions/asset.ts`
  - 관련 요구사항: `FR-108`
  - 상세:
    1. `requireWorkspaceId()`로 인증 검증
    2. `assetId`로 asset 조회, `project.workspaceId` 일치 확인 (타 워크스페이스 거부)
    3. `prisma.$transaction`으로 asset 삭제 + `ASSET_DELETED` 타임라인 이벤트 기록
    4. `revalidatePath` 처리
  - 완료 기준: 타 워크스페이스 assetId 전달 시 silent return, 정상 케이스 asset+이벤트 삭제

- [x] **T103** `[P]` — deleteRevisionRequest 서버 액션 구현
  - 구현 파일: `lib/actions/revision.ts`
  - 관련 요구사항: `FR-109`
  - 상세:
    1. `requireWorkspaceId()`로 인증 검증
    2. `revisionId`로 revisionRequest 조회, `project.workspaceId` 일치 확인
    3. `prisma.revisionRequest.delete({ where: { id: revisionId } })`
    4. `revalidatePath` 처리
  - 완료 기준: 정상 케이스 삭제, 타 워크스페이스 접근 시 silent return

- [x] **T104** `[P]` — createTimelineMemo 서버 액션 구현
  - 구현 파일: `lib/actions/project.ts`
  - 관련 요구사항: `FR-105`
  - 상세:
    1. `requireWorkspaceId()` 인증 검증
    2. `projectId`, `content` 폼 파라미터 읽기
    3. `content` 빈값 early return
    4. 프로젝트의 workspaceId 일치 확인
    5. `prisma.timelineEvent.create({ data: { projectId, title: content, eventType: 'MEMO' } })`
    6. `revalidatePath(`/projects/${projectId}`)`
  - 완료 기준: MEMO 이벤트가 타임라인에 생성됨

- [x] **T105** `[P]` — getProjects 검색 파라미터 확장
  - 구현 파일: `lib/actions/project.ts`
  - 관련 요구사항: `FR-103`
  - 상세:
    - 함수 시그니처: `getProjects(status?: string, q?: string)`
    - `q`가 있는 경우 Prisma where에 `OR: [{ title: { contains: q, mode: 'insensitive' } }, { customer: { name: { contains: q, mode: 'insensitive' } } }]` 추가
    - 기존 상태 필터(`isProjectDone` 기반)와 AND 조건으로 결합
  - 완료 기준: q 파라미터로 제목/고객명 부분 일치 검색 동작, 기존 status 필터와 병용 가능

- [x] **T106** `[P]` — publicRevision fileUrls 분리 저장
  - 구현 파일: `lib/actions/publicRevision.ts`
  - 관련 요구사항: `FR-106`
  - 상세:
    - `fullContent` 합치기 로직 제거
    - `fileUrls: fileUrl ? [fileUrl] : []` 로 `prisma.revisionRequest.create`에 추가
    - `content`는 원본 그대로 저장
  - 완료 기준: 파일 첨부 제출 시 `content`에 URL 미포함, `fileUrls`에 배열로 저장

- [x] **T107** `[P]` — convertInquiryToProject dueDate 파라미터 추가
  - 구현 파일: `lib/actions/inquiry.ts`
  - 관련 요구사항: `FR-102`
  - 상세:
    - `formData.get('dueDate')`로 날짜 읽기
    - 기존 `parseOptionalDate` 패턴(또는 동일한 파싱 로직) 적용
    - `prisma.project.create`의 `data`에 `dueDate` 추가
  - 완료 기준: 전환 대화상자에서 마감일 입력 시 프로젝트에 반영됨

### Phase 3. 인터페이스 레이어 (UI 컴포넌트)

- [x] **T108** — 고객 상세 → 새 프로젝트 링크 수정
  - 구현 파일: `app/(dashboard)/customers/[id]/page.tsx`
  - 관련 요구사항: `FR-101`
  - 상세:
    - 기존: `href="/projects/new"`
    - 변경: `href={/projects/new?customerId=${customer.id}}`
  - 완료 기준: 클릭 시 URL에 customerId 파라미터 포함

- [x] **T109** — 프로젝트 생성 폼 defaultCustomerId 지원 (T108 완료 후)
  - 구현 파일: `app/(dashboard)/projects/new/page.tsx`, `app/(dashboard)/projects/new/project-form.tsx`
  - 관련 요구사항: `FR-101`
  - 상세:
    - `page.tsx`: `searchParams.customerId` 읽어 `<ProjectForm defaultCustomerId={customerId}>` 전달
    - `project-form.tsx`: `defaultCustomerId?: string` prop 추가, 고객 `<select>`의 `defaultValue={defaultCustomerId ?? ''}` 적용
  - 완료 기준: `?customerId=xxx` URL로 접근 시 해당 고객이 미리 선택됨

- [x] **T110** — 프로젝트 목록 검색 폼 추가 (T105 완료 후)
  - 구현 파일: `app/(dashboard)/projects/page.tsx`
  - 관련 요구사항: `FR-103`
  - 상세:
    - `next/form` (`<Form action="/projects">`) 사용, `name="q"` input 추가
    - `searchParams.q` 읽어 `getProjects(status, q)` 호출
    - 검색창을 기존 상태 필터 버튼 위 또는 옆에 배치
    - 고객 목록과 동일한 스타일 적용
  - 완료 기준: 검색어 입력·제출 시 URL `?q=검색어` 파라미터 추가, 결과 필터링 동작

- [x] **T111** — 단계 시각화 스테퍼로 교체 (T105 완료 후)
  - 구현 파일: `app/(dashboard)/projects/[id]/stage-form.tsx`
  - 관련 요구사항: `FR-104`
  - 상세:
    - `currentStageId`와 `stages`를 받아 각 단계를 pill 버튼으로 렌더링
    - 현재 단계 인덱스: `stages.findIndex(s => s.id === currentStageId)` (없으면 -1)
    - 각 단계 버튼을 독립 `<form action={updateProjectStage}>` 로 감싸기
    - 스타일: 완료 단계 = 어두운 채움색 + 체크 아이콘, 현재 단계 = 강조색(indigo), 미래 단계 = 비활성(gray)
    - 현재 단계 버튼은 `disabled` (재선택 불필요)
    - 단계 없는 경우 "단계 없음" 텍스트 표시
  - 완료 기준: 각 단계가 pill로 표시되고 클릭 시 해당 단계로 변경됨

- [x] **T112** — 타임라인 탭 메모 입력 폼 추가 (T104 완료 후)
  - 구현 파일: `app/(dashboard)/projects/[id]/page.tsx` (타임라인 탭 섹션)
  - 관련 요구사항: `FR-105`
  - 상세:
    - 타임라인 목록 위에 메모 입력 `<form>` 추가
    - `<textarea>` (rows=3) + "메모 저장" `<button type="submit">`
    - `<input type="hidden" name="projectId">`
    - form action: `createTimelineMemo`
    - `MEMO` 이벤트 표시 스타일: 메모 아이콘 + 텍스트 내용 (기존 단계 변경 이벤트와 구분)
  - 완료 기준: 메모 저장 후 타임라인에 MEMO 이벤트가 나타남

- [x] **T113** `[P]` — 수정 요청 첨부 파일 표시 추가 (T101, T106 완료 후)
  - 구현 파일: `app/(dashboard)/projects/[id]/page.tsx` (revisions 탭)
  - 관련 요구사항: `FR-107`
  - 상세:
    - 각 revision 렌더링 블록에서 `(revision.fileUrls as string[]).length > 0` 일 때 "첨부 파일" 섹션 렌더링
    - 각 파일 URL을 `<a href>` 링크로 표시 (파일명은 URL 마지막 세그먼트 또는 "첨부파일 {n}")
    - `Paperclip` 아이콘 사용
  - 완료 기준: fileUrls가 있는 수정 요청에서 첨부 파일 링크가 표시됨

- [x] **T114** `[P]` — revisions 페이지 첨부 파일 표시 추가 (T101, T106 완료 후)
  - 구현 파일: `app/(dashboard)/revisions/page.tsx`
  - 관련 요구사항: `FR-107`
  - 상세: T113과 동일한 첨부 파일 섹션 렌더링 추가
  - 완료 기준: 전체 수정 요청 목록에서도 첨부 파일 링크가 표시됨

- [x] **T115** `[P]` — 에셋 삭제 버튼 추가 (T102 완료 후)
  - 구현 파일: `app/(dashboard)/projects/[id]/asset-status-form.tsx`
  - 관련 요구사항: `FR-108`
  - 상세:
    - 기존 상태 변경 UI 옆에 삭제 버튼(`<form action={deleteAsset}><input name="assetId"...>`) 추가
    - 삭제 버튼 스타일: 작은 빨간색 텍스트 버튼 또는 아이콘 버튼(`Trash2` 아이콘)
  - 완료 기준: 삭제 버튼 클릭 시 에셋 제거 및 목록에서 사라짐

- [x] **T116** `[P]` — 수정 요청 삭제 버튼 추가 (T103 완료 후)
  - 구현 파일: `app/(dashboard)/projects/[id]/revision-status-form.tsx`
  - 관련 요구사항: `FR-109`
  - 상세:
    - 기존 상태 변경 버튼 아래에 삭제 폼(`<form action={deleteRevisionRequest}>`) 추가
    - 삭제 버튼 스타일: 작은 회색 또는 빨간색 텍스트 버튼
  - 완료 기준: 삭제 버튼 클릭 시 수정 요청 제거 및 목록에서 사라짐

- [x] **T117** `[P]` — 공유 링크 복사 버튼 추가
  - 구현 파일: `app/(dashboard)/projects/[id]/public-page-form.tsx`, `app/(dashboard)/projects/[id]/page.tsx`
  - 관련 요구사항: `FR-110`
  - 상세:
    - `page.tsx`: `<PublicPageForm shareLink={shareLink}>` 로 shareLink 전달 (publicPage 없는 경우 undefined)
    - `public-page-form.tsx`: `shareLink?: string` prop 추가
    - `shareLink`가 있고 publicPage가 active일 때 복사 버튼 렌더링
    - 복사 로직: `navigator.clipboard.writeText(shareLink)`
    - 복사 성공 2초 후 상태 원복
  - 완료 기준: 활성 공유 링크가 있는 프로젝트에서 복사 버튼이 표시되고 클릭 시 URL이 클립보드에 복사됨

- [x] **T118** — 대시보드 통계 카드 추가
  - 구현 파일: `app/(dashboard)/dashboard/page.tsx`
  - 관련 요구사항: `FR-111`
  - 상세:
    - `getDashboardData`에 `activeCount` (완료되지 않은 프로젝트 전체 수), `urgentCount` (마감 2일 이내, 미완료) 추가
    - 대시보드 상단(신규 접수 섹션 위)에 통계 카드 2개 추가:
      - "진행 중" 카드: `activeCount` 표시
      - "마감 임박" 카드: `urgentCount` 표시 (0이면 강조 없이 표시)
    - 카드 디자인: 기존 대시보드 스타일(rounded-xl, border, bg-white)과 통일
  - 완료 기준: 대시보드 상단에 진행 중 N건, 마감 임박 N건 카드가 표시됨

- [x] **T119** — 의뢰 전환 대화상자 마감일 필드 추가 (T107 완료 후)
  - 구현 파일: `app/(dashboard)/dashboard/convert-dialog.tsx`
  - 관련 요구사항: `FR-102`
  - 상세:
    - 프로젝트 제목 입력 아래에 마감일 `<input type="date" name="dueDate">` 추가
    - 레이블: "마감일 (선택)"
    - 필수값 아님 (`required` 없음)
  - 완료 기준: 마감일 입력 후 전환 시 프로젝트에 해당 날짜 반영됨

### Phase 4. 테스트 (D 레이어)

- [x] **T120** — SC-101~SC-110 Vitest 테스트 구현
  - 테스트 파일: `tests/ux-upgrade.test.ts`
  - 관련 요구사항: 전체 SC-101~SC-110
  - 상세:
    - **SC-101**: `getCustomerDetail` mock → `/projects/new?customerId=xxx` 링크 href 검증 (단위 로직 검증)
    - **SC-102**: `convertInquiryToProject` mock에서 `project.create` 호출 시 dueDate 인자 확인
    - **SC-103**: `getProjects` mock에서 q 파라미터 있을 때 Prisma OR 조건 확인
    - **SC-104**: `updateProjectStage` mock → `project.currentStageId` 업데이트 확인
    - **SC-105**: `createTimelineMemo` → `timelineEvent.create` 호출 + eventType='MEMO' 확인
    - **SC-106**: `submitCustomerRevision` with fileUrl → `revisionRequest.create`의 `fileUrls=[fileUrl]`, content에 URL 미포함 확인
    - **SC-107**: `deleteAsset` 정상/타 워크스페이스 두 케이스
    - **SC-108**: `deleteRevisionRequest` 정상 케이스
    - **SC-109**: `navigator.clipboard.writeText` mock → 복사 버튼 동작 (vitest-mock-extended 또는 vi.spyOn)
    - **SC-110**: `getDashboardData` mock → activeCount, urgentCount 반환 확인
  - 완료 기준: `pnpm test` 기준 T120 관련 테스트 전체 PASSED

---

## 구현 완료 기준

- [x] T101~T119 체크박스 전체 완료 처리됨
- [x] `prisma migrate dev`가 에러 없이 완료됨
- [x] `pnpm typecheck` 에러 0건
- [x] `pnpm test` 전체 PASSED (기존 72개 + 신규 11개 = 83개, `npm test`로 검증)
- [x] `git status`에 의도치 않은 파일 없음

---
작성: Design Agent
버전: v1.0
최종 수정: 2026-06-22 21:34
상태: 확정
---

# Tasks: 수정 요청 댓글 스레드 (revision-comment-threads)

> Branch: 001-revision-comment-threads | Date: 2026-06-22 | Plan: [../planning/plan.md](../planning/plan.md)

## 목차

- [전제 조건](#전제-조건)
- [태스크 목록](#태스크-목록)
  - [Step 1. 데이터 계층 (A)](#step-1-데이터-계층-a)
  - [Step 2. 도메인 계층 — 공유 유틸리티 (B)](#step-2-도메인-계층--공유-유틸리티-b)
  - [Step 3. 도메인 계층 — Server Actions (B)](#step-3-도메인-계층--server-actions-b)
  - [Step 4. 인터페이스 계층 — 신규 UI 컴포넌트 (C)](#step-4-인터페이스-계층--신규-ui-컴포넌트-c)
  - [Step 5. 인터페이스 계층 — 기존 페이지 통합 (C)](#step-5-인터페이스-계층--기존-페이지-통합-c)
  - [Step 6. 테스트 계층 (D)](#step-6-테스트-계층-d)
- [Test Authoring Contract](#test-authoring-contract)
- [구현 완료 기준](#구현-완료-기준)

---

## 전제 조건

- [x] spec.md의 모든 `[NEEDS CLARIFICATION]` 항목이 해소되었는가? — 0건
- [x] plan.md의 Constitution Gates가 모두 통과(또는 예외 기재)되었는가? — P-001~P-006 모두 PASS
- [x] CHANGES.md에서 이전 작업의 "후속 작업 시 주의사항"을 확인했는가?

---

## 태스크 목록

> [P] 표시: 이전 태스크와 병렬 실행 가능
>
> | 레이어 | 대상 |
> |---|---|
> | A. 데이터 계층 | DB 스키마, Prisma 마이그레이션 |
> | B. 도메인 계층 | 공유 유틸리티 함수, Server Actions |
> | C. 인터페이스 계층 | 신규 UI 컴포넌트, 기존 페이지 통합 |
> | D. 테스트 계층 | 단위 테스트 (5a Test Agent 담당) |

### Step 1. 데이터 계층 (A)

- [x] **T001** — Prisma 스키마 업데이트 및 마이그레이션
  - 레이어: A
  - 구현 파일: `prisma/schema.prisma`
  - 관련 요구사항: `FR-001`, `FR-004~FR-009`, `NFR-004`, `NFR-005`
  - 상세:
    1. `RevisionComment` 신규 모델 추가 (plan.md 데이터 모델 절 참조):
       - 필드: `id(cuid)`, `revisionId`, `parentId?`, `authorType(String)`, `authorName`, `authorEmail?`, `content`, `createdAt`
       - Relation: `revision RevisionRequest @relation(onDelete: Cascade)`
       - Self-relation: `parent RevisionComment? @relation("CommentReplies")`, `replies RevisionComment[] @relation("CommentReplies", onDelete: Restrict)`
       - 인덱스: `@@index([revisionId, createdAt])`
    2. `RevisionRequest` 모델에 `comments RevisionComment[]` relation 추가
    3. `npx prisma migrate dev --name add-revision-comment-threads` 실행 (Prisma Client 자동 재생성 포함)
  - 완료 기준: `prisma/migrations/` 하위에 마이그레이션 파일 생성, `@/app/generated/prisma/client`에 `revisionComment` 메서드 노출 확인

### Step 2. 도메인 계층 — 공유 유틸리티 (B)

- [x] **T002** — `lib/notifications.ts` — `REVISION_COMMENT` 알림 타입 추가 (T001 완료 후)
  - 레이어: B
  - 구현 파일: `lib/notifications.ts`
  - 관련 요구사항: `FR-010`, `ADR-004`
  - 상세:
    1. `NotificationType` union에 `'REVISION_COMMENT'` 추가
    2. `settingKeys` Record에 `REVISION_COMMENT: 'notify_revision_comment'` 항목 추가
  - 완료 기준: TypeScript 컴파일 오류 없음, `sendNotification({ type: 'REVISION_COMMENT', ... })` 호출 시 타입 오류 없음

- [x] **T003** `[P]` — `lib/email.ts` — `sendRevisionCommentReplyEmail()` 함수 추가 (T001 완료 후)
  - 레이어: B
  - 구현 파일: `lib/email.ts`
  - 관련 요구사항: `FR-011`, `ADR-005`
  - 상세:
    1. `sendRevisionCommentReplyEmail(to: string, payload: { authorName: string; revisionContent: string; replyContent: string; portalUrl: string }): Promise<void>` 함수 추가
    2. 기존 `emailWrapper()` + `actionLink()` 헬퍼 패턴 사용
    3. 사용자 입력값(`replyContent`, `revisionContent`)에 `escapeHtml()` 적용
    4. 제목: `[Flowrit] 수정 요청에 답글이 달렸습니다`
    5. 본문: 작업자 이름, 원 수정 요청 내용(맥락), 답글 내용, 포털 링크 포함
  - 완료 기준: 함수 named export 확인, TypeScript 오류 없음

### Step 3. 도메인 계층 — Server Actions (B)

- [x] **T004** — `lib/actions/revisionComment.ts` 신규 생성 (T001 + T003 완료 후)
  - 레이어: B
  - 구현 파일: `lib/actions/revisionComment.ts` (신규)
  - 관련 요구사항: `FR-001`, `FR-004`, `FR-005`, `FR-006`, `FR-011`, `FR-012`, `NFR-002`, `NFR-004`, `NFR-005`, `NFR-006`
  - 상세:
    1. `'use server'` 지시어 선언
    2. **`getRevisionComments(revisionId: string)`** 구현:
       - `requireAuth()`로 `workspaceId` 획득 (기존 `revision.ts` 헬퍼 패턴 재사용)
       - `prisma.revisionComment.findMany`: `where: { revisionId, parentId: null, revision: { project: { workspaceId } } }`, `include: { replies: { orderBy: { createdAt: 'asc' } } }`, `orderBy: { createdAt: 'asc' }` (NFR-004, NFR-006)
       - 반환 타입: `RevisionCommentWithReplies[]` (plan.md 인터페이스 계약 절 참조)
    3. **`addRevisionComment(prevState, formData)`** 구현:
       - `requireAuth()`로 `workspaceId`, `userId`, `name` 획득
       - `content` 유효성: 1~2000자 (NFR-002)
       - 소유권 확인: `prisma.revisionRequest.findFirst({ where: { id: revisionId, project: { workspaceId } }, include: { project: { include: { publicPage: { select: { token: true } } } } } })` — 없으면 에러 반환
       - `parentId` 있는 경우 depth=1 강제: 부모 `parentId !== null` 이면 에러 반환 (NFR-005)
       - `prisma.revisionComment.create({ data: { revisionId, parentId: parentId || null, authorType: 'WORKER', authorName: session.user.name, content } })`
       - 답글이고 부모 `authorType === 'CLIENT'` 이며 `authorEmail` 존재하면 `sendRevisionCommentReplyEmail()` 호출 (FR-011). `portalUrl`: `${process.env.NEXT_PUBLIC_APP_URL}/p/${revision.project.publicPage?.token}`
       - `revalidatePath(\`/projects/${revision.projectId}\`)`, `revalidatePath('/revisions')`
       - 반환: `{ error?: string; success?: string }`
  - 완료 기준: `'use server'` 포함, workspaceId 격리 쿼리 포함, TypeScript 오류 없음

- [x] **T005** `[P]` — `lib/actions/publicRevisionComment.ts` 신규 생성 (T001 + T002 완료 후)
  - 레이어: B
  - 구현 파일: `lib/actions/publicRevisionComment.ts` (신규)
  - 관련 요구사항: `FR-007`, `FR-008`, `FR-009`, `FR-010`, `NFR-001`, `NFR-002`, `NFR-003`, `NFR-005`
  - 상세:
    1. `'use server'` 지시어 선언
    2. **`addClientRevisionComment(prevState, formData)`** 구현:
       - `token` → `prisma.publicProjectPage.findUnique({ where: { token, isActive: true } })` — 없으면 에러 반환 (NFR-003)
       - `revisionId` → `prisma.revisionRequest.findFirst({ where: { id: revisionId, projectId: page.projectId } })` — 없으면 에러 반환
       - `authorName` 유효성: 1~100자 (NFR-001)
       - `authorEmail` 유효성: 입력된 경우 RFC 5321 regex 검사 (NFR-001), 빈 문자열이면 null 처리
       - `content` 유효성: 1~2000자 (NFR-002)
       - `parentId` 있는 경우 depth=1 강제 (NFR-005)
       - `prisma.revisionComment.create({ data: { revisionId, parentId: parentId || null, authorType: 'CLIENT', authorName, authorEmail: authorEmail || null, content } })`
       - FR-010 인앱 알림: `project.assigneeId ? [project.assigneeId] : <OWNER 목록>` 로 `targetUserIds` 결정 후 `sendNotification({ type: 'REVISION_COMMENT', ... })` 호출
         - OWNER 목록 조회: 기존 헬퍼 재사용 가능 시 import, 없으면 `prisma.workspaceMember.findMany({ where: { workspaceId, role: 'OWNER' }, select: { userId: true } })` 패턴으로 로컬 구현
       - `revalidatePath(\`/p/${token}\`)`
       - 반환: `{ error?: string; success?: boolean }`
  - 완료 기준: `'use server'` 포함, 토큰 검증 포함, TypeScript 오류 없음

### Step 4. 인터페이스 계층 — 신규 UI 컴포넌트 (C)

- [x] **T006** — `app/(dashboard)/projects/[id]/revision-comment-section.tsx` 신규 생성 (T004 완료 후)
  - 레이어: C
  - 구현 파일: `app/(dashboard)/projects/[id]/revision-comment-section.tsx` (신규)
  - 관련 요구사항: `FR-001`, `FR-002`, `FR-004`, `FR-005`, `FR-006`, `ADR-006`
  - 상세:
    1. `async` Server Component: `{ revisionId: string }` props로 `getRevisionComments(revisionId)` 호출
    2. 댓글 목록 렌더링: 루트 댓글 → `replies` 배열 하위 렌더링 (2단계 트리)
    3. `authorType` 표시: `WORKER` → 작업자 이름, `CLIENT` → 입력한 이름 (FR-006, FR-009)
    4. 댓글 작성 폼: `addRevisionComment` Server Action 바인딩
       - 최상위 댓글 폼: `revisionId` 숨김 필드, `content` textarea
       - 답글 폼: `revisionId` + `parentId` 숨김 필드 포함
       - 폼 상태 관리(`useActionState`) 부분은 `'use client'` 분리 컴포넌트로 처리
    5. UX: 답글에는 "답글 달기" 버튼 미표시 (plan.md 기타 고려사항 §깊이 제한 강제 시점 참조)
  - 완료 기준: 컴포넌트 named/default export, TypeScript 오류 없음

- [x] **T007** `[P]` — `app/p/[token]/revision-comment-form.tsx` 신규 생성 (T005 완료 후)
  - 레이어: C
  - 구현 파일: `app/p/[token]/revision-comment-form.tsx` (신규)
  - 관련 요구사항: `FR-007`, `FR-008`, `FR-009`, `NFR-001`, `NFR-002`
  - 상세:
    1. `'use client'` Client Component
    2. props: `{ token: string; revisionId: string; parentId?: string; comments: RevisionCommentWithReplies[] }`
    3. `addClientRevisionComment` Server Action을 `useActionState`로 바인딩
    4. 입력 필드: 이름(필수, maxLength=100), 이메일(선택), 본문(필수, maxLength=2000)
    5. 숨김 필드: `token`, `revisionId`, `parentId?`
    6. 제출 성공 시 폼 초기화 (`success: true` 반환 시 처리), 에러 시 메시지 표시
    7. 기존 댓글 목록 표시: props로 받은 `comments` 렌더링 (루트 + replies 트리)
    8. `authorEmail`은 렌더링에서 제외 (plan.md 기타 고려사항 §공개 댓글 조회 시 authorEmail 노출 방지)
  - 완료 기준: 컴포넌트 export, TypeScript 오류 없음

### Step 5. 인터페이스 계층 — 기존 페이지 통합 (C)

- [x] **T008** — `app/(dashboard)/projects/[id]/page.tsx` 통합 (T006 완료 후)
  - 레이어: C
  - 구현 파일: `app/(dashboard)/projects/[id]/page.tsx`
  - 관련 요구사항: `FR-002`, `ADR-006`
  - 상세:
    1. `RevisionCommentSection` import 추가
    2. revisions 탭(`tab === 'revisions'`) 내 `project.revisions.map(...)` 루프에서 각 revision 카드 하단에 `<RevisionCommentSection revisionId={revision.id} />` 삽입
    3. 기존 레이아웃·렌더링 로직 불변 (revision 목록, `RevisionForm` 등)
  - 완료 기준: TypeScript 오류 없음, 기존 revision 목록 표시 동작 불변

- [x] **T009** `[P]` — `app/p/[token]/page.tsx` 통합 (T007 완료 후)
  - 레이어: C
  - 구현 파일: `app/p/[token]/page.tsx`
  - 관련 요구사항: `FR-003`, `FR-007`, `FR-008`
  - 상세:
    1. 기존 revisions 쿼리 include 확장 — `revisions: { orderBy: ..., include: { comments: { where: { parentId: null }, include: { replies: { orderBy: { createdAt: 'asc' } } }, orderBy: { createdAt: 'asc' } } } }`
    2. `select`에서 `authorEmail` 제외 (클라이언트 이메일 미노출)
    3. 각 revision 섹션에 `<RevisionCommentForm token={token} revisionId={revision.id} comments={revision.comments} />` 삽입
    4. 기존 "수정 요청 현황" 섹션 레이아웃 불변
  - 완료 기준: TypeScript 오류 없음, 기존 페이지 기능 불변

### Step 6. 테스트 계층 (D)

- [x] **T010** — `tests/revisionComment.test.ts` 작성 — SC-003~SC-015 단위 테스트
  - 레이어: D
  - 테스트 파일: `tests/revisionComment.test.ts` (신규)
  - 관련 SC: SC-003, SC-004, SC-005, SC-006, SC-007, SC-008, SC-009, SC-010, SC-011, SC-012, SC-013, SC-014, SC-015
  - 상세: 아래 `Test Authoring Contract` 절 참조
  - 완료 기준: SC-003~SC-015 전 케이스 작성 완료, vitest 실행 시 컴파일 오류 없음

> 본 Step의 태스크(레이어 D)는 **5a 단계 Test Agent (AUTHORING)** 가 PPG-1 시작 시 수행한다.
> Development Agent (4단계)는 T001~T009 (A·B·C 레이어)만 진행한다.
> 양 Agent는 동일 응답 turn 내 동시 spawn되어 병렬 진행한다.

---

## Test Authoring Contract

> **PPG-1의 5a 단계 Test Agent (AUTHORING) 입력 contract**

### 공통 mock 전제

- `tests/setup.ts`에서 `next/cache`, `next/navigation`, `next-auth` 전역 mock 설정됨 — 개별 파일에서 재설정 불필요
- Prisma mock: `mockDeep<PrismaClient>()` 패턴, import 경로 `@/app/generated/prisma/client`
- 신규 추가 mock (파일 상단 호이스팅):
  - `vi.mock('@/lib/email', () => ({ sendRevisionCommentReplyEmail: vi.fn() }))`
  - `vi.mock('@/lib/notifications', () => ({ sendNotification: vi.fn() }))`
- `auth` mock: `vi.mocked(auth).mockResolvedValue(SESSION)` (`SESSION = { user: { workspaceId, id, name } }`)

### SC-XXX 별 테스트 케이스 목록

| SC-ID | 수용 기준 요약 | Happy Path 함수명 | Edge / Error Case 함수명 | 테스트 파일 경로 | 비고 |
|---|---|---|---|---|---|
| SC-003 | 작업자 최상위 댓글 작성 → DB 저장, authorType=WORKER, authorName=세션이름 | `test_addRevisionComment_creates_worker_top_level_comment` | — | `tests/revisionComment.test.ts` | [env:unit] |
| SC-004 | 작업자 답글 작성 → parentId 설정됨 | `test_addRevisionComment_creates_worker_reply_with_parentId` | — | `tests/revisionComment.test.ts` | [env:unit] |
| SC-005 | 클라이언트 댓글 작성 → DB 저장, authorType=CLIENT, authorName=입력값 | `test_addClientRevisionComment_creates_client_comment` | — | `tests/revisionComment.test.ts` | [env:unit] |
| SC-006 | 클라이언트 답글 작성 → parentId 설정됨 | `test_addClientRevisionComment_creates_client_reply_with_parentId` | — | `tests/revisionComment.test.ts` | [env:unit] |
| SC-007 | 클라이언트 댓글 → sendNotification 호출, type=REVISION_COMMENT, userIds=[assigneeId] | `test_addClientRevisionComment_notifies_assignee` | `test_addClientRevisionComment_notifies_owner_when_no_assignee` | `tests/revisionComment.test.ts` | [env:unit] |
| SC-008 | 작업자 답글 시 클라이언트 이메일 발송 / 미입력 시 미발송 | `test_addRevisionComment_reply_to_client_sends_email` | `test_addRevisionComment_reply_to_client_no_email_skips_send` | `tests/revisionComment.test.ts` | [env:unit] |
| SC-009 | DONE 상태 수정 요청에 달린 댓글 정상 조회 | `test_getRevisionComments_returns_comments_for_done_status_revision` | — | `tests/revisionComment.test.ts` | [env:unit] |
| SC-010 | 클라이언트 이름 빈값·101자 초과 거부 | — | `test_addClientRevisionComment_rejects_empty_name`, `test_addClientRevisionComment_rejects_name_over_100_chars` | `tests/revisionComment.test.ts` | [env:unit] |
| SC-011 | RFC 5321 형식 아닌 이메일 거부 | — | `test_addClientRevisionComment_rejects_invalid_email_format` | `tests/revisionComment.test.ts` | [env:unit] |
| SC-012 | 댓글 본문 빈값·2001자 초과 거부 (작업자·클라이언트 공통) | — | `test_addRevisionComment_rejects_empty_content`, `test_addRevisionComment_rejects_content_over_2000_chars`, `test_addClientRevisionComment_rejects_empty_content` | `tests/revisionComment.test.ts` | [env:unit] |
| SC-013 | 유효하지 않은 토큰으로 클라이언트 댓글 거부 | — | `test_addClientRevisionComment_rejects_invalid_token` | `tests/revisionComment.test.ts` | [env:unit] |
| SC-014 | 답글(depth=1)에 재답글 시도 거부 (작업자·클라이언트 공통) | — | `test_addRevisionComment_rejects_reply_to_depth1_comment`, `test_addClientRevisionComment_rejects_reply_to_depth1_comment` | `tests/revisionComment.test.ts` | [env:unit] |
| SC-015 | getRevisionComments → createdAt 오름차순 정렬 쿼리 확인 | `test_getRevisionComments_orders_by_createdAt_asc` | — | `tests/revisionComment.test.ts` | [env:unit] |

> **SC-001, SC-002 (`[env:integration]`)**: Next.js App Router Server Component 렌더링 환경 필요. 현재 Playwright E2E 미구성으로 자동화 불가. plan.md 테스트 전략 §사후 운영 검증 피드백 사이클의 수동 확인 시나리오로 대체.

---

## 구현 완료 기준

- [x] 모든 태스크 체크박스(T001~T010) 완료
- [x] `npx tsc --noEmit` TypeScript 오류 0건
- [x] `npx vitest run tests/revisionComment.test.ts` 전체 PASSED
- [ ] `git status`에 의도치 않은 파일 없음

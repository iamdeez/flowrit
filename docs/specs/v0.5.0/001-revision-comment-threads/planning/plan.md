---
작성: Planning Agent
버전: v1.0
최종 수정: 2026-06-22
상태: 확정
---

# Plan: 수정 요청 댓글 스레드 (revision-comment-threads)

> Branch: 001-revision-comment-threads | Date: 2026-06-22 | Spec: [../spec/spec.md](../spec/spec.md)

## 목차

- [사전 검증 (Constitution Gates)](#사전-검증-constitution-gates)
- [기술 컨텍스트](#기술-컨텍스트)
- [핵심 설계](#핵심-설계)
- [결정 기록 (ADRs)](#결정-기록-adrs)
- [인터페이스 계약](#인터페이스-계약)
- [데이터 모델](#데이터-모델)
- [테스트 전략](#테스트-전략)
- [기타 고려사항](#기타-고려사항)

---

## 사전 검증 (Constitution Gates)

> constitution.md P-001 ~ P-006 조항을 Gates로 사용한다.

- [x] **P-001 워크스페이스 데이터 격리**: 작업자 댓글 조회·작성 Server Action은 `revisionRequest.project.workspaceId = session.user.workspaceId` 조건을 where 절에 포함한다. RevisionComment 모델에 workspaceId를 직접 저장하지 않더라도 쿼리에서 join으로 격리가 적용된다. **Pass.**
- [x] **P-002 RBAC 역할 경계**: 댓글 작성은 OWNER/ADMIN/MEMBER 모두 허용. 새로운 제한 경로 없음. 기존 proxy.ts·sidebar-nav.tsx 수정 불필요. **Pass.**
- [x] **P-003 NextAuth JWT 세션**: 작업자 인증은 기존 `auth()` 호출로 session.user.workspaceId·id를 사용. 별도 인증 메커니즘 미도입. 공개 댓글은 token 기반(PublicProjectPage) — NextAuth 세션과 별개이지만 기존 패턴(`submitCustomerRevision`)을 동일하게 따름. **Pass.**
- [x] **P-004 Next.js 16 버전 준수**: Server Actions + App Router + async 서버 컴포넌트 패턴. `useFormState`/`useActionState`는 React 19 App Router 방식 사용. **Pass.**
- [x] **P-005 파일 업로드 크기 원칙**: 본 spec은 텍스트 전용 댓글. 파일 업로드 없음. 무관. **Pass.**
- [x] **P-006 테스트 원칙**: 신규 Server Action 전체에 Vitest 단위 테스트 작성. SC-003~SC-015는 `[env:unit]` 태그로 단위 테스트 의무. **Pass (조건부: 테스트 파일 구현 시 충족).**

**예외 사항**: 없음.

---

## 기술 컨텍스트

- **언어 / 런타임**: TypeScript, Node.js (Next.js 16.2.9 App Router)
- **주요 의존성**:
  - Prisma 7 + PrismaPg adapter (PostgreSQL/Neon) — Prisma 출력 경로 `app/generated/prisma/`, import 시 `@/app/generated/prisma/client`
  - NextAuth v5 beta — `auth()` 세션 조회
  - Resend — 이메일 발송 (`lib/email.ts`)
  - `lib/notifications.ts` — 인앱 알림 단일 진입점 (`sendNotification()`)
- **테스트 프레임워크**: Vitest 4 + vitest-mock-extended (node 환경)
  - `tests/setup.ts`: next/cache·next/navigation·next-auth mock 설정
  - Prisma: 각 테스트 파일에서 `mockDeep<PrismaClient>()` 개별 mock

---

## 핵심 설계

### 전체 흐름

```
[작업자 댓글 흐름]
작업자 → 대시보드 (/projects/[id] 또는 /revisions)
       → RevisionCommentForm (Server Component 폼 또는 Client 컴포넌트)
       → addRevisionComment() Server Action
       → prisma.revisionComment.create()
       → (답글이 클라이언트 댓글에 대한 경우) sendRevisionCommentReplyEmail()
       → revalidatePath()

[클라이언트 댓글 흐름]
클라이언트 → /p/[token]
           → ClientRevisionCommentForm
           → addClientRevisionComment() Server Action
           → token 검증 → revisionId 소유권 검증 → depth 검증
           → prisma.revisionComment.create()
           → sendNotification(type: 'REVISION_COMMENT', ...) → 인앱 알림 생성
           → revalidatePath('/p/[token]') 등
```

### 신규 Server Action 파일 구조

**`lib/actions/revisionComment.ts`** (작업자 인증 필요):
- `getRevisionComments(revisionId: string)` — workspaceId 격리 쿼리로 댓글 목록 반환
- `addRevisionComment(prevState, formData)` — 작업자 댓글 작성 (최상위 또는 답글)

**`lib/actions/publicRevisionComment.ts`** (비인증, 토큰 기반):
- `addClientRevisionComment(prevState, formData)` — 클라이언트 댓글 작성 (최상위 또는 답글)

### 댓글 조회 로직 (`getRevisionComments`)

```typescript
// workspaceId 격리: revisionRequest → project → workspaceId (P-001)
const rootComments = await prisma.revisionComment.findMany({
  where: {
    revisionId,
    parentId: null,
    revision: { project: { workspaceId } },
  },
  include: {
    replies: {
      orderBy: { createdAt: 'asc' },
    },
  },
  orderBy: { createdAt: 'asc' },
})
```

반환 타입: 루트 댓글 배열, 각 항목에 `replies` 배열 포함 (2단계 트리 구조).

### 작업자 댓글 작성 (`addRevisionComment`)

입력 검증:
1. `session.user.workspaceId` + `session.user.id` 확인
2. `revisionId` → `prisma.revisionRequest.findFirst({ where: { id: revisionId, project: { workspaceId } } })` 로 소유권 확인
3. `content` 길이: 1~2000자 (NFR-002)
4. `parentId` 있는 경우: 부모 댓글의 `parentId`가 null인지 확인 (NFR-005 depth=1 강제)

생성:
```typescript
await prisma.revisionComment.create({
  data: {
    revisionId,
    parentId: parentId || null,
    authorType: 'WORKER',
    authorName: session.user.name,
    content,
  },
})
```

FR-011 이메일 트리거 (답글인 경우):
- 부모 댓글 조회 → `authorType === 'CLIENT'` && `authorEmail` 존재하면 `sendRevisionCommentReplyEmail()` 호출

### 클라이언트 댓글 작성 (`addClientRevisionComment`)

입력 검증:
1. `token` → `prisma.publicProjectPage.findUnique({ where: { token, isActive: true } })` → `projectId` 획득
2. `revisionId` → `prisma.revisionRequest.findFirst({ where: { id: revisionId, projectId } })` → 소유권 확인
3. `authorName` 길이: 1~100자 (NFR-001)
4. `authorEmail` 형식: 있으면 RFC 5321 regex (NFR-001)
5. `content` 길이: 1~2000자 (NFR-002)
6. `parentId` 있는 경우: 부모 댓글 `parentId=null` 확인 (NFR-005)

생성 + 알림:
```typescript
const comment = await prisma.revisionComment.create({
  data: {
    revisionId,
    parentId: parentId || null,
    authorType: 'CLIENT',
    authorName,
    authorEmail: authorEmail || null,
    content,
  },
})

// FR-010: assignee 또는 OWNER에게 인앱 알림
const project = await prisma.project.findFirst({
  where: { id: publicPage.projectId },
  select: { workspaceId: true, assigneeId: true },
})
const targetUserIds = project.assigneeId
  ? [project.assigneeId]
  : await getWorkspaceOwnerIds(project.workspaceId)

await sendNotification({
  userIds: targetUserIds,
  workspaceId: project.workspaceId,
  type: 'REVISION_COMMENT',
  title: '수정 요청에 새 댓글이 달렸습니다',
  body: `${authorName}: ${content.slice(0, 80)}`,
  href: `/projects/${publicPage.projectId}?tab=revisions`,
})
```

### 공개 댓글 조회

`app/(public)/p/[token]/` 페이지에서 사용하는 데이터 조회:
```typescript
// 토큰으로 projectId 조회 후 해당 프로젝트의 revisionId 확인
const comments = await prisma.revisionComment.findMany({
  where: {
    revisionId,
    revision: { projectId: publicPage.projectId },
    parentId: null,
  },
  include: { replies: { orderBy: { createdAt: 'asc' } } },
  orderBy: { createdAt: 'asc' },
})
```

### 알림 타입 확장

`lib/notifications.ts`에 `REVISION_COMMENT` 추가:
```typescript
export type NotificationType =
  | 'NEW_INQUIRY'
  | 'REVISION_SUBMITTED'
  | 'STAGE_CHANGED'
  | 'DEADLINE_SOON'
  | 'REVISION_COMMENT'  // 신규

const settingKeys: Record<NotificationType, string> = {
  // ...기존...
  REVISION_COMMENT: 'notify_revision_comment',
}
```

### 이메일 함수 추가

`lib/email.ts`에 `sendRevisionCommentReplyEmail()` 추가:
```typescript
export async function sendRevisionCommentReplyEmail(
  to: string,
  payload: {
    authorName: string    // 작업자 이름
    revisionContent: string  // 수정 요청 원문 (맥락 제공)
    replyContent: string
    portalUrl: string     // /p/[token] URL
  }
): Promise<void>
```

---

## 결정 기록 (ADRs)

| ADR-ID | 결정 항목 | 채택안 | 대안 | 근거 (spec FR/NFR 참조) | 영향 범위 |
|---|---|---|---|---|---|
| ADR-001 | RevisionComment의 workspaceId 저장 여부 | 미저장 — 쿼리 시 `revision.project.workspaceId` join으로 격리 | workspaceId 필드 직접 저장 | RevisionRequest도 workspaceId 없이 동일 패턴 사용. 일관성 유지, 스키마 단순화 (P-001, NFR-004) | RevisionComment 모델, 작업자 쿼리 전체 |
| ADR-002 | 클라이언트 댓글 작성자 정보 저장 방식 | RevisionComment에 `authorName`·`authorEmail` 직접 저장 | 별도 ClientCommentAuthor 모델 | 댓글 작성자 정보는 불변(수정·삭제 없음). 별도 모델은 불필요한 복잡성. (FR-007, FR-009) | RevisionComment 모델 |
| ADR-003 | 클라이언트 댓글 토큰 검증 방식 | `token → PublicProjectPage → projectId → RevisionRequest.projectId` 체인 검증 | 별도 API Route 방식 | Server Action 패턴과 일관성. `submitCustomerRevision` 동일 패턴 (NFR-003) | `lib/actions/publicRevisionComment.ts` |
| ADR-004 | 알림 타입 추가 | `REVISION_COMMENT` 타입을 `NotificationType` union에 추가 | 기존 `REVISION_SUBMITTED` 재사용 | 두 이벤트는 의미론적으로 다름. 사용자별 ON/OFF 제어 가능성을 위해 별도 타입 필요 (FR-010) | `lib/notifications.ts` |
| ADR-005 | FR-011 클라이언트 이메일 발송 조건 | 작업자가 답글 작성 시 부모 댓글의 `authorType='CLIENT'` && `authorEmail` 존재 여부 검사 | 항상 이메일 발송 시도 | 클라이언트가 이메일 미입력 가능(FR-007 선택 항목). NFR-001: 이메일 입력은 optional | `addRevisionComment` Server Action |
| ADR-006 | 댓글 UI 위치 (작업자) | `/projects/[id]` 프로젝트 상세 페이지의 revisions 탭에 댓글 스레드 UI 통합 | 별도 댓글 전용 모달, `/revisions` 페이지 직접 통합 | 기존 프로젝트 상세에 revisions 탭이 존재. `/revisions` 페이지는 목록만 표시하며 상세 컨텍스트 부족 (FR-002) | `app/(dashboard)/projects/[id]/` |

---

## 인터페이스 계약

### `addRevisionComment(prevState, formData)` — 작업자 인증 필요

```typescript
// formData 필드
// revisionId: string (required)
// content: string (required, 1~2000자)
// parentId: string (optional — 답글인 경우)

// 반환
type CommentFormState = { error?: string; success?: string }
```

- workspaceId 격리: `revisionRequest.project.workspaceId` 검증 포함
- 기존 `RevisionFormState` 패턴과 동일한 반환 타입 사용 가능

### `addClientRevisionComment(prevState, formData)` — 비인증

```typescript
// formData 필드
// token: string (required — PublicProjectPage.token)
// revisionId: string (required)
// authorName: string (required, 1~100자)
// authorEmail: string (optional, RFC 5321)
// content: string (required, 1~2000자)
// parentId: string (optional — 답글인 경우)

// 반환
type PublicCommentFormState = { error?: string; success?: boolean }
```

### `getRevisionComments(revisionId)` — 작업자 인증 필요

```typescript
// 반환
type RevisionCommentWithReplies = {
  id: string
  revisionId: string
  parentId: null
  authorType: 'WORKER' | 'CLIENT'
  authorName: string
  authorEmail: string | null
  content: string
  createdAt: Date
  replies: {
    id: string
    authorType: 'WORKER' | 'CLIENT'
    authorName: string
    content: string
    createdAt: Date
    parentId: string
  }[]
}[]
```

### 하위 호환성

- `RevisionRequest` 모델에 `comments RevisionComment[]` relation 추가. 기존 쿼리는 include 없으면 영향 없음.
- `NotificationType` union 확장은 기존 `settingsEnabled` 로직에 자동 적용. 기존 타입 변경 없음.
- `sendNotification()` 함수 시그니처 변경 없음.

---

## 데이터 모델

### 신규 모델: `RevisionComment`

```prisma
model RevisionComment {
  id          String   @id @default(cuid())
  revisionId  String
  parentId    String?
  authorType  String   // "WORKER" | "CLIENT"
  authorName  String
  authorEmail String?  // CLIENT 작성자의 이메일 (선택)
  content     String
  createdAt   DateTime @default(now())

  revision RevisionRequest  @relation(fields: [revisionId], references: [id], onDelete: Cascade)
  parent   RevisionComment? @relation("CommentReplies", fields: [parentId], references: [id], onDelete: Restrict)
  replies  RevisionComment[] @relation("CommentReplies")

  @@index([revisionId, createdAt])
}
```

### `RevisionRequest` 모델 수정

기존 모델에 relation 추가:
```prisma
model RevisionRequest {
  // ...기존 필드 유지...
  comments RevisionComment[]  // 신규 relation
}
```

### 설계 근거

- `onDelete: Cascade` (revision → comment): 수정 요청 삭제 시 댓글도 자동 삭제 (FR-012 — 상태 변경 시 보존은 삭제가 아닌 soft 처리이므로 무관)
- `onDelete: Restrict` (parent → reply): 부모 댓글 삭제 방지 (댓글 삭제 기능은 범위 외이므로 실질적으로 미발생)
- `authorEmail` nullable: 클라이언트 이메일 입력 선택 (NFR-001, FR-007)
- `authorType` String enum: 기존 Prisma String 패턴 일관성 (`RevisionRequest.status`, `RevisionRequest.source` 동일)
- `@@index([revisionId, createdAt])`: 수정 요청별 댓글 조회 + 시간순 정렬 최적화 (NFR-006)

---

## 테스트 전략

> SC-001, SC-002는 `[env:integration]` 태그로 Next.js 렌더링 환경 필요.
> 현재 프로젝트는 Vitest node 환경만 구성됨. 통합 테스트 환경 미구성.
> 아래 PROC-010 자가 점검 참조.

| SC 식별자 | 테스트 수준 | 테스트 유형 | 시나리오 요약 | 입력 | 기대 결과 |
|---|---|---|---|---|---|
| SC-001 | 통합 | Happy Path | 작업자가 대시보드 프로젝트 상세 revisions 탭에서 수정 요청 댓글 목록 조회 | 인증 세션 + 수정 요청 ID | 루트 댓글 + 답글 스레드 구조 표시 |
| SC-002 | 통합 | Happy Path | 클라이언트가 `/p/[token]` 페이지에서 수정 요청 댓글 목록 조회 | 유효 token + 수정 요청 ID | 댓글 목록 표시 |
| SC-003 | 단위 | Happy Path | 인증 작업자가 최상위 댓글 작성 | revisionId, content='내용', 인증 세션 | DB에 저장, authorType='WORKER', authorName=세션 이름 |
| SC-004 | 단위 | Happy Path | 인증 작업자가 기존 댓글에 답글 작성 | revisionId, content, parentId(루트댓글 ID) | DB에 저장, parentId 설정됨 |
| SC-005 | 단위 | Happy Path | 클라이언트가 이름·이메일·본문 입력 후 댓글 작성 | token, revisionId, authorName, authorEmail, content | DB에 저장, authorType='CLIENT', authorName=입력값 |
| SC-006 | 단위 | Happy Path | 클라이언트가 기존 댓글에 답글 작성 | token, revisionId, authorName, content, parentId | DB에 저장, parentId 설정됨 |
| SC-007 | 단위 | Happy Path | 클라이언트 댓글 작성 → 인앱 알림 생성 | 위 SC-005 입력 | sendNotification 호출됨, type='REVISION_COMMENT', userIds=[assigneeId] |
| SC-008 | 단위 | Happy Path / Edge Case | 작업자가 클라이언트 댓글(이메일 있음)에 답글 작성 → 이메일 발송 / 이메일 없으면 미발송 | authorEmail 있음/없음 두 케이스 | 있음: sendRevisionCommentReplyEmail 호출됨 / 없음: 호출 안 됨 |
| SC-009 | 단위 | Happy Path | RevisionRequest 상태 DONE 후 댓글 조회 | DONE 상태 수정 요청 ID | 댓글 목록 정상 반환 (onDelete: Cascade는 삭제 시에만 적용) |
| SC-010 | 단위 | Error Case | 클라이언트 이름 공란 또는 101자 초과 | authorName='' 또는 101자 문자열 | error 반환, DB 미저장 |
| SC-011 | 단위 | Error Case | RFC 5321 형식 아닌 이메일 | authorEmail='not-an-email' | error 반환, DB 미저장 |
| SC-012 | 단위 | Error Case | 댓글 본문 공란 또는 2001자 초과 | content='' 또는 2001자 문자열 | error 반환, DB 미저장 |
| SC-013 | 단위 | Error Case | 유효하지 않은 토큰으로 클라이언트 댓글 작성 | token='invalid-token' | error 반환, DB 미저장 |
| SC-014 | 단위 | Error Case | 답글(depth=1) 댓글에 다시 답글 시도 | parentId=depth1댓글ID | error 반환, DB 미저장 |
| SC-015 | 단위 | Happy Path | 댓글 목록이 createdAt 오름차순으로 반환됨 | 복수 댓글이 있는 revisionId | orderBy createdAt asc 쿼리 호출 확인 |

### 옵션 C (SC-001, SC-002 — integration) 자가 점검 (PROC-010)

**1. 운영 환경 의존성 평가**: Y
- SC-001, SC-002는 Next.js App Router 렌더링 결과를 검증해야 함. Server Component 렌더링, revalidatePath 반영 등은 node 환경 단위 테스트로 시뮬레이션 불가.

**2. mock 시뮬레이션 가능성**: N (일부 불가)
- UI 렌더링 결과(댓글 스레드 DOM 구조) 검증은 vitest node env로 불가능.
- 단, 데이터 조회 로직 자체(getRevisionComments)는 단위 테스트로 검증 가능 → SC-015에서 커버.

**3. 권장 옵션**: 옵션 A 또는 B 권장 — 단, 현재 Playwright E2E 미구성. Option C 유지 시 보완:
- `getRevisionComments` 함수의 단위 테스트로 데이터 레이어 검증 (SC-015에 포함)
- PR 머지 후 로컬 브라우저에서 `/projects/[id]?tab=revisions` 및 `/p/[token]` 수동 확인 권장
- 향후 Playwright E2E 구성 시 SC-001, SC-002 자동화 추가 예정

### 사후 운영 검증 피드백 사이클 (PROC-014)

파이프라인 종료 후 사용자가 운영 환경에서 점검할 시나리오:
1. 작업자 대시보드 `/projects/[id]?tab=revisions`에서 댓글 작성·조회 동작
2. 클라이언트 포털 `/p/[token]` 에서 댓글 작성·조회 동작
3. 클라이언트 댓글 작성 후 작업자 인앱 알림 수신 확인
4. 작업자가 클라이언트 댓글에 답글 작성 후 클라이언트 이메일 수신 확인

결함 발견 시: `spec.md` 배경 및 목적 또는 별도 hotfix spec에 기록 → main session "spec 수정" 이벤트 → 1단계 재진입.

### smoke_tests

- 필요 여부: N
- 근거: 본 spec은 새 모델·새 Server Action 추가. 기존 `revision.ts` Server Action의 시그니처·동작 변경 없음. 기존 테스트 회귀 위험 없음.

---

## 기타 고려사항

### 깊이 제한(NFR-005) 강제 시점

서버 측 검증만으로 depth 제한 강제. UI에서도 답글에 "답글 달기" 버튼을 표시하지 않는 방식으로 UX 차원 보완 권장 (필수는 아님).

```typescript
// addRevisionComment, addClientRevisionComment 공통 검증
if (parentId) {
  const parentComment = await prisma.revisionComment.findFirst({
    where: { id: parentId },
    select: { parentId: true },
  })
  if (!parentComment || parentComment.parentId !== null) {
    return { error: '답글에는 다시 답글을 달 수 없습니다.' }
  }
}
```

### FR-011 이메일 발송 조건 상세

`addRevisionComment` 내 답글 생성 후:
```typescript
if (parentId) {
  const parentComment = await prisma.revisionComment.findFirst({
    where: { id: parentId },
    select: { authorType: true, authorEmail: true },
  })
  if (
    parentComment?.authorType === 'CLIENT' &&
    parentComment.authorEmail
  ) {
    await sendRevisionCommentReplyEmail(parentComment.authorEmail, {
      authorName: session.user.name,
      revisionContent: revision.content,
      replyContent: content,
      portalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/p/${projectPublicToken}`,
    })
  }
}
```

포털 URL 구성을 위해 `addRevisionComment`에서 프로젝트의 `PublicProjectPage.token`도 조회가 필요. 쿼리를 통합하여 단일 DB 왕복으로 처리.

### 알림 settingKey 기본값

`notify_revision_comment`가 `notificationSettings` JSON에 없으면 `settingsEnabled()`는 `true`를 반환(기존 로직). 즉 모든 기존 사용자는 기본적으로 댓글 알림을 받게 됨. spec 범위 외("댓글 알림 ON/OFF 설정은 이번 범위에 포함하지 않는다")와 일치.

### 공개 댓글 조회 시 authorEmail 노출 방지

작업자 쿼리(`getRevisionComments`)에서는 `authorEmail` 포함 반환 가능 (내부 사용자). 공개 페이지 조회에서는 `select`에 `authorEmail` 제외하여 클라이언트에 이메일 미노출.

### revalidatePath 범위

- `addRevisionComment`: `revalidatePath('/projects/${projectId}')`, `revalidatePath('/revisions')`
- `addClientRevisionComment`: `revalidatePath('/p/${token}')`

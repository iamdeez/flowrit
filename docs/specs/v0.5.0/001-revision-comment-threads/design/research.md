---
작성: Design Agent
버전: v1.0
최종 수정: 2026-06-22
상태: 확정
---

# Research: 수정 요청 댓글 스레드 (revision-comment-threads)

## 목차

- [기존 코드베이스 분석](#기존-코드베이스-분석)
  - [클래스·모듈 계층 구조](#클래스모듈-계층-구조)
  - [영향 범위 분석](#영향-범위-분석)
  - [공유 상태·동시성 분석](#공유-상태동시성-분석)
- [핵심 패턴 조사](#핵심-패턴-조사)
  - [Server Action 패턴](#server-action-패턴)
  - [비인증 공개 Action 패턴](#비인증-공개-action-패턴)
  - [인앱 알림 패턴](#인앱-알림-패턴)
  - [이메일 발송 패턴](#이메일-발송-패턴)
  - [테스트 패턴](#테스트-패턴)
- [DB 스키마 현황](#db-스키마-현황)
- [UI 통합 현황](#ui-통합-현황)
- [§B API 변경 영향 범위](#b-api-변경-영향-범위)
- [context.md 부정합 사전 점검](#contextmd-부정합-사전-점검)
- [엣지 케이스 및 한계](#엣지-케이스-및-한계)

---

## 기존 코드베이스 분석

### 클래스·모듈 계층 구조

TypeScript 모듈 패턴 (클래스 미사용). 함수 중심 구성.

```
lib/actions/
  revision.ts          ← 기존: 작업자 인증 필요 RevisionRequest CRUD
  publicRevision.ts    ← 기존: 비인증 토큰 기반 CustomerRevision 제출
  (신규) revisionComment.ts         ← getRevisionComments + addRevisionComment
  (신규) publicRevisionComment.ts   ← addClientRevisionComment

lib/
  notifications.ts    ← sendNotification() 단일 진입점
  email.ts            ← Resend 기반 이메일 템플릿 함수들
```

추상 클래스나 상속 구조 없음. 단순 함수 모듈 패턴.

### 영향 범위 분석

#### 직접 수정 파일

| 파일 | 변경 유형 | 영향 내용 |
|---|---|---|
| `prisma/schema.prisma` | 수정 | `RevisionComment` 신규 모델 추가, `RevisionRequest`에 `comments` relation 추가 |
| `lib/notifications.ts` | 수정 | `NotificationType` union에 `'REVISION_COMMENT'` 추가, `settingKeys` 맵에 항목 추가 |
| `lib/email.ts` | 수정 | `sendRevisionCommentReplyEmail()` 함수 추가 |
| `app/(dashboard)/projects/[id]/page.tsx` | 수정 | revisions 탭에 `RevisionCommentSection` 통합, import 추가 |
| `app/p/[token]/page.tsx` | 수정 | 수정 요청 목록 확장 — 각 revision 하위에 댓글 섹션 통합 |

#### 신규 생성 파일

| 파일 | 변경 유형 | 역할 |
|---|---|---|
| `lib/actions/revisionComment.ts` | 신규 | 작업자 인증 댓글 조회 + 작성 Server Actions |
| `lib/actions/publicRevisionComment.ts` | 신규 | 비인증 클라이언트 댓글 작성 Server Action |
| `app/(dashboard)/projects/[id]/revision-comment-section.tsx` | 신규 | 작업자 대시보드 댓글 스레드 UI (Server Component + Client Form) |
| `app/p/[token]/revision-comment-form.tsx` | 신규 | 클라이언트 포털 댓글 폼 (Client Component) |
| `tests/revisionComment.test.ts` | 신규 | SC-003~SC-015 단위 테스트 |

#### 영향 없는 파일 (확인 완료)

| 파일 | 배제 근거 |
|---|---|
| `lib/actions/revision.ts` | `RevisionRequest` 관련 기존 CRUD. `RevisionComment` relation은 Prisma에서 명시적 include 없으면 쿼리에 포함되지 않음. `getRevisionGroups()`, `updateRevisionStatus()` 등 기존 함수 시그니처 변경 없음. |
| `lib/actions/publicRevision.ts` | 기존 `submitCustomerRevision()` 변경 없음. 별도 파일에 분리 구현. |
| `lib/actions/project.ts` | `getProjectDetail()` 쿼리 `revisions: { orderBy: { createdAt: 'desc' } }` — `comments` include 없음. 댓글 조회는 별도 `getRevisionComments()` Server Action으로 처리. 영향 없음. |
| `proxy.ts` | MEMBER 경로 제한 대상 변경 없음. plan.md P-002 Pass 근거. |
| `components/sidebar-nav.tsx` | 신규 경로 없음. 메뉴 변경 없음. |

### 공유 상태·동시성 분석

Server Actions는 stateless. 공유 인메모리 상태 없음. Prisma를 통한 DB 접근만 발생. 동시성 이슈 없음.

---

## 핵심 패턴 조사

### Server Action 패턴

`lib/actions/revision.ts` 기준 패턴 (코드 직접 확인):

```typescript
'use server'

function stringValue(formData: FormData, key: string): string {
  return ((formData.get(key) as string | null) ?? '').trim()
}

async function requireAuth(): Promise<{ workspaceId: string; userId: string; role: WorkspaceRole }> {
  const session = await auth()
  if (!session?.user?.workspaceId) throw new Error('로그인이 필요합니다.')
  // ...
}
```

- `stringValue()` 헬퍼 함수 로컬 정의 패턴 재사용
- `requireAuth()` 헬퍼로 세션 검증 + `session.user.id`, `workspaceId` 획득
- `revalidatePath()` 호출 후 반환

신규 `lib/actions/revisionComment.ts`에서 동일 패턴 사용.

### 비인증 공개 Action 패턴

`lib/actions/publicRevision.ts` 기준 패턴 (코드 직접 확인):

```typescript
const page = await prisma.publicProjectPage.findUnique({
  where: { token, isActive: true },
  include: { project: true },
})
if (!page) return { error: '유효하지 않은 공유 링크입니다.' }
```

`publicRevisionComment.ts`에서 `token → PublicProjectPage → projectId → revisionRequest.projectId` 체인 검증에 동일 패턴 적용.

### 인앱 알림 패턴

`lib/notifications.ts`의 `sendNotification()` 시그니처 (코드 직접 확인):

```typescript
export async function sendNotification({
  userIds,
  workspaceId,
  type,
  title,
  body,
  href,
  emailFn,  // optional
}: SendNotificationInput): Promise<void>
```

- `NotificationType` union: 현재 `'NEW_INQUIRY' | 'REVISION_SUBMITTED' | 'STAGE_CHANGED' | 'DEADLINE_SOON'`
- `settingKeys` Record에 각 타입 → `notify_*` 키 매핑
- 신규 `'REVISION_COMMENT'` 추가 시 기존 타입 변경 없음 (additive)
- `settingsEnabled()` 함수: `settingKeys[type]` 조회 → `notificationSettings` JSON 값 확인. 신규 타입의 키가 없으면 `true` 반환 (기본 알림 ON)

### 이메일 발송 패턴

`lib/email.ts` 기준 패턴 (코드 직접 확인):

```typescript
export async function sendRevisionSubmittedEmail(
  to: string,
  payload: { projectTitle: string; content: string; fileCount: number; projectUrl: string }
): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `[Flowrit] ...`,
    html: emailWrapper(`...`),
  })
}
```

- `emailWrapper()` + `actionLink()` 헬퍼로 HTML 구성
- `escapeHtml()` 필수 적용 (사용자 입력값)
- `sendRevisionCommentReplyEmail(to, payload)` 동일 패턴으로 추가

### 테스트 패턴

`tests/revision.test.ts` 기준 (코드 직접 확인):

```typescript
import { mockDeep, mockReset } from 'vitest-mock-extended'
import type { PrismaClient } from '@/app/generated/prisma/client'

const prismaMock = mockDeep<PrismaClient>()

vi.mock('@/lib/db', () => ({ prisma: prismaMock }))
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))

beforeEach(async () => {
  mockReset(prismaMock)
  const { auth } = await import('@/lib/auth')
  vi.mocked(auth).mockResolvedValue(SESSION)
})
```

- `PrismaClient` import 경로: `@/app/generated/prisma/client` (context.md §6 주의사항 확인)
- `vi.mock()` 파일 상단 호이스팅 패턴
- `mockReset(prismaMock)` 각 테스트 전
- `auth` mock: `vi.fn()` + `mockResolvedValue(SESSION)`

`tests/setup.ts`에서 `next/cache`, `next/navigation`, `next-auth` 전역 mock 설정 확인. 개별 파일에서 재설정 불필요.

신규 `tests/revisionComment.test.ts`에서 동일 패턴 적용. 추가로:
- `vi.mock('@/lib/email', ...)` — `sendRevisionCommentReplyEmail` mock
- `vi.mock('@/lib/notifications', ...)` — `sendNotification` mock

---

## DB 스키마 현황

`prisma/schema.prisma` 직접 확인:

```prisma
model RevisionRequest {
  id         String   @id @default(cuid())
  projectId  String
  content    String
  priority   String   @default("MEDIUM")
  status     String   @default("OPEN")
  assigneeId String?
  source     String   @default("MANUAL")
  fileUrls   Json     @default("[]")
  createdAt  DateTime @default(now())
  project    Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  // comments RevisionComment[] — 미존재. 신규 추가 필요
}
```

현재 `RevisionComment` 모델 없음. `RevisionRequest`에 `comments` relation 없음.

`Project` 모델: `assigneeId String?` 필드 존재. plan.md의 `project.assigneeId ? [assigneeId] : ownerIds` 조건 구현 가능.

`PublicProjectPage` 모델: `token String @unique @default(uuid())`, `isActive Boolean`. `submitCustomerRevision()`의 기존 패턴과 일치.

`authorType` 필드: 기존 `RevisionRequest.status`처럼 `String` 타입 사용 (Prisma enum 미사용 — context.md §6 기술 부채 일관성 유지).

---

## UI 통합 현황

### 작업자 대시보드 (`app/(dashboard)/projects/[id]/page.tsx`)

- revisions 탭 (`tab === 'revisions'`) 영역에 `RevisionForm`과 기존 revision 목록이 존재.
- 수정 요청 목록을 `project.revisions.map(...)` 으로 렌더링.
- `getProjectDetail()` 반환 데이터에 `comments` 없음 → 각 revision의 댓글은 `RevisionCommentSection` (async 서버 컴포넌트) 내부에서 `getRevisionComments(revisionId)` 호출로 별도 조회.
- 기존 revisions 탭 레이아웃을 크게 변경하지 않고 각 revision 카드 하단에 `RevisionCommentSection` 컴포넌트를 삽입.

### 클라이언트 포털 (`app/p/[token]/page.tsx`)

- 현재 `revisions: { orderBy: { createdAt: 'desc' } }` include로 `RevisionRequest[]` 조회.
- "수정 요청 현황" 섹션: 전체 건수 / 완료 건수 표시만 있음.
- 댓글 스레드 통합: 수정 요청별로 `<RevisionCommentForm>` 클라이언트 컴포넌트 추가 필요.
- 공개 페이지에서 댓글 목록 조회: 기존 `page.prisma.publicProjectPage.findUnique` 쿼리에 `revisions: { include: { comments: { include: { replies: ... } } } }` 추가 또는 별도 조회 방식 선택.
  - **선택 이유**: 기존 page.tsx가 Server Component이므로 직접 Prisma 쿼리 확장이 적절. 공개 페이지는 auth() 없이 작동.

---

## §B API 변경 영향 범위

### `NotificationType` union 확장

현재 사용 위치:
- `lib/notifications.ts`: `settingKeys`, `settingsEnabled()` 내부
- `app/(dashboard)/settings/notification-form.tsx`: 확인 필요

`notification-form.tsx` 직접 확인 결과:
- `NotificationType` TypeScript 타입을 import하지 않음.
- `NOTIFICATION_ITEMS` 배열에 하드코딩된 `key` 문자열 사용.
- **영향 없음**: `notify_revision_comment` 키를 이 배열에 추가하지 않아도 됨 (spec 범위 외: "댓글 알림 ON/OFF 설정은 이번 범위에 포함하지 않는다").
- `settingsEnabled()` 함수의 기본값 `true` 반환 로직으로 미설정 사용자도 댓글 알림 ON 상태.

### `RevisionRequest.comments` relation 추가 영향

기존 쿼리 중 `include: { revisions: ... }` 패턴 사용 파일:

| 파일 | 패턴 | 영향 |
|---|---|---|
| `lib/actions/project.ts` `getProjectDetail()` | `revisions: { orderBy: { createdAt: 'desc' } }` | `include` 없으므로 영향 없음 |
| `lib/actions/project.ts` `getRevisionGroups()` | `revisions: { where: {...} }` | `include` 없으므로 영향 없음 |
| `app/p/[token]/page.tsx` | `revisions: { orderBy: { createdAt: 'desc' } }` | 댓글 통합 시 `include: { comments: { include: { replies: ... } } }` 추가 필요 — 의도된 변경 |

Prisma는 명시적 `include` 없이 relation을 자동 로드하지 않으므로 기존 쿼리에 breaking change 없음.

---

## context.md 부정합 사전 점검

변경 대상 엔티티와 관련된 context.md §4 (도메인 모델) 및 §3.2 (이벤트 흐름) 항목 점검:

| 항목 | 현재 정의 | 변경 후 정의 | 부정합 여부 |
|---|---|---|---|
| §4 엔티티 관계 `RevisionRequest` 하위 | `RevisionRequest` 단독 표시 | `RevisionRequest` 하위에 `RevisionComment[]` 추가 필요 | 부정합 |
| §3.2 이벤트 흐름 NotificationType | 4가지 타입만 열거 | `REVISION_COMMENT` 추가 필요 | 부정합 |

→ 6단계 Docs Agent 갱신 대상으로 gaps.md GAP-001 등록.

---

## 엣지 케이스 및 한계

### FR-011 이메일 발송 — portalUrl 구성

`addRevisionComment`에서 클라이언트 댓글에 답글 작성 시 포털 URL 구성을 위해 `PublicProjectPage.token`이 필요. plan.md 설계대로 revision 소유권 확인 쿼리 시 `project.publicPage` join을 통해 단일 DB 왕복으로 처리:

```typescript
const revision = await prisma.revisionRequest.findFirst({
  where: { id: revisionId, project: { workspaceId } },
  include: {
    project: {
      include: { publicPage: { select: { token: true } } },
    },
  },
})
```

`publicPage`가 없는 프로젝트(공개 페이지 미생성)에서 작업자가 클라이언트 댓글에 답글을 달아도 이메일 발송은 조건부(클라이언트 이메일 존재 시). 포털 URL 없으면 이메일 내 링크 생략 또는 기본값 처리 필요 — plan.md 기타 고려사항에 명시된 대로 `publicPage?.token`으로 안전하게 처리.

### SC-001, SC-002 — integration 테스트 미구성

plan.md 테스트 전략 §옵션 C 자가 점검에서 확인: 현재 Playwright E2E 미구성. SC-001, SC-002는 단위 테스트 대상 외. `getRevisionComments()` 함수의 단위 테스트(SC-015)로 데이터 레이어 검증 대체.

### `parentId` depth 검증 — 동일 가드 조건 통합

`addRevisionComment` 및 `addClientRevisionComment` 모두 `parentId` 유무에 따른 분기가 두 가지 결정 포함:
1. depth=1 강제 (`parentId.parentId !== null`이면 거부)
2. (작업자 답글에서만) 부모 댓글 `authorType` + `authorEmail` 조회 → 이메일 트리거

두 결정 모두 `if (parentId)` 단일 가드 하에 있음 → 통합 블록으로 구현. 가드 중복 없음. (§E 원칙 준수)

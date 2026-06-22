---
작성: Test Agent (AUTHORING)
버전: v1.0
최종 수정: 2026-06-22
상태: 확정
---

# Test Cases: 수정 요청 댓글 스레드 (revision-comment-threads)

## 목차

- [SC × 시나리오 매트릭스](#sc--시나리오-매트릭스)
- [외부 의존성 명시](#외부-의존성-명시)
- [미커버 항목 사전 분류](#미커버-항목-사전-분류-4-카테고리)

---

## SC × 시나리오 매트릭스

| SC-ID | 수용 기준 | Happy Path | Edge Case | Error Case | 테스트 파일·함수 | env 태그 |
|---|---|---|---|---|---|---|
| SC-003 | 작업자 최상위 댓글 작성 → DB 저장, authorType=WORKER, authorName=세션이름 | `test_addRevisionComment_creates_worker_top_level_comment` | — | `test_addRevisionComment_rejects_empty_content`, `test_addRevisionComment_rejects_content_over_2000_chars` | `tests/revisionComment.test.ts` | [env:unit] |
| SC-004 | 작업자 답글 작성 → parentId 설정됨 | `test_addRevisionComment_creates_worker_reply_with_parentId` | — | — | `tests/revisionComment.test.ts` | [env:unit] |
| SC-005 | 클라이언트 댓글 작성 → DB 저장, authorType=CLIENT, authorName=입력값 | `test_addClientRevisionComment_creates_client_comment` | — | — | `tests/revisionComment.test.ts` | [env:unit] |
| SC-006 | 클라이언트 답글 작성 → parentId 설정됨 | `test_addClientRevisionComment_creates_client_reply_with_parentId` | — | — | `tests/revisionComment.test.ts` | [env:unit] |
| SC-007 | 클라이언트 댓글 → sendNotification 호출, type=REVISION_COMMENT, userIds=[assigneeId] | `test_addClientRevisionComment_notifies_assignee` | `test_addClientRevisionComment_notifies_owner_when_no_assignee` | — | `tests/revisionComment.test.ts` | [env:unit] |
| SC-008 | 작업자 답글 시 클라이언트 이메일 발송 / 이메일 없으면 미발송 | `test_addRevisionComment_reply_to_client_sends_email` | `test_addRevisionComment_reply_to_client_no_email_skips_send` | — | `tests/revisionComment.test.ts` | [env:unit] |
| SC-009 | DONE 상태 수정 요청에 달린 댓글 정상 조회 | `test_getRevisionComments_returns_comments_for_done_status_revision` | — | — | `tests/revisionComment.test.ts` | [env:unit] |
| SC-010 | 클라이언트 이름 빈값·101자 초과 거부 | — | — | `test_addClientRevisionComment_rejects_empty_name`, `test_addClientRevisionComment_rejects_name_over_100_chars` | `tests/revisionComment.test.ts` | [env:unit] |
| SC-011 | RFC 5321 형식 아닌 이메일 거부 | — | — | `test_addClientRevisionComment_rejects_invalid_email_format` | `tests/revisionComment.test.ts` | [env:unit] |
| SC-012 | 댓글 본문 공란·2001자 초과 거부 (작업자·클라이언트 공통) | — | — | `test_addRevisionComment_rejects_empty_content`, `test_addRevisionComment_rejects_content_over_2000_chars`, `test_addClientRevisionComment_rejects_empty_content` | `tests/revisionComment.test.ts` | [env:unit] |
| SC-013 | 유효하지 않은 토큰으로 클라이언트 댓글 거부 | — | — | `test_addClientRevisionComment_rejects_invalid_token` | `tests/revisionComment.test.ts` | [env:unit] |
| SC-014 | 답글(depth=1)에 재답글 시도 거부 (작업자·클라이언트 공통) | — | — | `test_addRevisionComment_rejects_reply_to_depth1_comment`, `test_addClientRevisionComment_rejects_reply_to_depth1_comment` | `tests/revisionComment.test.ts` | [env:unit] |
| SC-015 | 댓글 목록이 createdAt 오름차순으로 반환됨 | `test_getRevisionComments_orders_by_createdAt_asc` | — | — | `tests/revisionComment.test.ts` | [env:unit] |

---

## 외부 의존성 명시

- **fixture**: 없음 (파일 기반 fixture 사용 안 함)
- **mock**:
  - `@/lib/db` → `{ prisma: mockDeep<PrismaClient>() }` (vitest-mock-extended)
  - `@/lib/auth` → `{ auth: vi.fn() }` (SESSION = `{ user: { workspaceId: 'ws1', id: 'u1', name: '작업자' } }`)
  - `@/lib/email` → `{ sendRevisionCommentReplyEmail: vi.fn() }`
  - `@/lib/notifications` → `{ sendNotification: vi.fn() }`
  - `next/cache`, `next/navigation`, `next-auth` → `tests/setup.ts` 전역 mock (개별 설정 불필요)
- **환경 변수**: 없음 (테스트 내 mock으로 대체)
- **외부 서비스**: 없음 (Prisma, Resend, 알림 모두 mock)

---

## 미커버 항목 사전 분류 (4-카테고리)

| SC-ID | 미커버 사유 | 카테고리 | 권장 검증 방법 |
|---|---|---|---|
| SC-001 | Next.js App Router Server Component 렌더링 환경 필요. 대시보드 댓글 목록 표시는 DOM/HTML 결과 검증이 필요하며 node 환경 Vitest로 시뮬레이션 불가 | (2) 단위테스트 불가 | Playwright E2E (미구성 — 향후 추가 예정) 또는 PR 머지 후 로컬 브라우저 수동 확인 (`/projects/[id]?tab=revisions`) |
| SC-002 | 클라이언트 포털(`/p/[token]`) Server Component 렌더링 환경 필요. SC-001과 동일한 이유로 단위테스트 불가 | (2) 단위테스트 불가 | Playwright E2E (미구성 — 향후 추가 예정) 또는 PR 머지 후 로컬 브라우저 수동 확인 (`/p/[token]`) |

> SC-001, SC-002의 데이터 조회 로직(`getRevisionComments`의 쿼리·정렬)은 SC-015 단위 테스트가 커버한다.
> UI 렌더링 결과 검증만 단위테스트 불가 범주에 해당한다.

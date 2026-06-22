---
작성: Test Agent (EXECUTION)
버전: v1.0
최종 수정: 2026-06-22 22:03
상태: 확정
---

# 테스트 실행 결과

## 목차

- [실행 요약](#실행-요약)
- [실패 목록](#실패-목록)
- [SC 미커버 항목](#sc-미커버-항목)
- [plan.md 매핑표 검증](#planmd-매핑표-검증)
- [설계 문서 정합성](#설계-문서-정합성)
- [회귀 탐지](#회귀-탐지)

---

## 실행 요약

| 항목 | 값 |
|---|---|
| 실행 파일 | `tests/revisionComment.test.ts` |
| 실행 대상 | SC-003~SC-015 매핑 테스트 19건 |
| 전체 | 19 |
| 통과 | 19 |
| 실패 | 0 |
| 스킵 | 0 |
| 실행 시간 | 206ms |
| TypeScript 컴파일 | 0 오류 |

---

## 실패 목록

### 최초 실행 시 발견된 실패 (수정 완료)

| 테스트명 | 실패 메시지 요약 | 원인 분류 | 처리 결과 |
|---|---|---|---|
| `test_addClientRevisionComment_notifies_assignee` | `sendNotification` 호출 횟수 0 — `TypeError: Cannot destructure property 'workspaceId' of 'page.project'` | [B] 테스트 오류 | 테스트 수정 완료 |
| `test_addClientRevisionComment_notifies_owner_when_no_assignee` | 동일 원인 | [B] 테스트 오류 | 테스트 수정 완료 |

**수정 내용**: SC-007 두 케이스의 `publicProjectPage.findUnique` mock 반환값에 `project: { id, workspaceId, assigneeId }` 필드 추가. production 코드가 `include: { project: { select: {...} } }` 로 조인 조회하므로 mock 반환값에 `project` 중첩 필드가 필요했음 (AUTHORING 단계에서 production 코드 시그니처를 대조하지 않은 결과).

최종 재실행 결과: **19/19 PASS**.

---

## SC 미커버 항목

| SC-ID | 미커버 유형 | 카테고리 | 비고 |
|---|---|---|---|
| SC-001 | `[env:integration]` — Next.js Server Component 렌더링 환경 필요 | (2) 단위테스트 불가 | 데이터 조회 로직은 SC-015가 커버. UI 렌더링만 미커버 |
| SC-002 | `[env:integration]` — 클라이언트 포털 Server Component 렌더링 환경 필요 | (2) 단위테스트 불가 | SC-001과 동일 |

deferred SC (coverage.md 기준): SC-001, SC-002 — `[env:integration]` 태그, 검증 주체 사용자/운영자.

---

## plan.md 매핑표 검증

**SC 매핑 테이블**:

| SC-ID | 관련 테스트 | 통과 여부 | 미커버 근본원인 |
|---|---|---|---|
| SC-001 | (없음 — env:integration) | deferred | [env:integration] — Next.js 렌더링 환경 필요 |
| SC-002 | (없음 — env:integration) | deferred | [env:integration] — 클라이언트 포털 렌더링 환경 필요 |
| SC-003 | `test_addRevisionComment_creates_worker_top_level_comment`, `test_addRevisionComment_rejects_empty_content`, `test_addRevisionComment_rejects_content_over_2000_chars` | PASS | - |
| SC-004 | `test_addRevisionComment_creates_worker_reply_with_parentId` | PASS | - |
| SC-005 | `test_addClientRevisionComment_creates_client_comment` | PASS | - |
| SC-006 | `test_addClientRevisionComment_creates_client_reply_with_parentId` | PASS | - |
| SC-007 | `test_addClientRevisionComment_notifies_assignee`, `test_addClientRevisionComment_notifies_owner_when_no_assignee` | PASS | - |
| SC-008 | `test_addRevisionComment_reply_to_client_sends_email`, `test_addRevisionComment_reply_to_client_no_email_skips_send` | PASS | - |
| SC-009 | `test_getRevisionComments_returns_comments_for_done_status_revision` | PASS | - |
| SC-010 | `test_addClientRevisionComment_rejects_empty_name`, `test_addClientRevisionComment_rejects_name_over_100_chars` | PASS | - |
| SC-011 | `test_addClientRevisionComment_rejects_invalid_email_format` | PASS | - |
| SC-012 | `test_addRevisionComment_rejects_empty_content`, `test_addRevisionComment_rejects_content_over_2000_chars`, `test_addClientRevisionComment_rejects_empty_content` | PASS | - |
| SC-013 | `test_addClientRevisionComment_rejects_invalid_token` | PASS | - |
| SC-014 | `test_addRevisionComment_rejects_reply_to_depth1_comment`, `test_addClientRevisionComment_rejects_reply_to_depth1_comment` | PASS | - |
| SC-015 | `test_getRevisionComments_orders_by_createdAt_asc` | PASS | - |

---

## 설계 문서 정합성

### 요구사항 대조

spec.md FR-001~FR-012, NFR-001~NFR-006 전체 검토 결과:

- FR-001~FR-003 (댓글 조회): `getRevisionComments` 구현. workspaceId scope 포함. SC-009·SC-015 통과.
- FR-004~FR-006 (작업자 댓글 작성): `addRevisionComment` 구현. SC-003·SC-004 통과.
- FR-007~FR-009 (클라이언트 댓글 작성): `addClientRevisionComment` 구현. SC-005·SC-006 통과.
- FR-010 (인앱 알림): `sendNotification` 호출 확인. SC-007 통과.
- FR-011 (이메일 알림): `sendRevisionCommentReplyEmail` 호출 확인. SC-008 통과.
- FR-012 (댓글 보존): DONE 상태 수정 요청 댓글 조회 확인. SC-009 통과.
- NFR-001~NFR-006: 입력 검증·depth 제한·정렬 모두 구현 확인. SC-010~SC-015 통과.

불일치 항목: **없음**.

### plan.md 코드 예시 대조

`addRevisionComment` / `addClientRevisionComment` / `getRevisionComments` 의 인터페이스 계약이 plan.md 설계와 일치. 변수명·반환값·에러 형식 불일치 없음.

---

## 회귀 탐지

SC-XXX 매핑 외 기존 테스트에 대한 실행은 본 Agent 범위 밖이므로 CI 위임. 본 spec에서 수정한 파일:

- `lib/actions/revisionComment.ts` (신규)
- `lib/actions/publicRevisionComment.ts` (신규)
- `tests/revisionComment.test.ts` (신규)

기존 테스트에 영향을 줄 수 있는 기존 파일 수정:

- `lib/notifications.ts` — `REVISION_COMMENT` 타입 추가 (기존 타입 보존)
- `lib/email.ts` — `sendRevisionCommentReplyEmail` 함수 추가 (기존 함수 보존)

Breaking change 없음. 기존 export 인터페이스 보존 확인.

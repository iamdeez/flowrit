---
작성: Test Agent (EXECUTION)
버전: v1.0
최종 수정: 2026-06-22 22:03
상태: 확정
---

# Coverage: 수정 요청 댓글 스레드 (revision-comment-threads)

## 목차

- [SC 커버리지 매트릭스](#sc-커버리지-매트릭스)
- [STALE_SC 경고](#stale_sc-경고)

---

## SC 커버리지 매트릭스

| SC-ID | 수용 기준 | Happy Path | Edge Case | Error Case | plan.md 시나리오 전체 | 상태 |
|---|---|---|---|---|---|---|
| SC-001 | 작업자 대시보드 수정 요청 댓글 목록 표시 | deferred | — | — | deferred | deferred (env:integration) |
| SC-002 | 클라이언트 포털 댓글 목록 표시 | deferred | — | — | deferred | deferred (env:integration) |
| SC-003 | 작업자 최상위 댓글 작성 → DB 저장, authorType=WORKER | PASS | — | PASS (빈값·초과) | PASS | PASS |
| SC-004 | 작업자 답글 작성 → parentId 설정됨 | PASS | — | — | PASS | PASS |
| SC-005 | 클라이언트 댓글 작성 → authorType=CLIENT, authorName=입력값 | PASS | — | — | PASS | PASS |
| SC-006 | 클라이언트 답글 작성 → parentId 설정됨 | PASS | — | — | PASS | PASS |
| SC-007 | 클라이언트 댓글 → sendNotification, userIds=[assigneeId 또는 OWNER] | PASS | PASS (no assignee) | — | PASS | PASS |
| SC-008 | 작업자 답글 → 클라이언트 이메일 발송 / 이메일 없으면 미발송 | PASS | PASS (no email) | — | PASS | PASS |
| SC-009 | DONE 상태 수정 요청 댓글 조회 가능 | PASS | — | — | PASS | PASS |
| SC-010 | 클라이언트 이름 빈값·101자 초과 거부 | — | — | PASS (2건) | PASS | PASS |
| SC-011 | RFC 5321 형식 아닌 이메일 거부 | — | — | PASS | PASS | PASS |
| SC-012 | 댓글 본문 공란·2001자 초과 거부 | — | — | PASS (3건) | PASS | PASS |
| SC-013 | 유효하지 않은 토큰으로 클라이언트 댓글 거부 | — | — | PASS | PASS | PASS |
| SC-014 | depth=1 댓글에 재답글 시도 거부 | — | — | PASS (2건) | PASS | PASS |
| SC-015 | 댓글 목록 createdAt 오름차순 반환 | PASS | — | — | PASS | PASS |

**요약**: SC-003~SC-015 (13건) 전체 PASS. SC-001·SC-002는 `[env:integration]` deferred — 검증 주체: 사용자/운영자.

---

## STALE_SC 경고

검출 범위: 본 차수 신규 파일 (`tests/revisionComment.test.ts`).

테스트 파일 내 SC 번호: SC-003, SC-004, SC-005, SC-006, SC-007, SC-008, SC-009, SC-010, SC-011, SC-012, SC-013, SC-014, SC-015.

현재 spec.md SC 번호: SC-001~SC-015.

**STALE_SC 경고: 0건** — 모든 SC 번호가 현재 spec.md에 존재함.

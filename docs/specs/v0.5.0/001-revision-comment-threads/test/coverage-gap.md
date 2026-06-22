---
작성: Test Agent (EXECUTION)
버전: v1.0
최종 수정: 2026-06-22 22:03
상태: 확정
---

# Coverage Gap: 수정 요청 댓글 스레드 (revision-comment-threads)

## 목차

- [미커버 SC 목록](#미커버-sc-목록)
- [비고](#비고)

---

## 미커버 SC 목록

| SC-ID | 미커버 시나리오 | 카테고리 | 검증 방법 | 환경/도구 | 담당 (개발/운영/QA) | 비고 |
|---|---|---|---|---|---|---|
| SC-001 | 작업자 대시보드에서 수정 요청 선택 시 댓글 스레드(최상위 댓글 + 답글) UI 표시 | (2) 단위테스트 불가 | Playwright E2E 또는 로컬 브라우저 수동 확인 (`/projects/[id]?tab=revisions`) | Playwright (미구성) 또는 로컬 Next.js dev 서버 | QA / 운영 | 데이터 레이어(getRevisionComments 조회·정렬)는 SC-015가 커버. UI 렌더링 결과만 미커버 |
| SC-002 | 클라이언트가 `/p/[token]` 페이지에서 수정 요청별 댓글 목록 표시 | (2) 단위테스트 불가 | Playwright E2E 또는 로컬 브라우저 수동 확인 (`/p/[token]`) | Playwright (미구성) 또는 로컬 Next.js dev 서버 | QA / 운영 | SC-001과 동일 — Server Component 렌더링 환경 필요 |

> 카테고리 (1) 항목: 0건 — Development Agent 복귀 불필요.
> 카테고리 (2) 항목: 2건 — 사용자/운영자 후속 검증 위임. Docs Agent 진행 가능.

---

## 비고

SC-001, SC-002는 Next.js App Router Server Component 렌더링 환경이 필요하며 node 환경 Vitest로 시뮬레이션 불가능합니다. 향후 Playwright E2E 테스트 환경이 구성되면 자동화 커버리지로 전환할 수 있습니다.

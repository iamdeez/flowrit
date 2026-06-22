# Tasks: webhook-platform-integration

> Branch: 001-webhook-platform-integration | Date: 2026-06-23 | Plan: [plan.md](./plan.md)

## 전제 조건

- [x] spec.md의 모든 `[NEEDS CLARIFICATION]` 항목이 해소되었는가?
- [x] plan.md의 Constitution Gates가 모두 통과(또는 예외 기재)되었는가?

---

## 태스크 목록

### Phase 1. API 엔드포인트

- [x] **T001** — Webhook POST 핸들러 구현
  - 구현 파일: `app/api/webhooks/intake/[workspaceSlug]/route.ts`
  - 관련 요구사항: `FR-001`, `FR-002`, `FR-003`, `FR-004`
  - 상세: Bearer 인증 → 필드 검증 → Inquiry 생성 → 알림 발송 (best-effort)
  - 완료 기준: 올바른 요청 시 201, 인증 실패 시 401, 필드 누락 시 422

### Phase 2. 설정 UI

- [x] **T002** — 테스트 전송 Server Action 구현
  - 구현 파일: `lib/actions/testWebhook.ts`
  - 관련 요구사항: `FR-007`
  - 상세: `auth()` 검증 → 테스트 Inquiry 생성 → `NEW_INQUIRY` 알림 발송

- [x] **T003** — WebhookInfo 플랫폼 가이드 컴포넌트 구현
  - 구현 파일: `app/(dashboard)/settings/webhook-info.tsx`
  - 관련 요구사항: `FR-005`, `FR-006`, `FR-007`, `FR-008`
  - 상세:
    - 인스타그램·카카오채널·네이버 톡톡 탭 전환 (`activeTab` 상태)
    - 탭별: amber 설정 위치 안내 + 번호 단계 + 복사 가능 자동 응답 메시지 템플릿
    - "고급" 접기 섹션: 엔드포인트 URL, 인증 헤더, JSON 스키마, curl 예제, 테스트 버튼
    - `useActionState(sendTestInquiry, {})` 기반 테스트 폼

- [x] **T004** — settings/page.tsx에 WebhookInfo 삽입
  - 구현 파일: `app/(dashboard)/settings/page.tsx`
  - 완료 기준: 설정 페이지에서 webhook 섹션 표시

---

## 구현 완료 기준

- [x] 모든 태스크 체크박스가 완료 처리되었다.
- [x] `git status`에 의도치 않은 파일이 없다.

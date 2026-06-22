# Tasks: order-form-management

> Branch: 002-order-form-management | Date: 2026-06-23 | Plan: [plan.md](./plan.md)

## 전제 조건

- [x] spec.md의 모든 `[NEEDS CLARIFICATION]` 항목이 해소되었는가?
- [x] plan.md의 Constitution Gates가 모두 통과(또는 예외 기재)되었는가?
- [x] v0.6.0/001-webhook-platform-integration 구현 완료 확인

---

## 태스크 목록

### Phase 1. 데이터 모델

- [x] **T001** — Inquiry.formType 필드 추가 (스키마 + 마이그레이션)
  - 구현 파일: `prisma/schema.prisma`, `prisma/migrations/20260623000000_add_inquiry_form_type/migration.sql`
  - 관련 요구사항: `FR-003`, `NFR-002`
  - 완료 기준: `npx prisma generate` 후 TypeScript 타입에 `formType` 반영

### Phase 2. Server Actions

- [x] **T002** — submitOrder Server Action 구현
  - 구현 파일: `lib/actions/inquiry.ts`
  - 관련 요구사항: `FR-003`, `FR-004`
  - 상세: `formType: 'ORDER'`, 희망 날짜·예산 content prefix, `NEW_INQUIRY` 알림 발송, `/orders` revalidate

- [x] **T003** `[P]` — dismissInquiry Server Action 구현
  - 구현 파일: `lib/actions/inquiry.ts`
  - 관련 요구사항: `FR-006`
  - 상세: workspaceId scope 검증 후 `status: 'DISMISSED'` 업데이트, `/orders` + `/dashboard` revalidate

### Phase 3. 주문서 공개 폼

- [x] **T004** — 주문서 폼 Client Component 구현
  - 구현 파일: `app/order/[workspaceSlug]/order-form.tsx`
  - 관련 요구사항: `FR-002`
  - 상세: 이름·연락처·희망날짜·예산·의뢰내용·파일 첨부, presigned URL 업로드, `useActionState`

- [x] **T005** — 주문서 공개 페이지 구현
  - 구현 파일: `app/order/[workspaceSlug]/page.tsx`
  - 관련 요구사항: `FR-001`
  - 상세: `notFound()` 처리, 워크스페이스명 표시, OrderForm 삽입

### Phase 4. 주문서 관리 대시보드

- [x] **T006** — 주문서 관리 페이지 구현
  - 구현 파일: `app/(dashboard)/orders/page.tsx`
  - 관련 요구사항: `FR-005`, `FR-007`, `FR-008`
  - 상세: 탭(전체/일반 문의/주문서) + 상태 필터(대기 중/전환 완료), 폼 링크 안내 카드, Inquiry 목록 + formType 뱃지

- [x] **T007** `[P]` — DismissInquiryButton Client Component 구현
  - 구현 파일: `app/(dashboard)/orders/dismiss-button.tsx`
  - 관련 요구사항: `FR-006`
  - 상세: `useTransition`, confirm 다이얼로그

- [x] **T008** `[P]` — CopyLinkButton Client Component 구현
  - 구현 파일: `app/(dashboard)/orders/copy-link-button.tsx`
  - 상세: clipboard 복사 + 복사됨 상태 표시

### Phase 5. 사이드바 + 레이아웃

- [x] **T009** — SidebarNav에 주문서 관리 메뉴 + 뱃지 추가
  - 구현 파일: `components/sidebar-nav.tsx`
  - 관련 요구사항: `FR-009`
  - 상세: `ClipboardList` 아이콘, `pendingOrderCount` prop, MEMBER_ALLOWED 추가

- [x] **T010** — 대시보드 layout에 pendingOrderCount 쿼리 추가
  - 구현 파일: `app/(dashboard)/layout.tsx`
  - 상세: `Promise.all` 4번째 항목으로 `inquiry.count({ where: { workspaceId, status: 'PENDING' } })`

### Phase 6. 설정 페이지 링크

- [x] **T011** — IntakeLinkCopy 컴포넌트 구현 (두 폼 링크 표시)
  - 구현 파일: `app/(dashboard)/settings/intake-link-copy.tsx`
  - 관련 요구사항: `FR-010`
  - 상세: 일반 문의 폼 + 주문서 폼 각각 URL 표시 + 복사 버튼

### Phase 7. 레이블 일관성

- [x] **T012** — 대시보드·분석 페이지 레이블 정비
  - 구현 파일: `app/(dashboard)/dashboard/page.tsx`, `app/intake/[workspaceSlug]/page.tsx`, `app/(dashboard)/analytics/inquiry-trend-chart.tsx`
  - 상세: "신규 접수" → "미확인 주문"(stat card) / "접수 대기"(섹션), "신규 의뢰 접수" → "일반 문의 접수", "신규 의뢰" → "접수 건수"

---

## 구현 완료 기준

- [x] 모든 태스크 체크박스가 완료 처리되었다.
- [x] `npx prisma generate` 이후 TypeScript 타입 오류 없음.
- [x] `git status`에 의도치 않은 파일이 없다.

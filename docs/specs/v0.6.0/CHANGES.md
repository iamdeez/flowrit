## [001-webhook-platform-integration] 구현 완료

**변경 파일**:
- `app/api/webhooks/intake/[workspaceSlug]/route.ts`: 신규 — Bearer 인증 기반 외부 플랫폼 의뢰 접수 POST 핸들러. source 레이블 prefix + 알림 발송 포함.
- `lib/actions/testWebhook.ts`: 신규 — 설정 화면용 테스트 의뢰 생성 Server Action.
- `app/(dashboard)/settings/webhook-info.tsx`: 신규 — 인스타그램·카카오채널·네이버 톡톡 탭별 비기술 설정 가이드 Client Component. "고급" 섹션은 기본 숨김.

**후속 작업 시 주의사항**:
- `WEBHOOK_SECRET` 환경변수가 설정되지 않으면 webhook 엔드포인트가 503을 반환한다. `.env.local` 및 Vercel 환경변수에 반드시 설정해야 한다.
- webhook 엔드포인트는 현재 단일 `WEBHOOK_SECRET`을 공유한다. 워크스페이스별 독립 secret이 필요하면 별도 스펙으로 처리해야 한다.

---

## [002-order-form-management] 구현 완료

**변경 파일**:
- `prisma/schema.prisma`: `Inquiry` 모델에 `formType String @default("INQUIRY")` 추가. status 값에 `DISMISSED` 추가(코드 레벨 상수, DB enum 아님).
- `prisma/migrations/20260623000000_add_inquiry_form_type/migration.sql`: `formType` 컬럼 추가 마이그레이션.
- `lib/actions/inquiry.ts`: `submitOrder` 함수 추가 (formType: 'ORDER', 구조화 content prefix, NEW_INQUIRY 알림), `dismissInquiry` 함수 추가 (status: 'DISMISSED').
- `app/order/[workspaceSlug]/order-form.tsx`: 신규 — 고객 전용 주문서 폼 Client Component.
- `app/order/[workspaceSlug]/page.tsx`: 신규 — 고객 전용 주문서 공개 페이지 Server Component.
- `app/(dashboard)/orders/page.tsx`: 신규 — 주문서 관리 대시보드 (탭·상태 필터, 폼 링크 안내, Inquiry 목록).
- `app/(dashboard)/orders/dismiss-button.tsx`: 신규 — 무시 버튼 Client Component (useTransition + confirm).
- `app/(dashboard)/orders/copy-link-button.tsx`: 신규 — 링크 복사 버튼 Client Component.
- `app/(dashboard)/settings/intake-link-copy.tsx`: 신규 — 일반 문의 폼·주문서 폼 링크 표시 Client Component.
- `components/sidebar-nav.tsx`: `pendingOrderCount` prop 추가, `/orders` 메뉴 항목 추가, MEMBER_ALLOWED 포함.
- `app/(dashboard)/layout.tsx`: `Promise.all`에 PENDING Inquiry 수 쿼리 추가 → `pendingOrderCount` 전달.
- `app/(dashboard)/dashboard/page.tsx`: "신규 접수" → "미확인 주문"(stat card), "접수 대기"(섹션), 공백 텍스트, /orders 링크 추가.
- `app/intake/[workspaceSlug]/page.tsx`: 레이블 "신규 의뢰 접수" → "일반 문의 접수".
- `app/(dashboard)/analytics/inquiry-trend-chart.tsx`: 시리즈명 "신규 의뢰" → "접수 건수".

**후속 작업 시 주의사항**:
- `Inquiry.status`의 `DISMISSED` 값은 코드 레벨 상수이며 DB enum 미사용 (기존 `PENDING` / `CONVERTED` 패턴 동일). `DISMISSED` 건은 /orders 페이지의 기존 탭 필터에 노출되지 않는다.
- `formType` 필드 추가 후 `npx prisma generate`로 클라이언트 재생성이 필요하다. 재생성 없이 사용 시 TypeScript 타입 오류 발생.
- `/orders` 페이지의 `ConvertDialog`는 `app/(dashboard)/dashboard/convert-dialog.tsx`를 직접 임포트해 재사용한다.

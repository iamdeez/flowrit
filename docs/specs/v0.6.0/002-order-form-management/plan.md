# Plan: order-form-management

> Branch: 002-order-form-management | Date: 2026-06-23 | Spec: [spec.md](./spec.md)

## 목차

- [사전 검증 (Constitution Gates)](#사전-검증-constitution-gates)
- [기술 컨텍스트](#기술-컨텍스트)
- [사전 영향도 분석 결과](#사전-영향도-분석-결과)
- [핵심 설계](#핵심-설계)
- [데이터 모델](#데이터-모델)
- [인터페이스 계약](#인터페이스-계약)
- [테스트 전략](#테스트-전략)

---

## 사전 검증 (Constitution Gates)

- [x] 성능 원칙: 신규 쿼리는 workspaceId 인덱스 사용, 기존 쿼리 변경 없음
- [x] 호환성 원칙: `formType` 마이그레이션이 `DEFAULT 'INQUIRY'`로 기존 레코드 보존
- [x] 테스트 원칙: SC-001~SC-008 정의 완료
- [x] 스펙 범위 원칙: 기존 intake 폼·프로젝트 기능 변경 없음

---

## 기술 컨텍스트

- **언어 / 런타임**: TypeScript, Next.js 16 App Router (Server Component + Server Action)
- **주요 의존성**: Prisma 7, `lib/notifications.ts`, `lib/email.ts`, `lib/storage.ts`
- **상태 관리**: `useActionState` (주문서 폼), `useTransition` (무시 버튼)

---

## 사전 영향도 분석 결과

### 영향 파일 목록

| 파일 | 변경 유형 | 영향 내용 |
|---|---|---|
| `prisma/schema.prisma` | 수정 | `Inquiry`에 `formType String @default("INQUIRY")` 추가 |
| `prisma/migrations/20260623000000_add_inquiry_form_type/` | 신규 | `ALTER TABLE "Inquiry" ADD COLUMN "formType"` |
| `lib/actions/inquiry.ts` | 수정 | `submitOrder` 함수 추가, `dismissInquiry` 함수 추가 |
| `app/order/[workspaceSlug]/page.tsx` | 신규 | 고객 전용 주문서 공개 페이지 (Server Component) |
| `app/order/[workspaceSlug]/order-form.tsx` | 신규 | 주문서 폼 Client Component |
| `app/(dashboard)/orders/page.tsx` | 신규 | 주문서 관리 대시보드 (Server Component) |
| `app/(dashboard)/orders/dismiss-button.tsx` | 신규 | 무시 버튼 Client Component |
| `app/(dashboard)/orders/copy-link-button.tsx` | 신규 | 링크 복사 버튼 Client Component |
| `app/(dashboard)/settings/intake-link-copy.tsx` | 신규 | 일반 문의·주문서 폼 링크 표시 Client Component |
| `components/sidebar-nav.tsx` | 수정 | `pendingOrderCount` prop 추가, `/orders` 메뉴 + 뱃지 추가 |
| `app/(dashboard)/layout.tsx` | 수정 | `pendingOrderCount` 쿼리 추가 + SidebarNav에 전달 |
| `app/(dashboard)/dashboard/page.tsx` | 수정 | "신규 접수" → "접수 대기" 레이블, `/orders` 링크 추가 |
| `app/intake/[workspaceSlug]/page.tsx` | 수정 | "신규 의뢰 접수" → "일반 문의 접수" 레이블 |
| `app/(dashboard)/analytics/inquiry-trend-chart.tsx` | 수정 | 시리즈명 "신규 의뢰" → "접수 건수" |

---

## 핵심 설계

### 주문서 폼 구조화 content prefix

주문서 제출 시 Server Action이 구조화 prefix를 조합해 단일 `content` 문자열로 저장한다:

```
희망 날짜: 2026-07-01
예산: 50만 원
---
의뢰 내용 본문...
```

`formType: 'ORDER'` 필드로 일반 문의와 구분한다.

### Orders 페이지 쿼리 패턴

```ts
// tabKey: 'all' | 'inquiry' | 'order'
// statusFilter: 'PENDING' | 'CONVERTED'
prisma.inquiry.findMany({
  where: {
    workspaceId,
    status: statusFilter,
    ...(tab === 'inquiry' ? { formType: 'INQUIRY' }
       : tab === 'order'  ? { formType: 'ORDER' }
       : {}),
  },
  orderBy: { createdAt: 'desc' },
})
```

### 무시(Dismiss) 처리

```ts
// dismissInquiry Server Action
await prisma.inquiry.update({
  where: { id: inquiryId, workspace: { id: workspaceId } },
  data: { status: 'DISMISSED' },
})
revalidatePath('/orders')
revalidatePath('/dashboard')
```

DISMISSED 상태는 orders 페이지의 기존 필터(`PENDING` / `CONVERTED`)에 포함되지 않으므로 자동으로 목록에서 제거된다.

### 사이드바 뱃지

`app/(dashboard)/layout.tsx`에서 `PENDING` 상태 Inquiry 수를 `Promise.all`로 조회해 `pendingOrderCount`로 SidebarNav에 전달한다.

---

## 데이터 모델

### Inquiry (변경)

```prisma
model Inquiry {
  id          String    @id @default(cuid())
  workspaceId String
  name        String
  contact     String?
  content     String
  fileUrls    Json      @default("[]")
  status      String    @default("PENDING")   // PENDING | CONVERTED | DISMISSED
  formType    String    @default("INQUIRY")   // INQUIRY | ORDER  ← 신규
  projectId   String?
  createdAt   DateTime  @default(now())
  workspace   Workspace @relation(...)
}
```

---

## 인터페이스 계약

- 기존 `submitInquiry` Server Action 변경 없음 — `formType` 미전달 시 `DEFAULT 'INQUIRY'` 적용
- 기존 `ConvertDialog` 컴포넌트 변경 없음 — orders 페이지에서 그대로 재사용
- `SidebarNav` props에 `pendingOrderCount?: number` 추가 (하위 호환: 미전달 시 0)

---

## 테스트 전략

| SC 식별자 | 테스트 유형 | 시나리오 요약 | 기대 결과 |
|---|---|---|---|
| SC-001 | 수동 검증 | `/order/{slug}` 비인증 접근 | 로그인 없이 폼 표시 |
| SC-002 | 수동 검증 | 주문서 폼 제출 | DB에 `formType='ORDER'`, content에 prefix |
| SC-003 | 수동 검증 | 주문서 제출 후 대시보드 | 알림 수신 + /orders에 접수 건 표시 |
| SC-004 | UI 검증 | `/orders` 탭·필터 전환 | URL 파라미터 연동, 쿼리 필터 적용 |
| SC-005 | UI 검증 | "무시" 클릭 + confirm | 목록에서 제거, revalidate |
| SC-006 | UI 검증 | "프로젝트로 전환" 다이얼로그 | 기존 ConvertDialog 정상 동작 |
| SC-007 | UI 검증 | 사이드바 뱃지 | PENDING Inquiry 수 표시 |
| SC-008 | UI 검증 | 설정 페이지 링크 복사 | 일반 문의·주문서 URL 각각 복사 |

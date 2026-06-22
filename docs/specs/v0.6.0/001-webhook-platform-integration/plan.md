# Plan: webhook-platform-integration

> Branch: 001-webhook-platform-integration | Date: 2026-06-23 | Spec: [spec.md](./spec.md)

## 목차

- [사전 검증 (Constitution Gates)](#사전-검증-constitution-gates)
- [기술 컨텍스트](#기술-컨텍스트)
- [사전 영향도 분석 결과](#사전-영향도-분석-결과)
- [핵심 설계](#핵심-설계)
- [인터페이스 계약](#인터페이스-계약)
- [테스트 전략](#테스트-전략)

---

## 사전 검증 (Constitution Gates)

- [x] 성능 원칙: 처리 속도 저하 요인 없음 (새 엔드포인트 추가, 기존 코드 변경 없음)
- [x] 호환성 원칙: 기존 intake 폼 및 대시보드 인터페이스 변경 없음
- [x] 테스트 원칙: SC-001~SC-006 정의 완료
- [x] 스펙 범위 원칙: 신규 API 엔드포인트 + 설정 UI만 추가

---

## 기술 컨텍스트

- **언어 / 런타임**: TypeScript, Next.js 16 App Router (Route Handler)
- **주요 의존성**: Prisma 7, `lib/notifications.ts`, `lib/email.ts`
- **인증**: `WEBHOOK_SECRET` 환경변수 기반 Bearer 토큰

---

## 사전 영향도 분석 결과

### 영향 파일 목록

| 파일 | 변경 유형 | 영향 내용 |
|---|---|---|
| `app/api/webhooks/intake/[workspaceSlug]/route.ts` | 신규 | webhook POST 핸들러 |
| `lib/actions/testWebhook.ts` | 신규 | 설정 화면 테스트 전송 Server Action |
| `app/(dashboard)/settings/webhook-info.tsx` | 신규 | 플랫폼별 가이드 탭 UI (Client Component) |
| `app/(dashboard)/settings/page.tsx` | 수정 | WebhookInfo 컴포넌트 삽입 |

---

## 핵심 설계

### Webhook API 엔드포인트

```
POST /api/webhooks/intake/[workspaceSlug]
Authorization: Bearer {WEBHOOK_SECRET}
Content-Type: application/json

{ "name": "홍길동", "contact": "010-1234-5678", "content": "의뢰 내용", "source": "instagram" }
```

**처리 순서**:
1. `WEBHOOK_SECRET` 환경변수 존재 확인 → 미설정 시 503
2. `Authorization` 헤더 검증 → 불일치 시 401
3. JSON 파싱 → 실패 시 400
4. `name`, `content` 필수 검증 → 누락 시 422
5. `workspaceSlug`로 Workspace 조회 → 미존재 시 404
6. `source` 레이블을 content 상단에 prefix (`[인스타그램 DM]\n`)
7. `Inquiry` 생성
8. 워크스페이스 멤버 알림 발송 (실패해도 201 응답 — best-effort)

**소스 레이블 매핑**:
```
instagram → 인스타그램 DM
kakao     → 카카오톡 채널
naver     → 네이버 톡톡
zapier    → Zapier
make      → Make
custom    → 외부 연동
```

### 설정 UI (WebhookInfo)

- `activeTab` 상태로 인스타그램 / 카카오채널 / 네이버 톡톡 탭 전환
- 각 탭: 설정 위치 안내(amber info box) + 번호 단계 + 복사 가능 자동 응답 메시지 템플릿(의뢰 폼 URL 포함)
- "고급" `<details>` 요소: 엔드포인트 URL, `Authorization` 헤더, JSON 스키마, curl 예제, 테스트 전송 버튼
- `useActionState(sendTestInquiry, {})` 기반 테스트 버튼

---

## 인터페이스 계약

- 기존 `app/intake/[workspaceSlug]` 공개 폼 변경 없음
- `lib/notifications.ts`의 `sendNotification()` 기존 인터페이스 그대로 사용

---

## 테스트 전략

| SC 식별자 | 테스트 유형 | 시나리오 요약 | 기대 결과 |
|---|---|---|---|
| SC-001 | 수동 검증 | 올바른 인증·필드로 POST | 201 + inquiryId |
| SC-002 | 수동 검증 | 잘못된 Bearer 토큰 | 401 |
| SC-003 | 수동 검증 | source: "instagram" 포함 | content에 `[인스타그램 DM]` prefix |
| SC-004 | UI 검증 | 탭 전환 + 복사 버튼 | 탭별 가이드 + clipboard 복사 |
| SC-005 | UI 검증 | 테스트 전송 버튼 | 성공 메시지 + 대시보드에 Inquiry 생성 |
| SC-006 | UI 검증 | 고급 섹션 기본 상태 | 닫힘, 클릭 시 토글 |

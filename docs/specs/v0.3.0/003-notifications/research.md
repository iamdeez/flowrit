# Research: notifications

## 목차

- [기존 코드베이스 분석](#기존-코드베이스-분석)
- [영향 범위 분석](#영향-범위-분석)
- [기술 선택 조사](#기술-선택-조사)
- [엣지 케이스 및 한계](#엣지-케이스-및-한계)

---

## 기존 코드베이스 분석

### Resend 이메일 현황

`lib/email.ts`: `sendInviteEmail(email, inviteUrl)` 하나만 구현. `FROM` 주소는 `process.env.RESEND_FROM_EMAIL`. 인라인 HTML 템플릿.

신규 이메일 함수를 동일 파일에 추가한다 (`sendNewInquiryEmail`, `sendRevisionSubmittedEmail`, `sendStageChangedEmail`, `sendDeadlineReminderEmail`).

### 알림 훅 포인트

이메일을 발송해야 하는 이벤트들과 현재 위치:

| 이벤트 | 현재 위치 | 현재 이메일 발송 |
|---|---|---|
| 신규 의뢰 접수 | `lib/actions/inquiry.ts > submitInquiry` | 없음 |
| 수정 요청 제출 | `app/p/[token]/revision/route.ts` 또는 Server Action | 없음 |
| 프로젝트 단계 변경 | `lib/actions/project.ts > advanceStage` (추정) | 없음 |
| 마감일 임박 | 없음 | 없음 (Cron 신규) |

`submitInquiry` 흐름:
```ts
// lib/actions/inquiry.ts
export async function submitInquiry(prevState, formData) {
  // ... prisma.inquiry.create()
  // → 여기에 sendNewInquiryEmail() 추가
  revalidatePath('/dashboard');
}
```

수정 요청 제출 경로는 고객 포털(`/p/[token]`)에서 이루어진다. `app/p/[token]/revision/` 폴더를 확인해야 하나, Server Action 또는 Route Handler 중 하나를 통해 `RevisionRequest`를 생성한다. 생성 후 이메일 발송 훅 삽입.

단계 변경은 현재 `lib/actions/project.ts`에서 처리된다. `currentStageId` 업데이트 시 이메일 발송.

### Vercel Cron 현황

`vercel.json`이 존재하는지 확인 필요. 현재 cron 설정이 없으면 신규 생성한다.

### 인앱 알림 모델 부재

`Notification` 모델이 없다. 신규 생성 필요.

### `notificationSettings` JSON

`User.notificationSettings`는 001-settings 스펙에서 추가한다. 본 스펙 구현 시 해당 필드가 존재한다고 가정한다.

---

## 영향 범위 분석

### 영향 파일 목록

| 파일 | 변경 유형 | 영향 내용 |
|---|---|---|
| `prisma/schema.prisma` | 수정 | `Notification` 모델 추가, `TimelineEvent.eventType` DEADLINE_NOTIFIED 추가 |
| `lib/email.ts` | 수정 | 4개 이메일 함수 추가 |
| `lib/actions/inquiry.ts` | 수정 | `submitInquiry` 완료 후 이메일 + 알림 생성 |
| `lib/actions/project.ts` | 수정 | 단계 변경 후 이메일 + 알림 생성 |
| `app/p/[token]/revision/` 관련 파일 | 수정 | 수정 요청 제출 후 이메일 + 알림 생성 |
| `app/api/cron/deadline-reminder/route.ts` | 신규 | 마감일 리마인더 Cron Route Handler |
| `vercel.json` | 수정 또는 신규 | Cron Job 설정 |
| `app/(dashboard)/layout.tsx` | 수정 | 알림 벨 컴포넌트 추가 |
| `components/notification-bell.tsx` | 신규 | 알림 벨 + 드롭다운 패널 클라이언트 컴포넌트 |
| `lib/actions/notifications.ts` | 신규 | `markNotificationsRead`, `getNotifications` Server Actions |

---

## 기술 선택 조사

### 알림 벨 실시간성

Next.js App Router에서 알림 벨의 실시간 업데이트를 위한 옵션:
1. **Polling (선택)**: 클라이언트 컴포넌트에서 `setInterval`로 주기적으로 `getNotifications()` 호출. 구현이 단순하나 지연이 있음.
2. **SSE / WebSocket**: 복잡도 높음. 이 스펙에서는 미채택.
3. **페이지 로드 시 서버 데이터**: RSC에서 초기 카운트 렌더링, 패널 열 때 서버 액션으로 최신 목록 조회.

**결정**: 페이지 로드 시 미읽음 카운트를 RSC에서 렌더링, 패널 열기 시 Server Action으로 목록 조회. Polling 없음 (실시간성 불필요, 열 때마다 최신 데이터 반영).

### Cron 보안

Vercel Cron Job은 요청 시 `Authorization: Bearer {CRON_SECRET}` 헤더를 추가한다. Route Handler에서 `request.headers.get('authorization')` 검증.

```ts
// app/api/cron/deadline-reminder/route.ts
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... deadline 조회 및 이메일 발송
}
```

### 이메일 발송 실패 격리

```ts
// NFR-401 준수: try/catch로 격리
try {
  await sendNewInquiryEmail(...)
  await createNotification(...)
} catch (e) {
  console.error('Notification failed:', e)
  // 실패해도 핵심 기능(inquiry 저장)은 성공으로 처리됨
}
```

---

## 엣지 케이스 및 한계

- **마감일 리마인더 중복 방지**: `TimelineEvent`에 `type: 'DEADLINE_NOTIFIED'`를 기록하고, Cron 실행 시 이미 해당 레코드가 있으면 스킵한다. 단, `dueDate`가 변경된 경우 기존 DEADLINE_NOTIFIED 레코드가 있어도 재발송이 필요하다 — 이 스펙에서는 단순하게 날짜 변경 후 1회 재발송을 허용하지 않는다(범위 외). 현재 구현: 프로젝트당 DEADLINE_NOTIFIED 레코드가 하나라도 있으면 스킵.
- **`notificationSettings` 미존재 멤버**: `notificationSettings`가 `{}`인 경우 모든 알림 활성으로 간주하는 opt-out 방식(research 001-settings 참조).
- **워크스페이스 멤버 이메일 조회**: 알림 대상자 이메일을 찾기 위해 `WorkspaceMember → User.email` join이 필요하다.
- **Notification 레코드 누적**: 90일 자동 삭제 정책 미구현(NFR-403). 장기 운영 시 Notification 테이블이 크게 성장할 수 있다.

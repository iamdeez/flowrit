# Plan: notifications

## 목차

- [사전 검증 (Constitution Gates)](#사전-검증-constitution-gates)
- [기술 컨텍스트](#기술-컨텍스트)
- [사전 영향도 분석 결과](#사전-영향도-분석-결과)
- [핵심 설계](#핵심-설계)
- [인터페이스 계약](#인터페이스-계약)
- [데이터 모델](#데이터-모델)
- [테스트 전략](#테스트-전략)
- [기타 고려사항](#기타-고려사항)

---

## 사전 검증 (Constitution Gates)

- [x] 성능 원칙: 이메일 발송은 비동기 `try/catch` 블록으로 분리되어 핵심 API 응답 시간에 영향을 주지 않는다.
- [x] 호환성 원칙: `Notification` 모델 신규 추가, `TimelineEvent.eventType` 신규 값 추가 — 기존 코드 런타임 에러 없음.
- [x] 테스트 원칙: FR-401~FR-411 모두 SC-401~SC-406에 수용 기준이 있다.
- [x] 스펙 범위 원칙: 구현이 spec.md 범위(이메일 알림 4종, Cron 리마인더, 인앱 알림)를 벗어나지 않는다.

---

## 기술 컨텍스트

- **언어 / 런타임**: TypeScript, Next.js 16 App Router, Vercel
- **주요 의존성**: Resend, Prisma ORM, Vercel Cron (vercel.json)
- **환경 변수 추가**: `CRON_SECRET` (Vercel 자동 주입 또는 수동 설정)

---

## 사전 영향도 분석 결과

### 영향 파일 목록

| 파일 | 변경 유형 | 영향 내용 |
|---|---|---|
| `prisma/schema.prisma` | 수정 | `Notification` 모델 추가 |
| `lib/email.ts` | 수정 | 이메일 함수 4개 추가 |
| `lib/actions/inquiry.ts` | 수정 | `submitInquiry` — 알림 훅 삽입 |
| `lib/actions/project.ts` | 수정 | 단계 변경 액션 — 알림 훅 삽입 |
| `app/p/[token]/revision` 관련 | 수정 | 수정 요청 제출 — 알림 훅 삽입 |
| `app/api/cron/deadline-reminder/route.ts` | 신규 | Cron Route Handler |
| `vercel.json` | 수정/신규 | Cron 스케줄 설정 |
| `app/(dashboard)/layout.tsx` | 수정 | 알림 벨 컴포넌트 추가 |
| `components/notification-bell.tsx` | 신규 | 알림 벨 + 드롭다운 |
| `lib/actions/notifications.ts` | 신규 | 알림 Server Actions |

---

## 핵심 설계

### 알림 유틸리티 (`lib/notifications.ts`)

```ts
// 알림 생성 + 이메일 발송을 한 번에 처리하는 유틸리티
export async function sendNotification({
  userIds,       // 알림 수신자 userId 배열
  workspaceId,
  type,          // 'NEW_INQUIRY' | 'REVISION_SUBMITTED' | 'STAGE_CHANGED' | 'DEADLINE_SOON'
  title,
  body,
  href,
  emailFn,       // 이메일 발송 함수 (선택)
}: NotificationPayload): Promise<void>
```

내부 동작:
1. `userIds`로 User 조회 (email, notificationSettings)
2. 각 사용자의 `notificationSettings[type_key]`가 false이면 스킵
3. `prisma.notification.createMany(...)` — 배치 생성
4. 활성 수신자에게만 `emailFn(user.email, ...)` 호출 (try/catch로 격리)

### 이메일 함수 (`lib/email.ts` 추가)

```ts
export async function sendNewInquiryEmail(to: string, payload: { submitterName: string; contact: string; excerpt: string; dashboardUrl: string }): Promise<void>
export async function sendRevisionSubmittedEmail(to: string, payload: { projectTitle: string; content: string; fileCount: number; projectUrl: string }): Promise<void>
export async function sendStageChangedEmail(to: string, payload: { projectTitle: string; fromStage: string; toStage: string; changedBy: string; projectUrl: string }): Promise<void>
export async function sendDeadlineReminderEmail(to: string, payload: { projectTitle: string; customerName: string; dueDate: string; pendingRevisions: number; projectUrl: string }): Promise<void>
```

### 훅 삽입 패턴 (inquiry.ts 예시)

```ts
export async function submitInquiry(prevState, formData) {
  const inquiry = await prisma.inquiry.create({ ... });

  // 비차단 알림 훅
  try {
    const owners = await prisma.workspaceMember.findMany({
      where: { workspaceId: inquiry.workspaceId, role: { in: ['OWNER'] } },
      include: { user: true },
    });
    await sendNotification({
      userIds: owners.map(m => m.userId),
      workspaceId: inquiry.workspaceId,
      type: 'NEW_INQUIRY',
      title: '새 의뢰가 접수되었습니다',
      body: inquiry.content.slice(0, 100),
      href: '/dashboard',
      emailFn: (email) => sendNewInquiryEmail(email, { ... }),
    });
  } catch (e) {
    console.error('[notification] submitInquiry failed:', e);
  }

  revalidatePath('/dashboard');
}
```

### Cron Route Handler

```ts
// app/api/cron/deadline-reminder/route.ts
export async function GET(request: Request) {
  // 1. CRON_SECRET 검증
  // 2. 현재 시각 기준 23~25시간 후 dueDate인 진행 중 프로젝트 조회
  //    (archivedAt이 null, isProjectDone() = false)
  // 3. 각 프로젝트에 대해 TimelineEvent DEADLINE_NOTIFIED 여부 확인
  // 4. 미발송 프로젝트에 sendDeadlineReminderEmail + TimelineEvent 기록
  return Response.json({ processed: count });
}
```

### vercel.json

```json
{
  "crons": [
    {
      "path": "/api/cron/deadline-reminder",
      "schedule": "0 * * * *"
    }
  ]
}
```

### 알림 벨 컴포넌트

```tsx
// components/notification-bell.tsx — Client Component
'use client'
// - 초기 unreadCount는 props로 수신 (RSC에서 전달)
// - 클릭 시 Popover 열림
// - Popover 열릴 때 markNotificationsRead() Server Action 호출
// - Popover 내부: 최근 알림 20건 목록 (href로 링크)
```

RSC 레이아웃에서:
```tsx
// app/(dashboard)/layout.tsx
const unreadCount = await prisma.notification.count({
  where: { userId: session.user.id, isRead: false }
});
// <NotificationBell initialUnreadCount={unreadCount} />
```

---

## 인터페이스 계약

- `sendNotification()` 유틸리티는 핵심 흐름 외부에서 `try/catch`로 래핑하여 호출한다. 실패해도 호출자 함수는 정상 반환한다.
- `Cron Route Handler`는 `CRON_SECRET` 미일치 시 `401`을 반환한다. Vercel이 주입하는 헤더 외에는 호출을 허용하지 않는다.
- `markNotificationsRead`는 `userId` 기반으로만 동작하며, 다른 사용자의 알림을 변경하지 않는다.

---

## 데이터 모델

### Notification 신규 모델

```prisma
model Notification {
  id          String    @id @default(cuid())
  userId      String
  workspaceId String
  type        String    // 'NEW_INQUIRY' | 'REVISION_SUBMITTED' | 'STAGE_CHANGED' | 'DEADLINE_SOON'
  title       String
  body        String
  href        String
  isRead      Boolean   @default(false)
  createdAt   DateTime  @default(now())

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@index([workspaceId])
}
```

---

## 테스트 전략

| SC 식별자 | 테스트 유형 | 시나리오 요약 | 입력 | 기대 결과 |
|---|---|---|---|---|
| SC-401 | 수동 E2E | 인테이크 폼 제출 시 Owner 이메일 수신 | 인테이크 폼 제출 | Resend 로그에서 이메일 발송 확인 |
| SC-402 | 수동 E2E | 수정 요청 제출 시 담당자 이메일 수신 | 고객 포털 수정 요청 제출 | 담당자 이메일 발송; 담당자 없으면 Owner |
| SC-403 | 수동 E2E | 단계 변경 시 담당자(본인 아닌 경우)에게 이메일 | 팀원 A가 단계 변경, 담당자 B | B에게 이메일 발송 |
| SC-404 | 수동 E2E | Cron — 마감일 약 24시간 전 프로젝트에 리마인더 발송 | Cron GET 호출 | 이메일 발송 + DEADLINE_NOTIFIED 기록 |
| SC-405 | 수동 E2E | 알림 설정 OFF 시 이메일 미발송 | `notify_new_inquiry: false` 후 인테이크 제출 | 이메일 미발송 확인 |
| SC-406 | 수동 E2E | 알림 벨 미읽음 카운트 + 패널 열기 | 알림 생성 후 페이지 이동 | 벨에 숫자 뱃지, 패널에 목록 |

---

## 기타 고려사항

- **이메일 HTML 템플릿**: `lib/email.ts`의 기존 `sendInviteEmail` 스타일(인라인 CSS)을 동일하게 적용. 공통 래퍼(`emailWrapper(content: string)`)로 헤더·푸터를 재사용한다.
- **Notification 조회 성능**: `@@index([userId, isRead])`으로 미읽음 카운트 쿼리 최적화.
- **Cron CRON_SECRET**: Vercel 환경에서는 자동 설정되나, 로컬 테스트 시 `.env.local`에 임의 값을 설정하고 `x-vercel-signature` 헤더로 직접 호출하여 테스트한다.

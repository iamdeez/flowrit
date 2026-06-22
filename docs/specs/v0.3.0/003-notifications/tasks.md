# Tasks: notifications

## 목차

- [전제 조건](#전제-조건)
- [태스크 목록](#태스크-목록)
- [구현 완료 기준](#구현-완료-기준)

---

## 전제 조건

- [x] spec.md의 모든 `[NEEDS CLARIFICATION]` 항목이 해소되었는가?
- [x] plan.md의 Constitution Gates가 모두 통과(또는 예외 기재)되었는가?
- [ ] 001-settings의 `User.notificationSettings` 필드가 마이그레이션 완료되었는가? (T001 선행 필요)
- [ ] CHANGES.md에서 이전 작업의 "후속 작업 시 주의사항"을 확인했는가?

---

## 태스크 목록

### Phase 1. 스키마 마이그레이션

- [ ] **T001** — `Notification` 모델 추가 + 마이그레이션
  - 구현 파일: `prisma/schema.prisma`
  - 관련 요구사항: `FR-410`
  - 상세:
    - `Notification` 모델 추가 (plan.md 데이터 모델 참조)
    - `User`, `Workspace`에 `notifications Notification[]` 역관계 추가
    - `npx prisma migrate dev --name add-notification-model`
  - 완료 기준: 마이그레이션 성공, `Notification` 테이블 생성

### Phase 2. 이메일 함수 추가

- [ ] **T002** — `lib/email.ts` 이메일 함수 4개 + 공통 래퍼 추가 (T001 완료 후)
  - 구현 파일: `lib/email.ts`
  - 관련 요구사항: `FR-401`, `FR-402`, `FR-403`, `FR-404`
  - 상세:
    - `emailWrapper(content: string): string` 공통 HTML 래퍼 함수
    - `sendNewInquiryEmail(to, payload)` — 의뢰 접수 알림
    - `sendRevisionSubmittedEmail(to, payload)` — 수정 요청 알림
    - `sendStageChangedEmail(to, payload)` — 단계 변경 알림
    - `sendDeadlineReminderEmail(to, payload)` — 마감 리마인더
    - 각 함수: `resend.emails.send(...)` + 인라인 CSS 템플릿
  - 완료 기준: 함수 타입 컴파일 오류 없음, Resend API 형식 준수

### Phase 3. 알림 유틸리티

- [ ] **T003** — `lib/notifications.ts` 신규 (T001, T002 완료 후)
  - 구현 파일: `lib/notifications.ts`
  - 관련 요구사항: `FR-401`~`FR-411`
  - 상세:
    - `sendNotification({ userIds, workspaceId, type, title, body, href, emailFn })` 구현
    - `notificationSettings` JSON에서 해당 type 키 확인 (기본 true)
    - `prisma.notification.createMany(...)` 배치 생성
    - 활성 수신자에게 `emailFn` 호출 (try/catch 격리)
  - 완료 기준: 알림 생성 + 이메일 발송이 단일 함수로 처리됨

### Phase 4. 훅 삽입

- [ ] **T004** — `lib/actions/inquiry.ts` — `submitInquiry` 훅 삽입 (T003 완료 후)
  - 구현 파일: `lib/actions/inquiry.ts`
  - 관련 요구사항: `FR-401`
  - 상세:
    - `inquiry.create()` 완료 후 `try/catch` 블록에서 `sendNotification()` 호출
    - 대상: Owner + `notify_new_inquiry` 활성 멤버
  - 완료 기준: 의뢰 접수 시 이메일 발송 (Resend 로그 확인)

- [ ] **T005** `[P]` — 수정 요청 제출 훅 삽입 (T003 완료 후)
  - 구현 파일: 고객 포털 수정 요청 Server Action 또는 Route Handler (코드 탐색 후 결정)
  - 관련 요구사항: `FR-402`
  - 상세:
    - `RevisionRequest.create()` 완료 후 담당자(`assigneeId`) 또는 Owner에게 알림
    - `sendNotification()` + `sendRevisionSubmittedEmail`
  - 완료 기준: 고객 포털 수정 제출 시 이메일 발송

- [ ] **T006** `[P]` — 단계 변경 훅 삽입 (T003 완료 후)
  - 구현 파일: `lib/actions/project.ts` (단계 변경 액션)
  - 관련 요구사항: `FR-403`
  - 상세:
    - 단계 변경 시 `assigneeId !== session.user.id`인 경우에만 담당자에게 알림
    - `sendNotification()` + `sendStageChangedEmail`
  - 완료 기준: 본인이 변경 시 미발송, 타인이 변경 시 담당자에게 발송

### Phase 5. 마감일 리마인더 Cron

- [ ] **T007** — `app/api/cron/deadline-reminder/route.ts` 신규 (T002 완료 후)
  - 구현 파일: `app/api/cron/deadline-reminder/route.ts`
  - 관련 요구사항: `FR-404`, `FR-405`, `FR-406`
  - 상세:
    - `CRON_SECRET` Authorization 헤더 검증
    - 현재 시각 기준 23~25시간 후 dueDate인 진행 중(`archivedAt: null`) 프로젝트 조회
    - 각 프로젝트에 `TimelineEvent DEADLINE_NOTIFIED` 여부 확인 → 있으면 스킵
    - `sendDeadlineReminderEmail` + `TimelineEvent.create(type: 'DEADLINE_NOTIFIED')`
    - `{ processed: N }` 반환
  - 완료 기준: CRON_SECRET 없이 401, 올바른 요청 시 해당 프로젝트 이메일 발송

- [ ] **T008** `[P]` — `vercel.json` Cron 설정 추가/생성
  - 구현 파일: `vercel.json`
  - 관련 요구사항: `FR-405`
  - 상세: `{ "crons": [{ "path": "/api/cron/deadline-reminder", "schedule": "0 * * * *" }] }` 추가
  - 완료 기준: Vercel 대시보드에서 Cron Job 확인 가능 (배포 후)

### Phase 6. 인앱 알림 벨

- [ ] **T009** — `lib/actions/notifications.ts` 신규 (T001 완료 후)
  - 구현 파일: `lib/actions/notifications.ts`
  - 관련 요구사항: `FR-407`, `FR-408`, `FR-409`
  - 상세:
    - `getNotifications(userId)`: 최근 20건 반환
    - `markNotificationsRead(userId)`: `isRead: true` 일괄 업데이트
  - 완료 기준: 쿼리 타입 오류 없음

- [ ] **T010** `[P]` — `components/notification-bell.tsx` 신규 (T009 완료 후)
  - 구현 파일: `components/notification-bell.tsx`
  - 관련 요구사항: `FR-407`, `FR-408`, `FR-409`
  - 상세:
    - `'use client'` + Popover/DropdownMenu + unreadCount props
    - 클릭 시 `markNotificationsRead()` 호출
    - 알림 목록 렌더링 (이벤트 유형 아이콘, 요약, 시간, href 링크)
    - 읽음 처리 후 뱃지 숨김
  - 완료 기준: 미읽음 뱃지 표시, 패널 열기·닫기 동작

- [ ] **T011** — `app/(dashboard)/layout.tsx` 수정 — 알림 벨 추가 (T009, T010 완료 후)
  - 구현 파일: `app/(dashboard)/layout.tsx`
  - 상세:
    - RSC에서 `prisma.notification.count({ where: { userId, isRead: false } })` 조회
    - `<NotificationBell initialUnreadCount={unreadCount} />` 삽입 (헤더 영역)
  - 완료 기준: 레이아웃에 알림 벨 표시

### Phase 7. 테스트 검증

- [ ] **T012** — SC-401~SC-406 수동 E2E 검증
  - plan.md 테스트 전략 표 기준으로 시나리오 순서대로 검증
  - 완료 기준: 전체 SC 통과 확인

---

## 구현 완료 기준

- [ ] 모든 태스크 체크박스가 완료 처리되었다.
- [ ] 의뢰 접수, 수정 요청, 단계 변경 각각에서 이메일이 발송된다.
- [ ] 이메일 발송 실패가 핵심 기능 실패를 유발하지 않는다.
- [ ] Cron Route Handler가 CRON_SECRET 없이 401을 반환한다.
- [ ] 알림 벨에 미읽음 카운트가 표시되고, 패널을 열면 읽음 처리된다.
- [ ] `git status`에 의도치 않은 파일이 없다.

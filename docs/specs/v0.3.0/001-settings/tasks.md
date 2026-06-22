# Tasks: settings

## 목차

- [전제 조건](#전제-조건)
- [태스크 목록](#태스크-목록)
- [구현 완료 기준](#구현-완료-기준)

---

## 전제 조건

- [x] spec.md의 모든 `[NEEDS CLARIFICATION]` 항목이 해소되었는가?
- [x] plan.md의 Constitution Gates가 모두 통과(또는 예외 기재)되었는가?
- [x] CHANGES.md에서 이전 작업의 "후속 작업 시 주의사항"을 확인했는가?

---

## 태스크 목록

### Phase 1. 스키마 마이그레이션

- [x] **T001** — `User.notificationSettings` 필드 추가
  - 구현 파일: `prisma/schema.prisma`
  - 관련 요구사항: `FR-209`, `FR-210`, `FR-211`, `FR-212`
  - 상세: `User` 모델에 `notificationSettings Json @default("{}")` 추가 후 `npx prisma migrate dev --name add-notification-settings` 실행
  - 완료 기준: `prisma migrate status`가 최신 상태, DB에 컬럼 존재

### Phase 2. Server Actions

- [x] **T002** — `lib/actions/settings.ts` 신규 — `updateProfile` 구현
  - 구현 파일: `lib/actions/settings.ts`
  - 관련 요구사항: `FR-201`, `FR-202`
  - 상세: `'use server'` + `auth()` + `prisma.user.update({ name, email })` + 이메일 중복 검사 + `revalidatePath('/settings')`
  - 완료 기준: 이름·이메일 변경 시 DB에 반영됨, 중복 이메일 에러 처리

- [x] **T003** `[P]` — `changePassword` 구현
  - 구현 파일: `lib/actions/settings.ts`
  - 관련 요구사항: `FR-203`, `FR-204`
  - 상세: `bcrypt.compare(currentPw, hash)` 검증 → `bcrypt.hash(newPw, 12)` → `prisma.user.update`
  - 완료 기준: 현재 비밀번호 불일치 시 에러, 올바른 입력 시 DB 업데이트

- [x] **T004** `[P]` — `updateWorkspace` 구현
  - 구현 파일: `lib/actions/settings.ts`
  - 관련 요구사항: `FR-205`, `FR-206`, `FR-207`
  - 상세: OWNER 역할 검증 + slug 중복 검사(자신 제외) + `prisma.workspace.update`
  - 완료 기준: MEMBER 호출 시 에러, 중복 슬러그 에러, OWNER 성공 시 DB 업데이트

- [x] **T005** `[P]` — `updateNotificationSettings` 구현
  - 구현 파일: `lib/actions/settings.ts`
  - 관련 요구사항: `FR-208`, `FR-209`, `FR-210`, `FR-211`, `FR-212`
  - 상세: FormData에서 4개 toggle 값 읽기 → JSON 파싱 → `prisma.user.update({ notificationSettings })`
  - 완료 기준: 설정값이 DB JSON에 저장됨

- [x] **T006** `[P]` — `leaveWorkspace` + `deleteWorkspace` 구현
  - 구현 파일: `lib/actions/settings.ts`
  - 관련 요구사항: `FR-213`
  - 상세:
    - `leaveWorkspace`: OWNER 탈퇴 방지 → `WorkspaceMember.delete` → `signOut()`
    - `deleteWorkspace`: OWNER 검증 + 확인 텍스트 일치 → `Workspace.delete` → `signOut()`
  - 완료 기준: OWNER 탈퇴 시 에러, MEMBER 탈퇴 시 세션 종료, 삭제 시 전체 데이터 삭제 확인

### Phase 3. UI 컴포넌트

- [x] **T007** — `app/(dashboard)/settings/page.tsx` 신규 (T002~T006 완료 후)
  - 구현 파일: `app/(dashboard)/settings/page.tsx`
  - 관련 요구사항: `FR-201`, `FR-205`, `FR-208`, `FR-213`
  - 상세: RSC — `auth()` + 사용자·워크스페이스·멤버 조회 + `searchParams.tab` 기반 탭 렌더링 + `<Tabs>` 레이아웃
  - 완료 기준: `/settings` 접근 시 프로필 탭 기본 표시, 404 없음

- [x] **T008** `[P]` — `profile-form.tsx` 신규
  - 구현 파일: `app/(dashboard)/settings/profile-form.tsx`
  - 상세: `'use client'` + `useActionState(updateProfile)` + 이름·이메일 input + 저장 버튼 + 에러 표시
  - 완료 기준: 폼 제출 시 Server Action 호출, 에러 메시지 표시

- [x] **T009** `[P]` — `password-form.tsx` 신규
  - 구현 파일: `app/(dashboard)/settings/password-form.tsx`
  - 상세: `'use client'` + `useActionState(changePassword)` + 현재/신규/확인 비밀번호 input
  - 완료 기준: 불일치 에러, 성공 메시지 표시

- [x] **T010** `[P]` — `workspace-form.tsx` 신규
  - 구현 파일: `app/(dashboard)/settings/workspace-form.tsx`
  - 상세: OWNER에게만 표시 + 이름·슬러그 input + 슬러그 변경 경고 텍스트
  - 완료 기준: OWNER에게만 탭 표시, 폼 저장 동작

- [x] **T011** `[P]` — `notification-form.tsx` 신규
  - 구현 파일: `app/(dashboard)/settings/notification-form.tsx`
  - 상세: 4개 알림 항목 Switch 토글 + `useActionState(updateNotificationSettings)` + 저장 버튼
  - 완료 기준: 토글 상태가 DB 값으로 초기화, 저장 시 반영

- [x] **T012** `[P]` — `danger-zone.tsx` 신규
  - 구현 파일: `app/(dashboard)/settings/danger-zone.tsx`
  - 상세:
    - 탈퇴: MEMBER에게만 표시 + AlertDialog 확인
    - 삭제: OWNER에게만 표시 + Dialog + 워크스페이스 이름 입력 확인
  - 완료 기준: 확인 텍스트 불일치 시 삭제 버튼 비활성화

### Phase 4. 테스트 검증

- [x] **T013** — SC-201~SC-212 수동 E2E 검증
  - plan.md 테스트 전략 표 기준으로 시나리오 순서대로 검증
  - 완료 기준: 전체 SC 통과 확인

---

## 구현 완료 기준

- [x] 모든 태스크 체크박스가 완료 처리되었다.
- [x] `/settings` 접근 시 404가 발생하지 않는다.
- [x] 프로필 수정, 비밀번호 변경, 워크스페이스 설정, 알림 설정, 탈퇴·삭제가 모두 정상 동작한다.
- [x] MEMBER 계정에서 워크스페이스 설정 탭이 보이지 않거나 권한 에러가 발생한다.
- [x] `git status`에 의도치 않은 파일이 없다.

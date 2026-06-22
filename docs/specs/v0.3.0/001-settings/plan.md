# Plan: settings

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

> constitution.md 미존재 — 기본 4개 조항 사용.

- [x] 성능 원칙: 설정 페이지는 사용자가 드물게 방문하는 페이지로, 추가적인 성능 저하 요인을 포함하지 않는다.
- [x] 호환성 원칙: `User.notificationSettings` 필드는 신규 추가(`@default("{}")`)이므로 기존 코드가 런타임 에러를 유발하지 않는다.
- [x] 테스트 원칙: FR-201~FR-213 모두 SC-201~SC-213에 대응하는 수용 기준이 있다.
- [x] 스펙 범위 원칙: 구현이 spec.md 범위(프로필·워크스페이스·알림 설정·위험 구역)를 벗어나지 않는다.

---

## 기술 컨텍스트

- **언어 / 런타임**: TypeScript, Next.js 16 App Router, Node.js
- **주요 의존성**: NextAuth v5 (`auth()`), Prisma ORM, bcryptjs, shadcn/ui
- **테스트**: 수동 E2E 검증 (vitest 단위 테스트는 Server Action 레벨 선택적 적용)

---

## 사전 영향도 분석 결과

research.md 분석 결과를 기반으로 한다.

### 영향 파일 목록

| 파일 | 변경 유형 | 영향 내용 |
|---|---|---|
| `prisma/schema.prisma` | 수정 | `User`에 `notificationSettings Json @default("{}")` 추가 |
| `app/(dashboard)/settings/page.tsx` | 신규 | 설정 RSC — 탭에 따라 폼 렌더링 |
| `app/(dashboard)/settings/profile-form.tsx` | 신규 | 프로필 수정 클라이언트 컴포넌트 |
| `app/(dashboard)/settings/password-form.tsx` | 신규 | 비밀번호 변경 클라이언트 컴포넌트 |
| `app/(dashboard)/settings/workspace-form.tsx` | 신규 | 워크스페이스 설정 폼 (Owner 전용) |
| `app/(dashboard)/settings/notification-form.tsx` | 신규 | 알림 설정 토글 폼 |
| `app/(dashboard)/settings/danger-zone.tsx` | 신규 | 위험 구역 (탈퇴·삭제) |
| `lib/actions/settings.ts` | 신규 | 5개 Server Action |
| `components/sidebar-nav.tsx` | 변경 없음 | `/settings` 링크 이미 존재 |

---

## 핵심 설계

### 탭 구조

`/settings?tab=profile` (기본) / `?tab=workspace` / `?tab=notifications` / `?tab=danger`

RSC인 `page.tsx`가 `searchParams.tab`으로 분기하여 해당 폼 컴포넌트를 렌더링한다.

```tsx
// app/(dashboard)/settings/page.tsx (RSC)
export default async function SettingsPage({ searchParams }) {
  const session = await auth();
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id, workspaceId: session.user.workspaceId }
  });
  const workspace = await prisma.workspace.findUnique({
    where: { id: session.user.workspaceId }
  });
  const tab = searchParams?.tab ?? 'profile';
  // 탭에 따라 폼 컴포넌트 렌더링
}
```

### Server Actions (`lib/actions/settings.ts`)

#### updateProfile

```ts
export async function updateProfile(prevState, formData: FormData)
// formData: name, email
// 1. auth() 세션 확인
// 2. prisma.user.update({ where: { id }, data: { name, email } })
// 3. revalidatePath('/settings')
// return: { error? }
```

#### changePassword

```ts
export async function changePassword(prevState, formData: FormData)
// formData: currentPassword, newPassword, confirmPassword
// 1. auth() 세션 확인
// 2. DB에서 User.password 조회
// 3. bcrypt.compare(currentPassword, storedHash) → 불일치 시 error 반환
// 4. newPassword === confirmPassword 검증
// 5. bcrypt.hash(newPassword, 12)
// 6. prisma.user.update({ where: { id }, data: { password: hashed } })
// return: { error?, success? }
```

#### updateWorkspace

```ts
export async function updateWorkspace(prevState, formData: FormData)
// formData: name, slug
// 1. auth() + OWNER 역할 확인 (member.role !== 'OWNER' → 403)
// 2. slug 중복 검사 (자신 제외)
// 3. prisma.workspace.update(...)
// 4. revalidatePath('/settings')
// return: { error? }
```

#### updateNotificationSettings

```ts
export async function updateNotificationSettings(prevState, formData: FormData)
// formData: notify_new_inquiry, notify_revision_submitted, notify_stage_changed, notify_deadline_soon
// 1. auth()
// 2. JSON 파싱 후 prisma.user.update({ notificationSettings: settings })
// return: { error? }
```

#### leaveWorkspace

```ts
export async function leaveWorkspace()
// 1. auth()
// 2. OWNER는 탈퇴 불가 (다른 멤버에게 소유권 이전 후 가능) → error
// 3. prisma.workspaceMember.delete(...)
// 4. signOut() → 로그인 페이지 redirect
```

#### deleteWorkspace

```ts
export async function deleteWorkspace(prevState, formData: FormData)
// formData: confirmText (워크스페이스 이름 입력)
// 1. auth() + OWNER 역할 확인
// 2. confirmText === workspace.name 검증
// 3. prisma.workspace.delete(...) — Cascade로 전체 삭제
// 4. signOut()
```

---

## 인터페이스 계약

- `settings.ts` Server Actions는 모두 `(prevState: State, formData: FormData)` 시그니처를 따른다 (`useActionState` 패턴 일관성).
- `updateProfile`, `changePassword`는 `User.id` 기반으로만 동작한다. `workspaceId`에 의존하지 않는다.
- `updateWorkspace`, `deleteWorkspace`는 `WorkspaceMember.role === 'OWNER'` 서버 측 검증이 필수다. 클라이언트 측 숨김 처리는 보완적 UX일 뿐이다.
- `leaveWorkspace`는 성공 시 `signOut()`을 호출하여 세션을 무효화한다. 클라이언트가 별도 redirect를 수행하지 않아도 된다.

---

## 데이터 모델

### User 스키마 변경

```prisma
model User {
  // 기존 필드 유지
  notificationSettings Json @default("{}")
}
```

`notificationSettings` JSON 구조:

```json
{
  "notify_new_inquiry": true,
  "notify_revision_submitted": true,
  "notify_stage_changed": true,
  "notify_deadline_soon": true
}
```

키 부재 시 `true`로 간주하는 opt-out 방식.

---

## 테스트 전략

| SC 식별자 | 테스트 유형 | 시나리오 요약 | 입력 | 기대 결과 |
|---|---|---|---|---|
| SC-201 | 수동 E2E | `/settings` 접근 시 404 없이 프로필 탭 표시 | 로그인 후 `/settings` 접근 | 프로필 폼 렌더링 |
| SC-202 | 수동 E2E | 이름 변경 저장 | name = "새 이름" | DB 업데이트, 폼에 반영 |
| SC-203 | 수동 E2E | 현재 비밀번호 틀림 | currentPassword 오입력 | 에러 메시지 표시 |
| SC-204 | 수동 E2E | 비밀번호 변경 성공 | 올바른 현재/신규 비밀번호 | 성공 메시지, 새 비밀번호로 로그인 가능 |
| SC-205 | 수동 E2E | OWNER: 워크스페이스 이름·슬러그 변경 | 새 이름, 새 슬러그 | DB 업데이트 |
| SC-206 | 수동 E2E | MEMBER: 워크스페이스 탭 진입 불가 | member 계정으로 `/settings?tab=workspace` | 워크스페이스 탭 미표시 또는 권한 에러 |
| SC-207 | 수동 E2E | 슬러그 중복 | 이미 존재하는 슬러그 입력 | 에러 메시지 표시 |
| SC-208 | 수동 E2E | 알림 설정 토글 저장 | 특정 알림 끄기 | DB JSON 업데이트, 토글 상태 유지 |
| SC-209 | 수동 E2E | 워크스페이스 삭제 확인 텍스트 불일치 | 잘못된 확인 텍스트 | 에러, 삭제 미실행 |
| SC-210 | 수동 E2E | 워크스페이스 삭제 성공 | 정확한 워크스페이스 이름 입력 | 로그아웃 + 전체 데이터 삭제 |
| SC-211 | 수동 E2E | Owner의 탈퇴 시도 차단 | Owner 계정으로 탈퇴 시도 | 에러 메시지(소유권 이전 필요) |
| SC-212 | 수동 E2E | Member 탈퇴 | Member 계정으로 탈퇴 | 세션 종료, 로그인 페이지 이동 |

---

## 기타 고려사항

- **이메일 변경 유효성 검사**: 중복 이메일 여부를 `prisma.user.findUnique({ where: { email } })`로 검증해야 한다. 자신의 이메일과 동일한 경우 변경 없이 성공 처리한다.
- **슬러그 변경 경고**: `workspace-form.tsx`에서 슬러그 변경 시 `"기존 의뢰 접수 URL이 변경됩니다."` 경고 텍스트를 표시한다.
- **위험 구역 UI**: 삭제·탈퇴 버튼은 빨간색 border variant로 구분하고, Dialog 확인 후 액션을 실행한다.

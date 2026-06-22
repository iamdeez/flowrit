# Research: settings

## 목차

- [기존 코드베이스 분석](#기존-코드베이스-분석)
- [영향 범위 분석](#영향-범위-분석)
- [기술 선택 조사](#기술-선택-조사)
- [엣지 케이스 및 한계](#엣지-케이스-및-한계)

---

## 기존 코드베이스 분석

### 인증 구조

`lib/auth.ts` — NextAuth v5 Credentials Provider 기반. JWT 콜백에서 `token.id`(userId)와 `token.workspaceId`를 저장한다. Session은 `session.user.id`, `session.user.workspaceId`를 노출한다.

**핵심 제약**: 이름·이메일 변경 후 JWT 토큰이 자동으로 갱신되지 않는다. NextAuth v5 `update()` 함수(`next-auth/react`의 `useSession().update()`)를 클라이언트에서 호출해야 세션에 반영된다. 단, 현재 레이아웃(`(dashboard)/layout.tsx`)은 사이드바에 사용자 이름을 노출하지 않으므로, **DB 업데이트 + `revalidatePath()` 조합만으로 충분**하다.

### 현재 User 모델

```
User { id, email, password, name, createdAt, memberships[], sessions[] }
```

`notificationSettings` 필드가 없다 → 스키마 마이그레이션 필요.

### 현재 Workspace 모델

```
Workspace { id, name, slug, plan, createdAt, members[], customers[], ... }
```

`slug`는 `@unique`이므로 변경 시 중복 검사 필수. 의뢰 접수 URL `/intake/[workspaceSlug]`에 직접 영향.

### 현재 WorkspaceMember 모델

```
WorkspaceMember { id, workspaceId, userId, role, createdAt }
```

`role`은 `"OWNER"` 또는 `"MEMBER"`. OWNER 여부 확인은 각 Server Action 내에서 수행해야 한다.

### Server Action 패턴

모든 Server Action은 `'use server'` + `auth()` 세션 확인 + `prisma` 쿼리 + `revalidatePath()` 패턴을 따른다. 설정 액션도 동일한 패턴으로 구현한다.

### 비밀번호 처리

`lib/actions/auth.ts`: 회원가입 시 `bcrypt.hash(password, 12)` 사용. 변경 시도 시 `bcrypt.compare(currentPassword, storedHash)` 후 일치하면 `bcrypt.hash(newPassword, 12)`로 재해싱.

### 라우팅 현황

`app/(dashboard)/settings` 폴더가 존재하지 않는다. 생성 필요.

### 기존 탭 패턴

`app/(dashboard)/projects/[id]/page.tsx`가 `?tab=` 쿼리 파라미터로 탭 상태를 유지하는 패턴을 이미 구현. 동일 패턴 적용.

---

## 영향 범위 분석

### 영향 파일 목록

| 파일 | 변경 유형 | 내용 |
|---|---|---|
| `prisma/schema.prisma` | 수정 | `User`에 `notificationSettings Json @default("{}")` 추가 |
| `app/(dashboard)/settings/page.tsx` | 신규 | 설정 페이지 RSC (탭 라우팅) |
| `app/(dashboard)/settings/profile-form.tsx` | 신규 | 프로필 수정 클라이언트 폼 |
| `app/(dashboard)/settings/password-form.tsx` | 신규 | 비밀번호 변경 클라이언트 폼 |
| `app/(dashboard)/settings/workspace-form.tsx` | 신규 | 워크스페이스 설정 폼 (Owner only) |
| `app/(dashboard)/settings/notification-form.tsx` | 신규 | 알림 설정 폼 |
| `app/(dashboard)/settings/danger-zone.tsx` | 신규 | 위험 구역 컴포넌트 |
| `lib/actions/settings.ts` | 신규 | 설정 관련 Server Actions 모음 |
| `components/sidebar-nav.tsx` | 수정 없음 | `/settings` 링크 이미 존재 — 별도 수정 불필요 |

---

## 기술 선택 조사

### 슬러그 변경 시 기존 URL 무효화

`/intake/[workspaceSlug]` 라우트는 slug를 파라미터로 사용한다. 슬러그 변경 즉시 기존 URL이 404가 된다. 현재 MVP에서 구 슬러그 redirect는 구현하지 않는다(범위 외). 변경 전 경고만 표시한다.

### 워크스페이스 삭제 시 Cascade

`Workspace` → `Customer`, `Project`, `WorkflowTemplate`, `Inquiry`, `MessageTemplate`, `WorkspaceInvite`, `WorkspaceMember` 모두 `onDelete: Cascade`가 설정되어 있다. 단일 `prisma.workspace.delete()` 호출로 전체 삭제된다.

### 멤버 나가기(워크스페이스 탈퇴)

`WorkspaceMember` 삭제 후 해당 사용자가 Dashboard에 접근하면 `session.user.workspaceId`가 유효하지 않게 된다. 미들웨어 또는 Dashboard 서버 컴포넌트에서 멤버십 유효성 확인이 필요하다. 현재 구조에서는 `auth()` 후 `workspaceId`를 신뢰하므로, 탈퇴 직후 강제 로그아웃(`signOut()`) 처리가 가장 안전하다.

---

## 엣지 케이스 및 한계

- **이메일 변경**: NextAuth JWT에 `email`이 저장되나 현재 `auth.ts`의 `jwt` 콜백에서 `token.email`은 NextAuth 기본값에 의존. `User.email` 변경 후 다음 로그인 시점에 자연스럽게 반영됨. 중간 세션 불일치는 허용(낮은 위험).
- **Owner만 1명**: Owner가 다른 멤버 없이 워크스페이스 삭제 시 자신의 WorkspaceMember도 Cascade로 함께 삭제된다. User 계정 자체는 삭제되지 않는다.
- **notificationSettings JSON 기본값**: `{}` (빈 객체) 상태에서는 모든 알림이 활성으로 처리된다. 키가 없으면 켜짐으로 간주하는 opt-out 방식.

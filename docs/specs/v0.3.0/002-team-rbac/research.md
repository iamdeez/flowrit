# Research: team-rbac

## 목차

- [기존 코드베이스 분석](#기존-코드베이스-분석)
- [영향 범위 분석](#영향-범위-분석)
- [기술 선택 조사](#기술-선택-조사)
- [엣지 케이스 및 한계](#엣지-케이스-및-한계)

---

## 기존 코드베이스 분석

### 현재 역할 체계

`WorkspaceMember.role`: `"OWNER"` | `"MEMBER"` (string literal)

Prisma 스키마에 `@db.VarChar` 없이 plain `String`으로 선언. enum 타입이 아니다. `"ADMIN"` 추가 시 DB 마이그레이션 불필요 — 기존 컬럼에 새 값만 저장하면 된다.

### 현재 팀 액션 (`lib/actions/team.ts`)

```ts
// inviteTeamMember: 역할 검사 없음 — 어떤 멤버도 초대 가능 (보안 결함)
// cancelInvite: 마찬가지로 역할 검사 없음
// getTeamData: 멤버·초대 목록 반환
```

`inviteTeamMember`에 역할 파라미터가 있으나 `"MEMBER"`로 하드코딩:

```ts
role: "MEMBER",  // 초대 시 항상 MEMBER로 고정
```

### 현재 팀 UI (`app/(dashboard)/team/page.tsx`)

- 멤버 목록: 이름, 이메일, 역할 뱃지(OWNER/MEMBER)
- `InviteForm`: 이메일·역할 선택 없음 (MEMBER 고정)
- `CancelInviteButton`: 역할 검사 없이 누구나 초대 취소 가능

### 역할 권한 매트릭스 (현재 vs. 목표)

| 액션 | 현재 | OWNER | ADMIN | MEMBER |
|---|---|---|---|---|
| 멤버 초대 | 누구나 | ✅ | ✅ | ❌ |
| 초대 취소 | 누구나 | ✅ | ✅ | ❌ |
| 역할 변경 | 없음 | ✅ | ❌ | ❌ |
| 멤버 제거 | 없음 | ✅ | ✅ (ADMIN 이하만) | ❌ |
| 소유권 이전 | 없음 | ✅ | ❌ | ❌ |
| 워크스페이스 설정 | 없음 | ✅ | ❌ | ❌ |

### ProjectAssignee 와의 관계

`Project.assigneeId`는 `User.id`를 참조한다. 멤버 제거 시 해당 사용자가 담당자인 프로젝트에서 `assigneeId`를 null로 설정해야 한다. 마찬가지로 `RevisionRequest.assigneeId`도 null 처리 필요.

### 세션(JWT)과 역할

현재 JWT에 역할이 저장되지 않는다. `session.user.workspaceId`만 있다. 역할 확인은 항상 DB에서 `WorkspaceMember.findFirst()` 로 신선하게 가져온다. 이 방식이 더 안전하다(역할 변경 즉시 반영).

---

## 영향 범위 분석

### 영향 파일 목록

| 파일 | 변경 유형 | 영향 내용 |
|---|---|---|
| `prisma/schema.prisma` | 변경 없음 | `role String` 타입 그대로 — "ADMIN" 값만 추가 |
| `lib/actions/team.ts` | 수정 | 역할 검사 추가, 신규 액션 추가 |
| `app/(dashboard)/team/page.tsx` | 수정 | ADMIN 뱃지, 역할 변경 드롭다운, 제거 버튼 추가 |
| `app/(dashboard)/team/role-change-select.tsx` | 신규 | 역할 변경 드롭다운 (OWNER 전용) |
| `app/(dashboard)/team/remove-member-button.tsx` | 신규 | 멤버 제거 확인 다이얼로그 |
| `app/(dashboard)/team/transfer-ownership-button.tsx` | 신규 | 소유권 이전 다이얼로그 |
| `lib/actions/project.ts` | 수정 | 멤버 제거 시 assigneeId null 처리 — 단, team 액션에서 트랜잭션으로 처리 |

---

## 기술 선택 조사

### ADMIN 역할 추가 — Prisma 마이그레이션 불필요

`WorkspaceMember.role`이 `String` 타입이므로 DB 스키마 변경 없이 `"ADMIN"` 값 저장이 가능하다. TypeScript 타입 정의(`type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER'`)만 추가한다.

### 역할 변경 UI 패턴

shadcn/ui `Select` 컴포넌트로 OWNER가 다른 멤버의 역할을 드롭다운으로 선택한다. 자신의 행에는 드롭다운이 표시되지 않는다.

### 소유권 이전 절차

1. 대상 멤버(`targetUserId`)의 role을 `"OWNER"`로 변경
2. 현재 OWNER의 role을 `"ADMIN"`으로 강등
3. 단일 트랜잭션으로 처리

이전 후 현재 사용자(구 Owner)는 세션의 `workspaceId`는 유지되지만 역할이 ADMIN으로 바뀐다. 다음 페이지 로드 시 DB에서 새로 조회하므로 자동 반영된다.

---

## 엣지 케이스 및 한계

- **OWNER가 본인만 있는 경우 멤버 탈퇴 방지**: `leaveWorkspace` 액션(settings 스펙)에서 처리. 여기서는 `removeMember`가 자신에게 호출될 수 없도록 서버 검증.
- **ADMIN이 다른 ADMIN 제거 시도**: ADMIN은 ADMIN 이하만 제거 가능. 즉 ADMIN이 ADMIN을 제거하는 것은 불가(OWNER만 가능).
- **역할 변경과 동시 삭제**: 트랜잭션 미사용 시 race condition 가능. 단, 단일 사용자 워크플로우에서 현실적 위험은 낮음. 각 액션을 독립 실행으로 처리한다.
- **초대된 사용자(WorkspaceInvite)의 역할**: 초대 시 ADMIN 역할 부여 가능하도록 `inviteTeamMember`의 role 파라미터를 활성화한다.

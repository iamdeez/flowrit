# Plan: team-rbac

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

- [x] 성능 원칙: 역할 검사는 단일 `findFirst` 쿼리로 처리되며 성능 저하 요인이 없다.
- [x] 호환성 원칙: 기존 `"OWNER"` / `"MEMBER"` 값은 유지. `"ADMIN"` 추가만으로 기존 코드가 ADMIN을 MEMBER와 동일하게 처리하더라도 런타임 에러는 없다 (문자열 비교).
- [x] 테스트 원칙: FR-301~FR-309 모두 SC-301~SC-309에 수용 기준이 있다.
- [x] 스펙 범위 원칙: 구현이 spec.md 범위(ADMIN 역할, 역할 변경, 멤버 제거, 소유권 이전)를 벗어나지 않는다.

---

## 기술 컨텍스트

- **언어 / 런타임**: TypeScript, Next.js 16 App Router
- **주요 의존성**: Prisma ORM, NextAuth v5, shadcn/ui (Select, AlertDialog)
- **역할 타입**: `type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER'` — 별도 파일(`lib/types.ts` 또는 인라인)로 정의

---

## 사전 영향도 분석 결과

### 영향 파일 목록

| 파일 | 변경 유형 | 영향 내용 |
|---|---|---|
| `lib/actions/team.ts` | 수정 | 역할 게이트 추가, `changeMemberRole` / `removeMember` / `transferOwnership` 신규 액션 |
| `app/(dashboard)/team/page.tsx` | 수정 | ADMIN 뱃지, 역할 변경 컨트롤, 제거 버튼 추가 |
| `app/(dashboard)/team/role-change-select.tsx` | 신규 | Select 기반 역할 변경 UI |
| `app/(dashboard)/team/remove-member-button.tsx` | 신규 | AlertDialog 기반 멤버 제거 UI |
| `app/(dashboard)/team/transfer-ownership-button.tsx` | 신규 | 소유권 이전 다이얼로그 |

---

## 핵심 설계

### 역할 계층

```
OWNER > ADMIN > MEMBER
```

- OWNER: 모든 권한 (소유권 이전, 역할 변경, 멤버 제거, 워크스페이스 설정)
- ADMIN: 멤버 초대·취소·제거(MEMBER 대상만), 프로젝트·의뢰 관리
- MEMBER: 초대·제거 불가, 나머지 업무 기능은 동일

### 역할 검사 헬퍼

```ts
// lib/actions/team.ts 상단에 추가
async function getMemberRole(userId: string, workspaceId: string): Promise<WorkspaceRole | null> {
  const member = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId },
    select: { role: true },
  });
  return member?.role as WorkspaceRole | null;
}

function requireRole(current: WorkspaceRole, minimum: WorkspaceRole) {
  const hierarchy = { OWNER: 3, ADMIN: 2, MEMBER: 1 };
  if (hierarchy[current] < hierarchy[minimum]) {
    throw new Error('권한이 없습니다.');
  }
}
```

### 신규 Server Actions

#### changeMemberRole

```ts
export async function changeMemberRole(targetMemberId: string, newRole: WorkspaceRole)
// 1. auth() + getMemberRole()
// 2. requireRole(currentRole, 'OWNER') — OWNER만 역할 변경 가능
// 3. targetMember 조회 (같은 workspaceId인지 검증)
// 4. newRole이 'OWNER'이면 자동으로 transferOwnership 호출 (또는 에러)
// 5. prisma.workspaceMember.update({ where: { id: targetMemberId }, data: { role: newRole } })
// 6. revalidatePath('/team')
```

#### removeMember

```ts
export async function removeMember(targetMemberId: string)
// 1. auth() + getMemberRole()
// 2. requireRole(currentRole, 'ADMIN')
// 3. targetMember 조회 — ADMIN은 MEMBER만 제거 가능 (target.role === 'OWNER'이면 에러)
// 4. prisma.$transaction:
//    - workspaceMember.delete
//    - project.updateMany({ where: { assigneeId: target.userId }, data: { assigneeId: null } })
//    - revisionRequest.updateMany 동일
// 5. revalidatePath('/team')
```

#### transferOwnership

```ts
export async function transferOwnership(targetMemberId: string)
// 1. auth() + getMemberRole()
// 2. requireRole(currentRole, 'OWNER')
// 3. prisma.$transaction:
//    - workspaceMember.update(current → 'ADMIN')
//    - workspaceMember.update(target → 'OWNER')
// 4. revalidatePath('/team')
```

### 기존 액션 수정

#### inviteTeamMember

```ts
// 기존: role: "MEMBER" 하드코딩
// 변경: formData에서 role 파라미터 받기, requireRole(currentRole, 'ADMIN') 검사 추가
```

#### cancelInvite

```ts
// 변경: requireRole(currentRole, 'ADMIN') 검사 추가
```

---

## 인터페이스 계약

- 모든 역할 변경 액션은 **서버 측**에서 `getMemberRole()`을 호출하여 권한을 검증한다. 클라이언트 측 숨김 처리는 UX 보조이며 보안 수단이 아니다.
- `removeMember`는 멤버 제거와 함께 `project.updateMany` / `revisionRequest.updateMany`를 단일 트랜잭션으로 처리한다. 트랜잭션 실패 시 전체 롤백된다.
- `transferOwnership` 후 구 OWNER의 세션 `workspaceId`는 유지되지만 역할이 ADMIN으로 변경됨을 UI에 반영해야 한다(페이지 재로드 시 자동 반영).

---

## 데이터 모델

스키마 변경 없음. `WorkspaceMember.role String` 컬럼에 `"ADMIN"` 값 추가만으로 구현 가능.

TypeScript 타입 정의 추가:

```ts
// lib/types.ts (신규 또는 기존 파일에 추가)
export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER';
```

---

## 테스트 전략

| SC 식별자 | 테스트 유형 | 시나리오 요약 | 입력 | 기대 결과 |
|---|---|---|---|---|
| SC-301 | 수동 E2E | ADMIN 뱃지 표시 | ADMIN 역할 멤버 존재 | 팀 목록에 ADMIN 뱃지 |
| SC-302 | 수동 E2E | OWNER가 역할 변경 | MEMBER → ADMIN | DB 업데이트, 뱃지 변경 |
| SC-303 | 수동 E2E | MEMBER가 역할 변경 시도 | MEMBER 계정으로 API 직접 호출 | 권한 에러 |
| SC-304 | 수동 E2E | OWNER가 MEMBER 제거 | removeMember 실행 | 멤버 삭제, 프로젝트 담당자 null |
| SC-305 | 수동 E2E | ADMIN이 MEMBER 제거 | ADMIN 계정으로 removeMember | 멤버 삭제 성공 |
| SC-306 | 수동 E2E | ADMIN이 OWNER 제거 시도 | removeMember(ownerMemberId) | 권한 에러 |
| SC-307 | 수동 E2E | 소유권 이전 | OWNER → 다른 MEMBER | 대상 OWNER됨, 자신 ADMIN됨 |
| SC-308 | 수동 E2E | ADMIN이 멤버 초대 | ADMIN 계정으로 초대 | 성공 |
| SC-309 | 수동 E2E | MEMBER가 초대 시도 | MEMBER 계정으로 초대 | 권한 에러 |

---

## 기타 고려사항

- **InviteForm 역할 선택 UI**: OWNER/ADMIN만 초대 폼을 볼 수 있으므로, 역할 선택 드롭다운에 `OWNER` 옵션은 제공하지 않는다 (OWNER/ADMIN/MEMBER 중 ADMIN 이하만).
- **자기 자신 제거 방지**: `removeMember`에서 `target.userId === currentUser.id` 이면 에러 반환. 자기 자신 탈퇴는 settings의 `leaveWorkspace`를 사용.
- **ADMIN → OWNER 역할 변경**: `changeMemberRole`에서 newRole이 'OWNER'인 경우 `transferOwnership` 로직을 실행하여 현 OWNER를 ADMIN으로 강등한다.

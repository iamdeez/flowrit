# Research: Scale Project Visibility

## 기존 코드베이스 분석

### 인증 세션 구조

`lib/auth.ts`의 세션 타입 (확인):
```typescript
session.user.id          // userId (string)
session.user.workspaceId // workspaceId (string)
// role은 세션에 없음 → WorkspaceMember 테이블에서 조회 필요
```

### 역할 조회 패턴

`lib/actions/team.ts`에 이미 `getMemberRole()` 헬퍼가 존재:
```typescript
async function getMemberRole(userId: string, workspaceId: string): Promise<WorkspaceRole | null> {
  const member = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId },
    select: { role: true },
  })
  return (member?.role as WorkspaceRole) ?? null
}
```
단, 이 함수는 `team.ts` 내부 private 함수. 공유 헬퍼가 아직 없음.

### requireWorkspaceId() 현황

각 action 파일에 로컬로 중복 정의:
- `lib/actions/project.ts` — `async function requireWorkspaceId()`
- `lib/actions/revision.ts` — `async function requireWorkspaceId()`
- (팀, 고객 등 동일 패턴 반복)

### getProjects() 현황 (lib/actions/project.ts)

```typescript
export async function getProjects(status?: string, q?: string, archived?: string) {
  const workspaceId = await requireWorkspaceId()
  // ...
  const projects = await prisma.project.findMany({
    where: { workspaceId, archivedAt: ..., ...searchFilter },
    include: { customer, stages, revisions, assets },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
  })
  // 역할 체크 없음, 페이지네이션 없음, assignee 미포함
}
```

- `take`/`skip` 없음 → 전체 스캔
- `assigneeId` 필터 없음
- 담당자 include 없음

### getRevisionGroups() 현황 (lib/actions/revision.ts)

```typescript
export async function getRevisionGroups() {
  const workspaceId = await requireWorkspaceId()
  return prisma.project.findMany({
    where: { workspaceId, archivedAt: null, revisions: { some: ... } },
    include: { customer, revisions: { where: ..., orderBy: ... } },
    orderBy: ...,
    // take/skip 없음, 역할 체크 없음
  })
}
```

### 프로젝트 카드 현황 (app/(dashboard)/projects/page.tsx)

- 담당자 표시 없음
- `include` 에 `assignee` 정보 없음
- pagination UI 없음
- searchParams: `status`, `q`, `archived` 만 있음

### WorkspaceMember 스키마 (prisma/schema.prisma 확인)

```
WorkspaceMember {
  id          String
  workspaceId String
  userId      String
  role        String @default("MEMBER")
  user        User
}

Project {
  assigneeId  String?   // userId 참조 (WorkspaceMember.userId)
}
```

`Project.assigneeId`는 `User.id` 직접 참조 (`WorkspaceMember.id` 아님).

## 영향 범위 분석

### 변경이 필요한 파일

| 파일 | 변경 유형 | 영향 내용 |
|---|---|---|
| `lib/actions/project.ts` | 수정 | `getProjects()` 시그니처 변경, 역할 기반 필터·페이지네이션·담당자 include 추가 |
| `lib/actions/revision.ts` | 수정 | `getRevisionGroups()` 역할 기반 필터·30건 캡 추가 |
| `app/(dashboard)/projects/page.tsx` | 수정 | `page`·`assigneeId` searchParam 추가, 담당자 표시, 페이지네이션 UI |
| `app/(dashboard)/revisions/page.tsx` | 수정 | 역할 전달 불필요 (action 내부 처리) — 실질적 변경 없음 |

### 변경 불필요 파일 (배제 근거)

| 파일 | 배제 사유 |
|---|---|
| `lib/auth.ts` | 세션 타입 변경 없음 |
| `lib/actions/team.ts` | `getMemberRole` 복제 패턴 유지, 공유 헬퍼는 별도 파일로 분리 불필요 |
| `prisma/schema.prisma` | 스키마 변경 없음 |
| `app/(dashboard)/projects/[id]/page.tsx` | 상세 접근 제어는 범위 외 |

## 엣지 케이스 및 한계

1. **담당자 미지정 MEMBER**: `assigneeId = null` 인 프로젝트는 MEMBER에게 보이지 않는다. 의도된 동작 (본인 담당이 없으면 빈 목록).
2. **page searchParam 조작**: MEMBER가 `?page=2`를 보내도 안전 — 서버에서 역할 검증 후 자신의 프로젝트 범위 내에서만 페이지네이션.
3. **getProjects() 반환값 변경**: 기존 호출자(`/api/export/projects`, 다른 페이지)에서 이 함수를 사용하는지 확인 필요 → export API 확인.

# Plan: Scale Project Visibility

> Branch: 002-scale-project-visibility | Date: 2026-06-22 | Spec: [spec.md](./spec.md)

## 목차

- [사전 검증 (Constitution Gates)](#사전-검증-constitution-gates)
- [기술 컨텍스트](#기술-컨텍스트)
- [사전 영향도 분석 결과](#사전-영향도-분석-결과)
- [핵심 설계](#핵심-설계)
- [인터페이스 계약](#인터페이스-계약)
- [테스트 전략](#테스트-전략)

## 사전 검증 (Constitution Gates)

- [x] 성능 원칙: `take: 20` 페이지네이션으로 전체 스캔을 제거한다. 성능 저하 요인 없음.
- [x] 호환성 원칙: `getProjects()` 유일 호출자는 `projects/page.tsx`이며 동시에 변경함. export API는 자체 쿼리 사용 — 런타임 에러 없음.
- [x] 테스트 원칙: SC-001~SC-006 모두 tasks.md의 테스트 태스크에 매핑됨.
- [x] 스펙 범위 원칙: 프로젝트 상세 접근 제어, 무한 스크롤은 Out of Scope로 명시함.

## 기술 컨텍스트

- **언어 / 런타임**: TypeScript, Next.js 16.2.9 App Router, Server Actions
- **주요 의존성**: Prisma (Neon PostgreSQL), next-auth v5
- **세션**: `session.user.id` (userId), `session.user.workspaceId` — role은 세션에 없음

## 사전 영향도 분석 결과

### 영향 파일 목록

| 파일 | 변경 유형 | 영향 내용 |
|---|---|---|
| `lib/actions/project.ts` | 수정 | `requireAuth()` 헬퍼 추가, `getProjects()` 시그니처·로직 변경 |
| `lib/actions/revision.ts` | 수정 | `getRevisionGroups()` 역할 필터·캡 추가 |
| `app/(dashboard)/projects/page.tsx` | 수정 | searchParams 확장, 담당자 표시, 페이지네이션 UI |

## 핵심 설계

### 1. `requireAuth()` 헬퍼 (project.ts 내부)

기존 `requireWorkspaceId()` 를 대체하는 내부 헬퍼:

```typescript
async function requireAuth(): Promise<{ workspaceId: string; userId: string; role: WorkspaceRole }> {
  const session = await auth()
  if (!session?.user?.workspaceId) throw new Error('로그인이 필요합니다.')
  const { workspaceId, id: userId } = session.user
  const member = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId },
    select: { role: true },
  })
  const role = (member?.role as WorkspaceRole) ?? 'MEMBER'
  return { workspaceId, userId, role }
}
```

### 2. `getProjects()` 새 시그니처

```typescript
export type GetProjectsResult = {
  projects: ProjectWithDetails[]
  totalCount: number
  page: number
  totalPages: number
}

export async function getProjects(
  status?: string,
  q?: string,
  archived?: string,
  page?: number,
  assigneeFilter?: string   // OWNER/ADMIN이 특정 멤버 필터링 시 사용
): Promise<GetProjectsResult>
```

**역할별 동작:**
- MEMBER: `where` 조건에 `assigneeId: userId` 강제 적용 (파라미터 무시)
- OWNER/ADMIN: `assigneeFilter` 파라미터가 있으면 `assigneeId: assigneeFilter` 추가

**페이지네이션:**
```typescript
const PAGE_SIZE = 20
const currentPage = Math.max(1, page ?? 1)
const skip = (currentPage - 1) * PAGE_SIZE

const [projects, totalCount] = await Promise.all([
  prisma.project.findMany({ where, include, orderBy, take: PAGE_SIZE, skip }),
  prisma.project.count({ where }),
])
```

**담당자 include:**
```typescript
include: {
  customer: true,
  stages: { orderBy: { order: 'asc' } },
  revisions: { where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } },
  assets: true,
  assigneeUser: { select: { name: true } },   // User 직접 조인
}
```

> `Project.assigneeId` → `User.id` 참조. `prisma/schema.prisma`에 `Project.assigneeUser` 관계가
> 있어야 함. schema 확인 결과 `assigneeId`는 `@map` 없는 단순 String? — relation 없음.
> **대안**: `assigneeId`가 있으면 별도 User 조회 또는 findMany 후 userId→name Map 조인.
> 페이지당 20건이므로 별도 쿼리보다 한 번에 `WorkspaceMember` 테이블에서 Map 구성 후 매핑.

수정된 접근법:
```typescript
// 페이지 프로젝트의 assigneeId 목록으로 User 이름을 일괄 조회
const assigneeIds = [...new Set(projects.map(p => p.assigneeId).filter(Boolean) as string[])]
const assigneeNames = assigneeIds.length
  ? await prisma.user.findMany({
      where: { id: { in: assigneeIds } },
      select: { id: true, name: true },
    }).then(users => new Map(users.map(u => [u.id, u.name])))
  : new Map<string, string | null>()
```

반환 시 각 project에 `assigneeName: string | null` 을 붙여 반환.

### 3. `getRevisionGroups()` 역할 필터

```typescript
export async function getRevisionGroups() {
  const { workspaceId, userId, role } = await requireAuthRevision()
  const REVISION_CAP = 30
  const assigneeFilter = role === 'MEMBER' ? { assigneeId: userId } : {}

  return prisma.project.findMany({
    where: {
      workspaceId,
      archivedAt: null,
      ...assigneeFilter,
      revisions: { some: { status: { in: incompleteStatuses } } },
    },
    include: { customer, revisions: { ... } },
    orderBy: ...,
    take: REVISION_CAP,
  })
}
```

revision.ts에도 동일 패턴의 `requireAuthRevision()` 내부 헬퍼 추가.

### 4. 프로젝트 카드 담당자 표시

projects/page.tsx 카드 하단에 담당자 이름 추가:
```tsx
{project.assigneeName && (
  <span className="text-xs text-gray-400">담당: {project.assigneeName}</span>
)}
```

### 5. 페이지네이션 UI

projects/page.tsx:
- `page` searchParam 읽기 (기본 1)
- `totalPages > 1`이면 이전/다음 버튼 렌더링
- 현재 필터 searchParams 유지하며 `page` 변경

### 6. OWNER/ADMIN 담당자 필터 드롭다운

- `getProjectFormData()`의 `members` 목록을 별도 action으로 분리하거나, projects/page.tsx에서 직접 쿼리
- OWNER/ADMIN 판단: `getProjects()`의 반환값에 `role` 포함 또는 별도 `getViewerRole()` 액션

실용적 접근: `getProjects()` 반환에 `role` 추가

## 인터페이스 계약

**기존 호출자 영향:**
- `app/(dashboard)/projects/page.tsx`: 기존 3개 인자 → 5개로 확장. 동시 변경.
- `api/export/projects/route.ts`: `getProjects()` 미사용 (자체 prisma 쿼리). 영향 없음.

**getProjects() 반환 타입 변경:**
- 기존: `Project[]`
- 신규: `GetProjectsResult` (projects + totalCount + page + totalPages + role)
- `projects/page.tsx` 외 다른 호출자 없음 → Breaking change 안전.

## 테스트 전략

| SC 식별자 | 테스트 유형 | 시나리오 요약 | 기대 결과 |
|---|---|---|---|
| SC-001 | 코드 검증 | MEMBER role 시 `assigneeId: userId` where 조건 적용 확인 | `getProjects()` 내부 where에 조건 존재 |
| SC-002 | 코드 검증 | MEMBER가 `assigneeFilter` 파라미터 전달해도 무시 | 서버 내부에서 userId로 강제 대체 |
| SC-003 | 브라우저 | OWNER 로그인 후 담당자 드롭다운으로 필터 | 선택한 담당자의 프로젝트만 표시 |
| SC-004 | 브라우저 | 21건 이상 시 페이지네이션 버튼 표시 | 이전/다음 버튼 렌더 확인 |
| SC-005 | 브라우저 | 프로젝트 카드에 담당자 이름 확인 | 담당자 있는 프로젝트에 이름 표시 |
| SC-006 | 코드 검증 | MEMBER role 시 `getRevisionGroups()` where에 `assigneeId: userId` 적용 | 조건 존재 |

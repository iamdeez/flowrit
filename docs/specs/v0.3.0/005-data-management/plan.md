# Plan: data-management

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

- [x] 성능 원칙: CSV 내보내기는 별도 Route Handler에서 처리되며 기존 페이지 성능에 영향 없다.
- [x] 호환성 원칙: `Project.archivedAt DateTime?` 선택 필드 추가 — 기존 쿼리에서 해당 필드를 참조하지 않으므로 런타임 에러 없음. 단, 대시보드 카운트 쿼리에 `archivedAt: null` 조건을 추가해야 SC-604를 만족한다.
- [x] 테스트 원칙: FR-601~FR-614 모두 SC-601~SC-606에 수용 기준이 있다.
- [x] 스펙 범위 원칙: 구현이 spec.md 범위(CSV 내보내기, 아카이브, 복제)를 벗어나지 않는다.

---

## 기술 컨텍스트

- **언어 / 런타임**: TypeScript, Next.js 16 App Router, Node.js
- **주요 의존성**: Prisma ORM, NextAuth v5, shadcn/ui (Dialog, AlertDialog)
- **외부 의존성 추가 없음**: CSV는 내장 문자열 처리로 구현

---

## 사전 영향도 분석 결과

### 영향 파일 목록

| 파일 | 변경 유형 | 영향 내용 |
|---|---|---|
| `prisma/schema.prisma` | 수정 | `Project.archivedAt DateTime?` 추가 |
| `app/api/export/customers/route.ts` | 신규 | 고객 CSV Route Handler |
| `app/api/export/projects/route.ts` | 신규 | 프로젝트 CSV Route Handler |
| `app/(dashboard)/customers/page.tsx` | 수정 | CSV 내보내기 버튼 |
| `app/(dashboard)/projects/page.tsx` | 수정 | CSV 내보내기 버튼, 아카이브 필터 추가 |
| `app/(dashboard)/projects/[id]/page.tsx` | 수정 | 아카이브·복제 버튼 |
| `app/(dashboard)/projects/duplicate-project-dialog.tsx` | 신규 | 복제 다이얼로그 |
| `lib/actions/project.ts` | 수정 | archiveProject, unarchiveProject, duplicateProject |
| `app/(dashboard)/dashboard/page.tsx` | 수정 | archivedAt: null 조건 추가 |

---

## 핵심 설계

### CSV 내보내기 Route Handler

```ts
// app/api/export/customers/route.ts
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return new Response('Unauthorized', { status: 401 });

  const workspaceId = session.user.workspaceId;
  const customers = await prisma.customer.findMany({
    where: { workspaceId },
    include: { _count: { select: { projects: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const headers = ['이름', '연락처', '메모', '프로젝트 수', '등록일'];
  const rows = customers.map(c => [
    c.name,
    c.contact ?? '',
    c.memo ?? '',
    String(c._count.projects),
    c.createdAt.toLocaleDateString('ko-KR'),
  ]);

  const BOM = '﻿';
  const csv = BOM + toCSV(headers, rows);

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="customers.csv"',
    },
  });
}
```

```ts
// app/api/export/projects/route.ts
// URL 파라미터: ?search=&status=&archived=
// 동일 인증 패턴 + 현재 필터 연동
```

### CSV 유틸리티

```ts
// lib/utils/csv.ts (신규)
export function toCSV(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  return [
    headers.map(escape).join(','),
    ...rows.map(row => row.map(escape).join(','))
  ].join('\r\n');
}
```

### 프로젝트 아카이브 Server Actions

```ts
// lib/actions/project.ts 추가

export async function archiveProject(projectId: string) {
  const { workspaceId } = await requireWorkspaceId();
  await prisma.$transaction([
    prisma.project.update({
      where: { id: projectId, workspaceId },
      data: { archivedAt: new Date() },
    }),
    prisma.timelineEvent.create({
      data: { projectId, title: '프로젝트 아카이브', eventType: 'ARCHIVED' },
    }),
  ]);
  revalidatePath('/projects');
  revalidatePath(`/projects/${projectId}`);
}

export async function unarchiveProject(projectId: string) {
  const { workspaceId } = await requireWorkspaceId();
  await prisma.$transaction([
    prisma.project.update({
      where: { id: projectId, workspaceId },
      data: { archivedAt: null },
    }),
    prisma.timelineEvent.create({
      data: { projectId, title: '아카이브 해제', eventType: 'UNARCHIVED' },
    }),
  ]);
  revalidatePath('/projects');
  revalidatePath(`/projects/${projectId}`);
}
```

### 프로젝트 복제 Server Action

```ts
export async function duplicateProject(prevState, formData: FormData) {
  const { workspaceId } = await requireWorkspaceId();
  const sourceId = formData.get('sourceId') as string;
  const title = formData.get('title') as string;
  const customerId = formData.get('customerId') as string | null;
  const dueDate = formData.get('dueDate') ? new Date(formData.get('dueDate') as string) : null;

  const source = await prisma.project.findFirst({
    where: { id: sourceId, workspaceId },
    include: { stages: { orderBy: { order: 'asc' } } },
  });
  if (!source) return { error: '프로젝트를 찾을 수 없습니다.' };

  const newProject = await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        workspaceId,
        title,
        customerId: customerId || source.customerId,
        dueDate,
        budget: source.budget,
      },
    });

    // 단계 복제
    const stages = await Promise.all(
      source.stages.map((s, i) =>
        tx.workflowStage.create({
          data: {
            projectId: project.id,
            name: s.name,
            customerName: s.customerName,
            order: s.order,
            completedAt: null,
          },
        })
      )
    );

    // currentStageId = 첫 번째 단계
    await tx.project.update({
      where: { id: project.id },
      data: { currentStageId: stages[0]?.id ?? null },
    });

    return project;
  });

  redirect(`/projects/${newProject.id}`);
}
```

### getProjects 수정 (아카이브 필터)

```ts
// lib/actions/project.ts > getProjects
// 파라미터 추가: archived?: 'true' | 'false' | undefined
where: {
  workspaceId,
  archivedAt: archived === 'true' ? { not: null } : null,
  // 기존 search 필터 유지
}
```

### 대시보드 카운트 수정

```ts
// app/(dashboard)/dashboard/page.tsx
// 기존 activeCount 쿼리에 archivedAt: null 조건 추가
const activeCount = await prisma.project.count({
  where: { workspaceId, archivedAt: null, /* 기존 조건 */ },
});
```

---

## 인터페이스 계약

- CSV Route Handler는 `auth()`로 세션을 검증하고 `session.user.workspaceId`로 데이터를 필터링한다. 인증 실패 시 401, workspaceId 없으면 403.
- `archiveProject` / `unarchiveProject` / `duplicateProject`는 `requireWorkspaceId()`로 소속 검증 후 `where: { id, workspaceId }` 조합으로 타 워크스페이스 데이터 접근을 차단한다.
- `duplicateProject`는 성공 시 `redirect()`를 호출하므로 반환 타입이 없다. 실패 시에만 `{ error: string }`을 반환한다.

---

## 데이터 모델

### Project 스키마 변경

```prisma
model Project {
  // 기존 필드 유지
  archivedAt  DateTime?
}
```

### TimelineEvent.eventType 신규 값

`ARCHIVED`, `UNARCHIVED` — schema.prisma에 enum이 없으므로 String 타입에 해당 값만 추가.

---

## 테스트 전략

| SC 식별자 | 테스트 유형 | 시나리오 요약 | 입력 | 기대 결과 |
|---|---|---|---|---|
| SC-601 | 수동 E2E | 고객 CSV 내보내기 | "CSV 내보내기" 버튼 클릭 | `customers.csv` 다운로드, Excel에서 한글 정상 |
| SC-602 | 수동 E2E | 프로젝트 필터 연동 내보내기 | "진행 중" 필터 후 CSV 클릭 | 진행 중 프로젝트만 포함된 CSV |
| SC-603 | 수동 E2E | 아카이브 → 목록 제거 | 프로젝트 아카이브 클릭 | 기본 목록에서 사라짐, "아카이브됨" 필터에 표시 |
| SC-604 | 수동 E2E | 아카이브 프로젝트 대시보드 제외 | 아카이브 후 대시보드 확인 | 활성 카운트에서 제외됨 |
| SC-605 | 수동 E2E | 복제 후 새 프로젝트 상세 | 복제 다이얼로그 완료 | 새 프로젝트 상세 페이지, 원본과 동일한 단계 목록, 수정·에셋·타임라인 비어 있음 |
| SC-606 | 수동 E2E | 미인증 내보내기 접근 | `/api/export/customers` 직접 접근 | 401 응답 |

---

## 기타 고려사항

- **CSV 버튼 구현**: `<a href="/api/export/customers" download>` 태그로 단순 처리. 필터 연동 시 현재 URL의 searchParams를 export URL에 그대로 append한다.
- **복제 다이얼로그 고객 선택**: `customerId` 선택을 위해 현재 워크스페이스의 고객 목록을 서버에서 미리 조회하여 다이얼로그에 전달한다. 없으면 원본 고객을 자동 선택.
- **아카이브 해제 버튼**: 프로젝트 상세 페이지 헤더에 `archivedAt !== null`일 때 "아카이브 해제" 버튼을 표시한다. 아카이브 버튼은 `archivedAt === null`일 때만 표시.

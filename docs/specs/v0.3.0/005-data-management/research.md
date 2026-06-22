# Research: data-management

## 목차

- [기존 코드베이스 분석](#기존-코드베이스-분석)
- [영향 범위 분석](#영향-범위-분석)
- [기술 선택 조사](#기술-선택-조사)
- [엣지 케이스 및 한계](#엣지-케이스-및-한계)

---

## 기존 코드베이스 분석

### 현재 업로드 Route Handler 패턴

`app/api/upload/route.ts`: 인증 없이 presigned URL을 반환하는 Route Handler. CSV 내보내기 Route Handler는 이와 달리 **반드시 세션 인증 + 워크스페이스 소속 검증**이 필요하다(NFR-601).

### Customer 모델

현재 `Customer` 모델(schema.prisma 기반):
```
Customer { id, workspaceId, name, contact?, memo?, createdAt, projects[] }
```
CSV 내보내기 컬럼: 이름, 연락처, 메모, 프로젝트 수, 등록일.

`_count: { projects: true }` Prisma 집계로 프로젝트 수를 한 번에 가져올 수 있다.

### Project 모델

현재 Project 조회(`getProjects` in `lib/actions/project.ts`):
- 검색어(`title`, customer name) 필터
- `include: { customer, stages, currentStage, assignee }` 패턴

CSV 컬럼: 프로젝트명, 고객명, 현재 단계, 마감일, 담당자, 예산, 완료 여부, 생성일.

필터 연동(FR-602): `?search=&status=&archived=` 쿼리 파라미터를 Route Handler에도 전달.

### 현재 프로젝트 목록 필터

`app/(dashboard)/projects/page.tsx`의 `searchParams`로 search, status를 받아 `getProjects`에 전달. 아카이브 필터는 없다 — 신규 추가 필요.

### 단계(Stage) 구조

`Project` 생성 시 `$transaction`으로 `WorkflowStage` 레코드들을 생성한다. 현재 `WorkflowTemplate` 모델이 있으나 실제 사용 여부 확인 필요.

복제 시: 원본 프로젝트의 `WorkflowStage` 목록을 조회 후, 새 프로젝트에 대한 `WorkflowStage` 레코드를 동일한 이름·순서로 생성. `currentStageId`는 첫 번째 복제 단계로 설정.

---

## 영향 범위 분석

### 영향 파일 목록

| 파일 | 변경 유형 | 영향 내용 |
|---|---|---|
| `prisma/schema.prisma` | 수정 | `Project.archivedAt DateTime?` 추가 |
| `app/api/export/customers/route.ts` | 신규 | 고객 CSV 내보내기 Route Handler |
| `app/api/export/projects/route.ts` | 신규 | 프로젝트 CSV 내보내기 Route Handler |
| `app/(dashboard)/customers/page.tsx` | 수정 | "CSV 내보내기" 버튼 추가 |
| `app/(dashboard)/projects/page.tsx` | 수정 | "CSV 내보내기" 버튼, "아카이브됨" 필터 추가 |
| `app/(dashboard)/projects/[id]/page.tsx` | 수정 | 아카이브·아카이브해제·복제 버튼 추가 |
| `app/(dashboard)/projects/duplicate-project-dialog.tsx` | 신규 | 복제 입력 다이얼로그 |
| `lib/actions/project.ts` | 수정 | `archiveProject`, `unarchiveProject`, `duplicateProject` 추가 |
| `app/(dashboard)/dashboard/page.tsx` | 수정 | 아카이브 프로젝트를 카운트에서 제외하는 쿼리 조건 추가 |

---

## 기술 선택 조사

### CSV 생성 방식

Node.js 내장 스트림 없이 단순 문자열 조합으로 충분:

```ts
function toCSV(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [
    headers.map(escape).join(','),
    ...rows.map(row => row.map(escape).join(','))
  ].join('\r\n');
}
```

UTF-8 BOM 추가:
```ts
const BOM = '﻿';
return new Response(BOM + csv, {
  headers: {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="customers.csv"`,
  }
});
```

### Route Handler 인증 패턴

```ts
// app/api/export/customers/route.ts
import { auth } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = session.user.workspaceId;
  if (!workspaceId) return Response.json({ error: 'Forbidden' }, { status: 403 });

  // 쿼리 파라미터 파싱 + 데이터 조회 + CSV 반환
}
```

### 프로젝트 아카이브 필터

```ts
// getProjects 수정: archived 파라미터 추가
where: {
  workspaceId,
  archivedAt: archived === 'true' ? { not: null } : null,  // 기본: null (활성)
  ...
}
```

대시보드 카운트: `archivedAt: null` 조건 추가.

---

## 엣지 케이스 및 한계

- **복제 시 WorkflowTemplate 관계**: 원본 프로젝트의 `stages`가 특정 `WorkflowTemplate`과 연결된 경우, 복제된 프로젝트는 개별 `WorkflowStage`로만 생성되며 `templateId` 연결은 null로 초기화한다.
- **CSV 필터 연동(FR-602)**: Route Handler URL에 `?search=&status=&archived=` 파라미터를 전달하여 현재 목록과 동일한 결과를 내보낸다. 클라이언트에서 현재 URL 파라미터를 그대로 내보내기 URL에 append하여 사용.
- **대용량 데이터**: NFR-602에서 스트리밍을 언급하나, Vercel 서버리스 함수 응답 크기 제한(4.5MB body)이 있다. 현재 고객 1,000명 기준 CSV는 ~100KB 수준이므로 단순 문자열 조합으로 충분하다. 스트리밍은 향후 대규모 데이터 대비 선택적 개선.
- **아카이브된 프로젝트 복제 가능 여부**: 아카이브된 프로젝트 상세 페이지에서도 복제 버튼을 표시한다. 복제 결과는 항상 `archivedAt: null` (활성 상태).

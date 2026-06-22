# Tasks: data-management

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

- [x] **T001** — `Project.archivedAt` 필드 추가 + 마이그레이션
  - 구현 파일: `prisma/schema.prisma`
  - 관련 요구사항: `FR-605`
  - 상세: `archivedAt DateTime?` 필드 추가 → `npx prisma migrate dev --name add-project-archived-at`
  - 완료 기준: 마이그레이션 성공, `archivedAt` 컬럼 생성

### Phase 2. CSV 유틸리티 및 내보내기 Route Handler

- [x] **T002** — `lib/utils/csv.ts` 신규 — CSV 생성 유틸리티
  - 구현 파일: `lib/utils/csv.ts`
  - 관련 요구사항: `FR-603`
  - 상세:
    - `toCSV(headers: string[], rows: string[][]): string` 구현
    - 셀 내 따옴표 이스케이프 (`""`)
    - UTF-8 BOM(`﻿`) 상수 정의
  - 완료 기준: 한글 포함 CSV 문자열 정상 생성

- [x] **T003** — `app/api/export/customers/route.ts` 신규 (T002 완료 후)
  - 구현 파일: `app/api/export/customers/route.ts`
  - 관련 요구사항: `FR-601`, `FR-603`, `FR-604`
  - 상세:
    - `auth()` 세션 검증 → 미인증 시 401
    - `prisma.customer.findMany({ where: { workspaceId }, include: { _count: { select: { projects: true } } } })`
    - `toCSV(headers, rows)` 호출
    - `Content-Type: text/csv; charset=utf-8` + `Content-Disposition: attachment; filename="customers.csv"`
    - 응답 본문: BOM + CSV 문자열
  - 완료 기준: 인증 없이 401, 인증 시 CSV 다운로드

- [x] **T004** `[P]` — `app/api/export/projects/route.ts` 신규 (T001, T002 완료 후)
  - 구현 파일: `app/api/export/projects/route.ts`
  - 관련 요구사항: `FR-602`, `FR-603`, `FR-604`
  - 상세:
    - `auth()` 세션 검증
    - URL searchParams: `search`, `status`, `archived` 파싱
    - 현재 프로젝트 목록 필터와 동일한 Prisma 쿼리 조건 적용
    - 컬럼: 프로젝트명, 고객명, 현재 단계, 마감일, 담당자, 예산, 완료 여부, 생성일
    - `toCSV` + BOM 응답
  - 완료 기준: 필터 파라미터 연동, CSV 다운로드

### Phase 3. 아카이브 Server Actions

- [x] **T005** — `archiveProject`, `unarchiveProject` 구현 (T001 완료 후)
  - 구현 파일: `lib/actions/project.ts`
  - 관련 요구사항: `FR-606`, `FR-608`
  - 상세:
    - `archiveProject(projectId)`: `requireWorkspaceId()` + `prisma.$transaction([project.update(archivedAt: now), timelineEvent.create(ARCHIVED)])`
    - `unarchiveProject(projectId)`: 동일 패턴, `archivedAt: null`, `UNARCHIVED` 이벤트
    - `revalidatePath('/projects')` + `revalidatePath('/projects/${projectId}')`
  - 완료 기준: DB archivedAt 업데이트 + ARCHIVED/UNARCHIVED 타임라인 이벤트 생성

- [x] **T006** `[P]` — `getProjects` 아카이브 필터 추가 (T001 완료 후)
  - 구현 파일: `lib/actions/project.ts`
  - 관련 요구사항: `FR-607`
  - 상세:
    - `getProjects` 파라미터에 `archived?: string` 추가
    - `archivedAt: archived === 'true' ? { not: null } : null` 조건 적용
  - 완료 기준: `archived=true` 시 아카이브 프로젝트만 반환, 기본(undefined) 시 활성 프로젝트만

- [x] **T007** `[P]` — 대시보드 카운트 쿼리 수정 (T001 완료 후)
  - 구현 파일: `app/(dashboard)/dashboard/page.tsx`
  - 관련 요구사항: `FR-609`
  - 상세: 활성 프로젝트 카운트 쿼리에 `archivedAt: null` 조건 추가, 마감 임박 쿼리도 동일하게 수정
  - 완료 기준: 아카이브된 프로젝트가 대시보드 카운트에서 제외됨

### Phase 4. 복제 Server Action

- [x] **T008** — `duplicateProject` 구현 (T001 완료 후)
  - 구현 파일: `lib/actions/project.ts`
  - 관련 요구사항: `FR-610`, `FR-611`, `FR-612`, `FR-613`, `FR-614`
  - 상세:
    - `requireWorkspaceId()` + 원본 프로젝트 소속 검증
    - `prisma.$transaction`:
      - `project.create` (title, customerId, dueDate, budget — archivedAt은 null)
      - `workflowStage.createMany` (원본 단계 복사, completedAt: null)
      - `project.update({ currentStageId: 첫 번째 단계 id })`
    - `redirect(`/projects/${newProject.id}`)`
  - 완료 기준: 새 프로젝트 생성, 단계 복사, 수정·에셋·타임라인 없음, 상세 페이지 이동

### Phase 5. UI 추가

- [x] **T009** — 고객 목록 페이지 CSV 버튼 추가 (T003 완료 후)
  - 구현 파일: `app/(dashboard)/customers/page.tsx`
  - 관련 요구사항: `FR-601`
  - 상세: `<a href="/api/export/customers" download>CSV 내보내기</a>` 버튼 추가
  - 완료 기준: 버튼 클릭 시 CSV 다운로드

- [x] **T010** `[P]` — 프로젝트 목록 페이지 수정 (T004, T006 완료 후)
  - 구현 파일: `app/(dashboard)/projects/page.tsx`
  - 관련 요구사항: `FR-602`, `FR-607`
  - 상세:
    - "CSV 내보내기" `<a>` 버튼 (현재 URL 파라미터 연동)
    - 필터에 "아카이브됨" 옵션 추가
    - `getProjects` 호출 시 `archived` 파라미터 전달
  - 완료 기준: 아카이브 필터 동작, CSV 버튼 동작

- [x] **T011** `[P]` — 프로젝트 상세 페이지 아카이브·복제 버튼 추가 (T005, T008 완료 후)
  - 구현 파일: `app/(dashboard)/projects/[id]/page.tsx`
  - 관련 요구사항: `FR-606`, `FR-610`
  - 상세:
    - `archivedAt === null`이면 "아카이브" 버튼 표시 → `archiveProject` 호출
    - `archivedAt !== null`이면 "아카이브 해제" 버튼 표시 → `unarchiveProject` 호출
    - "복제" 버튼 → `DuplicateProjectDialog` 열기
  - 완료 기준: 상태에 따른 버튼 조건부 표시, 동작 정확

- [x] **T012** `[P]` — `duplicate-project-dialog.tsx` 신규 (T008 완료 후)
  - 구현 파일: `app/(dashboard)/projects/duplicate-project-dialog.tsx`
  - 관련 요구사항: `FR-611`
  - 상세:
    - shadcn/ui Dialog
    - 새 제목 input (기본값: `${원본 제목} (복사본)`)
    - 고객 선택 Select (워크스페이스 고객 목록, 기본: 원본 고객)
    - 마감일 Date input (선택)
    - `useActionState(duplicateProject)` 제출
  - 완료 기준: 다이얼로그 폼 입력 후 복제 실행, 새 프로젝트 상세로 이동

### Phase 6. 테스트 검증

- [x] **T013** — SC-601~SC-606 수동 E2E 검증
  - plan.md 테스트 전략 표 기준으로 시나리오 순서대로 검증
  - 완료 기준: 전체 SC 통과 확인

---

## 구현 완료 기준

- [x] 모든 태스크 체크박스가 완료 처리되었다.
- [x] 고객·프로젝트 CSV 내보내기가 정상 동작하고 Excel에서 한글이 깨지지 않는다.
- [x] 프로젝트 아카이브 시 목록에서 제거되고 대시보드 카운트에서 제외된다.
- [x] 프로젝트 복제 시 단계가 복사되고 수정·에셋·타임라인은 비어 있다.
- [x] 미인증 요청에 `/api/export/*`가 401을 반환한다.
- [ ] `git status`에 의도치 않은 파일이 없다.

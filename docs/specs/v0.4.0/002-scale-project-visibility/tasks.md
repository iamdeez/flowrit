# Tasks: Scale Project Visibility

> Branch: 002-scale-project-visibility | Date: 2026-06-22 | Plan: [plan.md](./plan.md)

## 목차

- [전제 조건](#전제-조건)
- [태스크 목록](#태스크-목록)
- [구현 완료 기준](#구현-완료-기준)

## 전제 조건

- [x] spec.md의 모든 `[NEEDS CLARIFICATION]` 항목이 해소되었는가?
- [x] plan.md의 Constitution Gates가 모두 통과(또는 예외 기재)되었는가?
- [x] CHANGES.md에서 이전 작업의 "후속 작업 시 주의사항"을 확인했는가? (v0.4.0 CHANGES.md 없음 — 건너뜀)

## 태스크 목록

### Phase 1. Server Action 수정

- [x] **T001** — `lib/actions/project.ts`: `requireAuth()` 헬퍼 추가 및 `getProjects()` 리팩터
  - 구현 파일: `lib/actions/project.ts`
  - 관련 요구사항: `FR-001`, `FR-002`, `FR-003`, `NFR-001`, `NFR-002`, `NFR-003`
  - 상세:
    1. 내부 `requireAuth()` 헬퍼 추가 — `{ workspaceId, userId, role }` 반환
    2. `GetProjectsResult` 타입 export
    3. `getProjects()` 시그니처에 `page?: number`, `assigneeFilter?: string` 추가
    4. MEMBER 역할 시 `assigneeFilter` 파라미터 무시하고 `assigneeId: userId` 강제 적용
    5. `take: 20, skip` 페이지네이션 추가
    6. `Promise.all`로 `findMany` + `count` 동시 실행
    7. assigneeId 목록으로 User.name 일괄 조회 후 Map 구성
    8. 반환값: `{ projects (with assigneeName), totalCount, page, totalPages, role }`
  - 완료 기준: TypeScript 에러 없음

- [x] **T002** — `lib/actions/revision.ts`: `getRevisionGroups()` 역할 필터·캡 추가
  - 구현 파일: `lib/actions/revision.ts`
  - 관련 요구사항: `FR-005`, `NFR-002`
  - 상세:
    1. 내부 `requireAuth()` 헬퍼 추가 (project.ts와 동일 패턴, 독립 복사)
    2. MEMBER 역할 시 `assigneeId: userId` where 조건 추가
    3. `take: 30` 추가
  - 완료 기준: TypeScript 에러 없음

### Phase 2. UI 수정

- [x] **T003** — `app/(dashboard)/projects/page.tsx`: searchParams 확장·담당자 필터·페이지네이션·카드 UI
  - 구현 파일: `app/(dashboard)/projects/page.tsx`
  - 관련 요구사항: `FR-002`, `FR-003`, `FR-004`
  - 상세:
    1. searchParams에 `page?: string`, `assigneeId?: string` 추가
    2. `getProjects()` 호출 시 `page`, `assigneeId` 전달
    3. OWNER·ADMIN(`role !== 'MEMBER'`)에게만 담당자 필터 드롭다운 렌더링
       - 워크스페이스 멤버 목록 조회: `getProjectFormData()`의 members 재사용 또는 별도 action
       - `<select>` 형태, 선택 시 `?assigneeId=userId` searchParam 변경
    4. 프로젝트 카드에 담당자 이름 표시 (`project.assigneeName`)
    5. 페이지네이션 UI: `totalPages > 1` 시 이전/다음 버튼
       - 현재 필터 파라미터 유지하면서 `page` 변경하는 Link 컴포넌트
  - 완료 기준: 브라우저에서 SC-003~SC-005 확인

### Phase 3. 검증

- [x] **T004** — 코드 검증 및 빌드 확인
  - 관련 요구사항: `NFR-001`, `NFR-002`, `SC-001`, `SC-002`, `SC-006`
  - 상세:
    1. `getProjects()` 내부 where 절에 MEMBER 시 `assigneeId: userId` 적용 확인
    2. MEMBER가 `assigneeFilter` 전달해도 무시되는 로직 확인
    3. `getRevisionGroups()` 동일 확인
    4. `npm run typecheck` 통과
    5. `npm run build` 통과
  - 완료 기준: 빌드 성공, TypeScript 에러 없음

## 구현 완료 기준

- [x] 모든 태스크(T001~T004) 체크박스가 완료 처리되었다.
- [x] `npm run typecheck`가 에러 없이 통과한다.
- [x] `npm run build`가 에러 없이 완료된다.
- [x] `git status`에 의도치 않은 파일이 없다.
- [x] 브라우저에서 SC-001~SC-006을 직접 확인했다.

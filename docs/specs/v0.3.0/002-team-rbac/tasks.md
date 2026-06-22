# Tasks: team-rbac

## 목차

- [전제 조건](#전제-조건)
- [태스크 목록](#태스크-목록)
- [구현 완료 기준](#구현-완료-기준)

---

## 전제 조건

- [x] spec.md의 모든 `[NEEDS CLARIFICATION]` 항목이 해소되었는가?
- [x] plan.md의 Constitution Gates가 모두 통과(또는 예외 기재)되었는가?
- [ ] CHANGES.md에서 이전 작업(001-settings)의 "후속 작업 시 주의사항"을 확인했는가?

---

## 태스크 목록

### Phase 1. 타입 정의 및 역할 헬퍼

- [ ] **T001** — `WorkspaceRole` 타입 정의 + 역할 헬퍼 함수 추가
  - 구현 파일: `lib/types.ts` (신규 또는 기존 파일에 추가), `lib/actions/team.ts`
  - 관련 요구사항: `FR-301`, `FR-302`
  - 상세:
    - `type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER'` 정의
    - `getMemberRole(userId, workspaceId)` 헬퍼 함수 구현
    - `requireRole(current, minimum)` 헬퍼 함수 구현 (hierarchy 객체 기반)
  - 완료 기준: 타입 컴파일 오류 없음, 헬퍼 함수 재사용 가능

### Phase 2. 기존 액션 보강

- [ ] **T002** — `inviteTeamMember` ADMIN 권한 검증 + 역할 선택 활성화 (T001 완료 후)
  - 구현 파일: `lib/actions/team.ts`
  - 관련 요구사항: `FR-303`, `FR-308`
  - 상세:
    - `getMemberRole()` → `requireRole(currentRole, 'ADMIN')` 추가
    - `formData.get('role')`으로 역할 파라미터 활성화 (OWNER 제외)
    - 유효하지 않은 role 값 방어 처리
  - 완료 기준: MEMBER 초대 시도 → 에러, ADMIN 초대 → 성공

- [ ] **T003** `[P]` — `cancelInvite` ADMIN 권한 검증 추가
  - 구현 파일: `lib/actions/team.ts`
  - 관련 요구사항: `FR-303`
  - 상세: `getMemberRole()` → `requireRole(currentRole, 'ADMIN')` 추가
  - 완료 기준: MEMBER 취소 시도 → 에러

### Phase 3. 신규 Server Actions

- [ ] **T004** — `changeMemberRole` 구현 (T001 완료 후)
  - 구현 파일: `lib/actions/team.ts`
  - 관련 요구사항: `FR-302`, `FR-305`
  - 상세:
    - OWNER 권한 검증
    - targetMember가 동일 workspaceId인지 검증
    - newRole이 'OWNER'이면 transferOwnership 로직으로 전환
    - `prisma.workspaceMember.update`
    - `revalidatePath('/team')`
  - 완료 기준: OWNER 아닌 사람이 호출 시 에러, 역할 변경 DB 반영

- [ ] **T005** `[P]` — `removeMember` 구현 (T001 완료 후)
  - 구현 파일: `lib/actions/team.ts`
  - 관련 요구사항: `FR-304`, `FR-306`
  - 상세:
    - ADMIN 권한 검증
    - target이 OWNER이거나 자기 자신이면 에러
    - ADMIN이 ADMIN을 제거하려면 에러(OWNER만 가능)
    - `prisma.$transaction`: WorkspaceMember.delete + Project.updateMany(assigneeId null) + RevisionRequest.updateMany(assigneeId null)
  - 완료 기준: 트랜잭션 완료, 프로젝트 담당자 null 확인

- [ ] **T006** `[P]` — `transferOwnership` 구현 (T001 완료 후)
  - 구현 파일: `lib/actions/team.ts`
  - 관련 요구사항: `FR-307`
  - 상세:
    - OWNER 권한 검증
    - `prisma.$transaction`: 현재 OWNER → ADMIN, 대상 → OWNER
  - 완료 기준: 트랜잭션 완료, 역할 전환 DB 반영

### Phase 4. UI 컴포넌트

- [ ] **T007** — `app/(dashboard)/team/page.tsx` 수정 — ADMIN 뱃지 + 역할 변경 컨트롤 (T004~T006 완료 후)
  - 구현 파일: `app/(dashboard)/team/page.tsx`
  - 관련 요구사항: `FR-301`, `FR-302`
  - 상세:
    - ADMIN 뱃지 색상 추가 (예: 파란색)
    - OWNER 계정일 때 각 멤버 행에 역할 변경 드롭다운 표시 (자신 행 제외)
    - OWNER/ADMIN 계정일 때 멤버 제거 버튼 표시
  - 완료 기준: 역할에 따른 UI 조건부 렌더링 정확함

- [ ] **T008** `[P]` — `role-change-select.tsx` 신규
  - 구현 파일: `app/(dashboard)/team/role-change-select.tsx`
  - 상세: shadcn/ui `Select` + `changeMemberRole` Server Action 바인딩 + 현재 역할 선택 기본값
  - 완료 기준: 드롭다운 선택 후 즉시 DB 반영

- [ ] **T009** `[P]` — `remove-member-button.tsx` 신규
  - 구현 파일: `app/(dashboard)/team/remove-member-button.tsx`
  - 상세: shadcn/ui `AlertDialog` + "정말 제거하시겠습니까?" + `removeMember` Server Action
  - 완료 기준: 확인 후 멤버 삭제, 취소 시 변경 없음

- [ ] **T010** `[P]` — `transfer-ownership-button.tsx` 신규
  - 구현 파일: `app/(dashboard)/team/transfer-ownership-button.tsx`
  - 상세: OWNER 계정에서만 표시 + Dialog + 대상 선택 + 확인 경고 + `transferOwnership`
  - 완료 기준: 소유권 이전 후 자신의 역할이 ADMIN으로 변경됨 확인

- [ ] **T011** `[P]` — `InviteForm` 역할 선택 드롭다운 추가
  - 구현 파일: `app/(dashboard)/team/page.tsx` 또는 별도 InviteForm 컴포넌트
  - 상세: role 선택 `Select` 추가 (ADMIN / MEMBER 선택, OWNER 제외)
  - 완료 기준: 선택한 역할로 초대 생성됨

### Phase 5. 테스트 검증

- [ ] **T012** — SC-301~SC-309 수동 E2E 검증
  - plan.md 테스트 전략 표 기준으로 시나리오 순서대로 검증
  - 완료 기준: 전체 SC 통과 확인

---

## 구현 완료 기준

- [ ] 모든 태스크 체크박스가 완료 처리되었다.
- [ ] ADMIN 역할이 DB에 저장되고 UI에 뱃지로 표시된다.
- [ ] MEMBER 계정에서 초대·역할 변경·멤버 제거가 서버 측에서 차단된다.
- [ ] `removeMember` 후 해당 사용자의 프로젝트 담당자 필드가 null로 변경된다.
- [ ] 소유권 이전 후 구 OWNER는 ADMIN, 대상은 OWNER가 된다.
- [ ] `git status`에 의도치 않은 파일이 없다.

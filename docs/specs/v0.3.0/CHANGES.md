# Changes — v0.3.0

## [002-team-rbac] 구현 완료

**변경 파일**:
- `lib/types.ts` (신규): `WorkspaceRole` 타입 정의
- `lib/actions/team.ts`: `getMemberRole`, `requireRole` 헬퍼 + `changeMemberRole`, `removeMember`, `transferOwnership` 신규 액션 + `inviteTeamMember`·`cancelInvite` ADMIN 권한 검증 추가 + `getTeamData`에 `currentMember` 반환 추가
- `lib/auth.ts`: `workspaceId` credential 추가 + `memberships` 쿼리 `orderBy: createdAt asc` + 초대 수락 시 올바른 workspace 세션 설정
- `lib/actions/invite.ts`: `registerAndAcceptInvite`·`loginAndAcceptInvite`에 `workspaceId` 전달
- `app/(dashboard)/team/page.tsx`: ADMIN 뱃지, 역할 변경 드롭다운, 제거·이전 버튼, 초대 폼 OWNER/ADMIN 한정 표시
- `app/(dashboard)/team/role-change-select.tsx` (신규): 역할 변경 드롭다운 컴포넌트
- `app/(dashboard)/team/remove-member-button.tsx` (신규): 멤버 제거 AlertDialog 컴포넌트
- `app/(dashboard)/team/transfer-ownership-button.tsx` (신규): 소유권 이전 Dialog 컴포넌트
- `app/(dashboard)/team/invite-form.tsx`: 초대 역할 옵션 OWNER → ADMIN으로 수정

**후속 작업 시 주의사항**:
- `lib/auth.ts` `authorize`에 `workspaceId` credential이 추가되었다. 로그인 시 `workspaceId`를 전달하지 않으면 가장 오래된 멤버십(createdAt asc)의 workspace가 세션에 설정된다. 초대 수락 흐름처럼 특정 workspace로 강제 진입해야 하는 경우 `signIn('credentials', { ..., workspaceId })` 형태로 전달해야 한다.
- `removeMember`의 `$transaction`은 `Project.assigneeId`와 `RevisionRequest.assigneeId`를 null로 일괄 업데이트한다. 추후 다른 엔티티에 `assigneeId` 필드가 추가되면 이 트랜잭션에도 포함해야 한다.

# Project Constitution

> 이 문서는 프로젝트의 **불변 원칙**을 정의한다.
> 모든 설계·구현·검증 작업 전에 반드시 읽는다.
> constitution 조항이 전역 규칙과 충돌하는 경우, constitution이 우선한다.
>
> - **변경 원칙**: 조항은 팀 전체의 합의 없이 변경하지 않는다.
> - **기준 커밋**: 문서에 commit hash·변경 이력을 기록하지 않는다. 기준 커밋이 필요하면 `git log -- .claude/docs/constitution.md` 를 사용한다.

---

## 1. 프로젝트 원칙

### P-001. 워크스페이스 데이터 격리 원칙

모든 데이터 접근은 반드시 `workspaceId` 범위 내로 제한한다.

- Server Action 및 API Route에서 `session.user.workspaceId`를 where 조건에 항상 포함한다.
- 다른 워크스페이스의 데이터를 노출하는 구현은 허용하지 않는다.
- `prisma.find*` 호출 시 `workspaceId` 필터 누락은 보안 결함으로 간주한다.

**Gates 질문**: 이 구현의 모든 DB 쿼리가 `workspaceId`로 올바르게 scope 되어 있는가?

---

### P-002. RBAC 역할 경계 원칙

역할(OWNER / ADMIN / MEMBER)에 따른 접근 제한은 두 레이어에서 중복 보호한다.

- **라우트 레이어**: `proxy.ts`에서 `MEMBER_BLOCKED_PATHS` 기반 redirect.
- **UI 레이어**: `SidebarNav`에서 `MEMBER_ALLOWED_PATHS` 기반 메뉴 필터링.
- Server Action에서 권한이 필요한 작업은 session role을 재검증한다.
- MEMBER 역할에 새 경로 접근 허용이 필요하면 `proxy.ts`와 `sidebar-nav.tsx` 양쪽을 함께 수정한다.

**Gates 질문**: 이 구현이 MEMBER 역할 사용자에게 허용되지 않은 데이터나 UI를 노출하지 않는가?

---

### P-003. NextAuth JWT 세션 원칙

인증 상태는 NextAuth v5 JWT 세션을 단일 소스로 사용한다.

- `session.user.id`, `session.user.workspaceId`, `session.user.role` 세 필드가 모든 인증 판단의 기준이다.
- 세션 외부에 별도 인증 상태를 두지 않는다.
- 워크스페이스 전환은 재로그인(signIn + workspaceId 파라미터)으로 처리한다. JWT 갱신 없이 세션 내 workspaceId를 바꾸지 않는다.

**Gates 질문**: 이 구현이 NextAuth 세션 이외의 별도 인증 메커니즘을 도입하지 않는가?

---

### P-004. Next.js 버전 준수 원칙

이 프로젝트는 **Next.js 16.2.9** (React 19)를 사용하며, 훈련 데이터의 Next.js와 API가 다를 수 있다.

- 코드 작성 전 `node_modules/next/dist/docs/` 가이드를 확인한다(AGENTS.md 준수).
- `middleware.ts` 대신 `proxy.ts`를 라우트 보호에 사용한다.
- Server Actions, App Router, `async` 서버 컴포넌트 패턴을 사용한다.
- `searchParams`는 `Promise<{...}>` 타입으로 `await`하여 사용한다.

**Gates 질문**: 이 구현이 Next.js 16 / React 19의 API와 호환되는가? deprecated API를 사용하지 않는가?

---

### P-005. 파일 업로드 크기 원칙

업로드 파일은 10MB 제한을 초과할 수 없다.

- `lib/storage.ts`의 `MAX_UPLOAD_SIZE`(10MB)를 단일 소스로 사용한다.
- API Route와 클라이언트 양쪽에서 이 상수를 참조한다.
- 하드코딩된 크기 리터럴 사용을 금지한다.

**Gates 질문**: 이 구현이 `MAX_UPLOAD_SIZE` 상수를 우회하거나 재정의하지 않는가?

---

### P-006. 테스트 원칙

모든 Server Action과 핵심 비즈니스 로직은 Vitest 단위 테스트를 갖춰야 한다.

- `tests/` 하위 `.test.ts` 파일로 작성하고 `npm test`로 실행한다.
- 테스트 커버리지를 낮추는 변경은 허용하지 않는다.
- 새 Server Action 추가 시 대응하는 테스트 파일을 함께 작성한다.

**Gates 질문**: 이 구현에 대응하는 테스트가 존재하고 전체 PASSED 상태인가?

---

## 2. 예외 처리 방식

constitution 위반이 불가피한 경우 아래 절차를 따른다.

1. `plan.md`의 **"예외 사항"** 항목에 위반 조항과 근거를 명시한다.
2. 대안(위반 범위 최소화, 단계적 해소 계획 등)을 함께 기재한다.
3. 사용자의 확인을 받은 후 구현을 진행한다.
4. 구조적 위반이라면 spec 범위를 재조정하거나, 팀 합의 후 constitution 조항 자체를 개정한다.

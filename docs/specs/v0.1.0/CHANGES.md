## [001-mvp-core] Phase 12 테스트 구현 완료

**변경 파일**:
- `vitest.config.ts`: vitest 설정 파일 신규 생성 (vite-tsconfig-paths 플러그인, node 환경, `tests/**/*.test.ts` 포함 패턴)
- `tests/setup.ts`: 전역 mock 설정 (`next/cache`, `next/navigation`, `next-auth`)
- `tests/auth.test.ts`: SC-001(회원가입·워크스페이스 자동 생성), SC-002(팀원 초대·수락) 테스트
- `tests/customer.test.ts`: SC-003(고객 CRUD·검색) 테스트
- `tests/project.test.ts`: SC-004(프로젝트 생성·타임라인), SC-005(워크플로우 템플릿) 테스트
- `tests/revision.test.ts`: SC-006(수정 요청 OPEN→IN_PROGRESS→DONE), SC-007(고객 포털 접수) 테스트
- `tests/asset.test.ts`: SC-008(에셋 등록·SHARED 상태 변경·필터링) 테스트
- `tests/publicPage.test.ts`: SC-009(고객 공개 페이지 토큰 조회), SC-010(공개 페이지 수정 요청 접수) 테스트
- `tests/inquiry.test.ts`: SC-011(인테이크 폼 접수·프로젝트 전환) 테스트
- `tests/message.test.ts`: SC-012(메시지 변수 치환) 테스트
- `tests/dashboard.test.ts`: SC-013(대시보드 필터링) 테스트
- `package.json`: `test`, `test:watch`, `typecheck` 스크립트 추가; `vitest`, `vitest-mock-extended`, `vite-tsconfig-paths` devDependencies 추가
- `docs/specs/v0.1.0/001-mvp-core/tasks.md`: T032~T038 완료 처리

**테스트 결과**: Test Files 9 passed (9) · Tests 72 passed (72)

**후속 작업 시 주의사항**:
- `tests/setup.ts`에 `vi.mock('next-auth', ...)` 전역 mock이 있어야 한다. `next-auth`를 import하는 Server Action을 신규 추가할 때 next-auth가 `next/server`를 내부적으로 참조하므로 이 global mock이 없으면 테스트가 실패한다.
- `prisma.$transaction`은 함수형과 배열형 두 가지 형태로 사용된다. 배열형을 사용하는 액션(`createRevisionRequest`, `updateRevisionStatus`, `updateProjectStage`)을 테스트할 때는 `mockImplementation`에서 두 형태 모두 처리하도록 구현해야 한다.
- `_reference/ourwedding/` 폴더에 JSX를 포함하는 `.js` 테스트 파일이 있다. vitest.config.ts의 `include: ['tests/**/*.test.ts']`로 제외했으므로 이 설정을 유지해야 한다.
- SESSION mock 타입은 `as never`로 단언한다. `as Awaited<ReturnType<...>>` 형태는 next-auth의 함수 오버로드 타입(NextMiddleware 포함)과 충돌하여 타입 오류가 발생한다.
- Prisma include 관계 필드를 테스트에서 접근할 때 `findUnique` 반환 타입은 기본 모델 타입이므로 `as unknown as typeof mockData | null` 형태로 캐스팅해야 한다.

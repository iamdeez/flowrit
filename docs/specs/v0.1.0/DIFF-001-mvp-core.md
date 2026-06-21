# Diff: 001-mvp-core (Phase 12 — Testing / SC Coverage)

## 커밋 메시지 한 줄 요약

- **KO**: SC-001~SC-013 전체 수용 기준 vitest 테스트 구현 (72 tests, 9 files)
- **EN**: Implement vitest test suite covering all acceptance criteria SC-001 to SC-013

## 변경 요약

Phase 12에서 SC-001~SC-013의 모든 수용 기준을 검증하는 vitest 테스트를 작성했다.

- **테스트 인프라 구성**: vitest v4.1.9 + vitest-mock-extended v4.0.0 + vite-tsconfig-paths v6.1.1를 devDependency로 추가. `vitest.config.ts` 신규 생성으로 `@/*` 경로 별칭과 `tests/**/*.test.ts` 포함 패턴을 설정했다.
- **전역 mock 설정** (`tests/setup.ts`): `next/cache`, `next/navigation`을 stub 처리하고, `next-auth`를 전역 mock해 `next/server` 모듈 해석 오류를 방지했다.
- **9개 테스트 파일, 72개 테스트**: `mockDeep<PrismaClient>()` 패턴으로 Prisma를 모킹했다. `$transaction`은 함수형·배열형 두 가지 형태를 모두 처리하는 implementation을 사용했다.
- **핵심 검증 내역**:
  - `register`: function-form `$transaction`, User+Workspace+Member(role=OWNER) 생성 검증
  - `inviteTeamMember`: `workspace.findUnique` (members include) mock 필요
  - `createRevisionRequest`: array-form `$transaction`, `source: 'MANUAL'` + `REVISION_CREATED` 이벤트
  - `updateAssetStatus`: PREPARING→SHARED 시 `ASSET_STATUS_CHANGE` 이벤트 (ASSET_STATUS_CHANGED 아님)
  - SC-012 (`applyTemplateVars`): 순수 함수 — mock 없이 직접 테스트

## 변경 파일 및 라인 수

| 파일 | 추가 | 삭제 | 비고 |
|---|---|---|---|
| `vitest.config.ts` | +12 | 0 | 신규 |
| `tests/setup.ts` | +23 | 0 | 신규 |
| `tests/auth.test.ts` | +250 | 0 | 신규 (SC-001, SC-002) |
| `tests/customer.test.ts` | +160 | 0 | 신규 (SC-003) |
| `tests/project.test.ts` | +230 | 0 | 신규 (SC-004, SC-005) |
| `tests/revision.test.ts` | +248 | 0 | 신규 (SC-006, SC-007) |
| `tests/asset.test.ts` | +178 | 0 | 신규 (SC-008) |
| `tests/publicPage.test.ts` | +183 | 0 | 신규 (SC-009, SC-010) |
| `tests/inquiry.test.ts` | +211 | 0 | 신규 (SC-011) |
| `tests/message.test.ts` | +51 | 0 | 신규 (SC-012) |
| `tests/dashboard.test.ts` | +140 | 0 | 신규 (SC-013) |
| `package.json` | +5 | -2 | test/test:watch 스크립트, 3개 devDep 추가 |
| `docs/specs/v0.1.0/001-mvp-core/tasks.md` | +9 | -9 | T032~T038 체크박스 완료 처리 |

## Diff

```diff
diff --git a/package.json b/package.json
index 4d72709..eb63881 100644
--- a/package.json
+++ b/package.json
@@ -6,7 +6,9 @@
     "dev": "next dev",
     "build": "next build",
     "start": "next start",
-    "lint": "eslint"
+    "lint": "eslint",
+    "test": "vitest run",
+    "test:watch": "vitest"
   },
   "dependencies": {
     "@aws-sdk/client-s3": "^3.1073.0",
@@ -34,6 +36,9 @@
     "eslint": "^9",
     "eslint-config-next": "16.2.9",
     "tailwindcss": "^4",
-    "typescript": "^5"
+    "typescript": "^5",
+    "vite-tsconfig-paths": "^6.1.1",
+    "vitest": "^4.1.9",
+    "vitest-mock-extended": "^4.0.0"
   }
 }
```

```diff
diff --git a/vitest.config.ts b/vitest.config.ts
new file mode 100644
--- /dev/null
+++ b/vitest.config.ts
@@ -0,0 +1,12 @@
+import { defineConfig } from 'vitest/config'
+import tsconfigPaths from 'vite-tsconfig-paths'
+
+export default defineConfig({
+  plugins: [tsconfigPaths()],
+  test: {
+    environment: 'node',
+    globals: true,
+    setupFiles: ['./tests/setup.ts'],
+    include: ['tests/**/*.test.ts'],
+  },
+})
```

```diff
diff --git a/tests/setup.ts b/tests/setup.ts
new file mode 100644
--- /dev/null
+++ b/tests/setup.ts
@@ -0,0 +1,23 @@
+import { vi } from 'vitest'
+
+vi.mock('next/cache', () => ({
+  revalidatePath: vi.fn(),
+  revalidateTag: vi.fn(),
+}))
+
+vi.mock('next/navigation', () => ({
+  redirect: vi.fn(),
+  notFound: vi.fn(),
+}))
+
+vi.mock('next-auth', () => ({
+  default: vi.fn(() => ({
+    handlers: {},
+    auth: vi.fn(),
+    signIn: vi.fn(),
+    signOut: vi.fn(),
+  })),
+  AuthError: class AuthError extends Error {
+    type = 'AuthError'
+  },
+}))
```

신규 파일 9개 (`tests/auth.test.ts`, `tests/customer.test.ts`, `tests/project.test.ts`,
`tests/revision.test.ts`, `tests/asset.test.ts`, `tests/publicPage.test.ts`,
`tests/inquiry.test.ts`, `tests/message.test.ts`, `tests/dashboard.test.ts`) 총 1,651줄 추가.
상세 내용은 각 파일 참조.

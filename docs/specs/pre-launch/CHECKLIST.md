# Flowrit 상용화 전 확인 체크리스트

> **작성일**: 2026-06-23 | **기준 버전**: v0.6.0
>
> 이 문서는 상용화(public launch) 전에 완료해야 할 항목을 영역별로 정리한다.
> 각 항목에는 현재 상태, 우선순위, 관련 파일이 명시된다.
>
> **우선순위 기준**:
> - 🔴 **BLOCKER** — 이 항목 미해결 시 상용화 불가
> - 🟡 **HIGH** — 출시 후 즉시 문제가 될 수 있음. 가능하면 출시 전 해결
> - 🟢 **NICE** — 품질 향상. 출시 후 단계적으로 처리 가능

---

## 목차

- [0. 즉시 처리 필요 (현재 상태)](#0-즉시-처리-필요-현재-상태)
- [1. 보안](#1-보안)
- [2. 인증 · 계정](#2-인증--계정)
- [3. 테스트](#3-테스트)
- [4. 기능 고도화](#4-기능-고도화)
- [5. 데브옵스 · CI/CD](#5-데브옵스--cicd)
- [6. 배포 · 인프라](#6-배포--인프라)
- [7. 모니터링 · 로깅](#7-모니터링--로깅)
- [8. 성능 · DB](#8-성능--db)
- [9. 운영 · 장애 대응](#9-운영--장애-대응)
- [10. 법적 · 비즈니스](#10-법적--비즈니스)
- [11. UX · 접근성](#11-ux--접근성)

---

## 0. 즉시 처리 필요 (현재 상태)

> 2026-06-23 기준, 배포 전 **오늘 안에 처리해야 할** 항목들.
> 아래 문제들은 현재 로컬에만 존재하며 Prod에 반영되지 않은 상태다.

### 0-1. 미커밋 변경사항 (Uncommitted Changes)

- [ ] 🔴 아래 파일들을 커밋하지 않으면 Prod 배포 시 반영되지 않는다. PR 또는 직접 `main` 커밋 필요.

**수정된 파일 (M):**
- `prisma/schema.prisma` — `OrderFormField` 모델 추가
- `lib/auth.ts` — OWNER 우선 멤버십 선택 로직 수정
- `proxy.ts` — 미들웨어 redirect 포트 수정 (`req.nextUrl.clone()` 사용)
- `lib/actions/inquiry.ts` — `fieldValues` JSON 수집 추가
- `app/order/[workspaceSlug]/order-form.tsx` — 동적 필드 렌더링
- `app/order/[workspaceSlug]/page.tsx` — 필드 fetch 후 form 전달
- `app/(dashboard)/settings/page.tsx` — 주문서 폼 빌더 탭 추가
- `app/(dashboard)/dashboard/page.tsx` — (변경 내용 확인 필요)
- `app/invite/[token]/accept-forms.tsx` — (변경 내용 확인 필요)
- `components/sidebar-nav.tsx` — (변경 내용 확인 필요)

**신규 파일 (??):**
- `app/(dashboard)/settings/order-form-builder.tsx` — 주문서 폼 빌더 컴포넌트
- `lib/actions/form-fields.ts` — OrderFormField CRUD Server Actions
- `prisma/migrations/20260623014251_add_order_form_fields/` — DB 마이그레이션

### 0-2. Prod DB 마이그레이션 미실행

- [ ] 🔴 `prisma/migrations/20260623014251_add_order_form_fields/` 마이그레이션이 **Prod DB에 적용되지 않음**.
  - Prod 배포 후 `npx prisma migrate deploy` 실행 또는 Vercel build 스크립트에 포함 필요.
  - 미적용 시 `/settings?tab=orderform` 및 `/order/[slug]` 페이지에서 500 에러 발생.

### 0-3. 테스트 26개 실패 중

- [x] ✅ **완료** — `tests/setup.ts`에 `RESEND_API_KEY = 're_test_key'` 추가, `workspaceMember.findFirst` mock 누락 수정, `fileUrl` → `fileUrls` 오타 수정. 102/102 PASS.

### 0-4. ESLint 155개 오류

- [x] ✅ **완료** — `_reference/`, `prisma/seed.cjs` → eslint ignore 추가. 앱 코드 내 4개 에러 수정. **0 errors, 9 warnings**.

### 0-5. 기타 발견된 코드 버그

- [x] ✅ **완료** — `app/(dashboard)/projects/[id]/page.tsx:74` — `NEXT_PUBLIC_APP_URL` 우선 사용, 없을 때만 headers fallback.

---

## 1. 보안

### 1-1. API Rate Limiting

- [ ] 🔴 `/api/webhooks/intake/[slug]` — rate limit 없음. 공개 엔드포인트이므로 IP당 분당 호출 제한 필요 (예: Vercel Edge Middleware 또는 Upstash Redis).
- [ ] 🔴 `/intake/[workspaceSlug]` 공개 폼 — 반복 제출 방지 없음. honeypot 필드 또는 서버 사이드 rate limit 필요.
- [ ] 🟡 `/order/[workspaceSlug]` 공개 폼 — 동일 IP 반복 제출 제한 없음.
- [ ] 🟡 로그인 엔드포인트 (`/api/auth/callback/credentials`) — brute-force 방어 없음. NextAuth credentials provider에 시도 횟수 제한 또는 잠금 로직 추가 필요.

### 1-2. 입력 검증 · 주입 방어

- [ ] 🔴 webhook `content` 필드 — 길이 제한 없음. 매우 긴 문자열이 DB에 저장될 수 있음. Server Action 및 route handler에서 최대 길이 검증 추가 필요.
- [ ] 🟡 Server Action 입력값 — `zod` 또는 수동 검증으로 필드 타입·길이·허용 문자를 명시적으로 검증하는 계층 부재. Prisma가 SQL injection을 방어하지만 비즈니스 로직 수준 검증이 필요.
- [ ] 🟡 파일 업로드 — contentType을 클라이언트가 자유롭게 지정 가능. `/api/upload`에서 허용 MIME 타입 화이트리스트 검증 추가 필요 (현재 `size`만 검증).

### 1-3. 인증 · 세션 보안

- [ ] 🔴 `AUTH_SECRET` — Vercel 환경변수에 충분히 긴 랜덤 값(32바이트 이상) 설정 확인. 기본값이나 테스트 값이 prod에 적용되지 않도록 점검.
- [ ] 🟡 JWT 만료 시간 — NextAuth 기본 세션 만료 정책 확인. 장기 미사용 세션 자동 만료 설정 여부 검토.
- [ ] 🟡 비밀번호 정책 — 현재 최소 길이 외 복잡도 요구 없음. 상용화 시 최소 8자·문자+숫자 조합 권장.
- [ ] 🟢 CSRF — Next.js Server Actions는 기본적으로 동일 출처 요청만 허용하지만, 커스텀 헤더 검증 여부를 확인.

### 1-4. 민감 정보 노출

- [ ] 🔴 `console.error`/`console.log` 내 민감 정보 — 에러 로그에 user 데이터, email, 내부 DB ID 등이 포함되지 않는지 전수 검토.
- [ ] 🟡 `WEBHOOK_SECRET` — 설정 UI에서 마스킹 없이 표시됨 확인 필요. 현재 `{WEBHOOK_SECRET}` 플레이스홀더만 안내하므로 실제 값 노출 없음 — 확인 후 OK 처리 가능.
- [ ] 🟡 Vercel 환경변수 — `NEXT_PUBLIC_*` 접두사가 붙은 변수는 클라이언트 번들에 포함됨. 현재 `NEXT_PUBLIC_APP_URL`만 해당하므로 이외 민감 변수가 실수로 `NEXT_PUBLIC_`으로 설정되지 않도록 주의.

---

## 2. 인증 · 계정

### 2-1. 비밀번호 초기화

- [ ] 🔴 비밀번호 분실 시 재설정 기능이 없음. 사용자가 비밀번호를 잊으면 계정에 접근 불가.
  - Resend 이미 연동되어 있으므로: 이메일 발송 → 시간 제한 토큰(DB 저장) → `/reset-password/[token]` 페이지 구현 필요.
  - 관련 파일: `lib/email.ts`, `prisma/schema.prisma` (PasswordResetToken 모델 추가)

### 2-2. 이메일 인증

- [ ] 🟡 회원가입 후 이메일 인증 없음. 실제 소유하지 않는 이메일로 가입 가능.
  - Resend 기반 인증 메일 발송 후 `emailVerified` 필드 관리 방안 검토.
  - NextAuth `emailVerified`를 사용하거나, Workspace 생성을 인증 완료 이후로 제한하는 방안 고려.

### 2-3. 소셜 로그인

- [ ] 🟢 현재 이메일+비밀번호 전용. Google 또는 카카오 OAuth 추가 시 가입 진입 장벽 감소 — 요구사항 확정 후 별도 spec.

### 2-4. 워크스페이스 온보딩

- [ ] 🟡 신규 가입 후 첫 화면이 빈 대시보드. 워크스페이스 이름 설정, 슬러그 설정, 첫 프로젝트 생성 안내 등 온보딩 플로우 없음.
  - 전환율(activation rate)에 직접 영향을 미치는 항목.

---

## 3. 테스트

### 3-1. 현재 상태

**Vitest 단위 테스트** (`tests/*.test.ts`) — 11개 파일 존재. **현재 26개 실패 중** (§0-3 참조).

테스트 실패 원인 해결 후 기대 결과:
- 5개 파일 PASS (기존 테스트)
- 6개 파일 FAIL → `RESEND_API_KEY` 미설정 문제 해결 시 대부분 회복 예상

미테스트 영역:
- `lib/actions/inquiry.ts` — `submitOrder`, `dismissInquiry` (v0.6.0 신규)
- `lib/actions/testWebhook.ts`
- `app/api/webhooks/intake/[workspaceSlug]/route.ts` — webhook 핸들러 전체

### 3-2. 단위 테스트 보완

- [ ] 🔴 `tests/inquiry.test.ts` — `submitOrder`, `dismissInquiry` SC별 테스트 추가 (constitution P-006 위반 상태).
- [ ] 🔴 `tests/webhook.test.ts` 신규 — webhook route handler: 인증 성공/실패, 필드 검증, source 레이블 prefix, 404 케이스.
- [ ] 🟡 `tests/testWebhook.test.ts` — `sendTestInquiry` 기본 흐름 테스트.

### 3-3. E2E 테스트 (Playwright)

Playwright가 설치되어 있으나 테스트 설정 파일 없음.

- [ ] 🟡 `playwright.config.ts` 작성 및 `tests/e2e/` 디렉토리 구성.
- [ ] 🟡 핵심 사용자 플로우 E2E 커버:
  - 로그인 → 프로젝트 생성 → 고객 공유 링크 → 수정 요청 제출 → 대시보드 확인
  - 공개 의뢰 폼(`/intake`) 제출 → 대시보드 접수 확인
  - 주문서 폼(`/order`) 제출 → `/orders` 목록 확인
- [ ] 🟢 CI에서 E2E 자동 실행 (Vercel Preview URL 대상 또는 로컬 서버).

### 3-4. 타입 체크 · Lint CI 통합

- [ ] 🟡 현재 `npm run typecheck` / `npm run lint`가 CI에서 자동 실행되지 않음. PR 시 자동 실패 유도 필요.

---

## 4. 기능 고도화

### 4-1. 결제 · 구독

- [ ] 🔴 현재 결제 기능 없음. SaaS 상용화의 핵심. 아래 중 하나 선택 후 spec 작성 필요:
  - **Stripe** (글로벌) — Checkout Session, Webhook, subscription 관리
  - **토스페이먼츠** (국내) — 카드/계좌이체, 자동결제
  - **무료 플랜 + 유료 플랜 제한** 설계 필요: 프로젝트 수, 팀원 수, 스토리지 등 제한 기준 결정

### 4-2. 이메일 템플릿

- [ ] 🟡 현재 이메일이 plain text 수준. 브랜드 일관성 있는 HTML 이메일 템플릿 필요.
  - `lib/email.ts`의 `sendNewInquiryEmail`, `sendRevisionCommentReplyEmail` 등 Resend React Email 템플릿으로 교체 권장.

### 4-3. 파일 관리

- [ ] 🟡 R2에 업로드된 파일의 삭제 기능 없음. Asset 또는 RevisionRequest 삭제 시 R2 오브젝트가 잔존함 → 스토리지 비용 누적.
  - Workspace 삭제 / Asset 삭제 시 R2 오브젝트도 함께 삭제하는 로직 추가 필요.
- [ ] 🟡 파일 만료(expiredAt) — Asset `EXPIRED` 상태가 있지만 실제 파일 접근을 막는 로직 없음. Presigned URL은 이미 만료되나 R2 public URL은 항상 접근 가능.

### 4-4. 알림 시스템

- [ ] 🟡 읽지 않은 알림이 쌓여도 일괄 읽음 처리 기능 없음.
- [ ] 🟡 이메일 알림 재전송 / 실패 시 재시도 로직 없음 (현재 fire-and-forget).
- [ ] 🟢 브라우저 Push 알림 (Web Push API) — 실시간성이 필요한 경우 고려.

### 4-5. 검색 · 필터

- [ ] 🟡 프로젝트·고객·수정 요청 전체 검색 기능 없음. 데이터 증가 시 필요.
- [ ] 🟢 주문서 관리(`/orders`) 텍스트 검색 없음.

### 4-6. 데이터 내보내기

- [ ] 🟢 `/api/export` 엔드포인트 존재 여부 확인 및 내보내기 형식(CSV/JSON) 완성도 검토.

---

## 5. 데브옵스 · CI/CD

### 5-1. CI 파이프라인

- [ ] 🔴 현재 CI 없음. `git push → Vercel 자동 배포`만 존재. PR 머지 전 자동 검증 없음.
  - GitHub Actions 또는 Vercel CI 구성 권장:
    ```
    PR 오픈 → npm run typecheck → npm run lint → npm test → (통과 시) Vercel Preview 배포
    ```
- [ ] 🔴 `main` 브랜치 직접 push 가능 — 브랜치 보호 규칙(branch protection) 설정 필요.
  - GitHub → Settings → Branches → main → Require PR + status checks.

### 5-2. 브랜치 전략

- [ ] 🟡 현재 단일 `main` 브랜치. 기능 개발은 `feat/*`, 버그 수정은 `fix/*` 브랜치 사용 규칙 수립 필요.
- [ ] 🟡 Staging 환경 없음 — Vercel Preview URL이 사실상 staging 역할이나, 별도 Staging 워크스페이스 + DB 분리 고려.

### 5-3. DB 마이그레이션 자동화

- [ ] 🔴 현재 마이그레이션은 수동 실행(`npx prisma migrate deploy`). Vercel 배포 후 자동 적용 안 됨.
  - Vercel `postbuild` 스크립트 또는 별도 마이그레이션 스텝 자동화 필요.
  - 예: `package.json` `"build": "prisma migrate deploy && next build"`
  - **주의**: 마이그레이션 실패 시 배포 롤백 전략도 함께 정의.

### 5-4. 시크릿 관리

- [ ] 🟡 `.env.local`이 실수로 커밋되지 않도록 `.gitignore` 확인 (현재 OK).
- [ ] 🟡 Vercel 환경변수와 `.env.example`의 동기화 여부 정기 점검 프로세스 필요.
- [ ] 🟢 `WEBHOOK_SECRET` 로테이션 절차 문서화 — secret 변경 시 플랫폼 연동 측도 업데이트 필요.

---

## 6. 배포 · 인프라

### 6-1. 커스텀 도메인 · SSL

- [ ] 🔴 `NEXT_PUBLIC_APP_URL`이 `https://flowrit.io` (또는 실제 도메인)으로 설정되어야 고객 공유 링크가 정상 동작.
- [ ] 🔴 Vercel에 커스텀 도메인 연결 + SSL 자동 갱신 확인.
- [ ] 🔴 Resend 발신 도메인(DNS SPF·DKIM·DMARC) 설정 — 미설정 시 이메일이 스팸함으로 분류됨.

### 6-2. 환경변수 전체 점검

- [ ] 🔴 Vercel Production 환경변수 확인 목록:
  - `DATABASE_URL` (Neon pooled connection string)
  - `AUTH_SECRET` (32바이트 이상 랜덤)
  - `AUTH_URL` (실제 도메인, e.g. `https://flowrit.io`)
  - `NEXT_PUBLIC_APP_URL` (실제 도메인)
  - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
  - `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
  - `CRON_SECRET`
  - `WEBHOOK_SECRET`

### 6-3. Vercel 플랜

- [ ] 🟡 Hobby 플랜 제약 확인:
  - Cron job 1개만 허용 (현재 1개 — OK, 추가 시 Pro 필요)
  - Serverless Function 실행 시간 제한 (10초)
  - 동시 빌드 1개
- [ ] 🟡 트래픽 증가 시 Pro 플랜 전환 기준 수립.

### 6-4. DB 용량 · 연결 관리

- [ ] 🟡 Neon 무료 플랜 제약: 0.5GB 스토리지, 브랜치 10개. 상용화 시 유료 플랜 전환 계획 수립.
- [ ] 🟡 Neon 자동 일시정지(auto-suspend) — 5분 비활성 시 DB가 sleep. Cron job이 첫 연결 시 cold start 지연 발생 가능. Neon 설정에서 비활성화 검토.

---

## 7. 모니터링 · 로깅

### 7-1. 에러 트래킹

- [ ] 🔴 현재 에러 트래킹 도구 없음 (`console.error`만 존재, Vercel 로그에서만 확인 가능).
  - **Sentry** 연동 권장: Next.js App Router 공식 SDK 지원.
    ```
    npm install @sentry/nextjs
    ```
  - 연동 후: 미처리 Server Action 예외, React 렌더 에러, API Route 500 에러 자동 수집.

### 7-2. 성능 모니터링

- [ ] 🟡 Core Web Vitals (LCP, FID, CLS) 측정 도구 없음.
  - Vercel Analytics(무료) 또는 Sentry Performance 연동 권장.
- [ ] 🟡 Cron job 실행 결과 알림 없음. 마감 리마인더 Cron 실패 시 누구도 인지 못함.
  - Sentry Cron 모니터링 또는 Simple Uptime 서비스 연동.

### 7-3. Uptime 모니터링

- [ ] 🟡 서비스 가용성 모니터링 없음.
  - **BetterUptime**, **UptimeRobot** (무료 플랜) 등으로 `https://flowrit.io` 1분마다 ping, 장애 시 이메일/슬랙 알림.

### 7-4. 구조화 로깅

- [ ] 🟢 현재 `console.error('[prefix] message', { data })` 패턴 혼용. 로그 포맷 통일 + JSON 구조화 로깅 도입 시 Vercel 로그 쿼리 편의성 향상.

---

## 8. 성능 · DB

### 8-1. 데이터베이스 인덱스

- [ ] 🔴 다음 쿼리 패턴이 인덱스 없이 풀 스캔 가능성 있음:
  - `Inquiry.findMany({ where: { workspaceId, status, formType } })` — `workspaceId + status` 복합 인덱스 없음
  - `RevisionRequest.findMany({ where: { projectId } })` — `projectId` 인덱스 확인 필요
  - `Notification.findMany({ where: { userId, isRead } })` — `userId + isRead` 복합 인덱스 없음
  - `prisma/schema.prisma`에 `@@index` 추가 및 마이그레이션 필요.

### 8-2. N+1 쿼리

- [ ] 🟡 `app/(dashboard)/projects/page.tsx` — 프로젝트 목록에서 각 프로젝트의 `currentStage`, `customer`, `assignee` 등을 별도 조회하고 있지 않은지 확인. `include` 활용 여부 검토.
- [ ] 🟡 대시보드 (`/dashboard`) — `Promise.all` 내 쿼리 수와 각 쿼리의 select 범위 최적화 검토.

### 8-3. 이미지 · 파일 최적화

- [ ] 🟡 R2에 업로드된 이미지에 대한 CDN 캐싱 정책 없음. Cloudflare R2는 기본적으로 CDN 역할을 하지만, Cache-Control 헤더 설정 여부 확인.
- [ ] 🟢 Next.js `<Image>` 컴포넌트 활용 여부 검토 — R2 도메인을 `next.config.ts`의 `images.remotePatterns`에 추가 필요.

### 8-4. 캐싱

- [ ] 🟢 Dashboard analytics 쿼리 — 6개월 통계 데이터를 매 요청마다 계산. React `cache()` 또는 Next.js `unstable_cache`로 일정 시간 캐싱 고려.

---

## 9. 운영 · 장애 대응

### 9-1. 데이터 백업

- [ ] 🔴 현재 백업 정책 없음. Neon은 자동 point-in-time restore를 지원하지만 보존 기간·복구 절차를 명확히 해야 함.
  - Neon 콘솔 → Backup 탭에서 보존 기간 확인 (무료 플랜: 7일).
  - 주요 데이터(Workspace, Project, Customer) 주간 수동 덤프 고려 (`pg_dump` via cron).

### 9-2. Runbook (장애 대응 절차)

- [ ] 🟡 다음 시나리오별 대응 절차 문서화:
  - **DB 접속 불가**: Neon 상태 페이지 확인 → 재시도 → 읽기 전용 모드 공지
  - **Resend 발송 실패**: 대기 중인 알림 수동 재발송 방법
  - **R2 업로드 불가**: 사용자 안내 방법, 임시 우회 방법
  - **Vercel 빌드 실패**: 마지막 정상 배포로 롤백 (Vercel 대시보드 → Promote to Production)
  - **인증 불가 (AUTH_SECRET 문제)**: 세션 무효화 범위, 재로그인 유도 방법

### 9-3. 서비스 공지 채널

- [ ] 🟡 서비스 점검·장애 시 사용자에게 공지할 채널 없음.
  - 상태 페이지 (statuspage.io 등) 또는 트위터/이메일 공지 채널 마련.

### 9-4. 고객 지원

- [ ] 🟡 앱 내 고객 지원 채널 없음 (인터콤, 채널톡 등 연동 검토).
- [ ] 🟢 사용자 피드백 수집 방법 (Hotjar, FullStory 등 행동 분석).

---

## 10. 법적 · 비즈니스

### 10-1. 필수 법적 문서

- [ ] 🔴 **개인정보처리방침** 페이지 없음. 고객 이름·연락처·파일을 수집하므로 개인정보보호법 의무 사항.
  - `/privacy` 경로로 정적 페이지 작성. Neon(미국), R2(Cloudflare), Resend 등 데이터 처리 위탁 업체 명시.
- [ ] 🔴 **이용약관** 페이지 없음 (`/terms`).
- [ ] 🟡 회원가입 화면에 "이용약관 및 개인정보처리방침에 동의" 체크박스 없음.

### 10-2. 쿠키 · 추적

- [ ] 🟡 현재 쿠키 동의 배너 없음. NextAuth 세션 쿠키 사용 → 쿠키 정책 페이지 필요. (EU 사용자 대상 시 필수)

### 10-3. 데이터 보존 정책

- [ ] 🟡 탈퇴/워크스페이스 삭제 시 데이터 삭제 정책 정의 없음.
  - `onDelete: Cascade` 설정 검토 (일부 모델은 이미 적용).
  - GDPR 적용 시 '삭제 요청 처리' 절차 필요.

### 10-4. 사업자 정보

- [ ] 🟡 서비스 내 사업자 등록번호, 대표자명, 연락처 노출 (전자상거래법 의무) — 결제 기능 추가 시 필수.

---

## 11. UX · 접근성

### 11-1. 에러 핸들링 UX

- [ ] 🟡 Server Action 실패 시 일부 화면에서 에러 메시지 없이 조용히 실패. `useActionState`의 error 상태를 모든 폼에서 사용자에게 표시하는지 확인.
- [ ] 🟡 `app/error.tsx` (전역 에러 바운더리) 없음 — Next.js App Router의 `error.tsx` 추가 권장.
- [ ] 🟡 `app/not-found.tsx` 커스텀 404 페이지 없음.

### 11-2. 로딩 상태

- [ ] 🟡 `app/loading.tsx` (전역 로딩 UI) 없음. 페이지 이동 시 빈 화면 노출 가능.
- [ ] 🟡 파일 업로드 중 진행률 표시 없음 (현재 `isPending` boolean만 사용).

### 11-3. 반응형 · 모바일

- [ ] 🟡 모바일 뷰 대응 수준 검토. 핵심 사용자 플로우(대시보드, 프로젝트 상세, 수정 요청)가 모바일에서 정상 동작하는지 실기기 확인.
- [ ] 🟢 PWA(Progressive Web App) 지원 고려 — 모바일 홈 화면 추가, 오프라인 지원.

### 11-4. 접근성 (a11y)

- [ ] 🟢 WCAG 2.1 AA 기준 주요 항목:
  - 이미지 alt 속성
  - 폼 label↔input 연결
  - 키보드 탐색 순서
  - 색상 대비 비율 (4.5:1)
  - `axe-core` 또는 Lighthouse 접근성 점수 측정.

---

## 우선순위 요약

### 🔴 BLOCKER (출시 전 필수)

> **오늘 처리 (§0 항목)** → **인프라/보안** → **기능/법적** 순으로 진행 권장.

| # | 항목 | 참조 |
|---|---|---|
| ~~0-A~~ | ~~미커밋 변경사항 전체 커밋~~ ✅ | §0-1 |
| 0-B | Prod DB 마이그레이션 (`OrderFormField`) 적용 | §0-2 |
| ~~0-C~~ | ~~테스트 실패 26개 해결~~ ✅ | §0-3 |
| ~~0-D~~ | ~~ESLint 오류 해결~~ ✅ | §0-4 |
| ~~0-E~~ | ~~`localhost:3000` 하드코딩 제거~~ ✅ | §0-5 |
| ~~1~~ | ~~비밀번호 초기화 기능~~ ✅ | §2-1 |
| ~~2~~ | ~~결제/구독 시스템 (나이스페이먼츠)~~ ✅ | §4-1 |
| ~~3~~ | ~~개인정보처리방침 + 이용약관 페이지~~ ✅ | §10-1 |
| ~~4~~ | ~~API rate limiting (webhook, intake 공개 엔드포인트)~~ ✅ | §1-1 |
| ~~5~~ | ~~CI/CD 파이프라인 + 브랜치 보호~~ ✅ | §5-1 |
| ~~6~~ | ~~DB 마이그레이션 자동화 (build 스크립트)~~ ✅ | §5-3 |
| ~~7~~ | ~~Sentry 에러 트래킹 연동~~ ✅ | §7-1 |
| 8 | 커스텀 도메인 + Resend 발신 도메인 DNS 설정 | §6-1 |
| 9 | Vercel 환경변수 전체 점검 | §6-2 |
| ~~10~~ | ~~DB 인덱스 추가 (`workspaceId+status`, `projectId`, `workspaceId`)~~ ✅ | §8-1 |
| ~~11~~ | ~~미테스트 Server Action 단위 테스트 (submitOrder, webhook)~~ ✅ | §3-2 |

### 🟡 HIGH (출시 직후 스프린트)

| # | 항목 |
|---|---|
| 1 | 이메일 인증 |
| 2 | 신규 가입 온보딩 플로우 |
| 3 | HTML 이메일 템플릿 |
| 4 | R2 파일 삭제 연동 |
| 5 | Uptime 모니터링 |
| 6 | Cron job 실패 알림 |
| 7 | Staging 환경 구성 |
| 8 | 장애 대응 Runbook 작성 |
| 9 | 모바일 UX 검증 |
| 10 | `app/error.tsx` / `app/not-found.tsx` |

---

> **다음 액션**: 위 BLOCKER 항목들을 별도 spec(`docs/specs/v0.7.0/`)으로 분리하여 순서대로 구현한다.
> 각 spec 작성 전 이 문서를 참조하여 누락 없이 반영한다.

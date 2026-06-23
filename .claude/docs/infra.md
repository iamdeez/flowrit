# Project Infra

> 이 문서는 프로젝트의 **운영 수준 인프라 지식**을 기록하는 참조 문서다.
> 배포·환경 구성에 영향을 주는 spec 설계 전 반드시 읽어 운영 제약을 파악한다.
>
> - **갱신 시점**: 인프라 구성이 변경된 spec 완료 후 갱신한다.
> - **환경변수**: `.env.example` 파일이 기준 문서다. 이 문서에 기재하지 않는다.
> - **보안 원칙**: 실제 인증 정보(비밀번호, 토큰, 키)는 절대 기록하지 않는다.

---

## 1. 환경 구성

| 환경 | 목적 | 비고 |
|---|---|---|
| dev | 로컬 개발·테스트 | `http://localhost:3000` |
| prod | 운영 | Vercel 배포, 커스텀 도메인 |

staging 환경은 현재 미구성. Playwright E2E는 Vercel Preview 또는 별도 staging DB를 대상으로 실행하는 전략을 사용한다.

---

## 2. 인프라 토폴로지

### 구성 개요

```
사용자 브라우저
      ↓ HTTPS
Vercel Edge (Next.js 16 App Router + proxy.ts)
      ↓
Server Actions / API Routes
      ├── Neon PostgreSQL (Prisma + PrismaPg adapter)
      ├── Cloudflare R2 (파일 업로드 — presigned URL)
      ├── Resend (이메일 발송)
      └── Discord Webhook (운영 알림)

Vercel Cron (매일 자정 UTC)
      → GET /api/cron/deadline-reminder
      → GET /api/cron/billing
      → Neon PostgreSQL + Resend
```

### 컴포넌트 목록

| 컴포넌트 | 유형 | 역할 |
|---|---|---|
| Vercel | PaaS | Next.js 호스팅, Cron 스케줄러 |
| Neon | PostgreSQL SaaS | 메인 데이터베이스 (pooled connection) |
| Cloudflare R2 | 오브젝트 스토리지 | 파일 업로드 (Assets, RevisionRequest 첨부파일) |
| Resend | 이메일 SaaS | 트랜잭션 이메일 (초대, 알림, 마감 리마인더) |

---

## 3. 배포 방식

### 빌드 및 배포

```
git push → Vercel 자동 빌드 (next build) → 자동 배포
```

로컬 빌드 확인: → `package.json` `scripts.build` 참조

**주의**: Prisma 클라이언트는 `app/generated/prisma/`에 생성된다. 일반적인 `node_modules/@prisma/client` 경로가 아니므로, import 경로 오류 주의 (`@/app/generated/prisma/client`).

### Vercel Cron

- 경로: `vercel.json` 참조
- Cron 목록:
  - `/api/cron/deadline-reminder` — `0 0 * * *` (매일 자정 UTC)
  - `/api/cron/billing` — `0 0 * * *` (매일 자정 UTC)
- 보호: `CRON_SECRET` 환경변수로 Bearer 토큰 인증 (`.env.example`에 포함)

### Health Check

- 경로: `GET /api/health`
- 공개 요청은 `status`, `service`, `timestamp`만 반환한다.
- 상세 요청은 `Authorization: Bearer HEALTHCHECK_TOKEN` 또는 `?token=`으로 app/database/env 체크를 반환한다.
- degraded 상태에서는 503을 반환하고, 상세 요청에서 Discord 운영 알림을 전송한다.

### 롤백 방법

Vercel 대시보드 → Deployments → 이전 배포 → Promote to Production

---

## 4. 모니터링·로깅

- Sentry DSN은 `NEXT_PUBLIC_SENTRY_DSN`으로 설정한다.
- Discord 운영 알림은 `DISCORD_WEBHOOK_URL`이 설정된 production 환경에서만 전송한다.
- Vercel 빌드·함수 로그: Vercel 대시보드 → Functions 탭.
- Cron 실패, 정기 결제 실패, billing callback 실패, 이메일 실패, webhook 알림 실패는 `sendOpsAlert()`로 sanitized Discord 알림을 보낸다.
- `lib/ops-sanitize.ts`는 secret/token/password/authorization/cookie/key/dsn/database_url/direct_url/webhook 계열 키를 `[REDACTED]`로 마스킹한다.

---

## 5. 연결 실패 재시도 동작

| 대상 | 재시도 방식 | 동작 영향 |
|---|---|---|
| Neon PostgreSQL | PrismaPg 기본 연결 풀 | 연결 실패 시 Server Action 에러 반환 |
| Resend | 재시도 없음 (단건 발송) | 이메일 발송 실패 시 `console.error` 후 계속 진행 |
| Cloudflare R2 | 재시도 없음 | presigned URL 발급 실패 시 500 에러 반환 |
| Discord Webhook | 재시도 없음 | 알림 전송 실패는 비즈니스 로직으로 전파하지 않음 |

---

## 6. 로컬 개발 환경

### 의존성 설치

`package-lock.json` 참조 → `npm install`

### 실행

```
npm run dev  → http://localhost:3000
```

### 테스트

```
npm test       → Vitest 단위 테스트 실행 (tests/**/*.test.ts)
npm run typecheck → TypeScript 타입 체크
npm run lint   → ESLint
npx playwright test --list → E2E 시나리오 목록 확인
```

Vitest 테스트는 node 환경 (`vitest.config.ts` `environment: 'node'`).

Playwright E2E:

```
PLAYWRIGHT_BASE_URL=https://preview-url npx playwright test
```

Mutating E2E는 `E2E_ALLOW_MUTATION=true`가 필요하며 production 데이터 대상으로 실행하지 않는다.

### 의존성 구조

| 패키지 | 역할 |
|---|---|
| `next@16.2.9` | App Router, Server Actions, proxy.ts |
| `next-auth@5.0.0-beta.31` | Credentials 인증, JWT 세션 |
| `@prisma/client@7` + `@prisma/adapter-pg` | ORM, PrismaPg adapter |
| `@aws-sdk/client-s3` | Cloudflare R2 (S3 호환) |
| `resend` | 이메일 발송 |
| `bcryptjs` | 비밀번호 해시 |
| `recharts` | 통계 차트 |
| `sonner` | 토스트 알림 |
| `tailwindcss@4` | 스타일링 |
| `vitest@4` | 단위 테스트 |
| `playwright` | E2E 테스트 |

---

## 7. 배포 전 확인 체크리스트

- [ ] Vercel 환경변수 설정 확인: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_URL`, `R2_*`, `RESEND_*`, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`, `DISCORD_WEBHOOK_URL`, `HEALTHCHECK_TOKEN`, `NICEPAY_*`, `UPSTASH_*`
- [ ] `CRON_SECRET` Vercel에 설정되었는가
- [ ] `/api/health` 공개 요약과 토큰 상세 응답 확인
- [ ] Prisma 마이그레이션 적용 확인 (`prisma/migrations/`)
- [ ] R2 버킷 Public access 활성화 확인
- [ ] `NEXT_PUBLIC_APP_URL`이 실제 배포 도메인으로 업데이트되었는가 (고객 공유 링크 기준)
- [ ] Vercel Cron 2개(`/api/cron/deadline-reminder`, `/api/cron/billing`) 활성 상태 확인

---

## 8. 알려진 인프라 제약

| 항목 | 내용 | 영향 범위 |
|---|---|---|
| Vercel Hobby 플랜 Cron 제한 | Hobby 플랜은 1개 Cron job만 허용. 추가 Cron 필요 시 Pro 플랜 필요. | 자동화 기능 확장 |
| R2 파일 크기 제한 | `MAX_UPLOAD_SIZE = 10MB` (lib/storage.ts). presigned URL 방식이므로 서버 메모리 통과 없음. 단일 파일 10MB 초과 불가. | Asset 업로드, RevisionRequest 첨부 |
| Neon 연결 풀 | pooled connection 사용. Serverless 환경(Vercel)에서 연결 고갈 방지. | DB 성능 |

---

## 9. 갱신 이력

> **활용법**: `git diff <commit> -- vercel.json prisma/schema.prisma prisma/migrations/ next.config.ts` 로 인프라 관련 변경을 확인할 수 있다.

| 날짜 | commit | 갱신 내용 | 관련 spec |
|---|---|---|---|
| 2026-06-22 | — | 최초 작성 | — |

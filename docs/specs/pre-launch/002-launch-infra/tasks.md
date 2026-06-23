# Tasks: 출시 인프라 퀵윈

> Branch: pre-launch | Date: 2026-06-23

## 목차

- [포함 항목](#포함-항목)
- [태스크 목록](#태스크-목록)
- [외부 의존 항목 (인프라 작업)](#외부-의존-항목-인프라-작업)

---

## 포함 항목

| 항목 | 우선순위 | 상태 |
|---|---|---|
| DB 마이그레이션 자동화 (build script) | 🔴 BLOCKER | 완료 |
| DB 인덱스 추가 | 🔴 BLOCKER | 완료 |
| 개인정보처리방침 페이지 | 🔴 BLOCKER | 완료 |
| 이용약관 페이지 | 🔴 BLOCKER | 완료 |
| API 입력값 길이 제한 (기초 방어) | 🔴 BLOCKER | 완료 |

## 태스크 목록

### T001 — DB 마이그레이션 자동화

- [x] `package.json` build script: `"build": "prisma migrate deploy && next build"`
- 구현 파일: `package.json`
- 완료 기준: Vercel 배포 시 마이그레이션 자동 실행

### T002 — DB 인덱스 추가

- [x] `Inquiry` 모델: `@@index([workspaceId, status])` 추가
- [x] `Project` 모델: `@@index([workspaceId])` 추가
- [x] `RevisionRequest` 모델: `@@index([projectId, status])` 추가
- 구현 파일: `prisma/schema.prisma`
- 완료 기준: 마이그레이션 성공

### T003 — 개인정보처리방침 + 이용약관 페이지

- [x] `app/privacy/page.tsx` 생성
- [x] `app/terms/page.tsx` 생성
- 완료 기준: `/privacy`, `/terms` 라우트 접근 가능

### T004 — API 입력값 기초 방어

- [x] webhook handler `content` 최대 길이 제한 (10,000자)
- [x] intake/order 공개 폼 honeypot 필드 추가
- 구현 파일: `app/api/webhooks/intake/[workspaceSlug]/route.ts`, intake 폼 컴포넌트
- 완료 기준: 과도하게 긴 content → 400 에러, honeypot 필드 채워지면 → silent 성공 (봇 차단)

## 외부 의존 항목 (인프라 작업)

아래 항목은 외부 서비스 설정이 필요하여 별도 진행한다.

| 항목 | 필요 서비스 | 담당 |
|---|---|---|
| CI/CD + 브랜치 보호 | GitHub Actions | 개발자 직접 |
| Sentry 에러 트래킹 | Sentry.io 계정 | 개발자 직접 |
| 커스텀 도메인 + Resend DNS | 도메인 레지스트라 + Resend | 개발자 직접 |
| Vercel 환경변수 전체 점검 | Vercel 대시보드 | 개발자 직접 |
| 결제/구독 시스템 | Stripe | 별도 spec 작성 필요 |
| 진짜 Rate Limiting | Upstash Redis + @upstash/ratelimit | 별도 spec 작성 필요 |

# 환경변수 설정 가이드

## 목차

- [개요](#개요)
- [초기 설정](#초기-설정)
- [DATABASE_URL — Neon PostgreSQL](#database_url--neon-postgresql)
- [AUTH_SECRET / AUTH_URL — NextAuth v5](#auth_secret--auth_url--nextauth-v5)
- [R2_* — Cloudflare R2 파일 업로드](#r2_--cloudflare-r2-파일-업로드)
- [RESEND_* — 이메일 발송](#resend_--이메일-발송)
- [NEXT_PUBLIC_APP_URL](#next_public_app_url)
- [Vercel 배포 시 설정 방법](#vercel-배포-시-설정-방법)

---

## 개요

프로젝트 루트의 `.env.example`을 복사하여 `.env` 파일을 만든 뒤 각 값을 채운다.

```bash
cp .env.example .env
```

`.env`는 `.gitignore`에 포함되어 있으므로 커밋되지 않는다.

---

## 초기 설정

`.env` 파일을 열고 아래 순서대로 설정한다. 로컬 개발 시 최소 필수 값은 `DATABASE_URL`과 `AUTH_SECRET`이다.

---

## DATABASE_URL — Neon PostgreSQL

**발급처**: [https://neon.tech](https://neon.tech)

1. 가입 후 **New Project** 생성
2. 대시보드 → **Connection Details** → **Connection string** 탭
3. **Pooled connection** 항목의 문자열 복사

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
```

> Neon은 연결 문자열 끝에 `?sslmode=require`가 포함된다. 그대로 사용한다.

설정 후 스키마를 DB에 반영한다:

```bash
npx prisma db push
```

---

## AUTH_SECRET / AUTH_URL — NextAuth v5

**AUTH_SECRET** — 세션 암호화에 사용하는 랜덤 문자열

터미널에서 직접 생성:

```bash
openssl rand -base64 32
```

또는 [https://generate-secret.vercel.app/32](https://generate-secret.vercel.app/32) 에서 생성 후 복사.

**AUTH_URL** — 앱의 기준 URL

| 환경 | 값 |
|---|---|
| 로컬 개발 | `http://localhost:3000` |
| Vercel 배포 후 | `https://your-domain.vercel.app` |

```
AUTH_SECRET="생성된-랜덤-문자열"
AUTH_URL="http://localhost:3000"
```

---

## R2_* — Cloudflare R2 파일 업로드

**발급처**: [https://dash.cloudflare.com](https://dash.cloudflare.com)

### 버킷 생성

1. 좌측 메뉴 **R2 Object Storage** 클릭
2. **Create bucket** → 버킷명 입력 (예: `flowrit-uploads`)
3. 버킷 생성 후 **Settings → Public access → Allow Access** 활성화
   - 활성화 후 표시되는 `*.r2.dev` 주소가 `R2_PUBLIC_URL`

### API 토큰 발급

1. 좌측 R2 메뉴 → **Overview → Manage R2 API tokens → Create API token**
2. **Permissions: Object Read & Write** 선택
3. 생성 직후 화면에서 아래 값을 복사 (Secret Access Key는 이 시점에만 확인 가능)

| 변수 | 위치 |
|---|---|
| `R2_ACCOUNT_ID` | 같은 페이지 우측 하단 "Account ID" |
| `R2_ACCESS_KEY_ID` | 토큰 생성 직후 화면 |
| `R2_SECRET_ACCESS_KEY` | 토큰 생성 직후 화면 |

```
R2_ACCOUNT_ID="your-cloudflare-account-id"
R2_ACCESS_KEY_ID="your-r2-access-key-id"
R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
R2_BUCKET_NAME="flowrit-uploads"
R2_PUBLIC_URL="https://your-bucket.r2.dev"
```

---

## RESEND_* — 이메일 발송

팀원 초대 이메일에 사용한다.

**발급처**: [https://resend.com](https://resend.com)

1. 가입 → **API Keys → Create API Key** → 이름 입력
2. 생성된 키 즉시 복사 (1회만 표시)

**RESEND_FROM_EMAIL**:
- 무료 플랜: `onboarding@resend.dev` 사용 가능 (도메인 인증 불필요, 테스트용)
- 실제 도메인 사용 시: Resend → Domains → Add Domain → DNS 레코드 등록 후 사용

```
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxx"
RESEND_FROM_EMAIL="onboarding@resend.dev"
```

---

## NEXT_PUBLIC_APP_URL

고객 공유 링크(`/p/[token]`)와 의뢰 접수 URL(`/intake/[slug]`) 생성에 사용한다.

| 환경 | 값 |
|---|---|
| 로컬 개발 | `http://localhost:3000` |
| Vercel 배포 후 | Vercel → 프로젝트 → Settings → Domains에서 확인한 URL |

```
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Vercel 배포 시 설정 방법

1. Vercel 대시보드 → 프로젝트 선택
2. **Settings → Environment Variables**
3. 위 변수들을 하나씩 추가
4. `AUTH_URL`과 `NEXT_PUBLIC_APP_URL`은 배포 도메인으로 변경

Neon과 Vercel을 연동하면 `DATABASE_URL`이 자동으로 주입된다:  
Vercel 대시보드 → **Storage → Connect Database → Neon** 선택

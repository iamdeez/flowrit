# Project Context

> 이 문서는 프로젝트의 **현재 상태를 묘사**하는 살아있는 참조 문서다.
> 새로운 spec 설계 전 반드시 읽어 프로젝트 구조·흐름·용어를 숙지한다.
>
> - **갱신 시점**: spec 구현·검증 완료 후, `CHANGES.md` 작성과 같은 시점에 갱신한다.
> - **작성 원칙**: 현재 코드베이스의 사실만 기록한다. 미래 계획이나 설계 의도는 spec.md에 작성한다.
> - **constitution.md와의 구분**: constitution은 "어떻게 만들어야 하는가(원칙)"이고,
>   이 문서는 "현재 무엇이 존재하는가(사실)"다.
> - **기준 커밋**: 이 문서의 내용은 §7 갱신 이력의 마지막 commit 기준이다.

---

## 1. 프로젝트 개요

- **프로젝트명**: Flowrit
- **목적**: 프리랜서 디자이너·개발자를 위한 AI Workflow OS SaaS — 고객 관리, 프로젝트 진행, 수정 요청, 납품, 팀 협업을 한 곳에서 처리한다.
- **현재 버전**: v0.5.0
- **주요 기술 스택**: Next.js 16.2.9 (App Router), React 19, TypeScript, NextAuth v5 beta (Credentials + JWT), Prisma 7 + PostgreSQL (Neon), Tailwind CSS v4, Vitest 4

---

## 2. 프로젝트 구조

### 디렉토리 레이아웃

```
flowrit/
├── app/
│   ├── (auth)/          ← 로그인·회원가입 페이지 (미인증)
│   ├── (dashboard)/     ← 인증 필요 대시보드 라우트 그룹
│   │   ├── analytics/   ← 통계 (OWNER/ADMIN 전용)
│   │   ├── customers/   ← 고객 관리 (OWNER/ADMIN 전용)
│   │   ├── dashboard/   ← 메인 대시보드
│   │   ├── messages/    ← 메시지 템플릿 (OWNER/ADMIN 전용)
│   │   ├── projects/    ← 프로젝트 관리
│   │   ├── revisions/   ← 수정 요청 목록
│   │   ├── settings/    ← 설정 (OWNER/ADMIN 전용)
│   │   ├── team/        ← 팀 관리 (OWNER/ADMIN 전용)
│   │   └── templates/   ← 워크플로우 템플릿 (OWNER/ADMIN 전용)
│   ├── api/
│   │   ├── auth/[...nextauth]/  ← NextAuth 핸들러
│   │   ├── cron/deadline-reminder/  ← Vercel Cron (매시간)
│   │   ├── export/      ← 데이터 내보내기
│   │   └── upload/      ← Presigned URL 발급
│   ├── intake/[workspaceSlug]/  ← 고객 의뢰 접수 공개 페이지
│   ├── invite/[token]/          ← 팀 초대 수락 페이지
│   └── p/[token]/               ← 고객용 공개 프로젝트 페이지
├── lib/
│   ├── actions/         ← Server Actions (도메인별 파일)
│   ├── auth.ts          ← NextAuth 설정 (JWT 세션)
│   ├── db.ts            ← Prisma 클라이언트 싱글턴
│   ├── email.ts         ← Resend 이메일 발송 함수
│   ├── notifications.ts ← 인앱·이메일 알림 통합 함수
│   ├── storage.ts       ← Cloudflare R2 presigned URL
│   └── project-utils.ts ← getCurrentStage / isProjectDone
├── components/          ← 공유 UI 컴포넌트
├── hooks/               ← 클라이언트 커스텀 훅
├── prisma/schema.prisma ← 데이터 모델
├── tests/               ← Vitest 단위 테스트
├── proxy.ts             ← 라우트 보호 (Next.js 16 middleware 역할)
└── vercel.json          ← Vercel Cron 스케줄 설정
```

### 레이어 구조

```
클라이언트 컴포넌트 (use client)
      ↓  form action / Server Action 직접 호출
Server Action (lib/actions/*.ts)  ←  인증 검증 + DB 접근
      ↓
Prisma Client (lib/db.ts)  →  PostgreSQL (Neon)
```

### 핵심 모듈 목록

| 모듈 | 위치 | 역할 |
|---|---|---|
| `proxy.ts` | 루트 | 라우트 보호 + MEMBER 역할 redirect |
| `lib/auth.ts` | lib | NextAuth 설정, JWT 토큰에 id·workspaceId·role 저장 |
| `lib/db.ts` | lib | Prisma 클라이언트 싱글턴 (globalThis 패턴) |
| `lib/notifications.ts` | lib | 인앱 알림 생성 + 이메일 발송 통합 (`sendNotification`) |
| `lib/storage.ts` | lib | Cloudflare R2 presigned URL 발급, `MAX_UPLOAD_SIZE` 정의 |
| `lib/email.ts` | lib | Resend 기반 이메일 템플릿 함수 |
| `lib/project-utils.ts` | lib | `isProjectDone` — 완료 단계 판별 유틸 |
| `lib/actions/revisionComment.ts` | lib/actions | 작업자용 수정 요청 댓글 조회·작성 Server Actions (workspaceId scope) |
| `lib/actions/publicRevisionComment.ts` | lib/actions | 고객 포털용 수정 요청 댓글 작성 Server Action (token 검증, 인앱 알림) |
| `components/sidebar-nav.tsx` | components | RBAC 기반 메뉴 필터링 |
| `app/api/cron/deadline-reminder/` | app/api | Vercel Cron — 마감 24시간 전 알림 발송 |
| `app/api/upload/route.ts` | app/api | presigned URL 발급 엔드포인트 (10MB 제한 검증) |

---

## 3. 이벤트 및 데이터 흐름

### 3.1 주요 처리 흐름

**프로젝트 생성 흐름**
```
사용자 → /projects/new 폼 제출
      → Server Action: createProject (lib/actions/project.ts)
      → Prisma: Project 생성 + WorkflowTemplate stages 복사
      → revalidatePath('/projects')
      → redirect('/projects')
```

**고객 포털 수정 요청 흐름**
```
고객 → /p/[token] 공개 페이지
      → RevisionRequest 제출 (source: 'CUSTOMER_PORTAL')
      → sendNotification (type: REVISION_SUBMITTED)
      → 인앱 알림 생성 + OWNER/ADMIN 이메일 발송
```

**파일 업로드 흐름**
```
클라이언트 → POST /api/upload (filename, contentType, size)
           ← { presignedUrl, key, publicUrl }
           → PUT presignedUrl (직접 R2로 업로드)
           → publicUrl을 DB에 저장
```

### 3.2 이벤트 흐름 (Notification)

| 이벤트 타입 | 발생 조건 | 수신 대상 |
|---|---|---|
| `NEW_INQUIRY` | intake 폼 제출 | OWNER 전체 |
| `REVISION_SUBMITTED` | 고객 포털에서 수정 요청 제출 | 프로젝트 assignee 또는 OWNER |
| `REVISION_COMMENT` | 고객 포털에서 수정 요청 댓글 작성 | 프로젝트 assignee 또는 OWNER |
| `STAGE_CHANGED` | 프로젝트 스테이지 변경 | [TBD — 코드 추적 필요] |
| `DEADLINE_SOON` | Vercel Cron (매시간) — 마감 23~25시간 전 | 프로젝트 assignee 또는 OWNER 전체 |

알림은 `lib/notifications.ts`의 `sendNotification()`으로 단일 진입점 처리. 사용자별 `notificationSettings` JSON 필드로 타입별 ON/OFF 제어.

### 3.3 상태 흐름 (RevisionRequest)

```
OPEN → IN_PROGRESS → DONE
```
- OPEN: 수정 요청 접수 (기본값)
- IN_PROGRESS: 작업자가 처리 시작
- DONE: 완료 처리

priority: HIGH / MEDIUM(기본) / LOW
source: MANUAL(직접 등록) / CUSTOMER_PORTAL(고객 접수)

### 상태 흐름 (Asset)

```
PREPARING → SHARED → EXPIRED
```
- PREPARING: 업로드 완료, 미공유 상태
- SHARED: 고객에게 공유됨
- EXPIRED: 만료됨 (`expiredAt` 필드로 관리)

type: DRIVE / GALLERY / VIDEO / DOCUMENT / OTHER

### 상태 흐름 (WorkflowStage)

프로젝트 내 stages 배열 + `currentStageId`로 현재 단계 관리.
`isProjectDone()`은 현재 단계의 `internalName` 또는 `customerName`이 '완료'인지로 판별.

### 상태 흐름 (WorkspaceInvite)

```
PENDING → (수락) 멤버 가입 후 invite 레코드는 token 무효화
```
- PENDING: 초대 이메일 발송 후 대기
- 수락: `/invite/[token]` 페이지에서 WorkspaceMember 생성

### 상태 흐름 (Inquiry)

```
PENDING → (대시보드에서 처리) → projectId 연결
```
- PENDING: 고객 의뢰 접수 기본 상태
- projectId가 연결되면 실제 프로젝트로 전환됨

### 3.4 외부 시스템 연동

| 시스템 | 연동 방식 | 담당 모듈 |
|---|---|---|
| PostgreSQL (Neon) | Prisma + PrismaPg adapter | `lib/db.ts` |
| Cloudflare R2 | AWS SDK S3 호환 + presigned URL | `lib/storage.ts` |
| Resend | HTTP API (이메일 발송) | `lib/email.ts` |
| Vercel Cron | GET `/api/cron/deadline-reminder` (매시간) | `app/api/cron/` |

---

## 4. 도메인 모델

### 핵심 엔티티 관계

```
Workspace
  ├── WorkspaceMember (User N:M, role: OWNER/ADMIN/MEMBER)
  ├── Customer
  │     └── Project
  │           ├── WorkflowStage (순서 있는 단계 목록, currentStageId로 현재 단계 참조)
  │           ├── RevisionRequest
  │           │     └── RevisionComment (2단계 스레드: 루트 댓글 + 답글)
  │           ├── Asset
  │           ├── TimelineEvent
  │           └── PublicProjectPage (token 기반 고객 공개 페이지)
  ├── WorkflowTemplate
  │     └── TemplateStage
  ├── MessageTemplate
  ├── Inquiry (고객 의뢰 접수, 처리 후 Project 연결)
  ├── WorkspaceInvite
  └── Notification
```

- `prisma/schema.prisma` → 모든 모델 정의
- `app/generated/prisma/` → Prisma 클라이언트 생성 출력 경로 (커밋 대상 아님)

---

## 5. 도메인 용어 사전 (Glossary)

| 용어 | 정의 | 사용 금지 동의어 |
|---|---|---|
| 워크스페이스 (Workspace) | 프리랜서 팀의 독립 조직 단위. 모든 데이터는 워크스페이스 범위 내 격리. | 조직, 팀 |
| 프로젝트 (Project) | 고객과 진행하는 작업 단위. 스테이지·수정 요청·납품물로 구성. | 일감, 건 |
| 스테이지 (WorkflowStage) | 프로젝트 진행 단계. 내부명(internalName)과 고객 표시명(customerName)이 분리됨. | 단계, 상태 |
| 수정 요청 (RevisionRequest) | 클라이언트 또는 작업자가 등록하는 수정 사항. MANUAL 또는 CUSTOMER_PORTAL 접수. | 피드백, 수정 사항 |
| 납품물 (Asset) | 프로젝트에 첨부하는 파일·링크. PREPARING → SHARED → EXPIRED 상태로 관리. | 파일, 결과물 |
| 고객 포털 (PublicProjectPage) | token 기반 비인증 고객용 공개 페이지. `/p/[token]` 경로. | 클라이언트 페이지 |
| 의뢰 접수 (Inquiry) | 공개 intake 폼을 통한 신규 고객 의뢰. 처리 후 Project로 전환 가능. | 문의, 견적 요청 |
| 역할 (WorkspaceRole) | OWNER / ADMIN / MEMBER 세 등급. `lib/types.ts`에 타입 정의. | 권한, 등급 |
| 인앱 알림 (Notification) | DB에 저장되는 알림. `isRead` 필드로 읽음 관리. 벨 아이콘으로 표시. | 푸시, 메시지 |
| 수정 요청 댓글 (RevisionComment) | 수정 요청에 달리는 2단계 댓글 스레드. 작업자(WORKER)와 고객(CLIENT)이 작성 가능. | 댓글, 답글 |

---

## 6. 알려진 제약 및 기술 부채

| 항목 | 내용 | 영향 범위 | 관련 spec |
|---|---|---|---|
| Prisma 생성 경로 | `generator output`이 `app/generated/prisma`로 설정됨. 일반적 `node_modules/@prisma/client` 경로와 다름. import 시 `@/app/generated/prisma/client` 사용 필요. | 모든 Prisma import | — |
| WorkspaceRole enum 미정의 | `schema.prisma`의 role 필드가 `String`으로 선언됨 (Prisma enum 미사용). `lib/types.ts`에 TypeScript 타입만 존재. 잘못된 문자열 저장을 DB 레벨에서 막지 못함. | WorkspaceMember, WorkspaceInvite | — |
| JWT 세션 단일 워크스페이스 | JWT에 workspaceId 하나만 저장. 복수 워크스페이스 멤버인 경우 재로그인으로만 전환 가능. | 인증, 워크스페이스 전환 UX | — |
| 테스트 Prisma mock | `tests/setup.ts`에 next/cache·next/navigation·next-auth mock만 설정. Prisma는 각 테스트 파일에서 개별 mock. 일관성 주의 필요. | tests/ | — |

---

## 7. 갱신 이력

> **활용법**: `git diff <commit> -- app/ lib/` 로 해당 시점 이후 변경된 코드를 확인할 수 있다.

| 날짜 | commit | 갱신 내용 | 관련 spec |
|---|---|---|---|
| 2026-06-22 | — | 최초 작성 | — |

# Plan: mvp-core

> Branch: 001-mvp-core | Date: 2026-06-21 | Spec: [spec.md](./spec.md)

## 목차

- [사전 검증 (Constitution Gates)](#사전-검증-constitution-gates)
- [기술 컨텍스트](#기술-컨텍스트)
- [사전 영향도 분석 결과](#사전-영향도-분석-결과)
- [핵심 설계](#핵심-설계)
- [인터페이스 계약](#인터페이스-계약)
- [데이터 모델](#데이터-모델)
- [테스트 전략](#테스트-전략)
- [기타 고려사항](#기타-고려사항)

---

## 사전 검증 (Constitution Gates)

> constitution.md 미존재 → 기본 4개 조항 사용

- [x] **성능 원칙**: 이 구현이 처리 속도를 저하시키는 요인을 포함하지 않는가?
  - 서버 사이드 렌더링(Next.js App Router)과 Prisma ORM 쿼리 최적화로 대응한다.
  - N+1 쿼리를 방지하기 위해 Prisma `include` 옵션으로 관계를 사전 로드한다.
- [x] **호환성 원칙**: 인터페이스 변경이 기존 통합 코드에 런타임 에러를 유발하지 않는가?
  - 신규 프로젝트이므로 기존 통합 코드 없음. 해당 없음.
- [x] **테스트 원칙**: 모든 FR-XXX에 대한 검증 시나리오가 spec.md에 정의되어 있는가?
  - SC-001~SC-013이 모든 FR 항목을 커버한다.
- [x] **스펙 범위 원칙**: 이 구현이 spec.md 범위를 벗어나는 변경을 포함하지 않는가?
  - AI 기능, 결제, 소셜 로그인은 범위 외로 명시. 구현에서 제외한다.

---

## 기술 컨텍스트

| 항목 | 선택 | 근거 |
|---|---|---|
| 프레임워크 | Next.js 15 (App Router), TypeScript | 사업계획서 명시, gohoc 검증 |
| 인증 | NextAuth.js v5 (Credentials Provider) | Next.js 공식 통합, Prisma Adapter |
| ORM | Prisma | TypeScript 타입 안정성, 마이그레이션 내장 |
| 데이터베이스 | PostgreSQL (Neon) | 사업계획서 명시, Vercel 통합 최적 |
| 파일 저장소 | Cloudflare R2 (presigned URL) | egress 무료, S3 호환 API |
| 이메일 발송 | Resend | 간단한 API, 무료 플랜 3,000건/월 |
| UI 라이브러리 | shadcn/ui + Tailwind CSS | 빠른 프로토타이핑, 커스터마이즈 용이 |
| 배포 | Vercel (앱) + Neon (DB) | 자동 미리보기 배포, PR 기반 워크플로 |
| 테스트 | Vitest + Testing Library | Next.js 15 호환, 빠른 실행 |

---

## 사전 영향도 분석 결과

신규 프로젝트이므로 모든 파일을 새로 생성한다.

### 영향 파일 목록

| 파일·폴더 | 변경 유형 | 내용 요약 |
|---|---|---|
| `prisma/schema.prisma` | 신규 | 전체 DB 스키마 (10개 모델) |
| `lib/auth.ts` | 신규 | NextAuth 설정, bcrypt 비밀번호 처리 |
| `lib/db.ts` | 신규 | Prisma Client 싱글턴 |
| `lib/storage.ts` | 신규 | R2 presigned URL 생성 유틸 |
| `lib/email.ts` | 신규 | Resend 이메일 발송 유틸 |
| `app/(auth)/` | 신규 | 로그인·회원가입 페이지 |
| `app/(dashboard)/` | 신규 | 인증 필요 페이지 (대시보드·프로젝트·고객) |
| `app/p/[token]/` | 신규 | 고객용 공개 진행상황 페이지 (비인증) |
| `app/intake/[workspaceSlug]/` | 신규 | 신규 의뢰 접수 페이지 (비인증) |
| `app/api/` | 신규 | API Route Handlers (파일 업로드 등) |

---

## 핵심 설계

### 아키텍처 개요

```
Client (Browser)
    │
    ├── 인증 페이지  (/login, /register)
    ├── 대시보드     (/dashboard)          → Server Components + Client Actions
    ├── 고객 관리   (/customers/*)         → Server Components + Client Actions
    ├── 프로젝트    (/projects/*)          → Server Components + Client Actions
    ├── 공개 페이지 (/p/[token])           → Server Components (비인증)
    └── 접수 폼     (/intake/[slug])       → Client Component (비인증)
         │
    Next.js Server (App Router)
         │
    ├── NextAuth v5 Session
    ├── Prisma ORM  ──→  PostgreSQL (Neon)
    └── Cloudflare R2 (파일 업로드)
```

### 라우팅 구조

```
app/
├── (auth)/
│   ├── login/page.tsx              # 로그인
│   └── register/page.tsx           # 회원가입
├── (dashboard)/
│   ├── layout.tsx                  # 인증 가드 레이아웃
│   ├── dashboard/page.tsx          # 오늘 처리할 작업 + 신규 접수
│   ├── customers/
│   │   ├── page.tsx                # 고객 목록
│   │   ├── [id]/page.tsx           # 고객 상세 + 프로젝트 목록
│   │   └── new/page.tsx            # 고객 등록
│   ├── projects/
│   │   ├── page.tsx                # 프로젝트 목록
│   │   └── [id]/page.tsx           # 프로젝트 상세
│   ├── revisions/page.tsx          # 수정 요청 전체 목록
│   ├── templates/page.tsx          # 워크플로우 템플릿 관리
│   ├── messages/page.tsx           # 메시지 템플릿 관리
│   ├── team/page.tsx               # 팀원 관리
│   └── settings/page.tsx           # 워크스페이스 설정
├── p/[token]/
│   └── page.tsx                    # 고객용 공개 진행상황 페이지
├── intake/[workspaceSlug]/
│   └── page.tsx                    # 신규 의뢰 접수 폼
├── invite/[token]/
│   └── page.tsx                    # 팀원 초대 수락
└── api/
    ├── auth/[...nextauth]/route.ts  # NextAuth 핸들러
    └── upload/route.ts             # R2 presigned URL 발급
```

### Server Actions 패턴

모든 데이터 변경은 Server Actions로 처리한다. 예시:

```typescript
// lib/actions/project.ts
'use server'

export async function createProject(data: CreateProjectInput) {
  const session = await getServerSession()
  if (!session) throw new Error('Unauthorized')

  return prisma.project.create({
    data: {
      ...data,
      workspaceId: session.user.workspaceId,
    },
  })
}
```

### 공개 페이지 토큰 검증

```typescript
// app/p/[token]/page.tsx
export default async function PublicProjectPage({ params }: { params: { token: string } }) {
  const page = await prisma.publicProjectPage.findUnique({
    where: { token: params.token, isActive: true },
    include: {
      project: {
        include: {
          currentStage: true,
          assets: { where: { status: 'SHARED' } },
          revisionRequests: true,
        },
      },
    },
  })

  if (!page) notFound()
  return <PublicProjectView project={page.project} />
}
```

### 파일 업로드 흐름 (R2 Presigned)

```
1. Client → POST /api/upload { filename, contentType, size }
2. Server: size > 10MB → 400 Error
3. Server → R2: presignedPutUrl 생성 (유효시간 5분)
4. Server → Client: { presignedUrl, key }
5. Client → R2: PUT {presignedUrl} (직접 업로드)
6. Client → Server Action: createAsset({ url: R2_PUBLIC_URL + key, ... })
```

---

## 인터페이스 계약

### 공개 API (비인증)

| 엔드포인트 | 방식 | 설명 |
|---|---|---|
| `GET /p/[token]` | Page Route | 고객용 공개 진행상황 페이지 |
| `POST /p/[token]/revision` | Server Action | 고객 수정 요청 제출 |
| `GET /intake/[workspaceSlug]` | Page Route | 신규 의뢰 접수 폼 |
| `POST /intake/[workspaceSlug]` | Server Action | 신규 의뢰 제출 |
| `GET /invite/[token]` | Page Route | 초대 수락 페이지 |
| `POST /api/upload` | API Route | R2 presigned URL 발급 |

### 인증 필요 Server Actions

| Action | 입력 | 설명 |
|---|---|---|
| `createCustomer` | name, contact, memo | 고객 생성 |
| `createProject` | customerId, title, dueDate, templateId, assigneeId | 프로젝트 생성 |
| `updateProjectStage` | projectId, stageId | 단계 변경 + 타임라인 기록 |
| `createRevisionRequest` | projectId, content, priority, assigneeId | 수정 요청 등록 |
| `updateRevisionStatus` | revisionId, status | 수정 요청 상태 변경 |
| `createAsset` | projectId, name, url, type, version, expiredAt | 에셋 등록 |
| `updateAssetStatus` | assetId, status | 에셋 상태 변경 |
| `createPublicPage` | projectId | 공유 링크 생성 (UUID v4 토큰) |
| `togglePublicPage` | pageId, isActive | 공유 링크 활성·비활성 |
| `convertInquiryToProject` | inquiryId, customerId | 의뢰 → 프로젝트 전환 |
| `inviteTeamMember` | email, role | 팀원 초대 (이메일 발송) |
| `copyMessageTemplate` | templateId, projectId | 메시지 변수 치환 결과 반환 |

---

## 데이터 모델

```prisma
// prisma/schema.prisma

model User {
  id            String            @id @default(cuid())
  email         String            @unique
  password      String            // bcrypt 해시
  name          String
  createdAt     DateTime          @default(now())
  memberships   WorkspaceMember[]
  sessions      Session[]
}

model Workspace {
  id            String            @id @default(cuid())
  name          String
  slug          String            @unique  // 접수 폼 URL에 사용
  plan          String            @default("beta")
  createdAt     DateTime          @default(now())
  members       WorkspaceMember[]
  customers     Customer[]
  projects      Project[]
  templates     WorkflowTemplate[]
  inquiries     Inquiry[]
  messageTemplates MessageTemplate[]
  invites       WorkspaceInvite[]
}

model WorkspaceMember {
  id            String    @id @default(cuid())
  workspaceId   String
  userId        String
  role          String    @default("MEMBER")  // OWNER | MEMBER
  createdAt     DateTime  @default(now())
  workspace     Workspace @relation(fields: [workspaceId], references: [id])
  user          User      @relation(fields: [userId], references: [id])
  @@unique([workspaceId, userId])
}

model Customer {
  id            String    @id @default(cuid())
  workspaceId   String
  name          String
  contact       String?
  memo          String?
  createdAt     DateTime  @default(now())
  workspace     Workspace @relation(fields: [workspaceId], references: [id])
  projects      Project[]
}

model Project {
  id              String          @id @default(cuid())
  workspaceId     String
  customerId      String
  title           String
  dueDate         DateTime?
  assigneeId      String?
  currentStageId  String?
  createdAt       DateTime        @default(now())
  workspace       Workspace       @relation(fields: [workspaceId], references: [id])
  customer        Customer        @relation(fields: [customerId], references: [id])
  stages          WorkflowStage[]
  revisions       RevisionRequest[]
  assets          Asset[]
  events          TimelineEvent[]
  publicPage      PublicProjectPage?
}

model WorkflowTemplate {
  id            String          @id @default(cuid())
  workspaceId   String
  name          String
  industry      String?
  isDefault     Boolean         @default(false)
  createdAt     DateTime        @default(now())
  workspace     Workspace       @relation(fields: [workspaceId], references: [id])
  stages        TemplateStage[]
}

model TemplateStage {
  id            String           @id @default(cuid())
  templateId    String
  internalName  String           // 사업자용 표시명
  customerName  String           // 고객용 표시명
  order         Int
  template      WorkflowTemplate @relation(fields: [templateId], references: [id])
}

model WorkflowStage {
  id            String    @id @default(cuid())
  projectId     String
  internalName  String
  customerName  String
  order         Int
  completedAt   DateTime?
  project       Project   @relation(fields: [projectId], references: [id])
}

model RevisionRequest {
  id            String    @id @default(cuid())
  projectId     String
  content       String
  priority      String    @default("MEDIUM")  // HIGH | MEDIUM | LOW
  status        String    @default("OPEN")    // OPEN | IN_PROGRESS | DONE
  assigneeId    String?
  source        String    @default("MANUAL")  // MANUAL | CUSTOMER_PORTAL
  createdAt     DateTime  @default(now())
  project       Project   @relation(fields: [projectId], references: [id])
}

model Asset {
  id            String    @id @default(cuid())
  projectId     String
  name          String
  url           String
  type          String    @default("OTHER")  // ORIGIN | REFERENCE | DELIVERY | OTHER
  version       String?
  status        String    @default("PREPARING")  // PREPARING | SHARED | EXPIRED
  expiredAt     DateTime?
  createdAt     DateTime  @default(now())
  project       Project   @relation(fields: [projectId], references: [id])
}

model PublicProjectPage {
  id            String    @id @default(cuid())
  projectId     String    @unique
  token         String    @unique @default(uuid())
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  project       Project   @relation(fields: [projectId], references: [id])
}

model Inquiry {
  id            String    @id @default(cuid())
  workspaceId   String
  name          String
  contact       String?
  content       String
  fileUrls      Json      @default("[]")  // R2 URL 배열
  status        String    @default("PENDING")  // PENDING | CONVERTED | REJECTED
  projectId     String?
  createdAt     DateTime  @default(now())
  workspace     Workspace @relation(fields: [workspaceId], references: [id])
}

model MessageTemplate {
  id            String    @id @default(cuid())
  workspaceId   String
  name          String
  type          String    // intake_confirm | work_start | delivery | revision_confirm | custom
  content       String    // {고객명}, {단계}, {마감일}, {공유링크} 변수 사용 가능
  createdAt     DateTime  @default(now())
  workspace     Workspace @relation(fields: [workspaceId], references: [id])
}

model TimelineEvent {
  id            String    @id @default(cuid())
  projectId     String
  title         String
  eventType     String    // STAGE_CHANGE | REVISION_ADDED | ASSET_ADDED | NOTE
  metadata      Json?
  createdAt     DateTime  @default(now())
  project       Project   @relation(fields: [projectId], references: [id])
}

model WorkspaceInvite {
  id            String    @id @default(cuid())
  workspaceId   String
  email         String
  token         String    @unique @default(uuid())
  role          String    @default("MEMBER")
  status        String    @default("PENDING")  // PENDING | ACCEPTED | EXPIRED
  createdAt     DateTime  @default(now())
  workspace     Workspace @relation(fields: [workspaceId], references: [id])
}
```

---

## 테스트 전략

| SC 식별자 | 테스트 유형 | 시나리오 요약 | 입력 | 기대 결과 |
|---|---|---|---|---|
| SC-001 | 통합 | 회원가입 → 로그인 → 대시보드 이동 | 유효한 이메일·비밀번호 | 세션 생성, Workspace 자동 생성 |
| SC-002 | 통합 | 팀원 초대 → 수락 → 워크스페이스 접근 | 초대 이메일, 토큰 | 팀원이 프로젝트 목록 열람 가능 |
| SC-003 | 단위 | 고객 CRUD + 검색 | 고객명, 연락처 | 검색 결과에서 등록된 고객 반환 |
| SC-004 | 통합 | 프로젝트 생성 → 단계 적용 → 단계 변경 | 프로젝트 정보, 템플릿 ID | 타임라인에 STAGE_CHANGE 이벤트 기록 |
| SC-005 | 단위 | 워크플로우 템플릿 생성 및 단계 설정 | 내부명, 고객명, 순서 | 저장된 단계가 올바른 순서로 조회됨 |
| SC-006 | 단위 | 수정 요청 등록 → 상태 변경 | 내용, 우선순위 | OPEN → IN_PROGRESS → DONE 전이 성공 |
| SC-007 | 통합 | 고객 수정 요청 제출 → 목록 반영 | 공개 토큰, 요청 내용 | RevisionRequest.source=CUSTOMER_PORTAL로 저장 |
| SC-008 | 단위 | 에셋 등록 → 상태 변경 → 고객 페이지 노출 | 외부 URL, 타입 | status=SHARED 에셋만 공개 페이지에 포함 |
| SC-009 | 통합 | 공유 링크 생성 → 비인증 접근 → 데이터 확인 | UUID 토큰 | 단계·에셋·수정요청 정상 노출, 내부 메모 미노출 |
| SC-010 | 통합 | 고객 재수정 제출 → 수정 요청 자동 등록 | 공개 토큰, 첨부 파일 | 프로젝트에 CUSTOMER_PORTAL 수정 요청 생성 |
| SC-011 | 통합 | 신규 의뢰 접수 → 대시보드 신규 접수 목록 | 워크스페이스 슬러그 | Inquiry 생성, 대시보드에서 확인 후 프로젝트 전환 가능 |
| SC-012 | 단위 | 메시지 템플릿 변수 치환 | 템플릿 내용, 프로젝트 ID | {고객명}·{단계}·{공유링크} 변수가 실제 값으로 대체됨 |
| SC-013 | 단위 | 대시보드 오늘 처리 목록 필터링 | 마감일 2일 이내 프로젝트, 미완료 수정 요청 | 해당 항목만 표시 |

---

## 기타 고려사항

### N+1 쿼리 방지

프로젝트 목록 조회 시 관련 데이터를 `include`로 함께 로드한다:

```typescript
prisma.project.findMany({
  where: { workspaceId },
  include: {
    customer: { select: { name: true } },
    revisions: { where: { status: { not: 'DONE' } }, select: { id: true } },
  },
  orderBy: { dueDate: 'asc' },
})
```

### 워크스페이스 격리

모든 DB 쿼리에 `workspaceId` 필터를 강제한다. Server Action 내에서 세션의 `workspaceId`와 요청 리소스의 `workspaceId`를 대조하여 다른 워크스페이스 데이터 접근을 차단한다.

### 기본 워크플로우 템플릿 시딩

최초 Workspace 생성 시 사진·웨딩 기본 템플릿을 자동으로 생성한다 (Prisma seed 또는 애플리케이션 레벨 초기화).

### 메시지 변수 치환

```typescript
function resolveTemplate(content: string, context: MessageContext): string {
  return content
    .replace(/{고객명}/g, context.customerName)
    .replace(/{단계}/g, context.currentStage)
    .replace(/{마감일}/g, context.dueDate ?? '미정')
    .replace(/{공유링크}/g, context.shareUrl ?? '(공유 링크 없음)')
}
```

### 보안 고려사항

- 공개 엔드포인트(`/p/[token]`, `/intake/[slug]`)는 인증 미들웨어에서 제외
- `POST /p/[token]/revision`은 토큰 유효성 검사 후 RevisionRequest 생성
- 파일 업로드 API는 인증 사용자만 접근 (의뢰 접수 폼 첨부는 예외 - 별도 처리)
- R2 presigned URL은 5분 만료로 설정

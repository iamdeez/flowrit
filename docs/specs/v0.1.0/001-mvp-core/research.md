# Research: mvp-core

> Branch: 001-mvp-core | Date: 2026-06-21 | Plan: [plan.md](./plan.md)

## 목차

- [기존 코드베이스 분석](#기존-코드베이스-분석)
- [기술 선택 조사](#기술-선택-조사)
- [데이터 모델 설계 근거](#데이터-모델-설계-근거)
- [엣지 케이스 및 한계](#엣지-케이스-및-한계)

---

## 기존 코드베이스 분석

신규 프로젝트이므로 기존 Flowrit 코드베이스는 없다. 아래 두 레포는 도메인 지식 및 검증된 업무 흐름 분석 목적으로 참조한다.

상세 분석: `docs/mvp/gohoc_레포_분석.md`, `docs/mvp/ourwedding_레포_분석.md`

### gohoc (Next.js 15 고객 포털)

**MVP 설계에 반영할 검증된 흐름:**

- 신규 의뢰 접수: S3 presigned upload, 원본·참고 파일 타입 구분, 주문번호 생성
- 재수정 접수: 기존 주문에 연결, 파일 + 요청사항 동시 제출
- 고객 접수 내역: 진행상황 + 결과물 다운로드를 한 화면에 표시
- 타임라인 이벤트: 접수·상태 변경·납품 이력 기록

**도메인 모델 매핑:**

| gohoc 개념 | Flowrit 모델 |
|---|---|
| Order | Project |
| WorkSubmission | Inquiry (접수) 또는 Asset 묶음 |
| Comment | RevisionRequest.content |
| Timeline | TimelineEvent |
| File (S3) | Asset(type=ORIGIN/REFERENCE) |

### ourwedding (React + Firebase 운영 관리 시스템)

**MVP 설계에 반영할 검증된 흐름:**

- 상태별 작업 큐: 주문확인, 신규, 재수정, 작업자현황, 파일전송 — 실제 운영 메뉴로 검증
- 담당자 배정 + 작업량 표시: 복잡한 권한 전에 배정 기능이 먼저 가치를 가짐
- 내부 상태 ↔ 고객 표시 상태 분리: `작업자현황` → 고객에게는 `보정 작업 중`으로 표시
- 파일 에셋 타입별 구분: 원본/참고/선작업/1차보정/재수정/전송본이 별도 상태

**사진·웨딩 업종 실제 상태값 (기본 템플릿 설계 근거):**

| 내부 상태 | 고객 표시명 (제안) |
|---|---|
| 신규 접수 | 의뢰 접수됨 |
| 주문 확인 | 검토 중 |
| 원본·자료 확인 | 준비 중 |
| 작업자 배정 | 준비 중 |
| 작업 진행 중 | 작업 진행 중 |
| 1차 결과 업로드 | 1차 결과 전달 완료 |
| 고객 확인 대기 | 확인 요청 |
| 재수정 접수 | 수정 작업 중 |
| 최종 납품 | 납품 완료 |
| 완료 | 완료 |

### 영향 파일 목록

신규 프로젝트이므로 모든 파일을 새로 생성한다.

| 파일·폴더 | 유형 | 역할 |
|---|---|---|
| `prisma/schema.prisma` | 신규 | 전체 DB 스키마 |
| `app/` | 신규 | Next.js App Router 페이지 트리 |
| `app/api/` | 신규 | Server Actions 및 API Route Handlers |
| `lib/db/` | 신규 | Prisma Client 인스턴스, 쿼리 함수 |
| `lib/auth/` | 신규 | NextAuth 설정, 세션 유틸 |
| `lib/storage/` | 신규 | R2/S3 presigned URL 생성 유틸 |
| `components/` | 신규 | 공유 UI 컴포넌트 |

---

## 기술 선택 조사

### 프레임워크: Next.js 15 (App Router, TypeScript)

**선택 근거:**
- 사업계획서에 명시된 기술 스택
- gohoc 레포가 Next.js 15로 이미 검증됨
- App Router + Server Actions으로 단일 앱 풀스택 구성 → 초기 배포 단순화
- Vercel 배포와 최적 통합

**아키텍처 결정: Next.js 단일 앱 (Server Actions + API Routes)**
- 별도 Node.js 백엔드 없음 → 운영 부담 최소화
- 필요 시 백엔드 분리 가능한 구조로 `lib/` 레이어 설계

### 인증: NextAuth.js v5 (Auth.js)

**선택 근거:**
- Next.js App Router 공식 통합
- Credentials Provider로 이메일·비밀번호 지원
- Prisma Adapter로 DB 세션 관리

**대안 비교:**

| 옵션 | 장점 | 단점 |
|---|---|---|
| NextAuth v5 | Next.js 공식 통합, 검증된 생태계 | 설정 복잡도 존재 |
| Supabase Auth | 올인원 간편 | 플랫폼 의존도 높음 |
| 직접 구현 (JWT) | 완전 제어 | 보안 구현 부담 큼 |

### ORM: Prisma

**선택 근거:**
- TypeScript 타입 자동 생성
- PostgreSQL 완전 지원
- 마이그레이션 관리 내장 (`prisma migrate dev`)
- Next.js + PostgreSQL 조합의 표준적 선택

### 데이터베이스: PostgreSQL (Neon 또는 Supabase)

**선택 근거:**
- 사업계획서에 명시
- 관계형 모델에 최적 (고객·프로젝트·수정요청 간 복잡한 관계)
- JSONB 지원으로 유연한 메타데이터 저장 가능

**플랫폼 권장:**
- **Neon**: 서버리스 PostgreSQL, Vercel과 최적 통합, 브랜치 기능으로 개발·프로덕션 분리 용이
- Supabase: 올인원(Auth·Storage·Realtime 포함) 이나 기능이 과도할 수 있음

### 파일 저장소: Cloudflare R2

**사용 범위 (명확히 제한):**
- 의뢰 접수 폼의 참고 파일 업로드 (10MB 이하)
- 재수정 접수 폼의 첨부 파일 (10MB 이하)

**납품 결과물은 R2에 저장하지 않음** — 사업자가 본인 Google Drive·Dropbox 등에 보관 후 URL만 Flowrit에 등록

**Cloudflare R2 선택 근거:**
- Egress 비용 없음 (파일 다운로드 시 비용 0)
- S3 호환 API (gohoc의 presigned URL 패턴 재사용 가능)
- Cloudflare 글로벌 CDN 기본 포함

---

## 데이터 모델 설계 근거

MVP 계획서의 데이터 모델 초안(`docs/mvp/MVP_계획서.md §7`)을 기반으로 하되, 아래 설계 결정을 추가한다.

### 핵심 설계 결정

**1. Inquiry(신규 접수) 엔티티 분리**

신규 의뢰 접수와 정식 프로젝트를 분리한다. 고객이 접수 폼을 제출하면 `Inquiry`로 저장되고, 사업자가 검토 후 `Project`로 전환한다. 이는 `ourwedding`의 "주문확인" 단계를 모델링한 것이다.

**2. 내부 상태 vs 고객 표시명 분리 (`WorkflowStage`)**

`ourwedding`에서 검증된 인사이트: 내부 상태(`작업자현황`)와 고객 표시명(`보정 작업 중`)을 분리해야 한다. `TemplateStage.internalName` vs `TemplateStage.customerName` 으로 구분한다.

**3. Asset을 외부 링크 중심으로 설계**

`url` 필드는 외부 스토리지 URL을 저장한다. 의뢰 접수 시 업로드된 파일은 R2에 저장하고 `url`에 R2 public URL을 기록한다. `type`으로 ORIGIN/REFERENCE/DELIVERY/OTHER를 구분한다.

**4. PublicProjectPage — 토큰 기반 공유**

`gohoc`는 고객 로그인(네이버 ID 기반)이 필요했으나, 신규 제품은 토큰 기반 비인증 공유 링크를 사용한다. UUID v4 토큰으로 `PublicProjectPage`를 조회한다.

**5. RevisionRequest 출처 구분**

사업자가 직접 등록한 수정 요청(`source=MANUAL`)과 고객이 공유 페이지에서 제출한 요청(`source=CUSTOMER_PORTAL`)을 같은 엔티티로 관리한다.

### 엔티티 관계 요약

```
Workspace ──< WorkspaceMember >── User
Workspace ──< Customer
Workspace ──< WorkflowTemplate ──< TemplateStage
Customer ──< Project
Project ──< WorkflowStage      (현재 단계 추적)
Project ──< RevisionRequest
Project ──< Asset
Project ──< TimelineEvent
Project ──1── PublicProjectPage
Workspace ──< Inquiry           (신규 접수, 프로젝트 전환 전)
Workspace ──< MessageTemplate
Workspace ──< WorkspaceInvite
```

---

## 엣지 케이스 및 한계

| 항목 | 내용 | 처리 방향 |
|---|---|---|
| 공유 링크 만료 | `Asset.expiredAt`이 지난 에셋 | 고객 페이지에서 "만료됨" 표시, 자동 삭제 없음 |
| 비활성 공유 링크 접근 | `PublicProjectPage.isActive = false` | 404 또는 "링크가 비활성화되었습니다" 안내 |
| 다중 워크스페이스 | MVP에서 사용자는 하나의 워크스페이스에만 속한다고 가정 | 여러 워크스페이스 전환은 MVP 범위 외 |
| 파일 업로드 크기 초과 | 10MB 초과 시도 | 클라이언트 측 + 서버 측 이중 검증 후 거부 |
| 이메일 초대 발송 | 실제 이메일 발송 필요 | Resend API 사용 (무료 플랜 월 3,000건) |
| 템플릿 없이 프로젝트 생성 | 사용자가 템플릿 없이 프로젝트를 시작하는 경우 | 빈 단계 목록으로 시작, 직접 단계 추가 허용 |
| 공유 링크 토큰 충돌 | UUID v4 충돌 확률 극히 낮음 | DB unique constraint로 충돌 시 재생성 |

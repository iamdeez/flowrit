# Tasks: mvp-core

> Branch: 001-mvp-core | Date: 2026-06-21 | Plan: [plan.md](./plan.md)

## 목차

- [전제 조건](#전제-조건)
- [태스크 목록](#태스크-목록)
- [구현 완료 기준](#구현-완료-기준)

---

## 전제 조건

- [x] spec.md의 모든 `[NEEDS CLARIFICATION]` 항목이 해소되었는가? (해당 없음)
- [x] plan.md의 Constitution Gates가 모두 통과(또는 예외 기재)되었는가?
- [ ] CHANGES.md에서 이전 작업의 "후속 작업 시 주의사항"을 확인했는가? (첫 스펙, 해당 없음)

---

## 태스크 목록

> `[P]` 표시: 이전 태스크와 병렬 실행 가능

---

### Phase 1. 프로젝트 셋업 및 인프라

- [x] **T001** — Next.js 15 프로젝트 초기화
  - 구현: `package.json`, `tsconfig.json`, `next.config.ts`
  - 상세: `npx create-next-app@latest --typescript --tailwind --app`으로 생성. shadcn/ui 초기화.
  - 완료 기준: `npm run dev` 실행 후 기본 페이지 렌더링 확인

- [x] **T002** `[P]` — Prisma + PostgreSQL 셋업
  - 구현: `prisma/schema.prisma`, `lib/db.ts`, `.env.example`
  - 상세: plan.md §데이터 모델의 전체 스키마 정의. `DATABASE_URL` 환경변수 설정.
  - 완료 기준: `npx prisma db push` 성공, Prisma Studio에서 테이블 확인

- [x] **T003** `[P]` — Cloudflare R2 버킷 및 파일 업로드 유틸 구현
  - 구현: `lib/storage.ts`, `app/api/upload/route.ts`
  - 상세: R2 presigned PUT URL 생성 함수. 10MB 초과 요청 거부. CORS 설정.
  - 완료 기준: 테스트 파일 업로드 후 R2에서 접근 확인

- [x] **T004** — NextAuth.js v5 인증 구현
  - 구현: `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `middleware.ts`
  - 상세: Credentials Provider (이메일·비밀번호, bcrypt 검증). Prisma Adapter 연결. 세션에 `workspaceId` 포함.
  - 완료 기준: 로그인 성공 후 세션 조회 시 `user.workspaceId` 반환

- [x] **T005** — 기본 레이아웃 및 라우팅 구조 설정
  - 구현: `app/(auth)/layout.tsx`, `app/(dashboard)/layout.tsx`, 공통 컴포넌트
  - 상세: 인증 필요 레이아웃은 미들웨어로 보호. 사이드바 네비게이션 (대시보드·고객·프로젝트·팀·설정).
  - 완료 기준: 비인증 상태에서 대시보드 접근 시 로그인 페이지로 리다이렉트

---

### Phase 2. 인증·워크스페이스

- [x] **T006** — 회원가입 + 워크스페이스 자동 생성
  - 구현: `app/(auth)/register/page.tsx`, `lib/actions/auth.ts`
  - 관련 요구사항: `FR-001`, `FR-002`
  - 상세: 이메일·비밀번호 폼. bcrypt로 해시 후 User 저장. Workspace 자동 생성 + WorkspaceMember(OWNER) 등록. 사진·웨딩 기본 WorkflowTemplate 시딩.
  - 완료 기준: SC-001 충족

- [x] **T007** — 로그인 페이지
  - 구현: `app/(auth)/login/page.tsx`
  - 관련 요구사항: `FR-001`
  - 상세: NextAuth signIn 호출. 오류 메시지 표시. 가입 페이지 링크.
  - 완료 기준: 유효 자격증명 → 대시보드 이동, 무효 → 오류 메시지

- [x] **T008** — 팀원 초대 (이메일 발송)
  - 구현: `app/(dashboard)/team/page.tsx`, `lib/actions/team.ts`, `lib/email.ts`
  - 관련 요구사항: `FR-003`, `FR-004`
  - 상세: WorkspaceInvite 생성 + Resend로 초대 링크 이메일 발송.
  - 완료 기준: 초대 이메일 발송 확인 (Resend 로그)

- [x] **T009** — 팀원 초대 수락
  - 구현: `app/invite/[token]/page.tsx`
  - 관련 요구사항: `FR-003`
  - 상세: 토큰 유효성 확인 → 가입 폼 또는 기존 계정 연결 → WorkspaceMember 생성.
  - 완료 기준: SC-002 충족

---

### Phase 3. 고객 관리

- [x] **T010** — 고객 목록 및 검색
  - 구현: `app/(dashboard)/customers/page.tsx`, `lib/actions/customer.ts`
  - 관련 요구사항: `FR-005`, `FR-006`
  - 상세: 이름 검색 쿼리 파라미터. 고객 목록 테이블. 고객 등록 버튼.
  - 완료 기준: SC-003 (검색) 충족

- [x] **T011** `[P]` — 고객 등록·편집·삭제
  - 구현: `app/(dashboard)/customers/new/page.tsx`, 편집 모달
  - 관련 요구사항: `FR-005`
  - 상세: 이름(필수)·연락처·메모 폼. Server Action으로 Customer CRUD.
  - 완료 기준: 고객 등록 후 목록에 표시

- [x] **T012** — 고객 상세 + 프로젝트 목록
  - 구현: `app/(dashboard)/customers/[id]/page.tsx`
  - 관련 요구사항: `FR-007`
  - 상세: 고객 정보 표시 + 해당 고객의 프로젝트 목록 (상태·마감일 포함).
  - 완료 기준: SC-003 (프로젝트 목록) 충족

---

### Phase 4. 워크플로우 템플릿

- [ ] **T013** — 기본 사진·웨딩 템플릿 시딩
  - 구현: `prisma/seed.ts` 또는 Workspace 생성 로직 내 자동 삽입
  - 관련 요구사항: `FR-015`
  - 상세: plan.md의 10단계 사진·웨딩 템플릿을 WorkflowTemplate + TemplateStage로 저장. `isDefault=true`.
  - 완료 기준: 새 워크스페이스 생성 시 기본 템플릿 조회 가능

- [ ] **T014** `[P]` — 워크플로우 템플릿 CRUD UI
  - 구현: `app/(dashboard)/templates/page.tsx`, `lib/actions/template.ts`
  - 관련 요구사항: `FR-014`, `FR-016`
  - 상세: 템플릿 목록. 신규 생성 폼. 단계 추가·순서 변경·내부명·고객표시명 설정. 삭제.
  - 완료 기준: SC-005 충족

---

### Phase 5. 프로젝트 관리

- [ ] **T015** — 프로젝트 생성
  - 구현: `app/(dashboard)/projects/new/page.tsx`, `lib/actions/project.ts`
  - 관련 요구사항: `FR-008`, `FR-009`
  - 상세: 고객 선택(드롭다운), 제목, 마감일, 담당자(선택), 워크플로우 템플릿 선택. 템플릿 적용 시 WorkflowStage 일괄 생성.
  - 완료 기준: 프로젝트 생성 후 상세 페이지로 이동, 단계 목록 표시

- [ ] **T016** — 프로젝트 목록
  - 구현: `app/(dashboard)/projects/page.tsx`
  - 관련 요구사항: `FR-012`
  - 상세: 진행 중 프로젝트 카드 목록. 상태별 필터(전체·진행 중·완료). 마감일 오름차순 정렬.
  - 완료 기준: 등록된 프로젝트가 목록에 표시

- [ ] **T017** — 프로젝트 상세 화면 (탭 레이아웃)
  - 구현: `app/(dashboard)/projects/[id]/page.tsx`
  - 관련 요구사항: `FR-011`
  - 상세: 상단에 프로젝트 정보(고객명·마감일·담당자·공유 링크 생성 버튼). 탭: 수정 요청 / 파일·링크 / 타임라인 / 메시지.
  - 완료 기준: 각 탭 전환 및 데이터 표시

- [ ] **T018** — 단계 변경 + 타임라인 기록
  - 구현: `lib/actions/project.ts` (updateProjectStage)
  - 관련 요구사항: `FR-010`
  - 상세: currentStageId 업데이트 + TimelineEvent(STAGE_CHANGE) 자동 생성. 상세 화면의 단계 표시(드롭다운 또는 단계 클릭).
  - 완료 기준: SC-004 충족

---

### Phase 6. 수정 요청 관리

- [ ] **T019** — 수정 요청 등록
  - 구현: 프로젝트 상세 "수정 요청" 탭, `lib/actions/revision.ts`
  - 관련 요구사항: `FR-017`
  - 상세: 내용(필수)·우선순위·담당자(선택) 폼. RevisionRequest(source=MANUAL) 생성.
  - 완료 기준: 수정 요청이 프로젝트 상세 목록에 표시

- [ ] **T020** `[P]` — 수정 요청 상태 변경
  - 구현: 수정 요청 카드 상태 드롭다운
  - 관련 요구사항: `FR-018`
  - 상세: OPEN / IN_PROGRESS / DONE 상태 전환. 체크박스 클릭으로 DONE 처리.
  - 완료 기준: SC-006 충족

- [ ] **T021** `[P]` — 수정 요청 전체 목록 화면
  - 구현: `app/(dashboard)/revisions/page.tsx`
  - 관련 요구사항: `FR-019`, `FR-020`
  - 상세: 전체 워크스페이스의 미완료 수정 요청 목록. 프로젝트 이름으로 그룹핑.
  - 완료 기준: 미완료 요청이 대시보드에 표시

---

### Phase 7. 에셋(파일·링크) 관리

- [ ] **T022** — 에셋 등록 (외부 링크)
  - 구현: 프로젝트 상세 "파일·링크" 탭, `lib/actions/asset.ts`
  - 관련 요구사항: `FR-021`
  - 상세: URL·이름·타입·버전·만료일 폼. 외부 URL 유효성 검사(http/https). Asset 생성.
  - 완료 기준: 에셋이 프로젝트 상세 목록에 표시

- [ ] **T023** `[P]` — 에셋 상태 변경
  - 구현: 에셋 카드 상태 드롭다운
  - 관련 요구사항: `FR-022`, `FR-023`
  - 상세: PREPARING → SHARED → EXPIRED 전환. SHARED로 변경 시 고객 페이지에 노출.
  - 완료 기준: SC-008 충족

---

### Phase 8. 고객용 진행상황 페이지

- [ ] **T024** — 공유 링크 생성 및 관리
  - 구현: 프로젝트 상세 상단, `lib/actions/publicPage.ts`
  - 관련 요구사항: `FR-024`
  - 상세: PublicProjectPage 생성(UUID v4 토큰). 링크 활성·비활성 토글. 링크 복사 버튼.
  - 완료 기준: 공유 링크 URL이 사업자 화면에 표시

- [ ] **T025** — 고객용 공개 진행상황 페이지 구현
  - 구현: `app/p/[token]/page.tsx`
  - 관련 요구사항: `FR-025`, `FR-026`
  - 상세: 토큰으로 PublicProjectPage 조회. isActive=false이면 404. 현재 단계(customerName)·마감일·SHARED 에셋·수정 요청 완료 여부 표시. 내부 메모 및 사업자 정보 미노출. 반응형 레이아웃.
  - 완료 기준: SC-009 충족

- [ ] **T026** — 고객용 재수정 접수 폼
  - 구현: `app/p/[token]/revision/page.tsx` 또는 모달
  - 관련 요구사항: `FR-027`
  - 상세: 수정 요청 내용 텍스트. 파일 첨부(R2, 10MB 이하). RevisionRequest(source=CUSTOMER_PORTAL) 생성.
  - 완료 기준: SC-010 충족

---

### Phase 9. 신규 의뢰 접수 (인테이크)

- [ ] **T027** — 워크스페이스 슬러그 기반 신규 의뢰 접수 폼
  - 구현: `app/intake/[workspaceSlug]/page.tsx`
  - 관련 요구사항: `FR-028`, `FR-029`
  - 상세: 고객 이름·연락처·의뢰 내용·요청사항 폼. 파일 첨부(R2, 복수, 각 10MB 이하). Inquiry 생성.
  - 완료 기준: 접수 폼 제출 후 성공 메시지 표시

- [ ] **T028** — 대시보드 "신규 접수" 목록 및 프로젝트 전환
  - 구현: `app/(dashboard)/dashboard/page.tsx` (신규 접수 섹션)
  - 관련 요구사항: `FR-013`, `FR-030`
  - 상세: PENDING 상태의 Inquiry 목록. 각 접수 건에 "프로젝트로 전환" 버튼 → 고객 선택(또는 신규 생성) + 프로젝트 제목 입력 후 Project 생성. Inquiry.status를 CONVERTED로 변경.
  - 완료 기준: SC-011 충족

---

### Phase 10. 메시지 템플릿

- [ ] **T029** — 메시지 템플릿 CRUD
  - 구현: `app/(dashboard)/messages/page.tsx`, `lib/actions/message.ts`
  - 관련 요구사항: `FR-031`
  - 상세: 템플릿 목록·생성·편집·삭제. 템플릿 내용에 `{고객명}`, `{단계}`, `{마감일}`, `{공유링크}` 변수 사용 가이드 표시.
  - 완료 기준: 템플릿 저장 후 목록에 표시

- [ ] **T030** — 메시지 변수 치환 + 클립보드 복사
  - 구현: 프로젝트 상세 "메시지" 탭, `lib/utils/messageTemplate.ts`
  - 관련 요구사항: `FR-032`
  - 상세: 프로젝트 컨텍스트(고객명·단계·마감일·공유링크)로 변수 치환. 복사 버튼 클릭 시 클립보드에 저장.
  - 완료 기준: SC-012 충족

---

### Phase 11. 대시보드

- [ ] **T031** — 대시보드 "오늘 처리할 작업" 목록
  - 구현: `app/(dashboard)/dashboard/page.tsx`
  - 관련 요구사항: `FR-012`, `FR-020`
  - 상세: 마감일이 오늘로부터 2일 이내인 프로젝트 + 상태가 OPEN/IN_PROGRESS인 수정 요청 목록. 각 항목에서 해당 프로젝트 상세로 이동.
  - 완료 기준: SC-013 충족

---

### Phase 12. 테스트 (SC 커버리지)

- [ ] **T032** — SC-001~002 테스트 (인증·팀원)
  - 테스트 파일: `tests/auth.test.ts`
  - 검증 대상: `SC-001`, `SC-002`
  - 시나리오: 회원가입 → 워크스페이스 자동 생성 / 팀원 초대 → 수락 → 접근 권한

- [ ] **T033** `[P]` — SC-003 테스트 (고객 CRUD·검색)
  - 테스트 파일: `tests/customer.test.ts`
  - 검증 대상: `SC-003`

- [ ] **T034** `[P]` — SC-004~005 테스트 (프로젝트·워크플로우)
  - 테스트 파일: `tests/project.test.ts`
  - 검증 대상: `SC-004`, `SC-005`

- [ ] **T035** `[P]` — SC-006~007 테스트 (수정 요청)
  - 테스트 파일: `tests/revision.test.ts`
  - 검증 대상: `SC-006`, `SC-007`

- [ ] **T036** `[P]` — SC-008~010 테스트 (에셋·공개 페이지)
  - 테스트 파일: `tests/asset.test.ts`, `tests/publicPage.test.ts`
  - 검증 대상: `SC-008`, `SC-009`, `SC-010`

- [ ] **T037** `[P]` — SC-011 테스트 (신규 접수)
  - 테스트 파일: `tests/inquiry.test.ts`
  - 검증 대상: `SC-011`

- [ ] **T038** `[P]` — SC-012~013 테스트 (메시지 템플릿·대시보드)
  - 테스트 파일: `tests/message.test.ts`, `tests/dashboard.test.ts`
  - 검증 대상: `SC-012`, `SC-013`

---

## 구현 완료 기준

- [ ] 모든 태스크 체크박스(T001~T038)가 완료 처리되었다.
- [ ] `npm run build`가 오류 없이 완료된다.
- [ ] TypeScript 타입 오류가 0건이다 (`npm run typecheck`).
- [ ] SC-001~SC-013의 모든 테스트가 PASS한다.
- [ ] `git status`에 의도치 않은 파일이 없다.
- [ ] `prisma/schema.prisma`와 실제 DB 스키마가 일치한다 (`prisma migrate status`).

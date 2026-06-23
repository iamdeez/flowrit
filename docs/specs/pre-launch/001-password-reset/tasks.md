# Tasks: 비밀번호 초기화 기능

> Branch: pre-launch/001-password-reset | Date: 2026-06-23 | Spec: [spec.md](./spec.md)

## 목차

- [전제 조건](#전제-조건)
- [태스크 목록](#태스크-목록)
- [구현 완료 기준](#구현-완료-기준)

---

## 전제 조건

- [x] spec.md의 모든 항목이 명확히 정의되었는가?
- [x] constitution.md P-003(NextAuth JWT 세션 원칙) 확인 — 비밀번호 초기화는 NextAuth 세션 외부 플로우이므로 DB 토큰 기반으로 독립 처리한다.

## 태스크 목록

### Phase 1. DB 모델

- [x] **T001** — `PasswordResetToken` 모델 추가 (`prisma/schema.prisma`)
  - 필드: `id`, `token` (unique), `userId`, `expiresAt`, `usedAt?`
  - 관련 요구사항: `FR-004`, `FR-005`
  - 완료 기준: `npx prisma migrate dev` 성공

### Phase 2. 서버 로직

- [x] **T002** — `sendPasswordResetEmail` 함수 추가 (`lib/email.ts`)
  - 관련 요구사항: `FR-002`
  - 완료 기준: 함수 존재, 기존 emailWrapper 패턴 사용

- [x] **T003** — `forgotPassword` Server Action 추가 (`lib/actions/auth.ts`)
  - 이메일 조회 → 토큰 생성 → DB 저장 → 이메일 발송
  - 관련 요구사항: `FR-002`, `FR-006`
  - 완료 기준: 존재하지 않는 이메일도 성공 응답 반환

- [x] **T004** — `resetPassword` Server Action 추가 (`lib/actions/auth.ts`)
  - 토큰 조회 → 만료/사용 여부 검증 → 비밀번호 해시 → 저장 → 토큰 무효화
  - 관련 요구사항: `FR-003`, `FR-004`, `FR-005`
  - 완료 기준: 만료/사용 토큰 처리, bcrypt 해시

### Phase 3. UI

- [x] **T005** — 로그인 페이지에 "비밀번호 찾기" 링크 추가 (`app/(auth)/login/page.tsx`)
  - 관련 요구사항: `FR-001`
  - 완료 기준: `/forgot-password` 링크 표시

- [x] **T006** — `/forgot-password` 페이지 생성 (`app/(auth)/forgot-password/page.tsx`)
  - 관련 요구사항: `FR-002`
  - 완료 기준: 이메일 입력 폼, 성공/오류 상태 표시

- [x] **T007** — `/reset-password/[token]` 페이지 생성
  - 관련 요구사항: `FR-003`, `FR-004`, `FR-005`
  - 완료 기준: 유효/만료 토큰 분기, 새 비밀번호 입력 폼

## 구현 완료 기준

- [x] 모든 태스크 체크박스가 완료 처리되었다.
- [x] `npm test` 전체 PASSED.
- [x] `npm run lint` 0 errors.

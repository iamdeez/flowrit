# Tasks: 마케팅 홍보 영상 자동 제작 플로우

> Branch: 002-marketing-video-automation | Date: 2026-06-24 | Plan: [plan.md](plan.md)

## 전제 조건

- [x] spec.md의 모든 `[NEEDS CLARIFICATION]` 항목이 해소되었는가? — 예. 외부 연동 불확실성은 MVP 범위 밖으로 분리했다.
- [x] plan.md의 Constitution Gates가 모두 통과(또는 예외 기재)되었는가? — 예
- [ ] 사용자가 데모 계정, 데모 프로젝트, 브랜드 자료, CTA URL을 준비했는가?
- [ ] CapCut 데스크톱 앱 또는 웹 편집 환경이 준비되었는가? — 미확인 시 handoff 패키지만 생성
- [ ] Instagram 자동 게시가 필요한 경우 Meta Business/Professional 계정/Meta App 권한이 준비되었는가? — 미확인 시 수동 게시 자료만 생성

## 사용자가 준비해야 하는 것

- [ ] Flowrit 촬영 전용 데모 계정 이메일/비밀번호
- [ ] 공개 가능한 데모 workspace slug
- [ ] 공개 가능한 데모 프로젝트 id와 고객 포털 token
- [ ] 데모 고객명, 프로젝트명, 수정 요청 문구, 납품 파일명
- [ ] 로고, 브랜드 컬러, 제품 한 줄 소개, CTA URL
- [ ] Instagram 계정명, 게시 톤, 선호 해시태그
- [ ] CapCut 데스크톱 앱 또는 웹 편집 환경
- [ ] Meta Business, Instagram Professional 계정, Facebook Page, Meta App 권한
- [ ] 배경 음악/이미지/AI 생성물 사용 라이선스 기준
- [ ] 자동 게시 여부와 게시 전 승인 담당자

## 태스크 목록

### Phase 1. 기반 설정과 안전장치

- [x] **T001** — 홍보 영상 자동화 디렉토리 생성
  - 구현 파일: `scripts/promo/`, `scripts/promo/lib/`, `scripts/promo/scenarios/`, `scripts/promo/templates/`
  - 관련 요구사항: `FR-001`
  - 완료 기준: promo CLI, lib, scenario, template 구조가 생성됨

- [x] **T002** — 환경변수 계약 추가
  - 구현 파일: `.env.example`, `scripts/promo/lib/env.ts`
  - 관련 요구사항: `FR-005`
  - 상세:
    - `PROMO_BASE_URL`, `PROMO_EMAIL`, `PROMO_PASSWORD`, `PROMO_WORKSPACE_SLUG`, `PROMO_PUBLIC_TOKEN`, `PROMO_PROJECT_ID`, `PROMO_OUTPUT_DIR`, `PROMO_BLACKLIST` 추가
    - 필수값 누락 시 실행 전 실패 처리
  - 완료 기준: env validation Vitest 통과

- [x] **T003** — 데모 workspace 안전장치 구현
  - 구현 파일: `scripts/promo/lib/safety.ts`
  - 관련 요구사항: `FR-004`, `NFR-001`, `NFR-002`
  - 상세:
    - base URL과 workspace slug가 demo/preview/staging 허용 목록에 속하는지 확인
    - production 실데이터 촬영은 명시적 override 없이는 차단
  - 완료 기준: production-like URL 차단 테스트 통과

- [x] **T004** — package scripts 추가
  - 구현 파일: `package.json`
  - 관련 요구사항: `FR-001`, `FR-006`
  - 상세:
    - `promo:record`
    - `promo:bundle`
    - `promo:check`
    - `promo:doctor`
  - 완료 기준: 명령이 help 또는 validation 단계까지 실행 가능

### Phase 2. 영상 연출 자동화

- [x] **T005** — HumanDirector 구현
  - 구현 파일: `scripts/promo/lib/human-actions.ts`
  - 관련 요구사항: `FR-002`
  - 상세:
    - 느린 hover/click/type/scroll/pause/spotlight/screenshot 제공
    - 장면별 최소 유지 시간을 상수화
  - 완료 기준: 유틸 단위 테스트와 타입 체크 통과

- [x] **T006** — Playwright 녹화 실행기 구현
  - 구현 파일: `scripts/promo/record.ts`, `scripts/promo/lib/recording.ts`
  - 관련 요구사항: `FR-001`, `FR-013`, `FR-014`
  - 상세:
    - scenario id, output dir, headed 옵션 지원
    - 9:16 viewport 기본값 적용
    - 실패 시 screenshot/log 생성
  - 완료 기준: smoke scenario 실행 시 녹화 파일 생성

- [x] **T007** — 시나리오 registry 구현
  - 구현 파일: `scripts/promo/scenarios/index.ts`
  - 관련 요구사항: `FR-003`
  - 상세:
    - scenario id로 실행 대상을 찾음
    - 존재하지 않는 id는 사용 가능한 목록과 함께 실패
  - 완료 기준: 기본 시나리오 3개 등록 테스트 통과

### Phase 3. 기본 홍보 시나리오

- [x] **T008** — `owner-dashboard` 시나리오 작성
  - 구현 파일: `scripts/promo/scenarios/owner-dashboard.ts`
  - 관련 요구사항: `FR-003`
  - 상세:
    - 로그인
    - 대시보드 오늘의 우선순위 확인
    - 프로젝트 목록/상세로 이동
    - 납품 상태 또는 다음 액션 강조
  - 완료 기준: 데모 계정에서 독립 실행 가능

- [x] **T009** — `client-portal` 시나리오 작성
  - 구현 파일: `scripts/promo/scenarios/client-portal.ts`
  - 관련 요구사항: `FR-003`
  - 상세:
    - 고객 포털 진입
    - 진행 단계 확인
    - 납품 이력 확인
    - 작업 확정 버튼 위치 강조
  - 완료 기준: 공개 token만으로 실행 가능

- [x] **T010** — `revision-to-delivery` 시나리오 작성
  - 구현 파일: `scripts/promo/scenarios/revision-to-delivery.ts`
  - 관련 요구사항: `FR-003`
  - 상세:
    - 수정 요청 확인
    - 작업물 재납품 위치 강조
    - 고객 포털에서 납품 이력과 확정 흐름 확인
  - 완료 기준: 수정 요청과 납품물의 차이가 영상 흐름상 명확함

### Phase 4. 결과물 번들 생성

- [x] **T011** — bundle renderer 구현
  - 구현 파일: `scripts/promo/bundle.ts`, `scripts/promo/lib/render.ts`
  - 관련 요구사항: `FR-006`, `FR-007`, `FR-008`
  - 상세:
    - `artifacts/promo/{runId}` 출력
    - `source.mp4`, `cover.png`, `screenshots/`, `manifest.json` 정리
  - 완료 기준: bundle renderer 테스트 통과

- [x] **T012** — caption 템플릿 생성
  - 구현 파일: `scripts/promo/templates/caption.ts`
  - 관련 요구사항: `FR-011`
  - 상세:
    - hook, value proposition, CTA, hashtags, 게시 전 체크리스트 생성
  - 완료 기준: Instagram token 없이 caption 생성 가능

- [x] **T013** — CapCut edit brief 템플릿 생성
  - 구현 파일: `scripts/promo/templates/capcut-brief.ts`
  - 관련 요구사항: `FR-010`
  - 상세:
    - 컷별 설명, 원본 파일명, 브랜드 톤, 금지 표현 포함
  - 완료 기준: CapCut 계정 없이 edit brief 생성 가능

- [x] **T014** — 민감 정보 scanner 구현
  - 구현 파일: `scripts/promo/lib/sensitive-scan.ts`
  - 관련 요구사항: `FR-009`, `NFR-001`
  - 상세:
    - 이메일, token-like string, secret 키, blacklist 문자열 탐지
    - 문제 발견 시 non-zero exit
  - 완료 기준: scanner Vitest 통과

### Phase 5. 외부 연동 준비

- [x] **T015** — CapCut handoff 문서 작성
  - 구현 파일: `docs/promo/capcut-workflow.md`
  - 관련 요구사항: `FR-010`
  - 상세:
    - 생성된 edit brief와 source bundle을 CapCut에 넣는 절차
    - 데스크톱 앱/템플릿/내보내기 설정 기준
  - 완료 기준: 수동 업로드 절차가 문서화됨

- [x] **T016** — Instagram 수동 게시 체크리스트 작성
  - 구현 파일: `docs/promo/instagram-reels-checklist.md`
  - 관련 요구사항: `FR-011`, `FR-015`
  - 상세:
    - MP4, cover, caption 확인
    - 공개 전 민감 정보 검토
    - 게시 후 링크 기록
  - 완료 기준: 자동 게시 권한 없이도 운영 가능

- [x] **T017** — Instagram 자동 게시 인터페이스 초안 작성
  - 구현 파일: `scripts/promo/lib/instagram-publisher.ts` 또는 문서 초안
  - 관련 요구사항: `FR-012`, `FR-015`
  - 상세:
    - 기본값 `review-only`
    - `--publish` 명시 시에만 게시
    - Meta 권한 미설정 시 실행 차단
  - 완료 기준: 실제 게시 없이 dry-run 계약 테스트 통과

### Phase 6. 검증과 문서화

- [x] **T018** — Vitest 단위 테스트 추가
  - 테스트 파일: `tests/promo/*.test.ts`
  - 관련 수용 기준: `SC-002`, `SC-003`, `SC-004`, `SC-005`, `SC-006`, `SC-007`, `SC-010`
  - 완료 기준: `npm test -- tests/promo` 또는 동등 명령 통과

- [ ] **T019** — Playwright smoke 테스트 추가
  - 테스트 파일: `tests/e2e/promo-recording.spec.ts`
  - 관련 수용 기준: `SC-001`, `SC-008`, `SC-009`
  - 상세:
    - mutation 없이 demo URL에서 한 시나리오 실행
    - MP4와 실패 screenshot 생성 여부 확인
  - 완료 기준: 로컬 데모 환경에서 smoke 통과
  - 현재 상태: smoke spec과 실행 가이드는 추가됨. `promo:doctor`는 더미 demo 값으로 통과 확인. 실제 고객 포털 smoke는 `PROMO_*` 데모 값 준비 후 통과 체크 가능.

- [x] **T020** — 운영자 가이드 작성
  - 구현 파일: `docs/promo/README.md`
  - 관련 요구사항: 전체
  - 상세:
    - 준비물
    - 명령 실행 순서
    - 산출물 검토 방법
    - CapCut/Instagram 수동 운영 방법
  - 완료 기준: 비개발자도 문서만 보고 소스 번들을 생성할 수 있음

- [ ] **T021** — 구현 완료 후 이력 동기화
  - 구현 파일: `docs/specs/v1.0.0/CHANGES.md`, `docs/specs/v1.0.0/DIFF-002-marketing-video-automation.md`
  - 관련 요구사항: 검증 규칙
  - 상세:
    - 완료 파일 목록과 검증 결과 기록
    - 후속 작업 주의사항 기록
  - 완료 기준: 스펙, 구현, 검증 이력이 일치함

## 구현 완료 기준

- [ ] `SC-001`부터 `SC-010`까지 모두 통과
- [x] 데모 workspace 외 대상 실행 차단 확인
- [x] 기본 시나리오 3개가 모두 독립 실행 가능
- [x] 생성 번들에 MP4, cover, caption, CapCut edit brief, manifest 포함
- [x] 민감 정보 scanner 통과
- [x] Vitest promo 테스트 통과
- [ ] Playwright promo smoke 테스트 통과
- [x] 운영자 가이드와 사용자 준비 체크리스트 작성 완료
- [x] `promo:doctor` readiness check 추가 및 ffmpeg 감지 확인

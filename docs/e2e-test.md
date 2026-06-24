# Flowrit E2E 테스트 결과

> **자동화 Playwright E2E 테스트 결과 + 수동 QA 템플릿**
> 결과 표기: `P`(Pass — 자동화) / `F`(Fail) / `S`(Skip — 자동화) / 빈칸(미자동화 — 수동 확인 필요)
> 자동화 실행 명령: `PLAYWRIGHT_BASE_URL=https://flowrit.motionbit.kr npx playwright test --project=desktop-chrome`
> 최종 실행 결과: **34 passed / 0 failed / 6 skipped** (2026-06-24)

---

## 목차

- [테스트 환경 정보](#테스트-환경-정보)
- [TC-A. 인증](#tc-a-인증)
- [TC-B. 온보딩](#tc-b-온보딩)
- [TC-C. 대시보드](#tc-c-대시보드)
- [TC-D. 고객 관리](#tc-d-고객-관리)
- [TC-E. 프로젝트 관리](#tc-e-프로젝트-관리)
- [TC-F. 수정 요청](#tc-f-수정-요청)
- [TC-G. 납품물 (Asset)](#tc-g-납품물-asset)
- [TC-H. 고객 포털 (공개 페이지)](#tc-h-고객-포털-공개-페이지)
- [TC-I. 주문서 (Order Form)](#tc-i-주문서-order-form)
- [TC-J. 일반 문의 접수 (Intake)](#tc-j-일반-문의-접수-intake)
- [TC-K. 팀 관리 & RBAC](#tc-k-팀-관리--rbac)
- [TC-L. 알림](#tc-l-알림)
- [TC-M. 메시지 템플릿](#tc-m-메시지-템플릿)
- [TC-N. 워크플로우 템플릿](#tc-n-워크플로우-템플릿)
- [TC-O. 통계 (Analytics)](#tc-o-통계-analytics)
- [TC-P. 설정](#tc-p-설정)
- [TC-Q. 데이터 내보내기](#tc-q-데이터-내보내기)
- [TC-R. 결제 & 구독 (NicePayments)](#tc-r-결제--구독-nicepayments)
- [TC-S. 시스템 & 운영](#tc-s-시스템--운영)
- [이슈 로그](#이슈-로그)

---

## 테스트 환경 정보

> E2E 환경변수(`.env.local`)와 동일한 값을 사용한다.

| 항목                  | 값                                    |
| ------------------- | ------------------------------------ |
| 테스트 날짜              | 2026.06.24                           |
| 테스트 환경 URL          | https://flowrit.motionbit.kr/        |
| 데스크톱 브라우저 / 뷰포트     | Chrome — 1440 × 1100                 |
| 모바일 브라우저 / 뷰포트      | Chrome (Pixel 5) — 390 × 920         |
| 테스터                 | 박수정                                  |
| 테스트 계정 이메일 (OWNER)  | flowrit-demo@example.com             |
| 테스트 계정 비밀번호 (OWNER) | demo1234                             |
| 테스트 계정 (ADMIN)      | 별도 준비 필요                             |
| 테스트 계정 (MEMBER)     | 별도 준비 필요                             |
| 워크스페이스 Slug         | flowrit-demo                         |
| 고객 포털 토큰            | 24069d72-0330-4b96-b507-579db99fe7ae |
| Mutation 허용 여부      | 허용 (E2E_ALLOW_MUTATION=true)         |

---

## TC-A. 인증

| TC | 항목 | 전제 조건 | 테스트 단계 | 기대 결과 | 결과 |
|---|---|---|---|---|---|
| A-01 | 신규 회원가입 | 미가입 이메일 | 1. `https://flowrit.motionbit.kr/register` 접근<br>2. 이름: `QA 테스터` / 이메일: `qa-test-001@example.com` / 비밀번호: `QATest1234!` 입력<br>3. 가입하기 제출 | `/onboarding`으로 이동, 워크스페이스 생성 화면 표시 | P |
| A-02 | 중복 이메일 회원가입 차단 | 기가입 이메일 | 1. `/register` 접근<br>2. 이메일: `flowrit-demo@example.com` / 비밀번호: `QATest1234!` 입력<br>3. 가입하기 제출 | 에러 메시지 표시, 가입 차단 | |
| A-03 | 로그인 성공 | 가입된 계정 | 1. `https://flowrit.motionbit.kr/login` 접근<br>2. 이메일: `flowrit-demo@example.com` / 비밀번호: `demo1234` 입력<br>3. 로그인 버튼 클릭 | `/dashboard`로 이동 | |
| A-04 | 로그인 실패 — 잘못된 비밀번호 | 가입된 계정 | 1. `/login` 접근<br>2. 이메일: `flowrit-demo@example.com` / 비밀번호: `wrongpassword` 입력<br>3. 로그인 버튼 클릭 | 에러 메시지 표시, 로그인 차단 | P |
| A-05 | 로그인 레이트 리밋 | — | A-04 과정을 5회 이상 반복 | 일시적 접근 차단 또는 "너무 많은 시도" 에러 메시지 표시 | |
| A-06 | 로그아웃 | `flowrit-demo@example.com`으로 로그인 상태 | 1. 사이드바 하단 또는 프로필 메뉴에서 로그아웃 클릭 | `/login`으로 이동, 재접근 시 세션 없음 확인 | P |
| A-07 | 비밀번호 찾기 — 이메일 발송 | 가입된 이메일 | 1. `https://flowrit.motionbit.kr/forgot-password` 접근<br>2. 이메일: `flowrit-demo@example.com` 입력<br>3. 전송 버튼 클릭 | 성공 메시지 표시, 해당 이메일로 재설정 링크 수신 | P |
| A-08 | 비밀번호 재설정 — 유효 토큰 | A-07 이메일 수신 | 1. 수신 이메일에서 `/reset-password/[token]` 링크 클릭<br>2. 새 비밀번호: `NewQAPass1234!` 입력<br>3. 확인 버튼 클릭 | 비밀번호 변경 성공 메시지, `/login`으로 이동 | |
| A-09 | 비밀번호 재설정 — 만료 토큰 | 취소·만료된 토큰 | 1. `https://flowrit.motionbit.kr/reset-password/invalid-token-xyz` 직접 접근 | 에러 메시지 또는 만료 안내 표시 | P |
| A-10 | 미인증 라우트 보호 | 로그아웃 상태 | 1. `https://flowrit.motionbit.kr/dashboard` 직접 접근 | `/login`으로 리다이렉트 | P |

---

## TC-B. 온보딩

| TC | 항목 | 전제 조건 | 테스트 단계 | 기대 결과 | 결과 |
|---|---|---|---|---|---|
| B-01 | 워크스페이스 생성 | A-01에서 생성한 `qa-test-001@example.com` 로그인 직후 | 1. `/onboarding` 접근 확인<br>2. 워크스페이스 이름: `QA 테스트 팀` 입력<br>3. Flowrit 시작하기 클릭 | 워크스페이스 생성, `/dashboard`로 이동 | P |
| B-02 | 슬러그 중복 방지 | 신규 계정 온보딩 화면 | 1. 워크스페이스 이름: `Flowrit Demo` (슬러그 `flowrit-demo`로 생성 시도)<br>2. 제출 | 에러 메시지 표시 ("이미 사용중인 슬러그" 등) | |

---

## TC-C. 대시보드

| TC | 항목 | 전제 조건 | 테스트 단계 | 기대 결과 | 결과 |
|---|---|---|---|---|---|
| C-01 | 대시보드 로드 | `flowrit-demo@example.com` 로그인 | `https://flowrit.motionbit.kr/dashboard` 접근 | 페이지 정상 로드, 로딩 스켈레톤 없이 완료 | P |
| C-02 | 통계 카드 표시 | 프로젝트·주문 데이터 있음 | `/dashboard` 접근 후 상단 통계 카드 확인 | 미확인 주문·진행 중 프로젝트·마감 임박 건수 숫자 표시 | P |
| C-03 | 접수 대기 섹션 | PENDING Inquiry 존재 | `/dashboard` 접근 후 "접수 대기" 섹션 확인 | 미전환 접수 항목 목록 표시 | |
| C-04 | 접수 → 프로젝트 전환 | C-03 PENDING 항목 존재 | 1. 접수 항목의 "전환" 버튼 클릭<br>2. 고객명: `이변환` / 프로젝트명: `전환 테스트 프로젝트` 입력<br>3. 확인 | 프로젝트 생성, 해당 항목 CONVERTED 처리 후 목록에서 제거 | |
| C-05 | 대시보드 반응형 (모바일) | — | 브라우저 개발자 도구에서 뷰포트 390px로 변경 후 `/dashboard` 접근 | 레이아웃 깨짐 없음, 사이드바 햄버거 메뉴 표시 및 동작 | S |

---

## TC-D. 고객 관리

| TC | 항목 | 전제 조건 | 테스트 단계 | 기대 결과 | 결과 |
|---|---|---|---|---|---|
| D-01 | 고객 목록 조회 | `flowrit-demo@example.com` 로그인 | `https://flowrit.motionbit.kr/customers` 접근 | 고객 목록 표시 | P |
| D-02 | 고객 생성 | OWNER 로그인 | 1. `https://flowrit.motionbit.kr/customers/new` 접근<br>2. 이름: `홍길동` / 회사명: `테스트 주식회사` / 이메일: `hong@test.com` / 전화번호: `010-1234-5678` 입력<br>3. 저장 | 고객 생성, `/customers` 목록 페이지로 이동 | P |
| D-03 | 고객 상세 조회 | D-02에서 생성한 `홍길동` 존재 | `/customers/[홍길동 id]` 접근 | 이름·이메일·전화번호 및 연결 프로젝트 목록 표시 | |
| D-04 | 고객 정보 수정 | D-03 상세 페이지 | 1. 이름 필드를 `홍길동 (수정)` 으로 변경<br>2. 저장 버튼 클릭 | 수정된 이름 반영 | |
| D-05 | 고객 검색 | 고객 데이터 있음 | 1. `/customers` 검색 입력란에 `홍길동` 입력 | `홍길동` 고객만 필터링 표시 | P |
| D-06 | MEMBER 고객 목록 접근 차단 | MEMBER 계정 로그인 | MEMBER 계정으로 `https://flowrit.motionbit.kr/customers` 직접 접근 | 접근 차단 또는 `/dashboard`로 리다이렉트 | |

---

## TC-E. 프로젝트 관리

| TC | 항목 | 전제 조건 | 테스트 단계 | 기대 결과 | 결과 |
|---|---|---|---|---|---|
| E-01 | 프로젝트 목록 조회 | `flowrit-demo@example.com` 로그인 | `https://flowrit.motionbit.kr/projects` 접근 | 프로젝트 목록 표시 | P |
| E-02 | 프로젝트 생성 | D-02 고객 존재, 워크플로우 템플릿 존재 | 1. `https://flowrit.motionbit.kr/projects/new` 접근<br>2. 프로젝트명: `QA 테스트 프로젝트` / 고객: `홍길동 (테스트 주식회사)` 선택 / 담당자: 본인 선택 / 마감일: `2026-07-31` 입력<br>3. 생성 버튼 클릭 | 프로젝트 생성, 스테이지 자동 복사, `/projects/[id]` 상세 페이지로 이동 | P |
| E-03 | 프로젝트 생성 — 템플릿 없음 | 워크플로우 템플릿 0개 상태 | `/projects/new` 접근 후 생성 시도 | 에러 메시지 또는 "템플릿을 먼저 만들어주세요" 안내 표시 | S |
| E-04 | 프로젝트 상세 — 기본 정보 | E-02 프로젝트 존재 | `/projects/[QA 테스트 프로젝트 id]` 접근 | 프로젝트명·고객명·담당자·마감일·현재 스테이지 표시 | |
| E-05 | 스테이지 변경 | E-04 프로젝트 상세 | 프로젝트 상세에서 스테이지 전진 버튼(→ 또는 "다음 단계") 클릭 | 현재 단계 변경 반영, 타임라인에 단계 변경 이벤트 기록 | |
| E-06 | 마지막 단계 → 완료 처리 | E-05에서 마지막 스테이지에 도달 | 마지막 스테이지로 이동 후 완료 확인 | 프로젝트 완료 상태 표시 (배지·텍스트 등) | |
| E-07 | 고객 공유 링크 복사 | E-02 프로젝트 존재 | 프로젝트 상세에서 "고객 공유 링크" 복사 버튼 클릭 | 링크 클립보드 복사, "복사됨" 피드백 표시 | |
| E-08 | 타임라인 표시 | E-05 스테이지 변경 이력 있음 | 프로젝트 상세 타임라인 탭 클릭 | 단계 변경 이벤트 시간순 목록 표시 | |
| E-09 | 담당자 변경 | 팀원 2명 이상 | 1. 프로젝트 상세 담당자 필드에서 다른 팀원 선택<br>2. 저장 | 담당자 변경 반영 | |
| E-10 | 프로젝트 목록 필터 | 프로젝트 여러 개 | 1. `/projects` 상태 필터 "진행 중" 선택<br>2. 담당자 필터 본인 선택 | 조건에 맞는 프로젝트만 표시 | P |

---

## TC-F. 수정 요청

| TC | 항목 | 전제 조건 | 테스트 단계 | 기대 결과 | 결과 |
|---|---|---|---|---|---|
| F-01 | 수정 요청 직접 등록 (MANUAL) | E-02 프로젝트 상세 수정 요청 탭 | 1. "새 수정 요청" 버튼 클릭<br>2. 제목: `메인 로고 색상 수정` / 내용: `로고 색상을 파란색에서 빨간색으로 변경해주세요.` / 우선순위: `HIGH` 선택<br>3. 제출 | 수정 요청 생성 (source: MANUAL, status: OPEN, priority: HIGH) | S |
| F-02 | 수정 요청 상태 변경 — OPEN → IN_PROGRESS | F-01 수정 요청 존재 | F-01 수정 요청 항목에서 상태 변경 버튼("처리 시작") 클릭 | 상태 `IN_PROGRESS`로 변경 반영 | S |
| F-03 | 수정 요청 상태 변경 — IN_PROGRESS → DONE | F-02 상태 IN_PROGRESS | F-02 수정 요청 항목에서 완료 버튼("완료 처리") 클릭 | 상태 `DONE`으로 변경 반영 | |
| F-04 | 수정 요청 우선순위 표시 | HIGH·MEDIUM·LOW 수정 요청 각각 존재 | 프로젝트 상세 수정 요청 탭 조회 | HIGH: 빨간 뱃지 / MEDIUM: 노란 뱃지 / LOW: 파란 뱃지(또는 색상 구분) 확인 | |
| F-05 | 수정 요청 댓글 — 작업자 작성 | F-01 수정 요청 존재 | 1. 수정 요청 항목 클릭<br>2. 댓글 입력란에 `확인했습니다. 수정 작업을 시작하겠습니다.` 입력<br>3. 제출 | 댓글 추가, WORKER 발신자로 표시 | |
| F-06 | 수정 요청 댓글 — 답글 작성 | F-05 댓글 존재 | 1. F-05 댓글의 답글 버튼 클릭<br>2. `감사합니다. 기다리겠습니다.` 입력<br>3. 제출 | 답글 추가, 들여쓰기 구조로 표시 | |
| F-07 | 전체 수정 요청 목록 | 여러 프로젝트에 수정 요청 존재 | `https://flowrit.motionbit.kr/revisions` 접근 | 전체 수정 요청 목록 표시 | P |

---

## TC-G. 납품물 (Asset)

| TC | 항목 | 전제 조건 | 테스트 단계 | 기대 결과 | 결과 |
|---|---|---|---|---|---|
| G-01 | 파일 업로드 | E-02 프로젝트 상세 납품물 탭 | 1. 납품물 탭 클릭<br>2. 파일 선택: `sample.jpg` (1MB 이하 이미지 파일)<br>3. 업로드 버튼 클릭 | 업로드 완료, `PREPARING` 상태로 납품물 목록에 표시 | |
| G-02 | 파일 업로드 — 10MB 초과 차단 | — | 납품물 탭에서 11MB 이상 파일 선택 후 업로드 시도 | 에러 메시지 표시 ("파일 크기 초과" 등), 업로드 차단 | |
| G-03 | 납품물 공유 | G-01 `PREPARING` 납품물 존재 | G-01 납품물 항목의 "공유" 버튼 클릭 | 상태 `SHARED`로 변경, 고객 포털에서 노출 확인 | |
| G-04 | 납품물 만료 처리 | G-03 `SHARED` 납품물 존재 | G-03 납품물 항목의 "만료 처리" 버튼 클릭 | 상태 `EXPIRED`로 변경 | |
| G-05 | 링크 납품물 등록 | E-02 프로젝트 상세 납품물 탭 | 1. "링크 추가" 또는 URL 입력란에 `https://www.figma.com/design/sample` 입력<br>2. 제목: `QA 피그마 링크` 입력<br>3. 등록 | 링크 납품물 목록에 표시 | |
| G-06 | 납품물 타입 필터 | 파일·링크 납품물 혼재 | 납품물 탭 타입 필터에서 `DRIVE` 또는 `DOCUMENT` 선택 | 선택한 타입만 필터링 표시 | |

---

## TC-H. 고객 포털 (공개 페이지)

> **준비**: 비로그인 시크릿 탭에서 아래 URL로 접근한다.
> 고객 포털 URL: `https://flowrit.motionbit.kr/p/24069d72-0330-4b96-b507-579db99fe7ae`

| TC | 항목 | 전제 조건 | 테스트 단계 | 기대 결과 | 결과 |
|---|---|---|---|---|---|
| H-01 | 고객 포털 접근 | 시크릿 탭(비로그인) | `https://flowrit.motionbit.kr/p/24069d72-0330-4b96-b507-579db99fe7ae` 접근 | 프로젝트 진행 현황·공유된 납품물 표시 | |
| H-02 | 고객 포털 — 비공유 납품물 미노출 | `PREPARING` 납품물 존재 (G-01 상태 유지 시) | 고객 포털 납품물 탭 확인 | `PREPARING` 상태 납품물은 목록에 표시되지 않음 | |
| H-03 | 수정 요청 접수 (고객 포털) | 고객 포털 수정 요청 탭 | 1. "수정 요청하기" 버튼 클릭<br>2. 내용: `배경 이미지를 더 밝은 톤으로 변경해주세요.` 입력<br>3. 수정 요청 제출 버튼 클릭 | 접수 성공 메시지 표시, 작업자 대시보드에 수정 요청 생성 (source: CUSTOMER_PORTAL) | P |
| H-04 | 고객 포털 댓글 작성 | H-03 수정 요청 존재 | 1. 수정 요청 항목 아래 댓글 입력란에 `네, 감사합니다.` 입력<br>2. 제출 | 댓글 추가 (CLIENT 발신자), 작업자 대시보드 인앱 알림 생성 | |
| H-05 | 유효하지 않은 토큰 | — | `https://flowrit.motionbit.kr/p/invalid-token-xyz` 접근 | 404 또는 "페이지를 찾을 수 없습니다" 에러 표시 | |

---

## TC-I. 주문서 (Order Form)

### I-1. 고객용 공개 주문서 폼

> 주문서 URL: `https://flowrit.motionbit.kr/order/flowrit-demo`

| TC | 항목 | 전제 조건 | 테스트 단계 | 기대 결과 | 결과 |
|---|---|---|---|---|---|
| I-01 | 주문서 폼 접근 | 시크릿 탭(비로그인) | `https://flowrit.motionbit.kr/order/flowrit-demo` 접근 | 주문서 폼 표시 | P |
| I-02 | 주문서 제출 | I-01 폼 표시 상태 | 1. 이름: `이순신` / 이메일: `lee@example.com` / 희망 날짜: `2026-07-15` / 예산: `500000` / 의뢰 내용: `브랜딩 디자인 작업을 의뢰합니다.` 입력<br>2. 주문서 제출하기 클릭 | "주문서가 접수되었습니다" 성공 메시지 표시, Inquiry (formType: ORDER) 생성 | P |
| I-03 | 필수 항목 미입력 차단 | I-01 폼 표시 상태 | 이름만 입력하고 나머지 필수 항목 비워두고 제출 시도 | 유효성 검사 에러 메시지 표시 | |

### I-2. 주문서 관리 대시보드

| TC | 항목 | 전제 조건 | 테스트 단계 | 기대 결과 | 결과 |
|---|---|---|---|---|---|
| I-04 | 주문서 목록 조회 | I-02 주문 접수됨, OWNER 로그인 | `https://flowrit.motionbit.kr/orders` 접근 → `주문서` 탭 | `이순신`의 PENDING 주문 목록 표시 | |
| I-05 | 주문서 → 프로젝트 전환 | I-04 `이순신` PENDING 주문 존재 | 1. 해당 주문 "프로젝트로 전환" 버튼 클릭<br>2. 프로젝트명: `이순신 브랜딩 프로젝트` 확인 후 전환 확인 | 프로젝트 생성, 주문 상태 CONVERTED, 목록에서 제거 | |
| I-06 | 주문서 무시 처리 | PENDING 주문 존재 (I-02 추가 제출 또는 다른 주문) | 1. 해당 주문 "무시" 버튼 클릭<br>2. 확인 다이얼로그 "확인" 클릭 | 주문 상태 DISMISSED, 목록에서 제거 | |
| I-07 | 사이드바 주문 뱃지 | PENDING 주문 존재 | OWNER 로그인 후 사이드바 확인 | Orders 메뉴 항목에 미처리 건수 숫자 뱃지 표시 | |

---

## TC-J. 일반 문의 접수 (Intake)

> 일반 문의 URL: `https://flowrit.motionbit.kr/intake/flowrit-demo`

| TC | 항목 | 전제 조건 | 테스트 단계 | 기대 결과 | 결과 |
|---|---|---|---|---|---|
| J-01 | 일반 문의 폼 접근 | 시크릿 탭(비로그인) | `https://flowrit.motionbit.kr/intake/flowrit-demo` 접근 | 일반 문의 접수 폼 표시 | P |
| J-02 | 일반 문의 제출 | J-01 폼 표시 상태 | 1. 이름: `강감찬` / 이메일: `kang@example.com` / 내용: `홈페이지 리뉴얼 관련 문의드립니다.` 입력<br>2. 제출 | 성공 메시지 표시, Inquiry (formType: INQUIRY) 생성, OWNER 인앱 알림 생성 | P |
| J-03 | Webhook 의뢰 접수 | `WEBHOOK_SECRET` 환경변수 설정됨 | 터미널에서 아래 명령 실행:<br>`curl -X POST https://flowrit.motionbit.kr/api/webhooks/intake/flowrit-demo -H "Authorization: Bearer {WEBHOOK_SECRET}" -H "Content-Type: application/json" -d '{"name":"웹훅 테스터","message":"인스타그램 DM 문의입니다."}'` | HTTP 201 응답, `/orders` 또는 대시보드에 Inquiry 생성 확인 | |
| J-04 | Webhook 잘못된 인증 | — | 터미널에서 아래 명령 실행:<br>`curl -X POST https://flowrit.motionbit.kr/api/webhooks/intake/flowrit-demo -H "Authorization: Bearer wrongtoken" -H "Content-Type: application/json" -d '{"name":"테스터","message":"테스트"}'` | HTTP 401 응답 반환 | |

---

## TC-K. 팀 관리 & RBAC

### K-1. 팀 초대

| TC | 항목 | 전제 조건 | 테스트 단계 | 기대 결과 | 결과 |
|---|---|---|---|---|---|
| K-01 | 팀원 초대 발송 | OWNER 로그인 | 1. `https://flowrit.motionbit.kr/team` 접근<br>2. 초대 폼에 이메일: `qa-admin@example.com` / 역할: `ADMIN` 입력<br>3. 초대 전송 | 초대 이메일 발송, 팀 페이지 초대 목록에 `qa-admin@example.com` PENDING 항목 추가 | P |
| K-02 | 초대 수락 — 기가입 계정 | K-01 초대 이메일 수신, 기가입 `qa-admin@example.com` 계정 | 1. 수신 이메일의 초대 수락 링크(`/invite/[token]`) 클릭<br>2. 기존 계정으로 로그인 | `flowrit-demo` 워크스페이스 ADMIN 멤버로 추가, `/dashboard`로 이동 | |
| K-03 | 초대 수락 — 신규 계정 | K-01 초대 이메일 수신, 미가입 이메일 | 1. 초대 링크 클릭<br>2. 이름: `팀원 테스터` / 비밀번호: `QATeam1234!` 입력 후 가입 | 계정 생성 + 워크스페이스 ADMIN 멤버로 추가, `/dashboard`로 이동 | |
| K-04 | 초대 취소 | K-01 PENDING 초대 존재 | `/team` 초대 목록에서 `qa-admin@example.com` 옆 "취소" 클릭 | 초대 항목 목록에서 제거 | S |
| K-05 | 만료 초대 링크 접근 | K-04 취소된 초대 토큰 | K-04 취소 전 복사해둔 `/invite/[token]` 링크 접근 | "유효하지 않은 초대" 에러 메시지 표시 | |

### K-2. 역할 및 권한

| TC | 항목 | 전제 조건 | 테스트 단계 | 기대 결과 | 결과 |
|---|---|---|---|---|---|
| K-06 | 역할 변경 (ADMIN → MEMBER) | OWNER 로그인, ADMIN 멤버 존재 | `/team`에서 ADMIN 멤버 역할 드롭다운 클릭 → `MEMBER` 선택 | 역할 변경 반영, 해당 멤버 재로그인 시 MEMBER 권한 적용 | |
| K-07 | 멤버 제거 | OWNER 로그인, 제거 대상 멤버 존재 | `/team`에서 대상 멤버 "제거" 버튼 클릭 → 확인 다이얼로그 승인 | 멤버 제거, 해당 멤버 assignee였던 프로젝트·수정 요청 assignee null 처리 | |
| K-08 | 소유권 이전 | OWNER 로그인, ADMIN 멤버 존재 | `/team`에서 대상 ADMIN 멤버 "소유권 이전" 버튼 클릭 → 확인 | OWNER ↔ ADMIN 역할 교체 반영 | |
| K-09 | MEMBER 제한 메뉴 | MEMBER 계정 로그인 | MEMBER 계정으로 로그인 후 사이드바 메뉴 확인 | customers·analytics·messages·settings·team·templates 메뉴 미표시 또는 접근 시 차단 | |
| K-10 | ADMIN 제한 — 설정 일부 | ADMIN 계정 로그인 | ADMIN으로 `/settings` 접근 | 설정 페이지 접근 가능, 소유권 이전 등 OWNER 전용 항목은 비표시 | |

---

## TC-L. 알림

| TC | 항목 | 전제 조건 | 테스트 단계 | 기대 결과 | 결과 |
|---|---|---|---|---|---|
| L-01 | 인앱 알림 수신 | J-02 일반 문의 제출 후 OWNER 로그인 상태 | 대시보드 상단 벨(🔔) 아이콘 확인 | 읽지 않은 알림 수 뱃지 표시 | |
| L-02 | 알림 읽음 처리 | L-01 읽지 않은 알림 존재 | 벨 아이콘 클릭 → 알림 목록에서 항목 클릭 | 해당 알림 읽음 처리, 뱃지 수 감소 또는 제거 | |
| L-03 | 의뢰 접수 알림 (이메일) | OWNER 이메일 설정됨 | J-02 일반 문의 제출 후 `flowrit-demo@example.com` 이메일 확인 | 의뢰 접수 알림 이메일 수신 | |
| L-04 | 수정 요청 알림 (이메일) | 프로젝트 담당자 이메일 설정됨 | H-03 고객 포털 수정 요청 제출 후 담당자 이메일 확인 | 수정 요청 접수 알림 이메일 수신 | |
| L-05 | 수정 요청 댓글 알림 (이메일) | 프로젝트 담당자 이메일 설정됨 | H-04 고객 포털 댓글 작성 후 담당자 이메일 확인 | 댓글 알림 이메일 수신 | |

---

## TC-M. 메시지 템플릿

| TC | 항목 | 전제 조건 | 테스트 단계 | 기대 결과 | 결과 |
|---|---|---|---|---|---|
| M-01 | 메시지 템플릿 목록 | OWNER 로그인 | `https://flowrit.motionbit.kr/messages` 접근 | 템플릿 목록 표시 | |
| M-02 | 메시지 템플릿 생성 | OWNER 로그인 | 1. 새 템플릿 버튼 클릭<br>2. 제목: `작업 완료 안내` / 내용: `안녕하세요 {{고객명}}님, {{프로젝트명}} 작업이 완료되었습니다. 확인 부탁드립니다.` 입력<br>3. 저장 | 템플릿 저장, 목록에 표시 | |
| M-03 | 변수 치환 미리보기 | M-02 템플릿 존재 | M-02 템플릿의 미리보기 버튼 클릭, 고객·프로젝트 선택 | `{{고객명}}` → 실제 고객명, `{{프로젝트명}}` → 실제 프로젝트명으로 치환된 결과 표시 | |
| M-04 | 메시지 템플릿 수정 | M-02 템플릿 존재 | 1. 템플릿 편집 버튼 클릭<br>2. 제목을 `작업 완료 안내 (수정)` 으로 변경<br>3. 저장 | 수정된 제목 반영 | |
| M-05 | 메시지 템플릿 삭제 | M-04 템플릿 존재 | 템플릿 삭제 버튼 클릭 → 확인 | 템플릿 목록에서 제거 | |

---

## TC-N. 워크플로우 템플릿

| TC | 항목 | 전제 조건 | 테스트 단계 | 기대 결과 | 결과 |
|---|---|---|---|---|---|
| N-01 | 워크플로우 템플릿 목록 | OWNER 로그인 | `https://flowrit.motionbit.kr/templates` 접근 | 템플릿 목록 표시 | |
| N-02 | 워크플로우 템플릿 생성 | OWNER 로그인 | 1. 새 템플릿 버튼 클릭<br>2. 이름: `QA 디자인 플로우` 입력 후 저장<br>3. 스테이지 추가 — ①내부명: `시안 작업` / 고객명: `디자인 작업 중` ②내부명: `수정 반영` / 고객명: `수정 작업 중` ③내부명: `최종 납품` / 고객명: `완료` | 템플릿 및 3개 스테이지 저장 | |
| N-03 | 스테이지 순서 변경 | N-02 스테이지 3개 존재 | `수정 반영` 스테이지를 드래그 또는 화살표로 `시안 작업` 위로 이동 | 변경된 순서 반영 | |
| N-04 | 프로젝트 생성 시 템플릿 적용 | N-02 템플릿 존재 | 프로젝트 생성(`/projects/new`)에서 `QA 디자인 플로우` 템플릿 선택 후 생성 | 해당 스테이지 목록이 프로젝트에 복사됨 | |

---

## TC-O. 통계 (Analytics)

| TC | 항목 | 전제 조건 | 테스트 단계 | 기대 결과 | 결과 |
|---|---|---|---|---|---|
| O-01 | 통계 페이지 접근 | OWNER 로그인 | `https://flowrit.motionbit.kr/analytics` 접근 | 통계 차트·지표 표시 | |
| O-02 | 기간 필터 | 데이터 존재 | `/analytics`에서 기간 필터 드롭다운을 `이번 달` → `지난 7일` 로 변경 | 선택 기간에 맞게 수치·차트 갱신 | |
| O-03 | 접수 추이 차트 | Inquiry 데이터 존재 | `/analytics` 접수 추이 차트 섹션 확인 | 기간별 접수 건수 막대/선 차트 표시 | |
| O-04 | MEMBER 접근 차단 | MEMBER 계정 로그인 | MEMBER 계정으로 `https://flowrit.motionbit.kr/analytics` 직접 접근 | 접근 차단 또는 `/dashboard`로 리다이렉트 | |

---

## TC-P. 설정

| TC | 항목 | 전제 조건 | 테스트 단계 | 기대 결과 | 결과 |
|---|---|---|---|---|---|
| P-01 | 워크스페이스 정보 수정 | OWNER 로그인 | 1. `https://flowrit.motionbit.kr/settings` 접근<br>2. 워크스페이스 이름 필드를 `Flowrit Demo (QA)` 로 변경<br>3. 저장 | 변경된 이름 반영 | P |
| P-02 | 일반 문의·주문서 링크 표시 | OWNER 로그인 | `/settings` 링크 섹션 확인 | 일반 문의 폼: `https://flowrit.motionbit.kr/intake/flowrit-demo` / 주문서: `https://flowrit.motionbit.kr/order/flowrit-demo` 표시 및 복사 버튼 동작 | P |
| P-03 | Webhook 설정 — 탭 표시 | OWNER 로그인 | `/settings` Webhook 탭 클릭 | 인스타그램·카카오채널·네이버 톡톡 탭 표시 및 각 탭별 가이드 내용 표시 | P |
| P-04 | 테스트 의뢰 전송 | OWNER 로그인, Webhook 탭 | Webhook 탭 내 "테스트 의뢰 전송" 버튼 클릭 | 성공 피드백 표시, 대시보드 접수 목록에 테스트 Inquiry 항목 생성 | |
| P-05 | 알림 설정 변경 | OWNER 로그인 | 1. `/settings` 알림 설정 섹션에서 `수정 요청 알림` 이메일 OFF<br>2. 저장<br>3. H-03 수정 요청 제출 후 이메일 미수신 확인 | 저장 성공, 해당 타입 이메일 알림 미발송 | |

---

## TC-Q. 데이터 내보내기

| TC | 항목 | 전제 조건 | 테스트 단계 | 기대 결과 | 결과 |
|---|---|---|---|---|---|
| Q-01 | 고객 데이터 CSV 내보내기 | OWNER 로그인, 고객 데이터 존재 | `/settings` 또는 `/customers` 내보내기 버튼 클릭 | `customers.csv` 파일 다운로드, `홍길동` 행 포함 확인 | |
| Q-02 | 프로젝트 데이터 CSV 내보내기 | OWNER 로그인, 프로젝트 데이터 존재 | `/settings` 또는 `/projects` 내보내기 버튼 클릭 | `projects.csv` 파일 다운로드, `QA 테스트 프로젝트` 행 포함 확인 | |

---

## TC-R. 결제 & 구독 (NicePayments)

> **주의**: 결제 테스트는 NicePayments 테스트 모드에서만 실행한다. 실카드 사용 금지.

| TC | 항목 | 전제 조건 | 테스트 단계 | 기대 결과 | 결과 |
|---|---|---|---|---|---|
| R-01 | 구독 플랜 페이지 접근 | OWNER 로그인 | `https://flowrit.motionbit.kr/billing` 접근 | 플랜 목록·현재 구독 상태 표시 | S |
| R-02 | 카드 등록 (테스트 카드) | NicePayments 테스트 모드 활성 | 1. Pro 플랜 선택<br>2. 테스트 카드번호: `4111-1111-1111-1111` / 유효기간: `12/26` / CVC: `123` 입력<br>3. 결제 진행 | 결제 성공, Pro 구독 활성화, `/billing/callback` 정상 처리 후 구독 상태 갱신 | |
| R-03 | 결제 콜백 처리 | R-02 완료 | `/billing` 재접근 후 구독 상태 확인 | 결제 결과 DB 반영, Pro 구독 활성 상태 표시 | |
| R-04 | 구독 취소 | R-02 Pro 구독 활성 상태 | `/billing`에서 구독 취소 버튼 클릭 → 확인 | 구독 종료일 설정, "구독이 취소되었습니다" 메시지 | |

---

## TC-S. 시스템 & 운영

| TC | 항목 | 전제 조건 | 테스트 단계 | 기대 결과 | 결과 |
|---|---|---|---|---|---|
| S-01 | Health Check — 공개 요약 | — | 브라우저 또는 curl로 `GET https://flowrit.motionbit.kr/api/health` 호출 | HTTP 200, `{"status":"ok",...}` JSON 반환 | P |
| S-02 | Health Check — 상세 (토큰) | `HEALTHCHECK_TOKEN` 값 보유 | `GET https://flowrit.motionbit.kr/api/health?token={HEALTHCHECK_TOKEN}` 호출 | HTTP 200, DB 연결 상태·환경변수 체크 포함 상세 JSON 반환 | |
| S-03 | Health Check — 잘못된 토큰 | — | `GET https://flowrit.motionbit.kr/api/health?token=wrongtoken` 호출 | HTTP 401 응답 또는 공개 요약만 반환 | P |
| S-04 | 404 페이지 | — | `https://flowrit.motionbit.kr/nonexistent-page-xyz` 접근 | Flowrit 브랜드 404 페이지 표시, 홈으로 돌아가기 버튼 동작 | P |
| S-05 | Discord 운영 알림 수신 | Discord Webhook URL 설정됨 | J-03 Webhook 의뢰 접수 또는 P-04 테스트 의뢰 전송 실행 | Discord 채널에 운영 알림 메시지 수신 | |
| S-06 | 랜딩 페이지 | — | `https://flowrit.motionbit.kr/` 접근 | 랜딩 페이지 표시, "무료로 시작하기" 또는 "로그인" CTA 버튼 동작 | P |
| S-07 | 이용약관·개인정보처리방침 | — | `https://flowrit.motionbit.kr/terms` 및 `https://flowrit.motionbit.kr/privacy` 각각 접근 | 각 페이지 정상 렌더링 | P |
| S-08 | 전역 로딩 화면 | — | 브라우저 개발자 도구 네트워크 탭에서 Slow 3G 설정 후 `/dashboard` 새로고침 | 로딩 스켈레톤 또는 Flowrit 로딩 UI 표시 후 완료 | |

---

## 이슈 로그

Fail(`F`) 항목을 아래 형식으로 기록한다.

| TC | 제목 | 재현 단계 | 기대 결과 | 실제 결과 | 스크린샷/링크 | 우선순위 | 처리 상태 |
|---|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — | — |

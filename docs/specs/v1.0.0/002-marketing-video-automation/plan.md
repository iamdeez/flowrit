# Plan: 마케팅 홍보 영상 자동 제작 플로우

> Branch: 002-marketing-video-automation | Date: 2026-06-24 | Spec: [spec.md](spec.md)

## 사전 검증 (Constitution Gates)

- [x] **P-001 워크스페이스 데이터 격리**: 홍보 영상 자동화는 `PROMO_*`로 지정된 데모 workspace만 대상으로 실행한다. 앱 내부 DB 조회를 추가하는 경우 반드시 `workspaceId` scope를 적용한다.
- [x] **P-002 RBAC 역할 경계**: 인증 대시보드 촬영은 데모 계정의 실제 권한으로 로그인한다. MEMBER 제한 경로를 우회하는 별도 인증 수단을 만들지 않는다.
- [x] **P-003 NextAuth JWT 세션**: 로그인은 기존 NextAuth 세션 흐름을 사용한다. 촬영 전용 bypass token 또는 임의 세션 주입은 사용하지 않는다.
- [x] **P-004 Next.js 버전 준수**: 앱 코드 변경이 필요한 경우 Next.js 16 App Router, Route Handler, Server Action, `proxy.ts` 구조를 유지한다.
- [x] **P-005 파일 업로드 크기**: 본 스펙은 파일 업로드 제한을 변경하지 않는다. 홍보용 데모 파일도 기존 `MAX_UPLOAD_SIZE` 정책을 따른다.
- [x] **P-006 테스트 원칙**: 신규 시나리오 DSL, 민감 정보 검사, 번들 manifest 생성은 Vitest 테스트를 갖춘다. 브라우저 녹화는 Playwright smoke test로 검증한다.

**예외 사항**: 없음.

## 기술 컨텍스트

- **언어 / 런타임**: TypeScript, Node.js, Next.js 16.2.9, React 19
- **자동화**: Playwright
- **영상 후처리**: ffmpeg 또는 Playwright video 원본 정리
- **출력 형식**: MP4, PNG, Markdown, JSON
- **외부 편집/게시**: CapCut 데스크톱/웹 수동 편집, Meta Graph API는 후속 자동 게시 범위
- **운영 환경**: 로컬 또는 CI runner. Vercel serverless runtime에서 실행하지 않음

## 아키텍처

```
Promo Scenario
  → HumanDirector
  → Playwright Browser Recording
  → Raw Clip / Screenshots
  → Bundle Renderer
  → Output Bundle
      ├─ source.mp4
      ├─ cover.png
      ├─ screenshots/*.png
      ├─ manifest.json
      ├─ caption.md
      └─ capcut-brief.md
```

## 모듈 설계

### 1. 시나리오 DSL

`scripts/promo/scenarios/*.ts`는 각 홍보 영상의 장면 순서를 정의한다.

```typescript
type PromoScenario = {
  id: string
  title: string
  durationTargetSec: 15 | 30 | 45
  viewport: 'mobile-reels' | 'desktop-framed'
  run: (director: HumanDirector) => Promise<void>
}
```

기본 시나리오:

| 시나리오 | 핵심 메시지 | 주요 화면 |
|---|---|---|
| `owner-dashboard` | 오늘 할 일을 한 화면에서 관리 | dashboard, projects |
| `client-portal` | 고객은 링크 하나로 진행 단계와 납품 이력을 확인 | `/p/[token]` |
| `revision-to-delivery` | 수정 요청부터 재납품, 완료 확정까지 연결 | project detail, customer portal |

### 2. HumanDirector

`HumanDirector`는 Playwright `Page`를 감싸고 영상용 동작 속도를 통일한다.

필수 메서드:

- `goto(url, options)`
- `hover(locator, label)`
- `click(locator, label)`
- `type(locator, text, options)`
- `scrollTo(locator | position)`
- `pause(ms, reason)`
- `spotlight(locator, label)`
- `screenshot(name)`

원칙:

- 클릭 전 hover와 300~800ms pause를 둔다.
- 입력은 한 번에 fill하지 않고 25~80ms 간격으로 타이핑한다.
- 장면 전환은 최소 700ms 이상 유지한다.
- 사용자가 읽어야 하는 메시지는 1.2초 이상 화면에 머문다.

### 3. 녹화 실행기

`scripts/promo/record.ts`

역할:

- CLI 인자 파싱: `--scenario`, `--output`, `--duration`, `--headed`
- `PROMO_*` 환경변수 검증
- 데모 workspace 안전장치 검증
- Playwright browser context 생성
- 시나리오 실행
- 실패 시 screenshot과 log 기록

명령 예시:

```bash
npm run promo:record -- --scenario client-portal
```

### 4. 번들 렌더러

`scripts/promo/bundle.ts`

역할:

- 녹화 결과물을 `artifacts/promo/{runId}`로 정리
- 커버 이미지 생성 또는 대표 screenshot 지정
- `manifest.json` 생성
- `caption.md` 생성
- `capcut-brief.md` 생성
- 민감 정보 검사 실행

### 5. 민감 정보 검사

검사 대상:

- `manifest.json`
- `caption.md`
- `capcut-brief.md`
- 실행 로그
- 스크린샷 OCR은 MVP 범위에서는 수동 검토 체크리스트로 처리하고, 후속으로 OCR 검사를 추가한다.

차단 패턴:

- 이메일
- JWT/token-like 문자열
- `secret`, `password`, `authorization`, `cookie`, `database_url`, `webhook`
- 사용자가 지정한 blacklist 고객명/회사명

### 6. CapCut handoff

MVP는 자동 업로드 대신 handoff 패키지를 만든다.

`capcut-brief.md` 포함 내용:

- 영상 목표
- 타깃 고객
- 장면별 설명
- 원본 영상/스크린샷 파일명
- 브랜드 톤앤매너
- 금지 표현과 개인정보 주의사항

CapCut은 공식 자동 생성 CLI에 의존하지 않고 수동 편집 handoff로 운영한다. 후속 자동화가 필요하면 CapCut 프로젝트 파일 생성 가능성을 별도 조사한다.

### 7. Instagram 게시 준비

MVP는 수동 게시 자료를 만든다.

`caption.md` 포함 내용:

- 1줄 hook
- 2~3문장 value proposition
- CTA
- 해시태그
- 게시 전 체크리스트

자동 게시를 구현하는 경우:

- `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_BUSINESS_ACCOUNT_ID`, `META_APP_ID` 등은 환경변수 또는 보안 저장소만 사용한다.
- 기본 모드는 `review-only`이며, 명시적 `--publish`가 있을 때만 게시한다.
- production 계정 게시 전 preview/staging 계정으로 dry run을 수행한다.

## 데이터 및 출력 계약

### 환경변수

| 변수 | 필수 | 설명 |
|---|---|---|
| `PROMO_BASE_URL` | 예 | 촬영 대상 Flowrit URL |
| `PROMO_EMAIL` | 예 | 촬영 전용 데모 계정 이메일 |
| `PROMO_PASSWORD` | 예 | 촬영 전용 데모 계정 비밀번호 |
| `PROMO_WORKSPACE_SLUG` | 예 | 데모 workspace slug |
| `PROMO_PUBLIC_TOKEN` | 예 | 고객 포털 공개 token |
| `PROMO_PROJECT_ID` | 선택 | 특정 데모 프로젝트 id |
| `PROMO_OUTPUT_DIR` | 선택 | 기본값 `artifacts/promo` |
| `PROMO_BLACKLIST` | 선택 | 산출물에 포함되면 실패시킬 문자열 목록 |
| `INSTAGRAM_ACCESS_TOKEN` | 후속 | 자동 게시 시 사용 |
| `INSTAGRAM_BUSINESS_ACCOUNT_ID` | 후속 | 자동 게시 시 사용 |

### manifest 예시

```json
{
  "runId": "20260624-030000-client-portal",
  "scenario": "client-portal",
  "baseUrl": "https://preview.flowrit.example",
  "viewport": { "width": 430, "height": 932 },
  "durationTargetSec": 30,
  "createdAt": "2026-06-24T03:00:00.000Z",
  "files": {
    "sourceVideo": "source.mp4",
    "cover": "cover.png",
    "caption": "caption.md",
    "capcutBrief": "capcut-brief.md"
  }
}
```

## 테스트 전략

| 수용 기준 | 테스트 |
|---|---|
| `SC-001` | Playwright smoke: `owner-dashboard` 녹화 실행 후 MP4 파일 존재 확인 |
| `SC-002` | Vitest: scenario registry에 기본 3개 시나리오 등록 확인 |
| `SC-003` | Vitest: 필수 `PROMO_*` 누락과 workspace mismatch 시 실행 차단 |
| `SC-004` | Vitest: bundle renderer가 필수 파일 목록과 manifest를 생성 |
| `SC-005` | Vitest: 민감 정보 scanner가 이메일/token/blacklist를 탐지 |
| `SC-006` | Vitest: CapCut 계정 없이도 edit brief 생성 |
| `SC-007` | Vitest: Instagram token 없이도 caption 생성 |
| `SC-008` | Playwright failure fixture: 실패 시 screenshot/log 생성 |
| `SC-009` | Playwright screenshot: 390px/430px 모바일 viewport에서 주요 텍스트 잘림 없음 확인 |
| `SC-010` | Vitest: publish option 기본값이 `review-only`인지 확인 |

## 구현 순서

1. 데모 데이터와 환경변수 계약 확정
2. `scripts/promo` 시나리오 DSL과 HumanDirector 구현
3. Playwright 녹화 실행기 구현
4. 번들 렌더러와 caption/edit brief 템플릿 구현
5. 민감 정보 검사 구현
6. 기본 시나리오 3개 작성
7. Vitest와 Playwright smoke 검증 추가
8. 운영자 문서와 준비 체크리스트 작성
9. CapCut 수동 편집 운영과 Instagram 자동 게시 가능 여부에 따라 후속 Phase 진행

## 운영 준비 사항

- 촬영 대상은 production 실데이터가 아닌 preview/staging/demo 환경으로 제한한다.
- 데모 프로젝트는 촬영 전에 고정된 상태로 reset 가능해야 한다.
- 로컬 촬영 PC 또는 CI runner에 Chromium, Playwright browser, ffmpeg 설치 여부를 확인한다.
- 게시 전 결과물을 사람이 검토하는 단계를 유지한다.
- 자동 게시가 활성화되면 Discord 운영 알림과 실패 로그를 연결한다.

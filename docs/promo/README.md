# Flowrit 홍보 영상 자동 제작 가이드

Flowrit의 실제 UI를 Playwright로 조작해 Instagram Reels용 소스 번들을 생성한다. 이 자동화는 QA 테스트가 아니라 영상 연출용이므로 클릭, 타이핑, 스크롤에 의도적인 pause가 포함된다.

## 준비물

- 촬영 전용 Flowrit 데모 계정
- 데모 workspace slug
- 데모 프로젝트 id
- 고객 포털 public token
- 공개 가능한 고객명, 프로젝트명, 수정 요청, 납품 파일명
- 로고, 제품 한 줄 소개, CTA URL, Instagram 계정명

## 환경변수

`.env.local`에 다음 값을 설정한다.

```bash
PROMO_BASE_URL="http://localhost:3000"
PROMO_EMAIL="promo-demo@example.com"
PROMO_PASSWORD="..."
PROMO_WORKSPACE_SLUG="demo-workspace"
PROMO_PUBLIC_TOKEN="..."
PROMO_PROJECT_ID="..."
PROMO_OUTPUT_DIR="artifacts/promo"
PROMO_BLACKLIST="real-customer-name,real-company-name"
```

production 실데이터 촬영은 기본 차단된다. 정말 production 도메인에서 demo-only workspace를 촬영해야 하는 경우에만 `PROMO_ALLOW_PRODUCTION=true`를 설정한다.

## 실행

먼저 준비 상태를 확인한다.

```bash
npm run promo:doctor
```

`PROMO_*` 값과 ffmpeg가 준비되면 실제 녹화를 실행한다.

```bash
npm run promo:record -- --scenario owner-dashboard
npm run promo:record -- --scenario client-portal
npm run promo:record -- --scenario revision-to-delivery
```

생성 위치:

```text
artifacts/promo/{runId}/
├── source.mp4
├── source.webm
├── cover.png
├── screenshots/
├── manifest.json
├── caption.md
└── capcut-brief.md
```

## 게시 전 확인

- `caption.md`의 CTA가 실제 프로필 링크와 맞는지 확인한다.
- `capcut-brief.md`의 hook, caption, CTA를 CapCut 프로젝트에 반영한다.
- `cover.png`에서 제품 화면과 핵심 문구가 읽히는지 확인한다.
- `manifest.json`에 실제 고객명, 이메일, 토큰이 없는지 확인한다.
- `npm run promo:check -- --dir artifacts/promo/{runId}`를 실행한다.

`source.mp4` 생성을 위해서는 로컬 또는 CI runner에 ffmpeg가 필요하다. ffmpeg가 없으면 Playwright 원본인 `source.webm`만 남고, Instagram 게시 전 MP4 변환을 별도로 수행해야 한다.

## Playwright smoke

데모 포털 값이 준비되면 다음 환경변수로 smoke 검증을 실행한다.

```bash
PROMO_RECORDING_SMOKE=true \
PROMO_BASE_URL="http://localhost:3000" \
PROMO_PUBLIC_TOKEN="..." \
npx playwright test tests/e2e/promo-recording.spec.ts --project=desktop-chrome
```

이 검증은 실제 게시나 데이터 변경 없이 고객 포털 접근, 핵심 문구 노출, 촬영용 screenshot 생성을 확인한다.

## 시나리오

| 시나리오 | 설명 |
|---|---|
| `owner-dashboard` | 작업자가 대시보드와 프로젝트에서 오늘 할 일, 수정 요청, 납품 상태를 확인하는 흐름 |
| `client-portal` | 고객이 링크로 진행 단계와 납품 이력을 확인하는 흐름 |
| `revision-to-delivery` | 수정 요청 확인 후 재납품과 고객 확정 흐름을 보여주는 시나리오 |

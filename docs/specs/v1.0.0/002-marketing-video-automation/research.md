# Research: 마케팅 홍보 영상 자동 제작 플로우

> Branch: 002-marketing-video-automation | Date: 2026-06-24 | Version: v1.0.0

## 조사 목적

Flowrit의 실제 동작 화면을 기반으로 Instagram Reels용 홍보 영상 소스를 자동 제작하는 플로우를 설계한다. 목표는 QA 테스트처럼 빠르게 지나가는 녹화가 아니라, 사람이 제품을 소개하는 것처럼 자연스러운 속도와 시선 흐름을 가진 9:16 영상 번들을 반복 생성하는 것이다.

## 기존 코드베이스 현황

- Next.js 16.2.9 App Router, React 19, TypeScript 기반이다.
- Playwright가 devDependency로 설치되어 있고 `playwright.config.ts`, `tests/e2e/` 기반 E2E 전략이 존재한다.
- 고객 공개 포털은 `/p/[token]`, 공개 주문서는 `/order/[workspaceSlug]`, 공개 문의는 `/intake/[workspaceSlug]` 경로를 사용한다.
- 인증 대시보드는 `/dashboard`, `/projects`, `/orders`, `/settings` 등으로 구성되어 있다.
- 파일 업로드는 `app/api/upload/route.ts`, `lib/storage.ts`, `lib/client-upload.ts`, `lib/upload-constants.ts`를 통해 Cloudflare R2 presigned URL 방식으로 처리한다.
- 운영 알림은 `lib/ops-alert.ts`, 민감 정보 제거는 `lib/ops-sanitize.ts`를 통해 Discord Webhook으로 전송한다.
- 현재 스펙 문서상 Playwright E2E는 검증 목적이다. 홍보 영상 제작용 자동 연출 스크립트는 아직 없다.

## 외부 시스템 조사

### CapCut

- CapCut은 무료 편집, 자막, 템플릿, 배경 음악, 내보내기 용도로 사용한다.
- 본 스펙에서는 CapCut을 AI 영상 생성 도구가 아니라 최종 편집 도구로 본다.
- MVP는 Flowrit에서 생성한 원본 영상, 장면별 편집 브리프, 캡션을 CapCut에 수동으로 넘길 수 있는 handoff 패키지를 만든다.
- 유료 템플릿이나 Pro-only 효과에 의존하지 않는 편집 가이드를 기본으로 한다.

참고: [CapCut Desktop](https://www.capcut.com/tools/desktop-video-editor)

### Instagram Reels / Meta

- Instagram Content Publishing은 Meta 개발자 플랫폼의 권한, OAuth 토큰, Professional Instagram 계정, Facebook Page 연결, 앱 검수 조건이 필요하다.
- 자동 게시까지 MVP에 포함하면 외부 승인과 운영 리스크가 커진다.
- MVP는 Reels 게시용 MP4, 커버 이미지, 캡션, 해시태그, CTA 문구를 생성하고, 실제 자동 게시 연동은 별도 단계로 분리한다.

참고: [Meta Instagram Content Publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing/)

## 설계 결정

### 결정 1. Playwright를 QA가 아닌 영상 연출 도구로 재사용

- 이유: 실제 제품 UI를 자동으로 조작하고, 브라우저 뷰포트·마우스·키보드·대기 시간을 제어할 수 있다.
- 대안: 수동 화면 녹화, SVG/슬라이드 기반 모션 제작, 전용 데모 앱 구축.
- 결정: Playwright 스크립트에 `HumanDirector` 유틸을 추가해 느린 클릭, hover, scroll, typing, pause, focus highlight를 제공한다.

### 결정 2. 첫 구현은 "소스 번들 자동 생성"까지로 제한

- 이유: 무료 운영을 우선하므로 AI 영상 생성 크레딧을 쓰지 않고 CapCut에서 사람이 빠르게 마감할 수 있게 한다.
- 범위: 원본 UI 녹화 MP4, 컷별 스크린샷, 커버 이미지, CapCut 편집 브리프, Reels 캡션/해시태그를 생성한다.
- 후속: Meta Graph API 접근이 확보되면 게시 예약을 확장한다.

### 결정 3. 운영 데이터 대신 데모 워크스페이스만 사용

- 이유: 홍보 영상에는 실제 고객명, 파일 URL, 결제 정보, 이메일, 내부 메모가 노출되면 안 된다.
- 결정: `PROMO_*` 환경변수로 지정한 데모 계정과 데모 프로젝트만 사용하고, 스크립트 시작 시 workspace slug 또는 project id를 검증한다.

### 결정 4. 9:16 세로 영상이 기본, 1:1과 16:9는 파생 산출물

- 이유: 사용자가 Instagram Reels 게시를 목표로 한다.
- 결정: 기본 viewport는 390x844 또는 430x932 계열 모바일 비율을 사용하되, 대시보드 설명 컷은 1080x1920 캔버스 안에 브라우저 프레임을 배치하는 렌더 단계를 둔다.

## 예상 영향 파일

| 파일/디렉토리 | 변경 유형 | 내용 |
|---|---|---|
| `scripts/promo/` | 신규 | 홍보 영상 자동 제작 CLI와 시나리오 |
| `scripts/promo/scenarios/*.ts` | 신규 | Reels별 장면 흐름 정의 |
| `scripts/promo/lib/human-actions.ts` | 신규 | 느린 클릭, 타이핑, 스크롤, 포커스 연출 유틸 |
| `scripts/promo/lib/recording.ts` | 신규 | Playwright context, viewport, trace/video 설정 |
| `scripts/promo/lib/render.ts` | 신규 | 원본 녹화 파일 정리, 커버 이미지, 메타데이터 생성 |
| `scripts/promo/templates/` | 신규 | CapCut 편집 브리프, 캡션, 해시태그 템플릿 |
| `scripts/seed-promo-demo.ts` | 신규 가능 | 데모 워크스페이스/프로젝트/고객 데이터 시드 |
| `package.json` | 수정 | `promo:record`, `promo:bundle`, `promo:seed` 스크립트 추가 |
| `.env.example` | 수정 | `PROMO_BASE_URL`, `PROMO_EMAIL`, `PROMO_PASSWORD`, `PROMO_PUBLIC_TOKEN` 등 placeholder 추가 |
| `tests/promo/*.test.ts` | 신규 | 시나리오 DSL, 민감 정보 검사, 번들 생성 테스트 |
| `docs/promo/` | 신규 가능 | 운영자용 촬영 가이드와 게시 체크리스트 |

## 주요 리스크

- UI가 바뀌면 영상 시나리오 selector가 깨질 수 있다.
- Playwright 기본 video는 브라우저 context 단위 원본이라 편집 품질이 제한될 수 있다. 필요 시 ffmpeg 후처리가 필요하다.
- 로컬/CI 환경에 ffmpeg가 없으면 최종 MP4 합성이 실패한다.
- 실제 계정 데이터가 영상에 노출될 수 있으므로 데모 데이터 검증이 필수다.
- Instagram 자동 게시는 Meta 앱 권한과 검수 상태에 따라 일정이 크게 흔들릴 수 있다.
- CapCut 최종 편집은 사람이 확인해야 하며, 무료 템플릿과 상업 사용 가능한 음원만 사용해야 한다.

## 구현 전 확인 사항

- 사용자가 공개 가능한 데모 프로젝트와 고객명을 제공해야 한다.
- Flowrit 브랜드 문구, 로고, 대표 색상, CTA URL이 확정되어야 한다.
- CapCut 데스크톱 앱 또는 웹 편집 환경과 무료 내보내기 설정을 확인해야 한다.
- Instagram 자동 게시가 목표라면 Meta Business, Instagram Professional 계정, Facebook Page, Meta App 설정이 필요하다.

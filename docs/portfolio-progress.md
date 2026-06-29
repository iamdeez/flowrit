# 포트폴리오 제작 진행 상황 & 남은 할 일

> 최종 갱신: 2026-06-28 · 목적: Flowrit 취업용 포트폴리오 제작 추적 (다음 세션 참고용)

## 산출물 위치

| 파일 | 내용 |
|---|---|
| `portfolio.md` (루트) | 메인 포트폴리오 문서 — 배경·아키텍처·ERD·솔루션·트러블슈팅·배포/운영·품질 (8개 섹션) |
| `docs/diagrams/d01~d18.png` | Mermaid 다이어그램 렌더링 결과 (18개) |
| `docs/diagrams/d01~d18.mmd` | 다이어그램 편집용 소스 (수정 시 이 파일 고치고 재렌더링) |
| `docs/diagrams/{mermaid,puppeteer}.json` | 렌더링 설정 |
| `docs/screenshots/*.png` | landing · dashboard · team · messages |
| `README.md` | portfolio 링크 + 토폴로지(d02)·ERD(d05) 다이어그램 + 스크린샷 반영 |

## 완료된 작업

- [x] `portfolio.md` 작성 — 코드베이스(`prisma/schema.prisma`, `lib/`, `proxy.ts`, `vercel.json`, CI) 근거 기반
- [x] Mermaid 다이어그램 18개 작성 (아키텍처·ERD·시퀀스·상태·RBAC·CI/배포 등)
- [x] **Mermaid → PNG 변환**: VS Code 기본 미리보기가 mermaid 미지원 → 어떤 뷰어에서도 보이도록 PNG 이미지로 교체. 시스템 Chrome + `@mermaid-js/mermaid-cli`(npx)로 렌더링, 흰 배경·2배 스케일
- [x] 스크린샷 4종 본문 배치 (히어로/배경/RBAC)
- [x] `README.md` 반영 — portfolio 링크, 데이터 모델 섹션 신설, 메시지 스크린샷 추가
- [x] 전체 이미지·링크 경로 존재 검증 (깨진 경로 0)

## 재렌더링 방법 (다이어그램 수정 시)

```bash
# 1) 특정 다이어그램 소스 수정: docs/diagrams/dNN.mmd
# 2) 재렌더링 (시스템 Chrome 사용)
export PUPPETEER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
npx -y @mermaid-js/mermaid-cli@latest -i docs/diagrams/dNN.mmd -o docs/diagrams/dNN.png \
  -p docs/diagrams/puppeteer.json -c docs/diagrams/mermaid.json -b white -s 2
```

## 남은 할 일

### A. 게시·검증 (우선)
- [ ] `git add` → commit → push (사용자가 직접 실행). 대상: `portfolio.md`, `README.md`, `docs/diagrams/*`, `docs/screenshots/*`
- [ ] GitHub 웹에서 다이어그램·스크린샷·링크 정상 렌더링 확인
- [ ] 포트폴리오 최종 호스팅 형태 결정 (GitHub README / Notion / PDF export 중)

### B. 콘텐츠 보강
- [ ] **본인 역할·기여도** 강조 문단 추가 (1인 풀스택, 담당 범위 구체화)
- [x] **검증 지표 추가** — 테스트 168개, Playwright E2E 21 specs, DB-backed 주문 페이지 성능 baseline 기록
- [ ] **라이브 데모 URL + 데모 계정**(`flowrit-demo@example.com` / `demo1234`) 안내 추가
- [ ] 스크린샷 추가 촬영: 고객 포털(`/p/[token]`), 공개 주문서, 프로젝트 상세, 분석 대시보드, 결제/구독 화면
- [ ] (선택) **영문 버전** `portfolio.en.md`
- [ ] (선택) **면접 예상 Q&A** 섹션 — 기술 선택 이유, 트러블슈팅 심화

### C. 사실 정합성 정리
- [ ] **Cron 문서 불일치 해소**: `vercel.json`은 단일 `/api/cron/daily`인데 `.claude/docs/infra.md`·`context.md`는 크론 2개(`deadline-reminder`, `billing`)로 기재됨. portfolio는 TS-4(Hobby 1-크론 통합)로 반영 완료. infra.md/context.md도 실제 상태에 맞게 갱신 필요
- [ ] portfolio 수치·경로 최종 교차검증 (테스트 수, 레이트리밋 정책, 결제 금액 등)

## 메모

- `docs/diagrams/`, `docs/screenshots/`는 `.gitignore` 제외 규칙 없음 → 그대로 커밋되면 GitHub에서 표시됨
- 본 파일은 작업 추적용. 포트폴리오 본문은 `portfolio.md`가 SoT

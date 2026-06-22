---
작성: Pipeline Orchestration (main session)
버전: v1.0
최종 수정: 2026-06-22
---

# 선택 단계 활성화 여부 — 001-revision-comment-threads

| Agent | 활성화 | 근거 |
|---|---|---|
| Database Design Agent | Y | RevisionComment 신규 Prisma 모델 + 마이그레이션 필요 |
| Deploy Agent | N | Vercel 자동 배포 — 별도 설정 변경 없음 |
| Security Agent | Y | 클라이언트 토큰 기반 공개 댓글 작성 로직 — 인증 경계 감사 필요 |
| Performance Agent | N | 단순 CRUD + 인덱스 설계 완료 — 별도 성능 검증 불필요 |

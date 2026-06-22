---
작성: Design Agent
버전: v1.0
최종 수정: 2026-06-22
---

# Gaps — 001-revision-comment-threads

## GAP-001

- **상태**: RESOLVED
- **유형**: 문서-갱신-필요
- **출처**: Design Agent
- **컨텍스트**: context.md 부정합 사전 점검 (research.md)
- **내용**:
  - `context.md §4 엔티티 관계도`에 `RevisionRequest` 하위 `RevisionComment[]` 추가 필요.
  - `context.md §3.2 이벤트 흐름` NotificationType 표에 `REVISION_COMMENT` 타입 추가 필요.
- **담당**: 6단계 Docs Agent
- **우선순위**: LOW (문서화 누락, 기능에 영향 없음)
- **해결**: `.claude/docs/context.md`에 `RevisionComment` 관계와 `REVISION_COMMENT` 이벤트 타입 반영.

---

## GAP-002

- **상태**: RESOLVED
- **유형**: 문서-갱신-필요
- **출처**: Docs Agent
- **컨텍스트**: context.md (PATCH-A10)
- **내용**:
  - `context.md §1 "현재 버전"` 필드를 v0.4.0 → v0.5.0으로 갱신 필요.
    - 코드 검증: `prisma/schema.prisma` 에 `RevisionComment` 모델 추가, v0.5.0 첫 spec 구현 완료 확인.
  - `context.md §2 핵심 모듈 목록` 표에 신규 Server Actions 추가 필요:
    - `lib/actions/revisionComment.ts` | lib/actions | 작업자용 댓글 조회·작성 Server Actions (workspaceId scope)
    - `lib/actions/publicRevisionComment.ts` | lib/actions | 클라이언트용 댓글 작성 Server Action (토큰 검증, 인앱 알림)
    - 코드 검증: 두 파일 모두 `'use server'` 선언, named export 확인.
  - `context.md §2 디렉토리 레이아웃` — `lib/actions/` 항목 설명에 `revisionComment.ts`, `publicRevisionComment.ts` 반영 여부 확인 (현재 "Server Actions (도메인별 파일)" 설명으로 충분할 수 있음, 검토 필요).
- **담당**: Retrospective Agent
- **우선순위**: MEDIUM (버전 필드 부정확)
- **해결**: `.claude/docs/context.md` 현재 버전을 v0.5.0으로 갱신하고 신규 Server Actions를 핵심 모듈 목록에 추가.

---

## GAP-003

- **상태**: RESOLVED
- **유형**: 보안-취약점
- **출처**: Security Agent
- **컨텍스트**: [SEC-001: parentId 교차 revision 범위 미검증]
- **내용**:
  - `addClientRevisionComment` (publicRevisionComment.ts L58-65) 및 `addRevisionComment` (revisionComment.ts L90-96)에서 `parentId`로 제공된 댓글 ID가 현재 revision에 속하는지 검증하지 않는다.
  - 공격자가 타 workspace 댓글 ID를 `parentId`로 제출할 경우, 저장되는 `RevisionComment.parentId`가 현재 revision과 무관한 댓글을 참조하게 된다.
  - 정보 노출: parentId brute-force로 타 workspace 댓글의 존재 여부 탐지 가능.
  - 수정 방향: parentId 조회 시 `{ id: parentId, revisionId: revisionId }` 조건 추가.
- **담당**: 다음 스펙 또는 즉시 패치
- **우선순위**: MEDIUM
- **해결**: `addRevisionComment`와 `addClientRevisionComment`의 parent comment 조회가 `{ id, revisionId }` 조건으로 현재 revision 범위를 검증함을 코드 확인.

---

## GAP-004

- **상태**: OPEN
- **유형**: 보안-취약점
- **출처**: Security Agent
- **컨텍스트**: [SEC-002: 클라이언트 댓글 작성 rate limiting 부재]
- **내용**:
  - `addClientRevisionComment` 에 rate limiting이 없다. 공개 포털(`/p/[token]`)에서 인증 없이 무제한 댓글 요청 가능.
  - DB 부하 및 알림 스팸(sendNotification 반복 호출) 위험.
  - 수정 방향: Next.js middleware 또는 Vercel rate limiting을 사용해 `/p/[token]`에 IP 기반 rate limit 적용.
- **담당**: 다음 스펙 또는 즉시 패치
- **우선순위**: MEDIUM

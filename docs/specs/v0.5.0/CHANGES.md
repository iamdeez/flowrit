## [001-revision-comment-threads] 구현 완료

**변경 파일**:

- `prisma/schema.prisma`: `RevisionComment` 모델 추가 (self-relation으로 1단계 depth 답글 구조), `RevisionRequest`에 `comments` relation 추가
- `prisma/migrations/20260622134000_add_revision_comment_threads/`: RevisionComment 테이블 마이그레이션
- `lib/notifications.ts`: `NotificationType` union에 `'REVISION_COMMENT'` 추가, `settingKeys`에 `notify_revision_comment` 항목 추가
- `lib/email.ts`: `sendRevisionCommentReplyEmail()` 함수 추가 (작업자 답글 → 클라이언트 이메일 발송)
- `lib/actions/revisionComment.ts`: 신규 — 작업자용 `getRevisionComments`, `addRevisionComment` Server Actions (workspaceId scope 격리)
- `lib/actions/publicRevisionComment.ts`: 신규 — 클라이언트용 `addClientRevisionComment` Server Action (토큰 검증, 인앱 알림 포함)
- `app/(dashboard)/projects/[id]/revision-comment-section.tsx`: 신규 — 대시보드 수정 요청 댓글 섹션 Server Component
- `app/(dashboard)/projects/[id]/revision-comment-thread.tsx`: 신규 — 댓글 목록·입력 폼 Client Component (`useActionState` 기반)
- `app/(dashboard)/projects/[id]/page.tsx`: 수정 요청 탭에 `RevisionCommentSection` 삽입, revision 카드 레이아웃 wrapper 조정
- `app/p/[token]/revision-comment-form.tsx`: 신규 — 고객 포털 댓글 조회·작성 Client Component
- `app/p/[token]/page.tsx`: revisions 쿼리에 댓글 include 확장, `RevisionCommentForm` 삽입
- `tests/revisionComment.test.ts`: 신규 — SC-003~SC-015 단위 테스트 19건 (19/19 PASS)

**후속 작업 시 주의사항**:

- `lib/notifications.ts`에 `REVISION_COMMENT` 타입이 추가되었다. 알림 타입별 설정을 처리하는 코드(`notificationSettings` JSON 파싱, 프런트엔드 알림 설정 UI 등)에서 새 타입을 처리해야 할 수 있다.
- `prisma/schema.prisma`의 `authorType` 필드는 `String`으로 선언되어 있다 (Prisma enum 미사용, 기존 패턴 준수). 값은 코드 레벨에서 `'WORKER'` / `'CLIENT'`로만 저장된다.
- SC-001·SC-002(`[env:integration]`)는 Next.js App Router Server Component 환경이 필요하여 자동화 미완료. E2E 테스트 환경(Playwright 등) 구성 후 별도 검증 필요.
- `app/p/[token]/page.tsx`의 revisions 쿼리가 댓글 include로 확장되어, 수정 요청이 많은 프로젝트에서 N+1 없이 한 번에 조회된다 (select로 `authorEmail` 필드 제외).

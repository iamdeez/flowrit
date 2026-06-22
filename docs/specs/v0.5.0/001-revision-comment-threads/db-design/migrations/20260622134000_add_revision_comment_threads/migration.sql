-- Up Migration: add_revision_comment_threads
-- 수정 요청 댓글 스레드 기능을 위한 RevisionComment 테이블 신규 생성

-- CreateTable
CREATE TABLE "RevisionComment" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "parentId" TEXT,
    "authorType" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevisionComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- (revisionId, createdAt) 복합 인덱스: 수정 요청별 댓글 조회 + 시간순 정렬 커버 (NFR-006)
CREATE INDEX "RevisionComment_revisionId_createdAt_idx" ON "RevisionComment"("revisionId", "createdAt");

-- AddForeignKey
-- revisionId → RevisionRequest: CASCADE — 수정 요청 삭제 시 댓글 연쇄 삭제 (FR-012와 무관, 수정 요청 자체 삭제 시에만 발생)
ALTER TABLE "RevisionComment" ADD CONSTRAINT "RevisionComment_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "RevisionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
-- parentId → RevisionComment: RESTRICT — 댓글 삭제 기능 미구현이므로 실질적 방어 (범위 외, 안전 장치)
ALTER TABLE "RevisionComment" ADD CONSTRAINT "RevisionComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "RevisionComment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Down Migration (롤백 시 수동 실행)
-- ALTER TABLE "RevisionComment" DROP CONSTRAINT IF EXISTS "RevisionComment_parentId_fkey";
-- ALTER TABLE "RevisionComment" DROP CONSTRAINT IF EXISTS "RevisionComment_revisionId_fkey";
-- DROP INDEX IF EXISTS "RevisionComment_revisionId_createdAt_idx";
-- DROP TABLE IF EXISTS "RevisionComment";

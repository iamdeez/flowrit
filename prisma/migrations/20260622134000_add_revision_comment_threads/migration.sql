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
CREATE INDEX "RevisionComment_revisionId_createdAt_idx" ON "RevisionComment"("revisionId", "createdAt");

-- AddForeignKey
ALTER TABLE "RevisionComment" ADD CONSTRAINT "RevisionComment_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "RevisionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionComment" ADD CONSTRAINT "RevisionComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "RevisionComment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

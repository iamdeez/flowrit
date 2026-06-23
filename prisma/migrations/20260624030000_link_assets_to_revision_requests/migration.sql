ALTER TABLE "Asset" ADD COLUMN "revisionRequestId" TEXT;

CREATE INDEX "Asset_revisionRequestId_idx" ON "Asset"("revisionRequestId");

ALTER TABLE "Asset"
  ADD CONSTRAINT "Asset_revisionRequestId_fkey"
  FOREIGN KEY ("revisionRequestId")
  REFERENCES "RevisionRequest"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

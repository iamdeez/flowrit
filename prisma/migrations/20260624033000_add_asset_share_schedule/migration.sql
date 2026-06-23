ALTER TABLE "Asset" ADD COLUMN "shareScheduledAt" TIMESTAMP(3);

CREATE INDEX "Asset_projectId_shareScheduledAt_idx" ON "Asset"("projectId", "shareScheduledAt");

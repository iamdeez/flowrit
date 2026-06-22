-- Add project archive marker for data lifecycle management.
ALTER TABLE "Project" ADD COLUMN "archivedAt" TIMESTAMP(3);

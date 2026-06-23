-- AlterTable
ALTER TABLE "Inquiry" ADD COLUMN     "fieldValues" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "OrderFormField" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "placeholder" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "options" JSONB,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderFormField_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderFormField_workspaceId_fieldKey_key" ON "OrderFormField"("workspaceId", "fieldKey");

-- AddForeignKey
ALTER TABLE "OrderFormField" ADD CONSTRAINT "OrderFormField_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

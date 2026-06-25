-- AlterTable
ALTER TABLE "prospects" ADD COLUMN     "enrichAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "enrichError" TEXT,
ADD COLUMN     "enrichQueuedAt" TIMESTAMP(3),
ADD COLUMN     "enrichStartedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "prospects_enrichQueuedAt_idx" ON "prospects"("enrichQueuedAt");

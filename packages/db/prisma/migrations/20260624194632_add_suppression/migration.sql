-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "unsubscribedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "suppressions" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppressions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "suppressions_email_key" ON "suppressions"("email");

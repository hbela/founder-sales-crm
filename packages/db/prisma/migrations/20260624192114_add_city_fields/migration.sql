-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "city" TEXT;

-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "city" TEXT;

-- AlterTable
ALTER TABLE "prospects" ADD COLUMN     "city" TEXT;

-- CreateIndex
CREATE INDEX "campaigns_city_idx" ON "campaigns"("city");

-- CreateIndex
CREATE INDEX "contacts_city_idx" ON "contacts"("city");

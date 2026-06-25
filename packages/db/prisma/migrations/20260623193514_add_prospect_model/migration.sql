-- CreateEnum
CREATE TYPE "ProspectStatus" AS ENUM ('NEW', 'ENRICHED', 'NEEDS_REVIEW', 'QUALIFIED', 'DISQUALIFIED', 'IMPORTED');

-- CreateEnum
CREATE TYPE "ProspectSource" AS ENUM ('GOOGLE_PLACES', 'CSV', 'MANUAL');

-- CreateTable
CREATE TABLE "prospects" (
    "id" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "legalName" TEXT,
    "website" TEXT,
    "domain" TEXT,
    "generalEmail" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "district" TEXT,
    "googlePlaceId" TEXT,
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "businessStatus" TEXT,
    "dentistCount" INTEGER,
    "locationCount" INTEGER,
    "employeeCount" INTEGER,
    "hasOnlineBooking" BOOLEAN NOT NULL DEFAULT false,
    "fitScore" INTEGER,
    "status" "ProspectStatus" NOT NULL DEFAULT 'NEW',
    "source" "ProspectSource" NOT NULL,
    "notes" TEXT,
    "enrichedAt" TIMESTAMP(3),
    "importedContactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prospects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "prospects_googlePlaceId_key" ON "prospects"("googlePlaceId");

-- CreateIndex
CREATE UNIQUE INDEX "prospects_importedContactId_key" ON "prospects"("importedContactId");

-- CreateIndex
CREATE INDEX "prospects_status_idx" ON "prospects"("status");

-- CreateIndex
CREATE INDEX "prospects_district_idx" ON "prospects"("district");

-- AddForeignKey
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_importedContactId_fkey" FOREIGN KEY ("importedContactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

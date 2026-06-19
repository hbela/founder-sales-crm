-- DropIndex
DROP INDEX "contacts_email_idx";

-- CreateIndex
CREATE UNIQUE INDEX "contacts_email_key" ON "contacts"("email");

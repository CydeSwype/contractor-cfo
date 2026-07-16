-- AlterTable
ALTER TABLE "CfoClient" ADD COLUMN     "invoiceNumberPrefix" TEXT;

-- AlterTable
ALTER TABLE "PersonalAccessToken" ADD COLUMN     "scope" TEXT NOT NULL DEFAULT 'full';

-- CreateTable
CREATE TABLE "CfoInvoiceAttachment" (
    "id" SERIAL NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "storedPath" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'upload',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CfoInvoiceAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CfoInvoiceAttachment_invoiceId_idx" ON "CfoInvoiceAttachment"("invoiceId");

-- AddForeignKey
ALTER TABLE "CfoInvoiceAttachment" ADD CONSTRAINT "CfoInvoiceAttachment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "CfoInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

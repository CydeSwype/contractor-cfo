-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "householdId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Household" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "stateRate" DECIMAL(5,4),
    "filingStatus" TEXT NOT NULL DEFAULT 'single',
    "priorYearTax" DECIMAL(10,2),
    "otherIncome" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdInvite" (
    "id" SERIAL NOT NULL,
    "householdId" INTEGER NOT NULL,
    "invitedBy" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HouseholdInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalAccessToken" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonalAccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CfoClient" (
    "id" SERIAL NOT NULL,
    "householdId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "hourlyRate" DECIMAL(10,2),
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CfoClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CfoInvoice" (
    "id" SERIAL NOT NULL,
    "householdId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "issuedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CfoInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CfoLineItem" (
    "id" SERIAL NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,4) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CfoLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CfoTransaction" (
    "id" SERIAL NOT NULL,
    "householdId" INTEGER NOT NULL,
    "invoiceId" INTEGER,
    "amount" DECIMAL(10,2) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "method" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CfoTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CfoExpense" (
    "id" SERIAL NOT NULL,
    "householdId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "vendor" TEXT,
    "isTaxDeductible" BOOLEAN NOT NULL DEFAULT false,
    "isPersonal" BOOLEAN NOT NULL DEFAULT false,
    "receiptUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CfoExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CfoBudgetTarget" (
    "id" SERIAL NOT NULL,
    "householdId" INTEGER NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "targetAmount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CfoBudgetTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CfoTaxPayment" (
    "id" SERIAL NOT NULL,
    "householdId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CfoTaxPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_householdId_idx" ON "User"("householdId");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdInvite_token_key" ON "HouseholdInvite"("token");

-- CreateIndex
CREATE INDEX "HouseholdInvite_token_idx" ON "HouseholdInvite"("token");

-- CreateIndex
CREATE INDEX "HouseholdInvite_email_idx" ON "HouseholdInvite"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalAccessToken_tokenHash_key" ON "PersonalAccessToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PersonalAccessToken_userId_idx" ON "PersonalAccessToken"("userId");

-- CreateIndex
CREATE INDEX "CfoClient_householdId_idx" ON "CfoClient"("householdId");

-- CreateIndex
CREATE INDEX "CfoClient_householdId_archivedAt_idx" ON "CfoClient"("householdId", "archivedAt");

-- CreateIndex
CREATE INDEX "CfoInvoice_householdId_status_idx" ON "CfoInvoice"("householdId", "status");

-- CreateIndex
CREATE INDEX "CfoInvoice_householdId_issuedAt_idx" ON "CfoInvoice"("householdId", "issuedAt");

-- CreateIndex
CREATE INDEX "CfoInvoice_clientId_idx" ON "CfoInvoice"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "CfoInvoice_householdId_invoiceNumber_key" ON "CfoInvoice"("householdId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "CfoLineItem_invoiceId_idx" ON "CfoLineItem"("invoiceId");

-- CreateIndex
CREATE INDEX "CfoTransaction_householdId_receivedAt_idx" ON "CfoTransaction"("householdId", "receivedAt");

-- CreateIndex
CREATE INDEX "CfoTransaction_invoiceId_idx" ON "CfoTransaction"("invoiceId");

-- CreateIndex
CREATE INDEX "CfoExpense_householdId_expenseDate_idx" ON "CfoExpense"("householdId", "expenseDate");

-- CreateIndex
CREATE INDEX "CfoExpense_householdId_category_idx" ON "CfoExpense"("householdId", "category");

-- CreateIndex
CREATE INDEX "CfoExpense_householdId_isTaxDeductible_idx" ON "CfoExpense"("householdId", "isTaxDeductible");

-- CreateIndex
CREATE INDEX "CfoBudgetTarget_householdId_yearMonth_idx" ON "CfoBudgetTarget"("householdId", "yearMonth");

-- CreateIndex
CREATE UNIQUE INDEX "CfoBudgetTarget_householdId_yearMonth_category_key" ON "CfoBudgetTarget"("householdId", "yearMonth", "category");

-- CreateIndex
CREATE INDEX "CfoTaxPayment_householdId_year_quarter_idx" ON "CfoTaxPayment"("householdId", "year", "quarter");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdInvite" ADD CONSTRAINT "HouseholdInvite_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdInvite" ADD CONSTRAINT "HouseholdInvite_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalAccessToken" ADD CONSTRAINT "PersonalAccessToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfoClient" ADD CONSTRAINT "CfoClient_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfoInvoice" ADD CONSTRAINT "CfoInvoice_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfoInvoice" ADD CONSTRAINT "CfoInvoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "CfoClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfoLineItem" ADD CONSTRAINT "CfoLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "CfoInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfoTransaction" ADD CONSTRAINT "CfoTransaction_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfoTransaction" ADD CONSTRAINT "CfoTransaction_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "CfoInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfoExpense" ADD CONSTRAINT "CfoExpense_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfoBudgetTarget" ADD CONSTRAINT "CfoBudgetTarget_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfoTaxPayment" ADD CONSTRAINT "CfoTaxPayment_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

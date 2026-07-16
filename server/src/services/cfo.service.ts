import { Prisma } from '@prisma/client';
import prisma from '../db';

export async function recalculateInvoiceTotals(invoiceId: number): Promise<void> {
  const items = await prisma.cfoLineItem.findMany({ where: { invoiceId } });
  const subtotal = items.reduce((sum, item) => sum + parseFloat(item.amount.toString()), 0);
  await prisma.cfoInvoice.update({
    where: { id: invoiceId },
    data: { subtotal: new Prisma.Decimal(subtotal), total: new Prisma.Decimal(subtotal) },
  });
}

const DEFAULT_INVOICE_PREFIX = 'INV';

/**
 * The invoice-numbering template for a client: `{prefix}-{year}-{seq}`, e.g. `WF-2026-003`.
 * Scoped per client (not household-wide) once a client has their own prefix set, so two
 * clients never compete over the same sequence and each client's numbering stays
 * self-consistent — this is what an agent should call rather than inferring the next
 * number by pattern-matching a client's invoice history, which silently propagates
 * whatever scheme the last invoice happened to use.
 */
export async function nextInvoiceNumber(householdId: number, clientId?: number): Promise<string> {
  const year = new Date().getFullYear();

  let prefix = DEFAULT_INVOICE_PREFIX;
  if (clientId) {
    const client = await prisma.cfoClient.findFirst({ where: { id: clientId, householdId } });
    prefix = client?.invoiceNumberPrefix || DEFAULT_INVOICE_PREFIX;
  }

  const searchPrefix = `${prefix}-${year}-`;
  const last = await prisma.cfoInvoice.findFirst({
    where: {
      householdId,
      invoiceNumber: { startsWith: searchPrefix },
      ...(clientId && prefix !== DEFAULT_INVOICE_PREFIX && { clientId }),
    },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  });

  const lastNum = last ? parseInt(last.invoiceNumber.replace(searchPrefix, ''), 10) : 0;
  const next = String((Number.isFinite(lastNum) ? lastNum : 0) + 1).padStart(3, '0');
  return `${searchPrefix}${next}`;
}

/**
 * Validate a caller-supplied invoice number against a client's registered numbering
 * template (if they have one). Returns an error string, or null if it's fine — used to
 * catch an agent/user proposing a number in the wrong scheme (e.g. mixing
 * `INV-YYYY-MM-NNN` into a client whose history is `INV-YYYY-NNN`) instead of silently
 * accepting it.
 */
export async function validateInvoiceNumber(
  householdId: number,
  clientId: number,
  invoiceNumber: string
): Promise<string | null> {
  const client = await prisma.cfoClient.findFirst({ where: { id: clientId, householdId } });
  if (!client?.invoiceNumberPrefix) return null; // no template registered — anything goes

  const pattern = new RegExp(`^${client.invoiceNumberPrefix}-\\d{4}-\\d+$`);
  if (!pattern.test(invoiceNumber)) {
    return `invoiceNumber "${invoiceNumber}" doesn't match this client's numbering template ` +
      `"${client.invoiceNumberPrefix}-YYYY-NNN". Omit invoiceNumber to auto-generate the next one.`;
  }
  return null;
}

export async function getYtdIncome(householdId: number, year: number): Promise<number> {
  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year + 1}-01-01`);

  const result = await prisma.cfoTransaction.aggregate({
    where: { householdId, receivedAt: { gte: start, lt: end } },
    _sum: { amount: true },
  });
  return parseFloat((result._sum.amount ?? 0).toString());
}

export async function getYtdExpenses(
  householdId: number,
  year: number
): Promise<{ total: number; business: number; personal: number; deductible: number }> {
  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year + 1}-01-01`);
  const where = { householdId, expenseDate: { gte: start, lt: end } };

  const [total, personal, deductible] = await Promise.all([
    prisma.cfoExpense.aggregate({ where, _sum: { amount: true } }),
    prisma.cfoExpense.aggregate({ where: { ...where, isPersonal: true }, _sum: { amount: true } }),
    prisma.cfoExpense.aggregate({ where: { ...where, isTaxDeductible: true }, _sum: { amount: true } }),
  ]);

  const totalAmt = parseFloat((total._sum.amount ?? 0).toString());
  const personalAmt = parseFloat((personal._sum.amount ?? 0).toString());
  const deductibleAmt = parseFloat((deductible._sum.amount ?? 0).toString());

  return { total: totalAmt, business: totalAmt - personalAmt, personal: personalAmt, deductible: deductibleAmt };
}

export async function getYtdTaxPayments(householdId: number, year: number): Promise<number> {
  const result = await prisma.cfoTaxPayment.aggregate({
    where: { householdId, year, paidDate: { not: null } },
    _sum: { amount: true },
  });
  return parseFloat((result._sum.amount ?? 0).toString());
}

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

export async function nextInvoiceNumber(householdId: number): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const last = await prisma.cfoInvoice.findFirst({
    where: { householdId, invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  });

  const lastNum = last ? parseInt(last.invoiceNumber.replace(prefix, ''), 10) : 0;
  const next = String(lastNum + 1).padStart(3, '0');
  return `${prefix}${next}`;
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

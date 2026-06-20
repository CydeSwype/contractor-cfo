import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { estimateQuarterlyTax } from '@contractor-cfo/shared';
import prisma from '../../db';
import { getYtdIncome, getYtdExpenses, getYtdTaxPayments } from '../../services/cfo.service';

export async function getDashboard(req: AuthRequest, res: Response): Promise<void> {
  const { householdId } = req.user!;
  if (!householdId) { res.status(400).json({ error: 'No household' }); return; }

  const year = parseInt((req.query.year as string) ?? String(new Date().getFullYear()), 10);

  const [household, ytdIncome, expenses, paymentsToDate] = await Promise.all([
    prisma.household.findUnique({ where: { id: householdId } }),
    getYtdIncome(householdId, year),
    getYtdExpenses(householdId, year),
    getYtdTaxPayments(householdId, year),
  ]);

  if (!household) { res.status(404).json({ error: 'Household not found' }); return; }

  const priorYearTax = household.priorYearTax ? parseFloat(household.priorYearTax.toString()) : 0;
  const otherIncome = household.otherIncome ? parseFloat(household.otherIncome.toString()) : 0;

  const taxEstimate = estimateQuarterlyTax({
    year,
    grossIncome: ytdIncome,
    businessExpenses: expenses.deductible,
    filingStatus: household.filingStatus as 'single' | 'mfj' | 'mfs' | 'hoh',
    priorYearTax,
    stateRate: household.stateRate ? parseFloat(household.stateRate.toString()) : 0,
    otherIncome,
    paymentsToDate,
  });

  const today = new Date();
  const [unpaidInvoices, overdueInvoices] = await Promise.all([
    prisma.cfoInvoice.findMany({
      where: { householdId, status: { in: ['draft', 'sent'] } },
      select: { total: true },
    }),
    prisma.cfoInvoice.findMany({
      where: { householdId, status: { in: ['sent', 'overdue'] }, dueAt: { lt: today } },
      select: { total: true },
    }),
  ]);

  const unpaidInvoiceTotal = unpaidInvoices.reduce(
    (sum, inv) => sum + parseFloat(inv.total.toString()),
    0
  );

  const taxReserve = taxEstimate.totalEstimatedTax - paymentsToDate;
  const netCashFlow = ytdIncome - expenses.total - Math.max(0, taxReserve);

  res.json({
    year,
    ytdIncome,
    ytdBusinessExpenses: expenses.business,
    ytdDeductibleExpenses: expenses.deductible,
    ytdPersonalExpenses: expenses.personal,
    taxReserve: Math.max(0, taxReserve),
    netCashFlow,
    unpaidInvoiceCount: unpaidInvoices.length,
    unpaidInvoiceTotal,
    overdueInvoiceCount: overdueInvoices.length,
    taxEstimate,
  });
}

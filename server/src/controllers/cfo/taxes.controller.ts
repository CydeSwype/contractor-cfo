import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { AuthRequest } from '../../middleware/auth.middleware';
import { estimateQuarterlyTax } from '@contractor-cfo/shared';
import prisma from '../../db';
import { getYtdIncome, getYtdExpenses, getYtdTaxPayments } from '../../services/cfo.service';

function requireHousehold(req: AuthRequest, res: Response): number | null {
  const { householdId } = req.user!;
  if (!householdId) { res.status(400).json({ error: 'No household' }); return null; }
  return householdId;
}

export async function getTaxEstimate(req: AuthRequest, res: Response): Promise<void> {
  const householdId = requireHousehold(req, res);
  if (!householdId) return;

  const query = { ...req.query, ...req.body } as {
    year?: string;
    priorYearTax?: string;
    otherIncome?: string;
  };

  const year = parseInt(query.year ?? String(new Date().getFullYear()), 10);

  const household = await prisma.household.findUnique({ where: { id: householdId } });
  if (!household) { res.status(404).json({ error: 'Household not found' }); return; }

  // Query params override household defaults — useful for what-if scenarios via MCP
  const priorYearTax = query.priorYearTax !== undefined
    ? parseFloat(query.priorYearTax)
    : household.priorYearTax ? parseFloat(household.priorYearTax.toString()) : 0;
  const otherIncome = query.otherIncome !== undefined
    ? parseFloat(query.otherIncome)
    : household.otherIncome ? parseFloat(household.otherIncome.toString()) : 0;

  const [grossIncome, expenses, paymentsToDate] = await Promise.all([
    getYtdIncome(householdId, year),
    getYtdExpenses(householdId, year),
    getYtdTaxPayments(householdId, year),
  ]);

  const estimate = estimateQuarterlyTax({
    year,
    grossIncome,
    businessExpenses: expenses.deductible,
    filingStatus: household.filingStatus as 'single' | 'mfj' | 'mfs' | 'hoh',
    priorYearTax,
    stateRate: household.stateRate ? parseFloat(household.stateRate.toString()) : 0,
    otherIncome,
    paymentsToDate,
  });

  res.json(estimate);
}

export async function listTaxPayments(req: AuthRequest, res: Response): Promise<void> {
  const householdId = requireHousehold(req, res);
  if (!householdId) return;

  const { year } = req.query as { year?: string };

  const payments = await prisma.cfoTaxPayment.findMany({
    where: {
      householdId,
      ...(year && { year: parseInt(year, 10) }),
    },
    orderBy: [{ year: 'desc' }, { quarter: 'asc' }],
  });
  res.json(payments);
}

export async function createTaxPayment(req: AuthRequest, res: Response): Promise<void> {
  const householdId = requireHousehold(req, res);
  if (!householdId) return;

  const { year, quarter, type, amount, dueDate, paidDate, notes } = req.body as {
    year: number;
    quarter: number;
    type: string;
    amount: number;
    dueDate: string;
    paidDate?: string;
    notes?: string;
  };

  if (!year || !quarter || !type || !amount || !dueDate) {
    res.status(400).json({ error: 'year, quarter, type, amount, and dueDate are required' });
    return;
  }

  const payment = await prisma.cfoTaxPayment.create({
    data: {
      householdId,
      year,
      quarter,
      type,
      amount: new Prisma.Decimal(amount),
      dueDate: new Date(dueDate),
      paidDate: paidDate ? new Date(paidDate) : null,
      notes,
    },
  });
  res.status(201).json(payment);
}

export async function updateTaxPayment(req: AuthRequest, res: Response): Promise<void> {
  const householdId = requireHousehold(req, res);
  if (!householdId) return;

  const id = parseInt(req.params.id, 10);
  const existing = await prisma.cfoTaxPayment.findFirst({ where: { id, householdId } });
  if (!existing) { res.status(404).json({ error: 'Payment not found' }); return; }

  const { amount, paidDate, notes } = req.body as {
    amount?: number;
    paidDate?: string | null;
    notes?: string;
  };

  const payment = await prisma.cfoTaxPayment.update({
    where: { id },
    data: {
      ...(amount !== undefined && { amount: new Prisma.Decimal(amount) }),
      ...(paidDate !== undefined && { paidDate: paidDate ? new Date(paidDate) : null }),
      ...(notes !== undefined && { notes }),
    },
  });
  res.json(payment);
}

export async function deleteTaxPayment(req: AuthRequest, res: Response): Promise<void> {
  const householdId = requireHousehold(req, res);
  if (!householdId) return;

  const id = parseInt(req.params.id, 10);
  const existing = await prisma.cfoTaxPayment.findFirst({ where: { id, householdId } });
  if (!existing) { res.status(404).json({ error: 'Payment not found' }); return; }

  await prisma.cfoTaxPayment.delete({ where: { id } });
  res.status(204).send();
}

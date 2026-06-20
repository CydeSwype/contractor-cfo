import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { AuthRequest } from '../../middleware/auth.middleware';
import prisma from '../../db';

function requireHousehold(req: AuthRequest, res: Response): number | null {
  const { householdId } = req.user!;
  if (!householdId) { res.status(400).json({ error: 'No household' }); return null; }
  return householdId;
}

export async function listExpenses(req: AuthRequest, res: Response): Promise<void> {
  const householdId = requireHousehold(req, res);
  if (!householdId) return;

  const { year, month, category, deductible, personal } = req.query as {
    year?: string;
    month?: string;
    category?: string;
    deductible?: string;
    personal?: string;
  };

  let dateFilter: Prisma.CfoExpenseWhereInput = {};
  if (year && month) {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    dateFilter = {
      expenseDate: {
        gte: new Date(y, m - 1, 1),
        lt: new Date(y, m, 1),
      },
    };
  } else if (year) {
    dateFilter = {
      expenseDate: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${parseInt(year, 10) + 1}-01-01`),
      },
    };
  }

  const expenses = await prisma.cfoExpense.findMany({
    where: {
      householdId,
      ...dateFilter,
      ...(category && { category }),
      ...(deductible !== undefined && { isTaxDeductible: deductible === 'true' }),
      ...(personal !== undefined && { isPersonal: personal === 'true' }),
    },
    orderBy: { expenseDate: 'desc' },
  });
  res.json(expenses);
}

export async function createExpense(req: AuthRequest, res: Response): Promise<void> {
  const householdId = requireHousehold(req, res);
  if (!householdId) return;

  const { category, description, amount, expenseDate, vendor, isTaxDeductible, isPersonal, receiptUrl, notes } = req.body as {
    category: string;
    description: string;
    amount: number;
    expenseDate: string;
    vendor?: string;
    isTaxDeductible?: boolean;
    isPersonal?: boolean;
    receiptUrl?: string;
    notes?: string;
  };

  if (!category || !description || !amount || !expenseDate) {
    res.status(400).json({ error: 'category, description, amount, and expenseDate are required' });
    return;
  }

  const expense = await prisma.cfoExpense.create({
    data: {
      householdId,
      category,
      description,
      amount: new Prisma.Decimal(amount),
      expenseDate: new Date(expenseDate),
      vendor,
      isTaxDeductible: isTaxDeductible ?? false,
      isPersonal: isPersonal ?? false,
      receiptUrl,
      notes,
    },
  });
  res.status(201).json(expense);
}

export async function updateExpense(req: AuthRequest, res: Response): Promise<void> {
  const householdId = requireHousehold(req, res);
  if (!householdId) return;

  const id = parseInt(req.params.id, 10);
  const existing = await prisma.cfoExpense.findFirst({ where: { id, householdId } });
  if (!existing) { res.status(404).json({ error: 'Expense not found' }); return; }

  const { category, description, amount, expenseDate, vendor, isTaxDeductible, isPersonal, receiptUrl, notes } = req.body as {
    category?: string;
    description?: string;
    amount?: number;
    expenseDate?: string;
    vendor?: string;
    isTaxDeductible?: boolean;
    isPersonal?: boolean;
    receiptUrl?: string;
    notes?: string;
  };

  const expense = await prisma.cfoExpense.update({
    where: { id },
    data: {
      ...(category && { category }),
      ...(description && { description }),
      ...(amount !== undefined && { amount: new Prisma.Decimal(amount) }),
      ...(expenseDate && { expenseDate: new Date(expenseDate) }),
      ...(vendor !== undefined && { vendor }),
      ...(isTaxDeductible !== undefined && { isTaxDeductible }),
      ...(isPersonal !== undefined && { isPersonal }),
      ...(receiptUrl !== undefined && { receiptUrl }),
      ...(notes !== undefined && { notes }),
    },
  });
  res.json(expense);
}

export async function deleteExpense(req: AuthRequest, res: Response): Promise<void> {
  const householdId = requireHousehold(req, res);
  if (!householdId) return;

  const id = parseInt(req.params.id, 10);
  const existing = await prisma.cfoExpense.findFirst({ where: { id, householdId } });
  if (!existing) { res.status(404).json({ error: 'Expense not found' }); return; }

  await prisma.cfoExpense.delete({ where: { id } });
  res.status(204).send();
}

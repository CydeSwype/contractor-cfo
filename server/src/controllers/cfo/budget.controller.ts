import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { AuthRequest } from '../../middleware/auth.middleware';
import prisma from '../../db';

function requireHousehold(req: AuthRequest, res: Response): number | null {
  const { householdId } = req.user!;
  if (!householdId) { res.status(400).json({ error: 'No household' }); return null; }
  return householdId;
}

export async function getBudgetTargets(req: AuthRequest, res: Response): Promise<void> {
  const householdId = requireHousehold(req, res);
  if (!householdId) return;

  const { yearMonth } = req.query as { yearMonth?: string };

  const targets = await prisma.cfoBudgetTarget.findMany({
    where: {
      householdId,
      ...(yearMonth && { yearMonth }),
    },
    orderBy: [{ yearMonth: 'desc' }, { category: 'asc' }],
  });
  res.json(targets);
}

export async function upsertBudgetTargets(req: AuthRequest, res: Response): Promise<void> {
  const householdId = requireHousehold(req, res);
  if (!householdId) return;

  const items = req.body as { yearMonth: string; category: string; targetAmount: number }[];

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Body must be a non-empty array of {yearMonth, category, targetAmount}' });
    return;
  }

  const upserts = items.map((item) =>
    prisma.cfoBudgetTarget.upsert({
      where: { householdId_yearMonth_category: { householdId, yearMonth: item.yearMonth, category: item.category } },
      create: { householdId, yearMonth: item.yearMonth, category: item.category, targetAmount: new Prisma.Decimal(item.targetAmount) },
      update: { targetAmount: new Prisma.Decimal(item.targetAmount) },
    })
  );

  const results = await prisma.$transaction(upserts);
  res.json(results);
}

export async function getBudgetVsActuals(req: AuthRequest, res: Response): Promise<void> {
  const householdId = requireHousehold(req, res);
  if (!householdId) return;

  const { yearMonth } = req.query as { yearMonth?: string };
  if (!yearMonth) {
    res.status(400).json({ error: 'yearMonth query param is required (format: YYYY-MM)' });
    return;
  }

  const [year, month] = yearMonth.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const [targets, expenses] = await Promise.all([
    prisma.cfoBudgetTarget.findMany({ where: { householdId, yearMonth } }),
    prisma.cfoExpense.findMany({
      where: { householdId, expenseDate: { gte: startDate, lt: endDate } },
      select: { category: true, amount: true },
    }),
  ]);

  // Sum actuals by category
  const actualsMap: Record<string, number> = {};
  for (const e of expenses) {
    const cat = e.category;
    actualsMap[cat] = (actualsMap[cat] ?? 0) + parseFloat(e.amount.toString());
  }

  // Merge targets with actuals
  const allCategories = new Set([
    ...targets.map((t) => t.category),
    ...Object.keys(actualsMap),
  ]);

  const result = Array.from(allCategories).map((category) => {
    const target = targets.find((t) => t.category === category);
    const actual = actualsMap[category] ?? 0;
    const targetAmount = target ? parseFloat(target.targetAmount.toString()) : null;
    const variance = targetAmount !== null ? actual - targetAmount : null;
    return { category, targetAmount, actualAmount: actual, variance };
  });

  result.sort((a, b) => a.category.localeCompare(b.category));
  res.json(result);
}

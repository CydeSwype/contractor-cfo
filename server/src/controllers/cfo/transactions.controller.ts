import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { AuthRequest } from '../../middleware/auth.middleware';
import prisma from '../../db';

function requireHousehold(req: AuthRequest, res: Response): number | null {
  const { householdId } = req.user!;
  if (!householdId) { res.status(400).json({ error: 'No household' }); return null; }
  return householdId;
}

export async function listTransactions(req: AuthRequest, res: Response): Promise<void> {
  const householdId = requireHousehold(req, res);
  if (!householdId) return;

  const { year, invoiceId } = req.query as { year?: string; invoiceId?: string };

  const transactions = await prisma.cfoTransaction.findMany({
    where: {
      householdId,
      ...(invoiceId && { invoiceId: parseInt(invoiceId, 10) }),
      ...(year && {
        receivedAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${parseInt(year, 10) + 1}-01-01`),
        },
      }),
    },
    include: { invoice: { select: { id: true, invoiceNumber: true, clientId: true } } },
    orderBy: { receivedAt: 'desc' },
  });
  res.json(transactions);
}

export async function createTransaction(req: AuthRequest, res: Response): Promise<void> {
  const householdId = requireHousehold(req, res);
  if (!householdId) return;

  const { invoiceId, amount, receivedAt, method, reference, notes } = req.body as {
    invoiceId?: number;
    amount: number;
    receivedAt: string;
    method?: string;
    reference?: string;
    notes?: string;
  };

  if (!amount || !receivedAt) {
    res.status(400).json({ error: 'amount and receivedAt are required' });
    return;
  }

  if (invoiceId) {
    const invoice = await prisma.cfoInvoice.findFirst({ where: { id: invoiceId, householdId } });
    if (!invoice) { res.status(400).json({ error: 'Invoice not found' }); return; }
  }

  const tx = await prisma.cfoTransaction.create({
    data: {
      householdId,
      invoiceId: invoiceId ?? null,
      amount: new Prisma.Decimal(amount),
      receivedAt: new Date(receivedAt),
      method,
      reference,
      notes,
    },
  });

  // Auto-mark invoice as paid if this is its first transaction
  if (invoiceId) {
    const invoice = await prisma.cfoInvoice.findUnique({ where: { id: invoiceId } });
    if (invoice && invoice.status === 'sent') {
      await prisma.cfoInvoice.update({
        where: { id: invoiceId },
        data: { status: 'paid', paidAt: new Date(receivedAt) },
      });
    }
  }

  res.status(201).json(tx);
}

export async function updateTransaction(req: AuthRequest, res: Response): Promise<void> {
  const householdId = requireHousehold(req, res);
  if (!householdId) return;

  const id = parseInt(req.params.id, 10);
  const existing = await prisma.cfoTransaction.findFirst({ where: { id, householdId } });
  if (!existing) { res.status(404).json({ error: 'Transaction not found' }); return; }

  const { amount, receivedAt, method, reference, notes } = req.body as {
    amount?: number;
    receivedAt?: string;
    method?: string;
    reference?: string;
    notes?: string;
  };

  const tx = await prisma.cfoTransaction.update({
    where: { id },
    data: {
      ...(amount !== undefined && { amount: new Prisma.Decimal(amount) }),
      ...(receivedAt !== undefined && { receivedAt: new Date(receivedAt) }),
      ...(method !== undefined && { method }),
      ...(reference !== undefined && { reference }),
      ...(notes !== undefined && { notes }),
    },
  });
  res.json(tx);
}

export async function deleteTransaction(req: AuthRequest, res: Response): Promise<void> {
  const householdId = requireHousehold(req, res);
  if (!householdId) return;

  const id = parseInt(req.params.id, 10);
  const existing = await prisma.cfoTransaction.findFirst({ where: { id, householdId } });
  if (!existing) { res.status(404).json({ error: 'Transaction not found' }); return; }

  await prisma.cfoTransaction.delete({ where: { id } });
  res.status(204).send();
}

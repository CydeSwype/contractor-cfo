import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { AuthRequest } from '../../middleware/auth.middleware';
import prisma from '../../db';
import { recalculateInvoiceTotals, nextInvoiceNumber } from '../../services/cfo.service';

function requireHousehold(req: AuthRequest, res: Response): number | null {
  const { householdId } = req.user!;
  if (!householdId) { res.status(400).json({ error: 'No household' }); return null; }
  return householdId;
}

export async function listInvoices(req: AuthRequest, res: Response): Promise<void> {
  const householdId = requireHousehold(req, res);
  if (!householdId) return;

  const { status, clientId, year } = req.query as {
    status?: string;
    clientId?: string;
    year?: string;
  };

  const invoices = await prisma.cfoInvoice.findMany({
    where: {
      householdId,
      ...(status && { status }),
      ...(clientId && { clientId: parseInt(clientId, 10) }),
      ...(year && {
        issuedAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${parseInt(year, 10) + 1}-01-01`),
        },
      }),
    },
    include: { client: { select: { id: true, name: true, company: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(invoices);
}

export async function getInvoice(req: AuthRequest, res: Response): Promise<void> {
  const householdId = requireHousehold(req, res);
  if (!householdId) return;

  const invoice = await prisma.cfoInvoice.findFirst({
    where: { id: parseInt(req.params.id, 10), householdId },
    include: {
      client: true,
      lineItems: { orderBy: { sortOrder: 'asc' } },
      transactions: { orderBy: { receivedAt: 'desc' } },
    },
  });

  if (!invoice) { res.status(404).json({ error: 'Invoice not found' }); return; }
  res.json(invoice);
}

export async function createInvoice(req: AuthRequest, res: Response): Promise<void> {
  const householdId = requireHousehold(req, res);
  if (!householdId) return;

  const { clientId, invoiceNumber, issuedAt, dueAt, notes, lineItems } = req.body as {
    clientId: number;
    invoiceNumber?: string;
    issuedAt?: string;
    dueAt?: string;
    notes?: string;
    lineItems?: { description: string; quantity: number; unitPrice: number; sortOrder?: number }[];
  };

  if (!clientId) { res.status(400).json({ error: 'clientId is required' }); return; }

  const client = await prisma.cfoClient.findFirst({ where: { id: clientId, householdId } });
  if (!client) { res.status(400).json({ error: 'Client not found' }); return; }

  const number = invoiceNumber ?? (await nextInvoiceNumber(householdId));

  const invoice = await prisma.cfoInvoice.create({
    data: {
      householdId,
      clientId,
      invoiceNumber: number,
      issuedAt: issuedAt ? new Date(issuedAt) : new Date(),
      dueAt: dueAt ? new Date(dueAt) : null,
      notes,
      ...(lineItems?.length && {
        lineItems: {
          create: lineItems.map((item, i) => {
            const amount = item.quantity * item.unitPrice;
            return {
              description: item.description,
              quantity: new Prisma.Decimal(item.quantity),
              unitPrice: new Prisma.Decimal(item.unitPrice),
              amount: new Prisma.Decimal(amount),
              sortOrder: item.sortOrder ?? i,
            };
          }),
        },
      }),
    },
    include: { lineItems: true, client: true },
  });

  if (lineItems?.length) {
    await recalculateInvoiceTotals(invoice.id);
    return void res.status(201).json(
      await prisma.cfoInvoice.findUnique({
        where: { id: invoice.id },
        include: { lineItems: true, client: true },
      })
    );
  }

  res.status(201).json(invoice);
}

export async function updateInvoice(req: AuthRequest, res: Response): Promise<void> {
  const householdId = requireHousehold(req, res);
  if (!householdId) return;

  const id = parseInt(req.params.id, 10);
  const existing = await prisma.cfoInvoice.findFirst({ where: { id, householdId } });
  if (!existing) { res.status(404).json({ error: 'Invoice not found' }); return; }

  const { issuedAt, dueAt, notes } = req.body as {
    issuedAt?: string;
    dueAt?: string;
    notes?: string;
  };

  const invoice = await prisma.cfoInvoice.update({
    where: { id },
    data: {
      ...(issuedAt !== undefined && { issuedAt: new Date(issuedAt) }),
      ...(dueAt !== undefined && { dueAt: dueAt ? new Date(dueAt) : null }),
      ...(notes !== undefined && { notes }),
    },
    include: { lineItems: true, client: true },
  });
  res.json(invoice);
}

export async function markInvoiceSent(req: AuthRequest, res: Response): Promise<void> {
  const householdId = requireHousehold(req, res);
  if (!householdId) return;

  const id = parseInt(req.params.id, 10);
  const existing = await prisma.cfoInvoice.findFirst({ where: { id, householdId } });
  if (!existing) { res.status(404).json({ error: 'Invoice not found' }); return; }

  const invoice = await prisma.cfoInvoice.update({
    where: { id },
    data: { status: 'sent', issuedAt: existing.issuedAt ?? new Date() },
  });
  res.json(invoice);
}

export async function voidInvoice(req: AuthRequest, res: Response): Promise<void> {
  const householdId = requireHousehold(req, res);
  if (!householdId) return;

  const id = parseInt(req.params.id, 10);
  const existing = await prisma.cfoInvoice.findFirst({ where: { id, householdId } });
  if (!existing) { res.status(404).json({ error: 'Invoice not found' }); return; }

  const invoice = await prisma.cfoInvoice.update({ where: { id }, data: { status: 'void' } });
  res.json(invoice);
}

export async function addLineItem(req: AuthRequest, res: Response): Promise<void> {
  const householdId = requireHousehold(req, res);
  if (!householdId) return;

  const invoiceId = parseInt(req.params.id, 10);
  const invoice = await prisma.cfoInvoice.findFirst({ where: { id: invoiceId, householdId } });
  if (!invoice) { res.status(404).json({ error: 'Invoice not found' }); return; }

  const { description, quantity, unitPrice, sortOrder } = req.body as {
    description: string;
    quantity: number;
    unitPrice: number;
    sortOrder?: number;
  };

  if (!description || quantity == null || unitPrice == null) {
    res.status(400).json({ error: 'description, quantity, and unitPrice are required' });
    return;
  }

  const amount = quantity * unitPrice;
  const item = await prisma.cfoLineItem.create({
    data: {
      invoiceId,
      description,
      quantity: new Prisma.Decimal(quantity),
      unitPrice: new Prisma.Decimal(unitPrice),
      amount: new Prisma.Decimal(amount),
      sortOrder: sortOrder ?? 0,
    },
  });

  await recalculateInvoiceTotals(invoiceId);
  res.status(201).json(item);
}

export async function updateLineItem(req: AuthRequest, res: Response): Promise<void> {
  const householdId = requireHousehold(req, res);
  if (!householdId) return;

  const invoiceId = parseInt(req.params.id, 10);
  const itemId = parseInt(req.params.itemId, 10);

  const invoice = await prisma.cfoInvoice.findFirst({ where: { id: invoiceId, householdId } });
  if (!invoice) { res.status(404).json({ error: 'Invoice not found' }); return; }

  const existing = await prisma.cfoLineItem.findFirst({ where: { id: itemId, invoiceId } });
  if (!existing) { res.status(404).json({ error: 'Line item not found' }); return; }

  const { description, quantity, unitPrice, sortOrder } = req.body as {
    description?: string;
    quantity?: number;
    unitPrice?: number;
    sortOrder?: number;
  };

  const newQuantity = quantity ?? parseFloat(existing.quantity.toString());
  const newUnitPrice = unitPrice ?? parseFloat(existing.unitPrice.toString());
  const amount = newQuantity * newUnitPrice;

  const item = await prisma.cfoLineItem.update({
    where: { id: itemId },
    data: {
      ...(description && { description }),
      quantity: new Prisma.Decimal(newQuantity),
      unitPrice: new Prisma.Decimal(newUnitPrice),
      amount: new Prisma.Decimal(amount),
      ...(sortOrder !== undefined && { sortOrder }),
    },
  });

  await recalculateInvoiceTotals(invoiceId);
  res.json(item);
}

export async function deleteLineItem(req: AuthRequest, res: Response): Promise<void> {
  const householdId = requireHousehold(req, res);
  if (!householdId) return;

  const invoiceId = parseInt(req.params.id, 10);
  const itemId = parseInt(req.params.itemId, 10);

  const invoice = await prisma.cfoInvoice.findFirst({ where: { id: invoiceId, householdId } });
  if (!invoice) { res.status(404).json({ error: 'Invoice not found' }); return; }

  await prisma.cfoLineItem.deleteMany({ where: { id: itemId, invoiceId } });
  await recalculateInvoiceTotals(invoiceId);
  res.status(204).send();
}

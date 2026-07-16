import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import prisma from '../../db';

function requireHousehold(req: AuthRequest, res: Response): number | null {
  const { householdId } = req.user!;
  if (!householdId) { res.status(400).json({ error: 'No household' }); return null; }
  return householdId;
}

export async function listClients(req: AuthRequest, res: Response): Promise<void> {
  const householdId = requireHousehold(req, res);
  if (!householdId) return;

  const includeArchived = req.query.archived === 'true';
  const clients = await prisma.cfoClient.findMany({
    where: {
      householdId,
      ...(includeArchived ? {} : { archivedAt: null }),
    },
    orderBy: { name: 'asc' },
  });
  res.json(clients);
}

export async function getClient(req: AuthRequest, res: Response): Promise<void> {
  const householdId = requireHousehold(req, res);
  if (!householdId) return;

  const client = await prisma.cfoClient.findFirst({
    where: { id: parseInt(req.params.id, 10), householdId },
    include: { invoices: { orderBy: { createdAt: 'desc' }, take: 10 } },
  });

  if (!client) { res.status(404).json({ error: 'Client not found' }); return; }
  res.json(client);
}

export async function createClient(req: AuthRequest, res: Response): Promise<void> {
  const householdId = requireHousehold(req, res);
  if (!householdId) return;

  const { name, company, contactEmail, contactPhone, hourlyRate, notes, invoiceNotes, invoiceNumberPrefix } = req.body as {
    name: string;
    company?: string;
    contactEmail?: string;
    contactPhone?: string;
    hourlyRate?: number;
    notes?: string;
    invoiceNotes?: string;
    invoiceNumberPrefix?: string;
  };

  if (!name) { res.status(400).json({ error: 'name is required' }); return; }

  const client = await prisma.cfoClient.create({
    data: { householdId, name, company, contactEmail, contactPhone, hourlyRate, notes, invoiceNotes, invoiceNumberPrefix },
  });
  res.status(201).json(client);
}

export async function updateClient(req: AuthRequest, res: Response): Promise<void> {
  const householdId = requireHousehold(req, res);
  if (!householdId) return;

  const id = parseInt(req.params.id, 10);
  const existing = await prisma.cfoClient.findFirst({ where: { id, householdId } });
  if (!existing) { res.status(404).json({ error: 'Client not found' }); return; }

  const { name, company, contactEmail, contactPhone, hourlyRate, notes, invoiceNotes, invoiceNumberPrefix } = req.body as {
    name?: string;
    company?: string;
    contactEmail?: string;
    contactPhone?: string;
    hourlyRate?: number | null;
    notes?: string;
    invoiceNotes?: string | null;
    invoiceNumberPrefix?: string | null;
  };

  const client = await prisma.cfoClient.update({
    where: { id },
    data: { name, company, contactEmail, contactPhone, hourlyRate, notes, invoiceNotes, invoiceNumberPrefix },
  });
  res.json(client);
}

export async function archiveClient(req: AuthRequest, res: Response): Promise<void> {
  const householdId = requireHousehold(req, res);
  if (!householdId) return;

  const id = parseInt(req.params.id, 10);
  const existing = await prisma.cfoClient.findFirst({ where: { id, householdId } });
  if (!existing) { res.status(404).json({ error: 'Client not found' }); return; }

  const client = await prisma.cfoClient.update({
    where: { id },
    data: { archivedAt: existing.archivedAt ? null : new Date() },
  });
  res.json(client);
}

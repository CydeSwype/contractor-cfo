import { Response } from 'express';
import { randomBytes } from 'crypto';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../db';

export async function getHousehold(req: AuthRequest, res: Response): Promise<void> {
  const { householdId } = req.user!;
  if (!householdId) {
    res.status(400).json({ error: 'No household associated with this account' });
    return;
  }

  const household = await prisma.household.findUnique({
    where: { id: householdId },
    include: { members: { select: { id: true, name: true, email: true, role: true, createdAt: true } } },
  });

  if (!household) {
    res.status(404).json({ error: 'Household not found' });
    return;
  }

  res.json(household);
}

export async function updateHousehold(req: AuthRequest, res: Response): Promise<void> {
  const { householdId } = req.user!;
  if (!householdId) { res.status(400).json({ error: 'No household' }); return; }

  const { name, stateRate, filingStatus, priorYearTax, otherIncome } = req.body as {
    name?: string;
    stateRate?: number | null;
    filingStatus?: string;
    priorYearTax?: number | null;
    otherIncome?: number | null;
  };

  const household = await prisma.household.update({
    where: { id: householdId },
    data: {
      ...(name !== undefined && { name }),
      ...(stateRate !== undefined && { stateRate }),
      ...(filingStatus !== undefined && { filingStatus }),
      ...(priorYearTax !== undefined && { priorYearTax }),
      ...(otherIncome !== undefined && { otherIncome }),
    },
    include: { members: { select: { id: true, name: true, email: true, role: true, createdAt: true } } },
  });

  res.json(household);
}

export async function inviteMember(req: AuthRequest, res: Response): Promise<void> {
  const { householdId, userId } = req.user!;
  if (!householdId) { res.status(400).json({ error: 'No household' }); return; }

  const { email } = req.body as { email: string };
  if (!email) { res.status(400).json({ error: 'email is required' }); return; }

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invite = await prisma.householdInvite.create({
    data: { householdId, invitedBy: userId, email, token, expiresAt },
  });

  res.status(201).json({
    id: invite.id,
    email: invite.email,
    token: invite.token,
    expiresAt: invite.expiresAt,
    acceptUrl: `/invite/${invite.token}`,
  });
}

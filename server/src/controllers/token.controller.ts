import { Response } from 'express';
import { randomBytes, createHash } from 'crypto';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../db';

const VALID_SCOPES = ['full', 'read_only', 'invoice_only'];

export async function listTokens(req: AuthRequest, res: Response): Promise<void> {
  const tokens = await prisma.personalAccessToken.findMany({
    where: { userId: req.user!.userId },
    select: { id: true, name: true, scope: true, lastUsedAt: true, expiresAt: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(tokens);
}

export async function createToken(req: AuthRequest, res: Response): Promise<void> {
  const { name, expiresAt, scope } = req.body as { name: string; expiresAt?: string; scope?: string };

  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  if (scope !== undefined && !VALID_SCOPES.includes(scope)) {
    res.status(400).json({ error: `scope must be one of ${VALID_SCOPES.join(', ')}` });
    return;
  }

  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');

  const pat = await prisma.personalAccessToken.create({
    data: {
      userId: req.user!.userId,
      name,
      tokenHash,
      scope: scope ?? 'full',
      ...(expiresAt && { expiresAt: new Date(expiresAt) }),
    },
    select: { id: true, name: true, scope: true, lastUsedAt: true, expiresAt: true, createdAt: true },
  });

  // Return the raw token only on creation — it cannot be retrieved again
  res.status(201).json({ ...pat, token: rawToken });
}

export async function deleteToken(req: AuthRequest, res: Response): Promise<void> {
  const id = parseInt(req.params.id, 10);

  const pat = await prisma.personalAccessToken.findFirst({
    where: { id, userId: req.user!.userId },
  });

  if (!pat) {
    res.status(404).json({ error: 'Token not found' });
    return;
  }

  await prisma.personalAccessToken.delete({ where: { id } });
  res.status(204).send();
}

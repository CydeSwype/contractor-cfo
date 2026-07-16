import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import prisma from '../db';

export interface AuthRequest extends Request {
  user?: { userId: number; householdId: number | null; name: string; email: string };
}

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  // Allow token via query param for direct browser downloads
  if (typeof req.query.token === 'string' && req.query.token) return req.query.token;
  return null;
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractBearer(req);
  if (!token) {
    res.status(401).json({ error: 'Missing token' });
    return;
  }

  // Try JWT first
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    req.user = { userId: user.id, householdId: user.householdId, name: user.name, email: user.email };
    next();
    return;
  } catch {
    // Not a valid JWT — try PAT
  }

  // Try Personal Access Token
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const pat = await prisma.personalAccessToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!pat) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
  if (pat.expiresAt && pat.expiresAt < new Date()) {
    res.status(401).json({ error: 'Token expired' });
    return;
  }

  // Update lastUsedAt without blocking the request
  prisma.personalAccessToken
    .update({ where: { id: pat.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  req.user = { userId: pat.userId, householdId: pat.user.householdId, name: pat.user.name, email: pat.user.email };
  next();
}

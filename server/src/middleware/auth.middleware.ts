import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import prisma from '../db';

export type TokenScope = 'full' | 'read_only' | 'invoice_only';

export interface AuthRequest extends Request {
  user?: { userId: number; householdId: number | null; name: string; email: string };
  // 'full' for JWT (browser session) auth; a PAT's own scope otherwise.
  tokenScope?: TokenScope;
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
    req.tokenScope = 'full';
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
  req.tokenScope = (pat.scope as TokenScope) ?? 'full';
  next();
}

/**
 * Gate mutating requests by the authenticating token's scope. Read-only tokens can
 * never write; invoice-only tokens can only write under the given path prefixes
 * (e.g. /invoices, /transactions) — everything else (clients, expenses, budget,
 * taxes, household) stays read-only for them. JWT session auth is always 'full' and
 * passes through untouched.
 *
 * Intended for agent-issued PATs (e.g. the MCP server) where you want to hand out a
 * token scoped to "can create/send invoices and record payments" without also
 * granting the ability to edit expenses or household tax settings.
 */
export function requireScope(invoiceOnlyPrefixes: string[] = [], readishPaths: string[] = []) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const scope = req.tokenScope ?? 'full';
    // A couple of endpoints (e.g. the tax "what-if" estimator) use POST for a
    // read-only calculation rather than a form-encoded GET — treat those as reads.
    const isWrite = req.method !== 'GET' && req.method !== 'HEAD' && !readishPaths.includes(req.path);

    if (!isWrite || scope === 'full') { next(); return; }

    if (scope === 'read_only') {
      res.status(403).json({ error: 'This token is read-only and cannot make changes' });
      return;
    }

    if (scope === 'invoice_only') {
      const allowed = invoiceOnlyPrefixes.some(prefix => req.path.startsWith(prefix));
      if (!allowed) {
        res.status(403).json({ error: 'This token can only create/update invoices and payments' });
        return;
      }
    }

    next();
  };
}

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db';

export async function signup(req: Request, res: Response): Promise<void> {
  const { name, email, password, householdName } = req.body as {
    name: string;
    email: string;
    password: string;
    householdName: string;
  };

  if (!name || !email || !password || !householdName) {
    res.status(400).json({ error: 'name, email, password, and householdName are required' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Email already in use' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const household = await prisma.household.create({ data: { name: householdName } });
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: 'owner', householdId: household.id },
  });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '30d' });
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string };

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}

export async function acceptInvite(req: Request, res: Response): Promise<void> {
  const { token, name, password } = req.body as { token: string; name: string; password: string };

  if (!token || !name || !password) {
    res.status(400).json({ error: 'token, name, and password are required' });
    return;
  }

  const invite = await prisma.householdInvite.findUnique({ where: { token } });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    res.status(400).json({ error: 'Invite is invalid or expired' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email: invite.email } });
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name,
      email: invite.email,
      passwordHash,
      role: 'partner',
      householdId: invite.householdId,
    },
  });

  await prisma.householdInvite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });

  const jwtToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '30d' });
  res.status(201).json({ token: jwtToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}

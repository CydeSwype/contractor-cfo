import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import householdRoutes from './routes/household.routes';
import tokenRoutes from './routes/token.routes';
import cfoRoutes from './routes/cfo.routes';

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET env var is not set');
  process.exit(1);
}

const app = express();
// Derived deterministically from the project name — see scripts/ports.mjs
// (`node scripts/ports.mjs`). PORT in server/.env is the canonical override.
const PORT = process.env.PORT ?? 32161;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/household', householdRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/cfo', cfoRoutes);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import householdRoutes from './routes/household.routes';
import tokenRoutes from './routes/token.routes';
import cfoRoutes from './routes/cfo.routes';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/household', householdRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/cfo', cfoRoutes);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

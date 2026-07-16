import axios from 'axios';

const BASE = process.env.CFO_API_BASE_URL ?? 'http://localhost:32161/api';
const PAT = process.env.CFO_PAT ?? '';

if (!PAT) {
  process.stderr.write('Warning: CFO_PAT env var is not set. API calls will fail.\n');
}

export const api = axios.create({
  baseURL: BASE,
  headers: { Authorization: `Bearer ${PAT}` },
});

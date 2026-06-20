import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('cfo_token', data.token);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas">
      <div className="w-full max-w-sm bg-surface border border-border rounded-2xl p-8">
        <h1 className="text-2xl font-semibold text-fg mb-1">Sign in</h1>
        <p className="text-fg-muted text-sm mb-6">Contractor CFO</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-fg-secondary mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-canvas border border-border rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-sm text-fg-secondary mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-canvas border border-border rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brand"
            />
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand text-white rounded-lg py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-fg-muted text-sm mt-6">
          No account?{' '}
          <Link to="/signup" className="text-brand hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

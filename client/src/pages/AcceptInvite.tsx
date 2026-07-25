import { useState, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/invite/accept', { token, ...form });
      localStorage.setItem('cfo_token', data.token);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Failed to accept invite');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm bg-surface border border-border rounded-2xl p-6 sm:p-8">
        <h1 className="text-2xl font-semibold text-fg mb-1">Join household</h1>
        <p className="text-fg-muted text-sm mb-6">You've been invited to share a CFO account.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-fg-secondary mb-1">Your name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
              className="w-full bg-canvas border border-border rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-sm text-fg-secondary mb-1">Choose a password</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
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
            {loading ? 'Joining…' : 'Join household'}
          </button>
        </form>
      </div>
    </div>
  );
}

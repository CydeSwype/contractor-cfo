import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', householdName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/signup', form);
      localStorage.setItem('cfo_token', data.token);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas">
      <div className="w-full max-w-sm bg-surface border border-border rounded-2xl p-8">
        <h1 className="text-2xl font-semibold text-fg mb-1">Get started</h1>
        <p className="text-fg-muted text-sm mb-6">Contractor CFO</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { field: 'name', label: 'Your name', type: 'text' },
            { field: 'email', label: 'Email', type: 'email' },
            { field: 'password', label: 'Password', type: 'password' },
            { field: 'householdName', label: 'Household name', type: 'text', placeholder: 'e.g. Smith Household' },
          ].map(({ field, label, type, placeholder }) => (
            <div key={field}>
              <label className="block text-sm text-fg-secondary mb-1">{label}</label>
              <input
                type={type}
                value={form[field as keyof typeof form]}
                onChange={e => set(field, e.target.value)}
                placeholder={placeholder}
                required
                className="w-full bg-canvas border border-border rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brand placeholder:text-fg-muted"
              />
            </div>
          ))}

          {error && <p className="text-danger text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand text-white rounded-lg py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-fg-muted text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

import { useEffect, useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Archive } from 'lucide-react';
import { getClients, createClient } from '../api/cfo';
import type { CfoClient } from '@contractor-cfo/shared';

export default function Clients() {
  const [clients, setClients] = useState<CfoClient[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', company: '', contactEmail: '', hourlyRate: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { getClients().then(setClients); }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const client = await createClient({
        name: form.name,
        company: form.company || undefined,
        contactEmail: form.contactEmail || undefined,
        hourlyRate: form.hourlyRate ? parseFloat(form.hourlyRate) as unknown as string : undefined,
      });
      setClients(cs => [...cs, client]);
      setForm({ name: '', company: '', contactEmail: '', hourlyRate: '' });
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-fg">Clients</h1>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 bg-brand text-white rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          <Plus size={16} />
          New client
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-surface border border-border rounded-xl p-5 mb-6 space-y-3">
          <h2 className="text-sm font-medium text-fg mb-2">New client</h2>
          {[
            { key: 'name', label: 'Name *', type: 'text', required: true },
            { key: 'company', label: 'Company', type: 'text' },
            { key: 'contactEmail', label: 'Email', type: 'email' },
            { key: 'hourlyRate', label: 'Hourly rate ($)', type: 'number' },
          ].map(({ key, label, type, required }) => (
            <div key={key}>
              <label className="block text-xs text-fg-secondary mb-1">{label}</label>
              <input
                type={type}
                value={form[key as keyof typeof form]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                required={required}
                className="w-full bg-canvas border border-border rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brand"
              />
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving} className="bg-brand text-white rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-fg-muted text-sm px-3 py-2 hover:text-fg">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {clients.length === 0 && (
          <p className="text-fg-muted text-sm py-8 text-center">No clients yet. Add your first client above.</p>
        )}
        {clients.map(client => (
          <Link
            key={client.id}
            to={`/clients/${client.id}`}
            className="flex items-center justify-between bg-surface border border-border rounded-xl px-5 py-4 hover:border-brand/50 transition-colors"
          >
            <div>
              <div className="text-fg font-medium text-sm">{client.name}</div>
              {client.company && <div className="text-fg-muted text-xs mt-0.5">{client.company}</div>}
            </div>
            <div className="flex items-center gap-4">
              {client.hourlyRate && (
                <span className="text-fg-secondary text-sm">${parseFloat(client.hourlyRate).toFixed(0)}/hr</span>
              )}
              {client.archivedAt && <Archive size={14} className="text-fg-muted" />}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

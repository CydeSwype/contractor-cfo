import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { getClients, createInvoice } from '../api/cfo';
import type { CfoClient } from '@contractor-cfo/shared';

interface LineItemDraft {
  description: string;
  quantity: string;
  unitPrice: string;
}

export default function NewInvoice() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<CfoClient[]>([]);
  const [clientId, setClientId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issuedAt, setIssuedAt] = useState(new Date().toISOString().slice(0, 10));
  const [dueAt, setDueAt] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([
    { description: '', quantity: '1', unitPrice: '' },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getClients().then(setClients);
  }, []);

  function updateLineItem(index: number, field: keyof LineItemDraft, value: string) {
    setLineItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }

  function addLineItem() {
    setLineItems(prev => [...prev, { description: '', quantity: '1', unitPrice: '' }]);
  }

  function removeLineItem(index: number) {
    setLineItems(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) { setError('Please select a client.'); return; }

    const validItems = lineItems.filter(i => i.description.trim() && i.unitPrice);
    setSaving(true);
    setError('');
    try {
      const invoice = await createInvoice({
        clientId: parseInt(clientId, 10),
        invoiceNumber: invoiceNumber || undefined,
        issuedAt: issuedAt || undefined,
        dueAt: dueAt || undefined,
        notes: notes || undefined,
        lineItems: validItems.map((item, i) => ({
          description: item.description,
          quantity: parseFloat(item.quantity) || 1,
          unitPrice: parseFloat(item.unitPrice),
          sortOrder: i,
        })),
      });
      navigate(`/invoices/${invoice.id}`);
    } catch {
      setError('Failed to create invoice. Please try again.');
      setSaving(false);
    }
  }

  const lineTotal = lineItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/invoices" className="text-fg-muted hover:text-fg">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-semibold text-fg">New Invoice</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-fg-muted mb-1">Client *</label>
              <select
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                className="w-full bg-canvas border border-border rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:border-brand"
                required
              >
                <option value="">Select a client…</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1">Invoice number</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
                placeholder="Auto-generated"
                className="w-full bg-canvas border border-border rounded-lg px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1">Issue date</label>
              <input
                type="date"
                value={issuedAt}
                onChange={e => setIssuedAt(e.target.value)}
                className="w-full bg-canvas border border-border rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1">Due date</label>
              <input
                type="date"
                value={dueAt}
                onChange={e => setDueAt(e.target.value)}
                className="w-full bg-canvas border border-border rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                className="w-full bg-canvas border border-border rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:border-brand resize-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-sm font-medium text-fg mb-3">Line items</h2>
          <div className="space-y-2">
            {lineItems.map((item, i) => (
              <div key={i} className="flex gap-2 items-start">
                <input
                  type="text"
                  value={item.description}
                  onChange={e => updateLineItem(i, 'description', e.target.value)}
                  placeholder="Description"
                  className="flex-1 bg-canvas border border-border rounded-lg px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:border-brand"
                />
                <input
                  type="number"
                  value={item.quantity}
                  onChange={e => updateLineItem(i, 'quantity', e.target.value)}
                  placeholder="Qty"
                  min="0"
                  step="any"
                  className="w-16 bg-canvas border border-border rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:border-brand"
                />
                <input
                  type="number"
                  value={item.unitPrice}
                  onChange={e => updateLineItem(i, 'unitPrice', e.target.value)}
                  placeholder="Rate"
                  min="0"
                  step="any"
                  className="w-24 bg-canvas border border-border rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:border-brand"
                />
                <div className="w-20 py-2 text-sm text-fg-muted text-right">
                  {fmt((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0))}
                </div>
                <button
                  type="button"
                  onClick={() => removeLineItem(i)}
                  disabled={lineItems.length === 1}
                  className="p-2 text-fg-muted hover:text-danger disabled:opacity-30"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addLineItem}
            className="mt-3 flex items-center gap-1.5 text-xs text-brand hover:opacity-80"
          >
            <Plus size={13} /> Add line item
          </button>

          <div className="mt-4 pt-4 border-t border-border flex justify-end">
            <div className="text-sm text-fg-muted">
              Total: <span className="text-fg font-semibold ml-2">{fmt(lineTotal)}</span>
            </div>
          </div>
        </div>

        {error && <p className="text-danger text-sm">{error}</p>}

        <div className="flex justify-end gap-3">
          <Link
            to="/invoices"
            className="px-4 py-2 text-sm text-fg-muted border border-border rounded-lg hover:border-fg-muted"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm bg-brand text-white rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}

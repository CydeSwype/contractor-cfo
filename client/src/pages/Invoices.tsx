import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { getInvoices } from '../api/cfo';
import type { CfoInvoice } from '@contractor-cfo/shared';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-border text-fg-muted',
  sent: 'bg-brand/15 text-brand',
  paid: 'bg-success/15 text-success',
  overdue: 'bg-danger/15 text-danger',
  void: 'bg-border text-fg-muted',
};

function fmt(n: string | number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n));
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<CfoInvoice[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInvoices(filter ? { status: filter } : undefined)
      .then(setInvoices)
      .finally(() => setLoading(false));
  }, [filter]);

  const statuses = ['', 'draft', 'sent', 'paid', 'overdue', 'void'];

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-fg">Invoices</h1>
        <Link
          to="/invoices/new"
          className="flex items-center gap-2 bg-brand text-white rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          <Plus size={16} />
          New invoice
        </Link>
      </div>

      <div className="flex gap-2 mb-5">
        {statuses.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              filter === s
                ? 'border-brand bg-brand/15 text-brand'
                : 'border-border text-fg-muted hover:text-fg'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-fg-muted text-sm">Loading…</p>
      ) : (
        <div className="space-y-2">
          {invoices.length === 0 && (
            <p className="text-fg-muted text-sm py-8 text-center">No invoices found.</p>
          )}
          {invoices.map(inv => (
            <Link
              key={inv.id}
              to={`/invoices/${inv.id}`}
              className="flex items-center justify-between bg-surface border border-border rounded-xl px-5 py-4 hover:border-brand/50 transition-colors"
            >
              <div>
                <div className="text-fg font-medium text-sm">{inv.invoiceNumber}</div>
                <div className="text-fg-muted text-xs mt-0.5">
                  {(inv as CfoInvoice & { client?: { name: string } }).client?.name ?? '—'}
                  {inv.dueAt && ` · due ${new Date(inv.dueAt).toLocaleDateString()}`}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-fg text-sm font-medium">{fmt(inv.total)}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[inv.status] ?? 'bg-border text-fg-muted'}`}>
                  {inv.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

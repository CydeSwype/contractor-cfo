import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getClient } from '../api/cfo';
import type { CfoClient } from '@contractor-cfo/shared';

function fmt(n: string | number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n));
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<CfoClient & { invoices?: { id: number; invoiceNumber: string; status: string; total: string; issuedAt: string | null }[] } | null>(null);

  useEffect(() => { if (id) getClient(parseInt(id, 10)).then(setClient); }, [id]);

  if (!client) return <div className="text-fg-muted">Loading…</div>;

  return (
    <div className="max-w-2xl">
      <Link to="/clients" className="flex items-center gap-2 text-fg-secondary text-sm mb-6 hover:text-fg">
        <ArrowLeft size={14} />
        Clients
      </Link>

      <div className="bg-surface border border-border rounded-xl p-6 mb-6">
        <h1 className="text-xl font-semibold text-fg">{client.name}</h1>
        {client.company && <p className="text-fg-secondary text-sm mt-1">{client.company}</p>}

        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
          {client.contactEmail && (
            <div>
              <span className="text-fg-muted">Email</span>
              <p className="text-fg mt-0.5">{client.contactEmail}</p>
            </div>
          )}
          {client.contactPhone && (
            <div>
              <span className="text-fg-muted">Phone</span>
              <p className="text-fg mt-0.5">{client.contactPhone}</p>
            </div>
          )}
          {client.hourlyRate && (
            <div>
              <span className="text-fg-muted">Rate</span>
              <p className="text-fg mt-0.5">${parseFloat(client.hourlyRate).toFixed(0)}/hr</p>
            </div>
          )}
        </div>

        {client.notes && (
          <p className="text-fg-secondary text-sm mt-4 border-t border-border pt-4">{client.notes}</p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-fg">Recent invoices</h2>
          <Link to={`/invoices?clientId=${client.id}`} className="text-xs text-brand hover:underline">
            All invoices
          </Link>
        </div>

        <div className="space-y-2">
          {(client as { invoices?: { id: number; invoiceNumber: string; status: string; total: string; issuedAt: string | null }[] }).invoices?.map(inv => (
            <Link
              key={inv.id}
              to={`/invoices/${inv.id}`}
              className="flex items-center justify-between bg-surface border border-border rounded-xl px-4 py-3 hover:border-brand/50 transition-colors text-sm"
            >
              <span className="text-fg font-medium">{inv.invoiceNumber}</span>
              <div className="flex items-center gap-4">
                <span className="text-fg-secondary">{fmt(inv.total)}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  inv.status === 'paid' ? 'bg-success/15 text-success'
                  : inv.status === 'sent' ? 'bg-brand/15 text-brand'
                  : 'bg-border text-fg-muted'
                }`}>
                  {inv.status}
                </span>
              </div>
            </Link>
          ))}
          {!((client as { invoices?: unknown[] }).invoices?.length) && (
            <p className="text-fg-muted text-sm py-4 text-center">No invoices yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

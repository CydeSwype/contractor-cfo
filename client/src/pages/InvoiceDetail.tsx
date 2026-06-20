import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Send, XCircle } from 'lucide-react';
import { getInvoice, markInvoiceSent, voidInvoice, createTransaction } from '../api/cfo';
import type { CfoInvoice } from '@contractor-cfo/shared';

function fmt(n: string | number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n));
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<CfoInvoice | null>(null);
  const [recording, setRecording] = useState(false);

  async function load() {
    if (id) setInvoice(await getInvoice(parseInt(id, 10)));
  }

  useEffect(() => { load(); }, [id]);

  async function handleSend() {
    if (!invoice) return;
    setInvoice(await markInvoiceSent(invoice.id));
  }

  async function handleVoid() {
    if (!invoice || !confirm('Void this invoice?')) return;
    setInvoice(await voidInvoice(invoice.id));
  }

  async function handleRecordPayment() {
    if (!invoice) return;
    setRecording(true);
    try {
      await createTransaction({
        invoiceId: invoice.id,
        amount: invoice.total as unknown as string,
        receivedAt: new Date().toISOString(),
      });
      await load();
    } finally {
      setRecording(false);
    }
  }

  if (!invoice) return <div className="text-fg-muted">Loading…</div>;

  const lineItems = (invoice as CfoInvoice & { lineItems?: { id: number; description: string; quantity: string; unitPrice: string; amount: string }[] }).lineItems ?? [];
  const client = (invoice as CfoInvoice & { client?: { name: string; company?: string } }).client;

  return (
    <div className="max-w-2xl">
      <Link to="/invoices" className="flex items-center gap-2 text-fg-secondary text-sm mb-6 hover:text-fg">
        <ArrowLeft size={14} />
        Invoices
      </Link>

      <div className="bg-surface border border-border rounded-xl p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-fg">{invoice.invoiceNumber}</h1>
            {client && <p className="text-fg-secondary text-sm mt-1">{client.name}{client.company ? ` · ${client.company}` : ''}</p>}
          </div>
          <span className={`text-xs px-3 py-1 rounded-full ${
            invoice.status === 'paid' ? 'bg-success/15 text-success'
            : invoice.status === 'sent' ? 'bg-brand/15 text-brand'
            : invoice.status === 'overdue' ? 'bg-danger/15 text-danger'
            : 'bg-border text-fg-muted'
          }`}>
            {invoice.status}
          </span>
        </div>

        <div className="flex gap-6 text-sm text-fg-secondary mb-5">
          {invoice.issuedAt && <span>Issued {new Date(invoice.issuedAt).toLocaleDateString()}</span>}
          {invoice.dueAt && <span>Due {new Date(invoice.dueAt).toLocaleDateString()}</span>}
          {invoice.paidAt && <span className="text-success">Paid {new Date(invoice.paidAt).toLocaleDateString()}</span>}
        </div>

        {lineItems.length > 0 && (
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="text-fg-muted border-b border-border">
                <th className="text-left py-2 font-normal">Description</th>
                <th className="text-right py-2 font-normal">Qty</th>
                <th className="text-right py-2 font-normal">Rate</th>
                <th className="text-right py-2 font-normal">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map(item => (
                <tr key={item.id} className="border-b border-border/50">
                  <td className="py-2 text-fg">{item.description}</td>
                  <td className="py-2 text-fg-secondary text-right">{parseFloat(item.quantity).toFixed(1)}</td>
                  <td className="py-2 text-fg-secondary text-right">{fmt(item.unitPrice)}</td>
                  <td className="py-2 text-fg text-right">{fmt(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="flex justify-end">
          <div className="text-right">
            <div className="text-2xl font-semibold text-fg">{fmt(invoice.total)}</div>
            <div className="text-xs text-fg-muted mt-0.5">Total due</div>
          </div>
        </div>

        {invoice.notes && (
          <p className="text-fg-secondary text-sm border-t border-border pt-4 mt-4">{invoice.notes}</p>
        )}
      </div>

      <div className="flex gap-3">
        {invoice.status === 'draft' && (
          <button
            onClick={handleSend}
            className="flex items-center gap-2 bg-brand text-white rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            <Send size={14} />
            Mark as sent
          </button>
        )}
        {invoice.status === 'sent' && (
          <button
            onClick={handleRecordPayment}
            disabled={recording}
            className="flex items-center gap-2 bg-success/15 text-success border border-success/30 rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            Record full payment
          </button>
        )}
        {(invoice.status === 'draft' || invoice.status === 'sent') && (
          <button
            onClick={handleVoid}
            className="flex items-center gap-2 text-danger text-sm px-3 py-2 rounded-lg hover:bg-danger/10 transition-colors"
          >
            <XCircle size={14} />
            Void
          </button>
        )}
      </div>
    </div>
  );
}

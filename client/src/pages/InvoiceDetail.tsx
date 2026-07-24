import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Send, XCircle, CheckCircle2, RotateCcw, FileText, Upload, Download, Trash2 } from 'lucide-react';
import {
  getInvoice, markInvoiceSent, voidInvoice, createTransaction, updateInvoice,
  listAttachments, uploadAttachment, downloadAttachmentUrl, deleteAttachment, getInvoicePdfUrl,
} from '../api/cfo';
import DateField from '../components/DateField';
import type { CfoInvoice, CfoInvoiceAttachment } from '@contractor-cfo/shared';

function fmt(n: string | number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n));
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<CfoInvoice | null>(null);
  const [recording, setRecording] = useState(false);
  const [attachments, setAttachments] = useState<CfoInvoiceAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function loadAttachments(invoiceId: number) {
    listAttachments(invoiceId).then(setAttachments).catch(() => {});
  }

  async function load() {
    if (id) {
      const inv = await getInvoice(parseInt(id, 10));
      setInvoice(inv);
      loadAttachments(inv.id);
    }
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

  // Patch a field and keep the on-screen invoice in sync. Preserves the joined
  // client/lineItems data that updateInvoice doesn't return in the same shape.
  async function patch(body: Partial<CfoInvoice>) {
    if (!invoice) return;
    const updated = await updateInvoice(invoice.id, body);
    setInvoice(prev => (prev ? { ...prev, ...updated } : updated));
  }

  function togglePaid() {
    if (!invoice) return;
    patch({ status: invoice.status === 'paid' ? 'sent' : 'paid' });
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
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl font-semibold text-fg">{invoice.invoiceNumber}</h1>
            {client && <p className="text-fg-secondary text-sm mt-1">{client.name}{client.company ? ` · ${client.company}` : ''}</p>}
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:justify-end">
            <span className={`text-xs px-3 py-1 rounded-full ${
              invoice.status === 'paid' ? 'bg-success/15 text-success'
              : invoice.status === 'sent' ? 'bg-brand/15 text-brand'
              : invoice.status === 'overdue' ? 'bg-danger/15 text-danger'
              : 'bg-border text-fg-muted'
            }`}>
              {invoice.status}
            </span>
            {invoice.status === 'draft' && (
              <button
                onClick={handleSend}
                className="flex items-center gap-1.5 bg-brand text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:opacity-90"
              >
                <Send size={12} />
                Mark as sent
              </button>
            )}
            {(invoice.status === 'sent' || invoice.status === 'overdue') && (
              <button
                onClick={handleRecordPayment}
                disabled={recording}
                className="flex items-center gap-1.5 bg-success/15 text-success border border-success/30 rounded-lg px-3 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-50"
              >
                Record payment
              </button>
            )}
            {invoice.status !== 'draft' && invoice.status !== 'void' && (
              <button
                onClick={togglePaid}
                className="flex items-center gap-1.5 border border-border text-fg rounded-lg px-3 py-1.5 text-xs font-medium hover:border-brand transition-colors"
              >
                {invoice.status === 'paid' ? <RotateCcw size={12} /> : <CheckCircle2 size={12} />}
                {invoice.status === 'paid' ? 'Mark unpaid' : 'Mark paid'}
              </button>
            )}
            {(invoice.status === 'draft' || invoice.status === 'sent' || invoice.status === 'overdue') && (
              <button
                onClick={handleVoid}
                className="flex items-center gap-1.5 text-danger text-xs px-2 py-1.5 rounded-lg hover:bg-danger/10 transition-colors"
              >
                <XCircle size={12} />
                Void
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div>
            <label className="block text-xs text-fg-secondary mb-1">Issued</label>
            <DateField
              value={invoice.issuedAt}
              clearable
              onChange={v => patch({ issuedAt: v })}
              placeholder="Not set"
            />
          </div>
          <div>
            <label className="block text-xs text-fg-secondary mb-1">Due</label>
            <DateField
              value={invoice.dueAt}
              clearable
              onChange={v => patch({ dueAt: v })}
              placeholder="Not set"
            />
          </div>
          <div>
            <label className="block text-xs text-fg-secondary mb-1">Paid</label>
            <DateField
              value={invoice.paidAt}
              clearable
              disabled={invoice.status !== 'paid'}
              onChange={v => patch({ paidAt: v })}
              placeholder={invoice.status === 'paid' ? 'Set paid date' : 'Not paid'}
            />
          </div>
        </div>

        {lineItems.length > 0 && (
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm min-w-[420px]">
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
          </div>
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

      {/* Attachments */}
      <div className="bg-surface border border-border rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-fg flex items-center gap-2">
            <FileText size={14} />
            Attachments
          </h2>
          <div className="flex gap-2">
            <a
              href={`${getInvoicePdfUrl(invoice.id)}?token=${localStorage.getItem('cfo_token') ?? ''}`}
              download={`${invoice.invoiceNumber}.pdf`}
              onClick={() => setTimeout(() => loadAttachments(invoice.id), 1500)}
              className="flex items-center gap-1.5 text-xs text-brand hover:opacity-80"
            >
              <Download size={12} />
              Download PDF
            </a>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg"
            >
              <Upload size={12} />
              Upload
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={async e => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploading(true);
                try {
                  await uploadAttachment(invoice.id, file);
                  loadAttachments(invoice.id);
                } finally {
                  setUploading(false);
                  e.target.value = '';
                }
              }}
            />
          </div>
        </div>

        {uploading && <p className="text-xs text-fg-muted mb-2">Uploading…</p>}

        {attachments.length === 0 ? (
          <p className="text-xs text-fg-muted">No attachments yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {attachments.map(att => (
              <li key={att.id} className="flex items-center justify-between text-sm">
                <a
                  href={`${downloadAttachmentUrl(invoice.id, att.id)}?token=${localStorage.getItem('cfo_token') ?? ''}`}
                  download={att.filename}
                  className="flex items-center gap-2 text-fg hover:text-brand truncate"
                >
                  <FileText size={13} className="text-fg-muted shrink-0" />
                  <span className="truncate">{att.filename}</span>
                  {att.source === 'generated' && (
                    <span className="text-xs text-fg-muted shrink-0">(generated)</span>
                  )}
                </a>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteAttachment(invoice.id, att.id);
                    loadAttachments(invoice.id);
                  }}
                  className="ml-3 p-1 text-fg-muted hover:text-danger shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

    </div>
  );
}

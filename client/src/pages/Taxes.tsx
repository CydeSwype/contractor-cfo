import { useEffect, useState, FormEvent } from 'react';
import { CheckCircle, Circle, Plus } from 'lucide-react';
import { getTaxEstimate, getTaxPayments, createTaxPayment } from '../api/cfo';
import type { TaxEstimate, CfoTaxPayment } from '@contractor-cfo/shared';

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}
function pct(n: number) {
  return (n * 100).toFixed(1) + '%';
}

export default function Taxes() {
  const year = new Date().getFullYear();
  const [estimate, setEstimate] = useState<TaxEstimate | null>(null);
  const [payments, setPayments] = useState<CfoTaxPayment[]>([]);
  const [priorYearTax, setPriorYearTax] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [payForm, setPayForm] = useState({ quarter: 1, type: 'federal_estimated', amount: '', paidDate: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);

  async function loadEstimate() {
    const est = await getTaxEstimate({ year, priorYearTax: parseFloat(priorYearTax) || 0 });
    setEstimate(est);
  }

  async function loadPayments() {
    setPayments(await getTaxPayments(year));
  }

  useEffect(() => { loadEstimate(); loadPayments(); }, [year]);

  async function handleRecordPayment(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const due = estimate?.quarterlyDueDates.find(d => d.quarter === payForm.quarter);
      await createTaxPayment({
        year,
        quarter: payForm.quarter,
        type: payForm.type as CfoTaxPayment['type'],
        amount: payForm.amount,
        dueDate: due?.dueDate ?? new Date().toISOString(),
        paidDate: payForm.paidDate || undefined,
      });
      await loadPayments();
      await loadEstimate();
      setShowPaymentForm(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-fg">Taxes — {year}</h1>
      </div>

      {/* Prior year tax input for safe harbor */}
      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm text-fg-secondary whitespace-nowrap">Prior year total tax paid</label>
        <input
          type="number"
          step="1"
          value={priorYearTax}
          onChange={e => setPriorYearTax(e.target.value)}
          onBlur={loadEstimate}
          placeholder="e.g. 12000"
          className="w-36 bg-surface border border-border rounded-lg px-3 py-1.5 text-fg text-sm focus:outline-none focus:border-brand"
        />
        <span className="text-xs text-fg-muted">(used for safe-harbor calculation)</span>
      </div>

      {estimate && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'SE Tax', value: fmt(estimate.seTax) },
              { label: 'Federal Income Tax', value: fmt(estimate.federalIncomeTax) },
              { label: 'State Tax', value: fmt(estimate.stateIncomeTax) },
              { label: 'Per-Quarter Payment', value: fmt(estimate.perQuarterPayment), highlight: true },
            ].map(({ label, value, highlight }) => (
              <div key={label} className={`bg-surface border rounded-xl p-4 ${highlight ? 'border-warning/50' : 'border-border'}`}>
                <div className="text-xs text-fg-muted mb-1">{label}</div>
                <div className={`text-lg font-semibold ${highlight ? 'text-warning' : 'text-fg'}`}>{value}</div>
              </div>
            ))}
          </div>

          <div className="bg-surface border border-border rounded-xl p-5 mb-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-fg-secondary">Net SE income</span>
              <span className="text-fg">{fmt(estimate.netSEIncome)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fg-secondary">SE deduction (50%)</span>
              <span className="text-fg">-{fmt(estimate.seDeduction)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fg-secondary">Recommended reserve</span>
              <span className="text-warning">{pct(estimate.recommendedReservePercent)} of gross income</span>
            </div>
            <div className="flex justify-between text-success border-t border-border pt-2">
              <span>Payments made to date</span>
              <span>{fmt(estimate.paymentsToDate)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-fg-secondary">Remaining liability</span>
              <span className={estimate.remainingLiability > 0 ? 'text-danger' : 'text-success'}>
                {fmt(estimate.remainingLiability)}
              </span>
            </div>
          </div>

          {/* Quarterly due dates */}
          <div className="mb-6">
            <h2 className="text-sm font-medium text-fg mb-3">Quarterly due dates</h2>
            <div className="space-y-2">
              {estimate.quarterlyDueDates.map(q => {
                const paid = payments.filter(p => p.quarter === q.quarter);
                const isPaid = paid.length > 0 && paid.some(p => p.paidDate);
                return (
                  <div key={q.quarter} className="flex items-center justify-between bg-surface border border-border rounded-xl px-5 py-3">
                    <div className="flex items-center gap-3">
                      {isPaid
                        ? <CheckCircle size={16} className="text-success" />
                        : <Circle size={16} className="text-fg-muted" />
                      }
                      <div>
                        <div className="text-fg text-sm">{q.label}</div>
                        <div className="text-fg-muted text-xs">Due {new Date(q.dueDate).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      {isPaid
                        ? <span className="text-success text-sm">{fmt(paid.reduce((s, p) => s + parseFloat(p.amount.toString()), 0))} paid</span>
                        : <span className="text-fg-secondary text-sm">{fmt(estimate.perQuarterPayment)}</span>
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Record payment */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-fg">Payment history</h2>
        <button
          onClick={() => setShowPaymentForm(v => !v)}
          className="flex items-center gap-1.5 text-brand text-sm hover:underline"
        >
          <Plus size={14} />
          Record payment
        </button>
      </div>

      {showPaymentForm && (
        <form onSubmit={handleRecordPayment} className="bg-surface border border-border rounded-xl p-5 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-fg-secondary mb-1">Quarter</label>
              <select value={payForm.quarter} onChange={e => setPayForm(f => ({ ...f, quarter: parseInt(e.target.value) }))}
                className="w-full bg-canvas border border-border rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brand">
                {[1, 2, 3, 4].map(q => <option key={q} value={q}>Q{q}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-fg-secondary mb-1">Type</label>
              <select value={payForm.type} onChange={e => setPayForm(f => ({ ...f, type: e.target.value }))}
                className="w-full bg-canvas border border-border rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brand">
                <option value="federal_estimated">Federal estimated</option>
                <option value="state_estimated">State estimated</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-fg-secondary mb-1">Amount ($)</label>
              <input type="number" step="1" required value={payForm.amount}
                onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full bg-canvas border border-border rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brand" />
            </div>
            <div>
              <label className="block text-xs text-fg-secondary mb-1">Date paid</label>
              <input type="date" value={payForm.paidDate}
                onChange={e => setPayForm(f => ({ ...f, paidDate: e.target.value }))}
                className="w-full bg-canvas border border-border rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brand" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="bg-brand text-white rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save payment'}
            </button>
            <button type="button" onClick={() => setShowPaymentForm(false)} className="text-fg-muted text-sm px-3 py-2 hover:text-fg">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {payments.length === 0 && <p className="text-fg-muted text-sm py-4 text-center">No payments recorded yet.</p>}
        {payments.map(p => (
          <div key={p.id} className="flex items-center justify-between bg-surface border border-border rounded-xl px-5 py-3 text-sm">
            <div>
              <span className="text-fg">Q{p.quarter} {p.type.replace('_', ' ')}</span>
              {p.paidDate && <span className="text-fg-muted ml-2">· paid {new Date(p.paidDate).toLocaleDateString()}</span>}
            </div>
            <span className="text-fg font-medium">{fmt(parseFloat(p.amount.toString()))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

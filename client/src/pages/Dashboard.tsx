import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Shield, DollarSign, AlertTriangle } from 'lucide-react';
import { getDashboard } from '../api/cfo';
import type { CfoDashboard } from '@contractor-cfo/shared';

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function StatCard({ label, value, sub, icon: Icon, color = 'text-fg' }: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm text-fg-secondary">{label}</span>
        <Icon size={16} className={color} />
      </div>
      <div className={`text-2xl font-semibold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-fg-muted mt-1">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<CfoDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear();

  useEffect(() => {
    getDashboard(year)
      .then(setData)
      .finally(() => setLoading(false));
  }, [year]);

  if (loading) return <div className="text-fg-muted">Loading…</div>;
  if (!data) return <div className="text-danger">Failed to load dashboard</div>;

  const reservePct = Math.round(data.taxEstimate.recommendedReservePercent * 100);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-fg">{year} Overview</h1>
          <p className="text-fg-muted text-sm mt-1">Year-to-date summary</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
        <StatCard label="YTD Income" value={fmt(data.ytdIncome)} icon={TrendingUp} color="text-success" />
        <StatCard label="YTD Expenses" value={fmt(data.ytdPersonalExpenses + data.ytdBusinessExpenses)} sub={`${fmt(data.ytdDeductibleExpenses)} deductible`} icon={TrendingDown} color="text-fg" />
        <StatCard label="Tax Reserve Needed" value={fmt(data.taxReserve)} sub={`~${reservePct}% of income`} icon={Shield} color="text-warning" />
        <StatCard label="Net Cash Flow" value={fmt(data.netCashFlow)} icon={DollarSign} color={data.netCashFlow >= 0 ? 'text-success' : 'text-danger'} />
      </div>

      {data.overdueInvoiceCount > 0 && (
        <div className="flex items-center gap-3 bg-danger/10 border border-danger/30 rounded-xl p-4 mb-6">
          <AlertTriangle size={16} className="text-danger flex-shrink-0" />
          <span className="text-sm text-fg">
            <strong className="text-danger">{data.overdueInvoiceCount} overdue invoice{data.overdueInvoiceCount > 1 ? 's' : ''}</strong>
            {' — '}
            <Link to="/invoices?status=sent" className="text-brand underline">view invoices</Link>
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-sm font-medium text-fg mb-4">Quarterly Tax Estimate</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-fg-secondary">SE Tax</span>
              <span className="text-fg">{fmt(data.taxEstimate.seTax)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fg-secondary">Federal Income Tax</span>
              <span className="text-fg">{fmt(data.taxEstimate.federalIncomeTax)}</span>
            </div>
            {data.taxEstimate.stateIncomeTax > 0 && (
              <div className="flex justify-between">
                <span className="text-fg-secondary">State Tax</span>
                <span className="text-fg">{fmt(data.taxEstimate.stateIncomeTax)}</span>
              </div>
            )}
            <div className="border-t border-border pt-2 flex justify-between font-medium">
              <span className="text-fg-secondary">Per Quarter</span>
              <span className="text-warning">{fmt(data.taxEstimate.perQuarterPayment)}</span>
            </div>
            {data.taxEstimate.paymentsToDate > 0 && (
              <div className="flex justify-between text-success">
                <span>Paid to date</span>
                <span>{fmt(data.taxEstimate.paymentsToDate)}</span>
              </div>
            )}
          </div>
          <Link to="/taxes" className="block text-center text-xs text-brand mt-4 hover:underline">
            Full breakdown →
          </Link>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-sm font-medium text-fg mb-4">Outstanding Invoices</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-fg-secondary">Unpaid invoices</span>
              <span className="text-fg">{data.unpaidInvoiceCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fg-secondary">Total outstanding</span>
              <span className="text-fg">{fmt(data.unpaidInvoiceTotal)}</span>
            </div>
            <div className="flex justify-between text-danger">
              <span>Overdue</span>
              <span>{data.overdueInvoiceCount}</span>
            </div>
          </div>
          <Link to="/invoices" className="block text-center text-xs text-brand mt-4 hover:underline">
            View all invoices →
          </Link>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { getBudgetActuals } from '../api/cfo';
import type { BudgetActual } from '@contractor-cfo/shared';

function fmt(n: string | number | null) {
  if (n === null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(n));
}

export default function Budget() {
  const now = new Date();
  const [yearMonth, setYearMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [actuals, setActuals] = useState<BudgetActual[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getBudgetActuals(yearMonth)
      .then(setActuals)
      .finally(() => setLoading(false));
  }, [yearMonth]);

  const totalActual = actuals.reduce((s, a) => s + Number(a.actualAmount), 0);
  const totalBudget = actuals.reduce((s, a) => s + (a.targetAmount ? Number(a.targetAmount) : 0), 0);

  return (
    <div className="max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-fg">Budget</h1>
        <input
          type="month"
          value={yearMonth}
          onChange={e => setYearMonth(e.target.value)}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brand"
        />
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 text-sm">
        <div className="bg-surface border border-border rounded-xl px-3 sm:px-5 py-4">
          <div className="text-fg-muted mb-1">Spent</div>
          <div className="text-lg sm:text-2xl font-semibold text-fg">{fmt(totalActual)}</div>
        </div>
        <div className="bg-surface border border-border rounded-xl px-3 sm:px-5 py-4">
          <div className="text-fg-muted mb-1">Budgeted</div>
          <div className="text-lg sm:text-2xl font-semibold text-fg">{totalBudget ? fmt(totalBudget) : '—'}</div>
        </div>
        <div className="bg-surface border border-border rounded-xl px-3 sm:px-5 py-4">
          <div className="text-fg-muted mb-1">Variance</div>
          <div className={`text-lg sm:text-2xl font-semibold ${totalBudget && totalActual > totalBudget ? 'text-danger' : 'text-success'}`}>
            {totalBudget ? fmt(totalActual - totalBudget) : '—'}
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-fg-muted text-sm">Loading…</p>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="border-b border-border text-fg-muted">
                <th className="text-left px-5 py-3 font-normal">Category</th>
                <th className="text-right px-5 py-3 font-normal">Budget</th>
                <th className="text-right px-5 py-3 font-normal">Actual</th>
                <th className="text-right px-5 py-3 font-normal">Variance</th>
              </tr>
            </thead>
            <tbody>
              {actuals.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-fg-muted">No expenses this month. Set budget targets via the MCP server or API.</td></tr>
              )}
              {actuals.map(row => {
                const over = row.variance !== null && Number(row.variance) > 0;
                return (
                  <tr key={row.category} className="border-b border-border/50">
                    <td className="px-5 py-3 text-fg capitalize">{row.category.replace('_', ' ')}</td>
                    <td className="px-5 py-3 text-fg-secondary text-right">{fmt(row.targetAmount)}</td>
                    <td className="px-5 py-3 text-fg text-right">{fmt(row.actualAmount)}</td>
                    <td className={`px-5 py-3 text-right ${over ? 'text-danger' : 'text-success'}`}>
                      {row.variance !== null ? fmt(row.variance) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

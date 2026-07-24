import { useEffect, useState, FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { getExpenses, createExpense } from '../api/cfo';
import DateField from '../components/DateField';
import type { CfoExpense, ExpenseCategory } from '@contractor-cfo/shared';

const CATEGORIES: ExpenseCategory[] = [
  'software', 'office', 'travel', 'meals', 'phone', 'home_office',
  'healthcare', 'education', 'marketing', 'housing', 'utilities',
  'groceries', 'entertainment', 'other',
];

function fmt(n: string | number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n));
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<CfoExpense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    category: 'software' as ExpenseCategory,
    description: '',
    amount: '',
    expenseDate: new Date().toISOString().slice(0, 10),
    vendor: '',
    isTaxDeductible: false,
    isPersonal: false,
  });
  const [saving, setSaving] = useState(false);

  function load() {
    getExpenses({ year: new Date().getFullYear() }).then(setExpenses);
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const expense = await createExpense({
        ...form,
        amount: parseFloat(form.amount) as unknown as string,
        vendor: form.vendor || undefined,
      });
      setExpenses(es => [expense, ...es]);
      setForm(f => ({ ...f, description: '', amount: '', vendor: '' }));
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  const total = expenses.reduce((s, e) => s + parseFloat(e.amount.toString()), 0);
  const deductible = expenses.filter(e => e.isTaxDeductible).reduce((s, e) => s + parseFloat(e.amount.toString()), 0);

  return (
    <div className="max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Expenses</h1>
          <p className="text-fg-muted text-sm mt-1">
            {fmt(total)} total · {fmt(deductible)} deductible
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center justify-center gap-2 bg-brand text-white rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          <Plus size={16} />
          Add expense
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-surface border border-border rounded-xl p-5 mb-6 space-y-3">
          <h2 className="text-sm font-medium text-fg mb-2">New expense</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-fg-secondary mb-1">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value as ExpenseCategory }))}
                className="w-full bg-canvas border border-border rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brand"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-fg-secondary mb-1">Date</label>
              <DateField
                value={form.expenseDate}
                onChange={v => setForm(f => ({ ...f, expenseDate: v ?? f.expenseDate }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-fg-secondary mb-1">Description *</label>
              <input type="text" value={form.description} required
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full bg-canvas border border-border rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs text-fg-secondary mb-1">Amount ($) *</label>
              <input type="number" step="0.01" value={form.amount} required
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full bg-canvas border border-border rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs text-fg-secondary mb-1">Vendor</label>
              <input type="text" value={form.vendor}
                onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}
                className="w-full bg-canvas border border-border rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brand"
              />
            </div>
          </div>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2 cursor-pointer text-fg-secondary">
              <input type="checkbox" checked={form.isTaxDeductible}
                onChange={e => setForm(f => ({ ...f, isTaxDeductible: e.target.checked }))}
                className="accent-brand" />
              Tax deductible
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-fg-secondary">
              <input type="checkbox" checked={form.isPersonal}
                onChange={e => setForm(f => ({ ...f, isPersonal: e.target.checked }))}
                className="accent-brand" />
              Personal expense
            </label>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving} className="bg-brand text-white rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-fg-muted text-sm px-3 py-2 hover:text-fg">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {expenses.length === 0 && <p className="text-fg-muted text-sm py-8 text-center">No expenses logged yet.</p>}
        {expenses.map(exp => (
          <div key={exp.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-surface border border-border rounded-xl px-5 py-3">
            <div>
              <div className="text-fg text-sm font-medium">{exp.description}</div>
              <div className="text-fg-muted text-xs mt-0.5">
                {exp.category.replace('_', ' ')}
                {exp.vendor ? ` · ${exp.vendor}` : ''}
                {' · '}{new Date(exp.expenseDate).toLocaleDateString()}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {exp.isTaxDeductible && <span className="text-xs text-success bg-success/10 px-2 py-0.5 rounded-full">deductible</span>}
              {exp.isPersonal && <span className="text-xs text-fg-muted bg-border px-2 py-0.5 rounded-full">personal</span>}
              <span className="text-fg text-sm font-medium">{fmt(exp.amount)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ChevronDown, X } from 'lucide-react';
import { getInvoices, getClients } from '../api/cfo';
import type { CfoClient, CfoInvoice } from '@contractor-cfo/shared';

const STATUS_COLORS: Record<string, string> = {
  draft:   'bg-border text-fg-muted',
  sent:    'bg-brand/15 text-brand',
  paid:    'bg-success/15 text-success',
  overdue: 'bg-danger/15 text-danger',
  void:    'bg-border text-fg-muted',
};

function fmt(n: string | number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n));
}

type InvoiceWithClient = CfoInvoice & { client?: Pick<CfoClient, 'id' | 'name' | 'company'> };

function monthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function quarterLabel(yq: string) {
  const [y, q] = yq.split('-Q');
  return `Q${q} ${y}`;
}

function invoiceQuarter(issuedAt: string | null): string | null {
  if (!issuedAt) return null;
  const [y, m] = issuedAt.slice(0, 7).split('-').map(Number);
  return `${y}-Q${Math.ceil(m / 3)}`;
}

export default function Invoices() {
  const [allInvoices, setAllInvoices] = useState<InvoiceWithClient[]>([]);
  const [clients, setClients] = useState<CfoClient[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [timeMode, setTimeMode] = useState<'month' | 'quarter' | null>(null);
  const [timePeriod, setTimePeriod] = useState('');
  const [selectedClientIds, setSelectedClientIds] = useState<Set<number>>(new Set());
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [showVoided, setShowVoided] = useState(false);
  const clientPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getInvoices(showVoided ? { includeVoid: true } : undefined),
      getClients(),
    ]).then(([invs, cls]) => {
      setAllInvoices(invs as InvoiceWithClient[]);
      setClients(cls);
    }).finally(() => setLoading(false));
  }, [showVoided]);

  // Close client picker on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (clientPickerRef.current && !clientPickerRef.current.contains(e.target as Node)) {
        setClientPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // Derive available time periods from invoice data
  const availableMonths = useMemo(() => {
    const s = new Set<string>();
    allInvoices.forEach(inv => { if (inv.issuedAt) s.add(inv.issuedAt.slice(0, 7)); });
    return Array.from(s).sort().reverse();
  }, [allInvoices]);

  const availableQuarters = useMemo(() => {
    const s = new Set<string>();
    availableMonths.forEach(ym => {
      const [y, m] = ym.split('-').map(Number);
      s.add(`${y}-Q${Math.ceil(m / 3)}`);
    });
    return Array.from(s).sort().reverse();
  }, [availableMonths]);

  // Apply all filters client-side
  const filtered = useMemo(() => {
    return allInvoices.filter(inv => {
      if (statusFilter && inv.status !== statusFilter) return false;

      if (timeMode && timePeriod) {
        const ym = inv.issuedAt?.slice(0, 7) ?? null;
        if (!ym) return false;
        if (timeMode === 'month' && ym !== timePeriod) return false;
        if (timeMode === 'quarter' && invoiceQuarter(inv.issuedAt) !== timePeriod) return false;
      }

      if (selectedClientIds.size > 0) {
        const cid = inv.client?.id;
        if (!cid || !selectedClientIds.has(cid)) return false;
      }

      return true;
    });
  }, [allInvoices, statusFilter, timeMode, timePeriod, selectedClientIds]);

  function toggleTimeMode(mode: 'month' | 'quarter') {
    if (timeMode === mode) {
      setTimeMode(null);
      setTimePeriod('');
    } else {
      setTimeMode(mode);
      setTimePeriod('');
    }
  }

  function toggleClient(id: number) {
    setSelectedClientIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function clearAllFilters() {
    setStatusFilter('');
    setTimeMode(null);
    setTimePeriod('');
    setSelectedClientIds(new Set());
  }

  function toggleShowVoided() {
    setShowVoided(prev => {
      const next = !prev;
      if (!next && statusFilter === 'void') setStatusFilter('');
      return next;
    });
  }

  const hasActiveFilters = statusFilter || timeMode || selectedClientIds.size > 0;
  const statuses = showVoided
    ? ['', 'draft', 'sent', 'paid', 'overdue', 'void']
    : ['', 'draft', 'sent', 'paid', 'overdue'];
  const clientLabel = selectedClientIds.size === 0
    ? 'Clients'
    : selectedClientIds.size === 1
      ? clients.find(c => selectedClientIds.has(c.id))?.name ?? '1 client'
      : `${selectedClientIds.size} clients`;

  return (
    <div className="max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-fg">Invoices</h1>
        <Link
          to="/invoices/new"
          className="flex items-center justify-center gap-2 bg-brand text-white rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          <Plus size={16} />
          New invoice
        </Link>
      </div>

      {/* Filter bar */}
      <div className="space-y-3 mb-5">
        {/* Status pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s === statusFilter ? '' : s)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                statusFilter === s
                  ? 'border-brand bg-brand/15 text-brand'
                  : 'border-border text-fg-muted hover:text-fg'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>

        {/* Time + client filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Month / Quarter toggle */}
          <div className="flex items-center bg-surface border border-border rounded-lg overflow-hidden text-xs">
            <button
              onClick={() => toggleTimeMode('month')}
              className={`px-3 py-1.5 transition-colors ${
                timeMode === 'month' ? 'bg-brand/15 text-brand' : 'text-fg-muted hover:text-fg'
              }`}
            >
              Month
            </button>
            <div className="w-px h-4 bg-border" />
            <button
              onClick={() => toggleTimeMode('quarter')}
              className={`px-3 py-1.5 transition-colors ${
                timeMode === 'quarter' ? 'bg-brand/15 text-brand' : 'text-fg-muted hover:text-fg'
              }`}
            >
              Quarter
            </button>
          </div>

          {/* Period selector */}
          {timeMode === 'month' && (
            <select
              value={timePeriod}
              onChange={e => setTimePeriod(e.target.value)}
              className="bg-canvas border border-border rounded-lg px-3 py-1.5 text-xs text-fg focus:outline-none focus:border-brand"
            >
              <option value="">All months</option>
              {availableMonths.map(ym => (
                <option key={ym} value={ym}>{monthLabel(ym)}</option>
              ))}
            </select>
          )}
          {timeMode === 'quarter' && (
            <select
              value={timePeriod}
              onChange={e => setTimePeriod(e.target.value)}
              className="bg-canvas border border-border rounded-lg px-3 py-1.5 text-xs text-fg focus:outline-none focus:border-brand"
            >
              <option value="">All quarters</option>
              {availableQuarters.map(yq => (
                <option key={yq} value={yq}>{quarterLabel(yq)}</option>
              ))}
            </select>
          )}

          {/* Client multi-select */}
          <div className="relative" ref={clientPickerRef}>
            <button
              onClick={() => setClientPickerOpen(o => !o)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg transition-colors ${
                selectedClientIds.size > 0
                  ? 'border-brand bg-brand/15 text-brand'
                  : 'border-border text-fg-muted hover:text-fg'
              }`}
            >
              {clientLabel}
              <ChevronDown size={11} />
            </button>

            {clientPickerOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-surface border border-border rounded-xl shadow-xl py-1 min-w-48">
                {clients.map(c => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-fg hover:bg-border/40 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedClientIds.has(c.id)}
                      onChange={() => toggleClient(c.id)}
                      className="accent-brand"
                    />
                    <span>{c.name}</span>
                    {c.company && <span className="text-fg-muted text-xs">{c.company}</span>}
                  </label>
                ))}
                {clients.length === 0 && (
                  <p className="px-3 py-2 text-xs text-fg-muted">No clients</p>
                )}
              </div>
            )}
          </div>

          {/* Clear */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 text-xs text-fg-muted hover:text-fg ml-1"
            >
              <X size={11} />
              Clear
            </button>
          )}

          {/* Show voided toggle */}
          <label className="flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg cursor-pointer ml-auto">
            <input
              type="checkbox"
              checked={showVoided}
              onChange={toggleShowVoided}
              className="accent-brand"
            />
            Show voided
          </label>
        </div>
      </div>

      {/* Invoice list */}
      {loading ? (
        <p className="text-fg-muted text-sm">Loading…</p>
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <p className="text-fg-muted text-sm py-8 text-center">No invoices match these filters.</p>
          )}
          {filtered.map(inv => (
            <Link
              key={inv.id}
              to={`/invoices/${inv.id}`}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-surface border border-border rounded-xl px-5 py-4 hover:border-brand/50 transition-colors"
            >
              <div>
                <div className="text-fg font-medium text-sm">{inv.invoiceNumber}</div>
                <div className="text-fg-muted text-xs mt-0.5">
                  {inv.client?.name ?? '—'}
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

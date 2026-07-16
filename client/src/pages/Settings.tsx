import { useEffect, useState, FormEvent } from 'react';
import { Plus, Trash2, Copy, Check } from 'lucide-react';
import { getHousehold, updateHousehold, inviteMember, getTokens, createToken, deleteToken } from '../api/cfo';
import { STATE_TAX_RATES, getStateInfo } from '@contractor-cfo/shared';

type TokenScope = 'full' | 'read_only' | 'invoice_only';
interface Token { id: number; name: string; scope: TokenScope; lastUsedAt: string | null; createdAt: string; token?: string }

const SCOPE_LABELS: Record<TokenScope, string> = {
  full: 'Full access',
  read_only: 'Read-only',
  invoice_only: 'Invoices only',
};

interface HouseholdState {
  name: string;
  state: string | null;
  stateRate: string | null;
  filingStatus: string;
  priorYearTax: string | null;
  otherIncome: string | null;
  members: { id: number; name: string; email: string; role: string }[];
}

export default function Settings() {
  const [household, setHousehold] = useState<HouseholdState | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [tokenScope, setTokenScope] = useState<TokenScope>('full');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getHousehold().then(setHousehold);
    getTokens().then(setTokens);
  }, []);

  async function saveHousehold(e: FormEvent) {
    e.preventDefault();
    if (!household) return;
    const updated = await updateHousehold({
      name: household.name,
      state: household.state,
      filingStatus: household.filingStatus,
      priorYearTax: household.priorYearTax ? parseFloat(household.priorYearTax) : null,
      otherIncome: household.otherIncome ? parseFloat(household.otherIncome) : null,
    });
    setHousehold(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    const result = await inviteMember(inviteEmail);
    setInviteUrl(`${window.location.origin}/invite/${result.token}`);
    setInviteEmail('');
  }

  async function handleCreateToken(e: FormEvent) {
    e.preventDefault();
    if (!tokenName) return;
    const result = await createToken(tokenName, undefined, tokenScope);
    setNewToken(result.token);
    setTokens(ts => [result, ...ts]);
    setTokenName('');
    setTokenScope('full');
  }

  async function handleDeleteToken(id: number) {
    if (!confirm('Delete this token? Any app using it will lose access.')) return;
    await deleteToken(id);
    setTokens(ts => ts.filter(t => t.id !== id));
  }

  function copyToken() {
    if (!newToken) return;
    navigator.clipboard.writeText(newToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold text-fg">Settings</h1>

      {/* Household */}
      {household && (
        <section>
          <h2 className="text-sm font-medium text-fg mb-4">Household</h2>
          <form onSubmit={saveHousehold} className="bg-surface border border-border rounded-xl p-5 space-y-3">
            <div>
              <label className="block text-xs text-fg-secondary mb-1">Household name</label>
              <input type="text" value={household.name}
                onChange={e => setHousehold(h => h ? { ...h, name: e.target.value } : h)}
                className="w-full bg-canvas border border-border rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brand" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-fg-secondary mb-1">State</label>
                <select value={household.state ?? ''}
                  onChange={e => setHousehold(h => h ? { ...h, state: e.target.value || null } : h)}
                  className="w-full bg-canvas border border-border rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brand">
                  <option value="">Select state…</option>
                  {STATE_TAX_RATES.map(s => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
                {(() => {
                  const info = getStateInfo(household.state);
                  if (!info) return <p className="text-xs text-fg-muted mt-1">We'll apply the state's tax rate automatically.</p>;
                  return (
                    <p className="text-xs text-fg-muted mt-1">
                      Est. state rate <span className="text-fg-secondary">{(info.rate * 100).toFixed(2)}%</span>
                      {info.hasLocalIncomeTax && ' · local city/county tax may also apply'}
                    </p>
                  );
                })()}
              </div>
              <div>
                <label className="block text-xs text-fg-secondary mb-1">Filing status</label>
                <select value={household.filingStatus}
                  onChange={e => setHousehold(h => h ? { ...h, filingStatus: e.target.value } : h)}
                  className="w-full bg-canvas border border-border rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brand">
                  <option value="single">Single</option>
                  <option value="mfj">Married filing jointly</option>
                  <option value="mfs">Married filing separately</option>
                  <option value="hoh">Head of household</option>
                </select>
              </div>
            </div>

            <div className="border-t border-border pt-3 space-y-3">
              <p className="text-xs text-fg-muted">Tax estimate inputs — used by the dashboard and Claude</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-fg-secondary mb-1">Prior year total tax ($)</label>
                  <input type="number" step="1" min="0"
                    value={household.priorYearTax ?? ''}
                    onChange={e => setHousehold(h => h ? { ...h, priorYearTax: e.target.value || null } : h)}
                    placeholder="e.g. 24000"
                    className="w-full bg-canvas border border-border rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brand" />
                  <p className="text-xs text-fg-muted mt-1">From last year's tax return — enables safe harbor calc</p>
                </div>
                <div>
                  <label className="block text-xs text-fg-secondary mb-1">Other annual income ($)</label>
                  <input type="number" step="1" min="0"
                    value={household.otherIncome ?? ''}
                    onChange={e => setHousehold(h => h ? { ...h, otherIncome: e.target.value || null } : h)}
                    placeholder="e.g. 50000"
                    className="w-full bg-canvas border border-border rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brand" />
                  <p className="text-xs text-fg-muted mt-1">W2, dividends, rental income, etc.</p>
                </div>
              </div>
            </div>

            <button type="submit" className="flex items-center gap-2 bg-brand text-white rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90">
              {saved ? <Check size={14} /> : null}
              {saved ? 'Saved' : 'Save'}
            </button>
          </form>

          {/* Members */}
          <div className="mt-4">
            <h3 className="text-xs text-fg-muted mb-2">Members</h3>
            {household.members.map(m => (
              <div key={m.id} className="flex items-center justify-between bg-surface border border-border rounded-xl px-4 py-3 mb-2 text-sm">
                <div>
                  <span className="text-fg">{m.name}</span>
                  <span className="text-fg-muted ml-2">{m.email}</span>
                </div>
                <span className="text-xs text-fg-muted capitalize">{m.role}</span>
              </div>
            ))}

            <form onSubmit={handleInvite} className="flex gap-2 mt-3">
              <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                placeholder="Partner's email"
                className="flex-1 bg-canvas border border-border rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brand placeholder:text-fg-muted" />
              <button type="submit" className="bg-surface border border-border text-fg text-sm rounded-lg px-4 py-2 hover:border-brand transition-colors">
                Invite
              </button>
            </form>
            {inviteUrl && (
              <p className="text-xs text-fg-secondary mt-2">Invite link: <span className="text-brand">{inviteUrl}</span></p>
            )}
          </div>
        </section>
      )}

      {/* API Tokens */}
      <section>
        <h2 className="text-sm font-medium text-fg mb-1">API Tokens</h2>
        <p className="text-xs text-fg-muted mb-4">
          Generate a Personal Access Token to use with Claude Desktop, ChatGPT, or this
          project's MCP server. Prefer the narrowest scope that works and a short
          expiry for anything handed to an AI agent — see the README's "Token scopes"
          section for guidance.
        </p>

        {newToken && (
          <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 mb-4">
            <p className="text-xs text-warning mb-2">Copy this token now — it won't be shown again.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-fg bg-canvas rounded px-3 py-2 overflow-x-auto">{newToken}</code>
              <button onClick={copyToken} className="text-fg-secondary hover:text-fg">
                {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleCreateToken} className="flex gap-2 mb-4">
          <input type="text" value={tokenName} onChange={e => setTokenName(e.target.value)}
            placeholder='Token name, e.g. "Claude Desktop"'
            className="flex-1 bg-canvas border border-border rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brand placeholder:text-fg-muted" />
          <select value={tokenScope} onChange={e => setTokenScope(e.target.value as TokenScope)}
            className="bg-canvas border border-border rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brand">
            <option value="full">Full access</option>
            <option value="invoice_only">Invoices only</option>
            <option value="read_only">Read-only</option>
          </select>
          <button type="submit" className="flex items-center gap-2 bg-brand text-white rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90">
            <Plus size={14} />
            Generate
          </button>
        </form>

        <div className="space-y-2">
          {tokens.map(tok => (
            <div key={tok.id} className="flex items-center justify-between bg-surface border border-border rounded-xl px-4 py-3 text-sm">
              <div>
                <span className="text-fg">{tok.name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-border text-fg-muted ml-2">{SCOPE_LABELS[tok.scope]}</span>
                {tok.lastUsedAt && <span className="text-fg-muted text-xs ml-2">last used {new Date(tok.lastUsedAt).toLocaleDateString()}</span>}
              </div>
              <button onClick={() => handleDeleteToken(tok.id)} className="text-danger hover:text-danger/70">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {tokens.length === 0 && <p className="text-fg-muted text-xs">No tokens yet.</p>}
        </div>
      </section>
    </div>
  );
}

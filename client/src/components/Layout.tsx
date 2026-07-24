import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, Receipt, PieChart, Calculator, Settings, LogOut, Menu, X,
} from 'lucide-react';

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clients', icon: Users, label: 'Clients' },
  { to: '/invoices', icon: FileText, label: 'Invoices' },
  { to: '/expenses', icon: Receipt, label: 'Expenses' },
  { to: '/budget', icon: PieChart, label: 'Budget' },
  { to: '/taxes', icon: Calculator, label: 'Taxes' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  function logout() {
    localStorage.removeItem('cfo_token');
    navigate('/login');
  }

  return (
    <div className="flex h-screen">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav
        className={`fixed inset-y-0 left-0 z-50 w-64 flex-shrink-0 flex flex-col bg-surface border-r border-border py-6 px-3 transition-transform duration-200 md:static md:z-auto md:w-56 md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-3 mb-8">
          <span className="text-lg font-semibold text-fg">Contractor CFO</span>
          <button
            onClick={() => setMobileOpen(false)}
            className="text-fg-muted hover:text-fg md:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-1">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-brand/15 text-brand'
                    : 'text-fg-secondary hover:text-fg hover:bg-white/5'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-fg-muted hover:text-fg hover:bg-white/5 transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </nav>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 bg-surface border-b border-border px-4 py-3 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-fg-secondary hover:text-fg"
          >
            <Menu size={20} />
          </button>
          <span className="text-base font-semibold text-fg">Contractor CFO</span>
        </div>

        <main className="flex-1 overflow-y-auto bg-canvas p-4 sm:p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, Receipt, PieChart, Calculator, Settings, LogOut,
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

  function logout() {
    localStorage.removeItem('cfo_token');
    navigate('/login');
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <nav className="w-56 flex-shrink-0 flex flex-col bg-surface border-r border-border py-6 px-3">
        <div className="px-3 mb-8">
          <span className="text-lg font-semibold text-fg">Contractor CFO</span>
        </div>

        <div className="flex-1 space-y-1">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
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

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-canvas p-8">
        <Outlet />
      </main>
    </div>
  );
}

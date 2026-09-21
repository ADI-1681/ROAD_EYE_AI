import { NavLink, Outlet } from 'react-router-dom';
import RoadEyeLogo from './RoadEyeLogo';
import { APP_ROUTES } from '../constants/app';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { label: 'Dashboard', to: APP_ROUTES.dashboard },
  { label: 'My Complaints', to: APP_ROUTES.myComplaints },
  { label: 'Report Issue', to: APP_ROUTES.reportIssue },
];

export default function DashboardShell() {
  const { user, logout } = useAuth();

  const handleBrandRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:px-6">
        <header className="rounded-3xl border border-slate-200 bg-white/90 shadow-sm ring-1 ring-slate-200/70 backdrop-blur-sm">
          <div className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <RoadEyeLogo compact className="-my-1" onClick={handleBrandRefresh} />
              <div>
                <h1 className="text-xl font-bold text-slate-900">Citizen dashboard</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
                {user?.name || 'Citizen'}
              </div>
              <button
                type="button"
                onClick={logout}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Logout
              </button>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2 border-t border-slate-200 bg-slate-50/80 px-4 py-3">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === APP_ROUTES.dashboard}
                className={({ isActive }) =>
                  `rounded-xl px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-cyan-700 text-white shadow-sm shadow-cyan-200'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

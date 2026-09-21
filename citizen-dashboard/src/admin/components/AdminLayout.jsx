import { NavLink, Outlet } from 'react-router-dom';
import RoadEyeLogo from '../../components/RoadEyeLogo';
import { useAdminAuth } from '../context/AdminAuthContext';

const navItems = [
  { label: 'Dashboard', to: '/admin/dashboard' },
  { label: 'Complaints', to: '/admin/complaints' },
  { label: 'Map Overview', to: '/admin/map' },
  { label: 'Dashcam Demo', to: '/admin/dashcam' },
];

export default function AdminLayout() {
  const { user, logout } = useAdminAuth();

  const handleBrandRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        <header className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <RoadEyeLogo compact className="-my-1" onClick={handleBrandRefresh} />
              <div>
                <h1 className="text-xl font-bold text-slate-900">Admin dashboard</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700">
                {user?.name || 'Admin'}
              </div>
              <button
                type="button"
                onClick={logout}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
              >
                Logout
              </button>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-xl px-4 py-2 text-sm font-medium ${
                    isActive ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="mt-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

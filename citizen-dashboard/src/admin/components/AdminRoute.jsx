import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

export default function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, user, logout } = useAdminAuth();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!isAdmin || user?.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">Not authorized</h2>
          <p className="mt-3 text-sm text-slate-600">This account does not have access to the admin dashboard.</p>
          <button
            type="button"
            onClick={logout}
            className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Return to login
          </button>
        </div>
      </div>
    );
  }

  return children;
}

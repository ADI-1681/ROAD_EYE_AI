import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../admin/context/AdminAuthContext';
import RoadEyeLogo from '../../components/RoadEyeLogo';
import { useAuth } from '../../context/AuthContext';
import service from '../../services';
import adminService from '../../shared/adminService';

const isGoogleEmail = (value) => /^[^\s@]+@(gmail\.com|googlemail\.com)$/i.test(String(value || '').trim());

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { login: adminLogin } = useAdminAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState('citizen');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const email = form.email.trim();
    if (!isGoogleEmail(email)) {
      setError('Only Gmail addresses are allowed.');
      return;
    }

    setLoading(true);

    try {
      if (selectedRole === 'admin') {
        const response = await adminService.login({ ...form, email });

        if (!response?.user || response.user.role !== 'admin') {
          throw new Error('Not authorized');
        }

        adminLogin(response.user, response.token);
        navigate('/admin/dashboard');
        return;
      }

      const response = await service.login({ ...form, email });
      login(response.user, response.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/50">
        <div className="mb-6 text-center">
          <RoadEyeLogo className="mx-auto" />
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedRole('citizen')}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                selectedRole === 'citizen'
                  ? 'bg-cyan-700 text-white shadow-sm'
                  : 'border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Citizen
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole('admin')}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                selectedRole === 'admin'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Admin
            </button>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="text"
              inputMode="email"
              autoComplete="username"
              value={form.email}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
              placeholder="you@gmail.com"
              required
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700" htmlFor="password">
                Password
              </label>
              <Link to="/forgot-password" className="text-sm font-medium text-cyan-700 hover:text-cyan-800">
                Forgot?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
              placeholder="••••••••"
              required
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="submit"
              disabled={loading}
              className={`rounded-xl px-4 py-3 text-base font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                selectedRole === 'admin' ? 'bg-slate-900 hover:bg-slate-800' : 'bg-cyan-700 hover:bg-cyan-800'
              }`}
            >
              {loading ? 'Signing in...' : selectedRole === 'admin' ? 'Admin login' : 'Citizen login'}
            </button>
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Create one
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

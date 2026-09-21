import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../shared/adminService';
import { useAdminAuth } from '../context/AdminAuthContext';

const isGoogleEmail = (value) => /^[^\s@]+@(gmail\.com|googlemail\.com)$/i.test(String(value || '').trim());

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAdminAuth();
  const [form, setForm] = useState({
    email: 'adityasrivastava20060825@gmail.com',
    password: 'aditya2006',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const email = form.email.trim();
    if (!isGoogleEmail(email)) {
      setError('Only Gmail addresses are allowed for admin login.');
      return;
    }

    setLoading(true);

    try {
      const response = await adminService.login({ ...form, email });

      if (!response?.user || response.user.role !== 'admin') {
        throw new Error('Not authorized');
      }

      login(response.user, response.token);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err?.message || 'Admin login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-lg font-bold text-white">
            R
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Admin portal</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">ROAD EYE</h1>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="text"
              inputMode="email"
              autoComplete="username"
              title="Use your Gmail address"
              value={form.email}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-slate-500"
              required
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-base font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

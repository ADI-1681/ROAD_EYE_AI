import { Link } from 'react-router-dom';
import { APP_ROUTES, DASHBOARD_SUMMARY, STATUS_META } from '../../constants/app';
import { useAuth } from '../../context/AuthContext';
import service from '../../services';
import { useEffect, useState } from 'react';

const summaryCards = [
  { label: 'Total complaints', value: DASHBOARD_SUMMARY.totalComplaints, accent: 'cyan' },
  { label: 'Resolved this month', value: DASHBOARD_SUMMARY.resolvedThisMonth, accent: 'emerald' },
  { label: 'Avg. resolution', value: `${DASHBOARD_SUMMARY.avgResolutionHours} hrs`, accent: 'amber' },
  { label: 'Response rate', value: `${DASHBOARD_SUMMARY.responseRate}%`, accent: 'violet' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadComplaints = async () => {
      try {
        const data = await service.getComplaints();
        setComplaints(data.slice(0, 3));
      } catch (error) {
        console.error('Failed to load dashboard complaints', error);
      } finally {
        setLoading(false);
      }
    };

    loadComplaints();
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-cyan-700 via-cyan-600 to-cyan-500 p-6 text-white shadow-lg shadow-cyan-200/40">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100">Welcome back</p>
            <h2 className="mt-2 text-3xl font-bold">{user?.name || 'Citizen'}</h2>
          </div>
          <Link
            to={APP_ROUTES.reportIssue}
            className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-50"
          >
            Report a civic issue
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{card.label}</p>
              <span className={`h-2.5 w-2.5 rounded-full ${
                card.accent === 'cyan' ? 'bg-cyan-500' :
                card.accent === 'emerald' ? 'bg-emerald-500' :
                card.accent === 'amber' ? 'bg-amber-500' : 'bg-violet-500'
              }`} />
            </div>
            <p className="mt-4 text-3xl font-bold text-slate-900">{card.value}</p>
          </div>
        ))}
      </section>

    </div>
  );
}

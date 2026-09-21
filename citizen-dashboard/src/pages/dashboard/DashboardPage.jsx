import { Link } from 'react-router-dom';
import { APP_ROUTES, DASHBOARD_SUMMARY, STATUS_META } from '../../constants/app';
import { useAuth } from '../../context/AuthContext';
import service from '../../services';
import { useEffect, useState } from 'react';
import ComplaintLocationMap from '../../shared/components/ComplaintLocationMap';

const summaryCards = [
  { label: 'Total complaints', value: DASHBOARD_SUMMARY.totalComplaints, accent: 'cyan' },
  { label: 'Resolved this month', value: DASHBOARD_SUMMARY.resolvedThisMonth, accent: 'emerald' },
  { label: 'Avg. resolution', value: `${DASHBOARD_SUMMARY.avgResolutionHours} hrs`, accent: 'amber' },
  { label: 'Response rate', value: `${DASHBOARD_SUMMARY.responseRate}%`, accent: 'violet' },
];

const parseLocation = (value) => {
  const [lat, lng] = String(value || '').split(',').map(Number);
  return {
    lat: Number.isFinite(lat) ? lat : 12.9716,
    lng: Number.isFinite(lng) ? lng : 77.5946,
  };
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [summary, setSummary] = useState(DASHBOARD_SUMMARY);
  const [loading, setLoading] = useState(true);

  const summaryCards = [
    { label: 'Total complaints', value: summary.totalComplaints, accent: 'cyan' },
    { label: 'Resolved this month', value: summary.resolvedThisMonth, accent: 'emerald' },
    { label: 'Avg. resolution', value: `${summary.avgResolutionHours} hrs`, accent: 'amber' },
    { label: 'Response rate', value: `${summary.responseRate}%`, accent: 'violet' },
  ];

  useEffect(() => {
    const loadComplaints = async () => {
      try {
        const [summaryData, complaintData] = await Promise.all([
          service.getDashboardSummary(),
          service.getComplaints(),
        ]);
        setSummary(summaryData);
        setComplaints(complaintData.slice(0, 3));
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

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Recent complaints</h3>
            <p className="mt-1 text-sm text-slate-500">Your latest submitted reports appear here.</p>
          </div>
          <Link to={APP_ROUTES.myComplaints} className="text-sm font-semibold text-cyan-700 hover:text-cyan-800">
            View all
          </Link>
        </div>

        {loading ? (
          <p className="mt-5 text-sm text-slate-500">Loading complaints...</p>
        ) : complaints.length === 0 ? (
          <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No complaints submitted yet.</p>
        ) : (
          <div className="mt-4 divide-y divide-slate-100">
            {complaints.map((complaint) => {
              const meta = STATUS_META[complaint.status] || STATUS_META.submitted;
              return (
                <Link key={complaint.id} to={`/complaints/${complaint.id}`} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0 hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{complaint.title}</p>
                    <p className="mt-1 truncate text-sm text-slate-500">{complaint.type} · {complaint.address}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{meta.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {!loading && complaints.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-900">Latest complaint location</h3>
            <p className="mt-1 text-sm text-slate-500">Map for your most recently submitted report.</p>
          </div>
          <ComplaintLocationMap
            {...parseLocation(complaints[0].location)}
            address={complaints[0].address || complaints[0].landmark || 'Complaint location'}
            locations={complaints[0].photoLocations || []}
          />
        </section>
      ) : null}

    </div>
  );
}

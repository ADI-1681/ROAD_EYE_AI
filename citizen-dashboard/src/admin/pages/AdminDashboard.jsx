import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard';
import adminService from '../../shared/adminService';
import { STATUS_META, SEVERITY_META } from '../../shared/constants';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, pending: 0, in_progress: 0, resolved: 0, high_severity_open: 0 });
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);

      try {
        const [statsResponse, complaintsResponse] = await Promise.all([
          adminService.getStats(),
          adminService.getComplaints({ page: 1, page_size: 5, sort: 'newest' }),
        ]);

        setStats(statsResponse);
        setQueue(complaintsResponse.items || []);
      } catch (error) {
        console.error('Failed to load admin dashboard', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const topIssues = useMemo(() => {
    const counts = {};

    queue.forEach((complaint) => {
      const key = complaint.analysis.issue_type;
      counts[key] = (counts[key] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [queue]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Operations summary</p>
            <h2 className="text-2xl font-bold text-slate-900">Overview</h2>
          </div>
          <Link to="/admin/complaints" className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Review queue
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
          Loading dashboard metrics...
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total complaints" value={stats.total} helper="All active citizen reports" tone="slate" />
            <StatCard label="Pending" value={stats.pending} helper="Awaiting review" tone="amber" />
            <StatCard label="In progress" value={stats.in_progress} helper="Assigned to teams" tone="cyan" />
            <StatCard label="High severity open" value={stats.high_severity_open} helper="Priority incidents" tone="red" />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Needs attention</h3>
                <Link to="/admin/complaints" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                  View all
                </Link>
              </div>

              <div className="mt-5 space-y-3">
                {queue.length === 0 ? (
                  <p className="text-sm text-slate-500">No complaints available right now.</p>
                ) : (
                  queue.map((complaint) => {
                    const statusMeta = STATUS_META[complaint.status] || STATUS_META.pending;
                    const severityMeta = SEVERITY_META[complaint.analysis.severity] || SEVERITY_META.medium;

                    return (
                      <div key={complaint.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div>
                          <p className="font-semibold text-slate-900">{complaint.id}</p>
                          <p className="text-sm text-slate-600">{complaint.analysis.issue_type}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${
                            severityMeta.tone === 'danger' ? 'bg-red-100 text-red-700' :
                            severityMeta.tone === 'warning' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-200 text-slate-700'
                          }`}>
                            {severityMeta.label}
                          </span>
                          <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${
                            statusMeta.tone === 'success' ? 'bg-emerald-100 text-emerald-700' :
                            statusMeta.tone === 'warning' ? 'bg-amber-100 text-amber-700' :
                            statusMeta.tone === 'neutral' ? 'bg-slate-200 text-slate-700' : 'bg-cyan-100 text-cyan-700'
                          }`}>
                            {statusMeta.label}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">Issue mix</h3>
              <div className="mt-5 space-y-4">
                {topIssues.length === 0 ? (
                  <p className="text-sm text-slate-500">No issue data available.</p>
                ) : (
                  topIssues.map((item) => (
                    <div key={item.name}>
                      <div className="mb-1 flex items-center justify-between text-sm text-slate-600">
                        <span>{item.name}</span>
                        <span className="font-semibold text-slate-900">{item.count}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-slate-900"
                          style={{ width: `${Math.max((item.count / Math.max(queue.length, 1)) * 100, 12)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

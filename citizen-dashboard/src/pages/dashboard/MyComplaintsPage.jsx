import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { APP_ROUTES, STATUS_META } from '../../constants/app';
import service from '../../services';

const formatDate = (value) => {
  if (!value) return 'Recently';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export default function MyComplaintsPage() {
  const location = useLocation();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadComplaints = async () => {
      try {
        const data = await service.getComplaints();
        setComplaints(data);
      } catch (error) {
        console.error('Failed to load complaints', error);
      } finally {
        setLoading(false);
      }
    };

    loadComplaints();
  }, []);

  const filteredComplaints = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return complaints;

    return complaints.filter((complaint) => {
      const fields = [
        complaint.title,
        complaint.type,
        complaint.address,
        complaint.landmark,
        complaint.report_code,
        complaint.id,
      ].filter(Boolean);

      return fields.some((field) => String(field).toLowerCase().includes(query));
    });
  }, [complaints, search]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Track progress</p>
          <h2 className="text-2xl font-bold text-slate-900">My complaints</h2>
        </div>
        <Link
          to={APP_ROUTES.reportIssue}
          className="rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800"
        >
          Report new issue
        </Link>
      </div>

      {location?.state?.lastSubmitted ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Report submitted successfully. Reference: {location.state.lastSubmitted.report_code || location.state.lastSubmitted.id}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by title, code, landmark, or location"
          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
        />
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">
          Loading complaints...
        </div>
      ) : filteredComplaints.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          {search ? 'No complaints match your search.' : 'No complaints yet.'}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredComplaints.map((complaint) => {
            const meta = STATUS_META[complaint.status] || STATUS_META.submitted;

            return (
              <div key={complaint.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                        {complaint.report_code || complaint.id}
                      </span>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                        meta.tone === 'success' ? 'bg-emerald-100 text-emerald-700' :
                        meta.tone === 'warning' ? 'bg-amber-100 text-amber-700' :
                        meta.tone === 'info' ? 'bg-cyan-100 text-cyan-700' :
                        meta.tone === 'danger' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {meta.label}
                      </span>
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">
                        {complaint.priority || 'Medium'} priority
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-slate-900">{complaint.title}</p>
                    <p className="text-sm text-slate-500">{complaint.type} • {complaint.address}</p>
                  </div>

                  <div className="flex flex-col items-start gap-3 md:items-end">
                    <p className="text-xs text-slate-500">Updated {formatDate(complaint.updatedAt || complaint.createdAt)}</p>
                    <Link
                      to={`/complaints/${complaint.id}`}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                    >
                      View details
                    </Link>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                    {complaint.landmark || 'Landmark not provided'}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                    {complaint.assignedTo || 'Awaiting assignment'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

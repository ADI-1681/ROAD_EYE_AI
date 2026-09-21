import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { APP_ROUTES, STATUS_META } from '../../constants/app';
import service from '../../services';

const formatDate = (value) => {
  if (!value) return 'Recently';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Recently';

  return parsed.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export default function ComplaintDetailPage() {
  const { id } = useParams();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadComplaint = async () => {
      try {
        const data = await service.getComplaintById(id);
        setComplaint(data);
      } catch (error) {
        console.error('Failed to load complaint details', error);
      } finally {
        setLoading(false);
      }
    };

    loadComplaint();
  }, [id]);

  const statusMeta = useMemo(
    () => STATUS_META[complaint?.status] || STATUS_META.submitted,
    [complaint],
  );

  const timeline = useMemo(() => {
    if (!complaint) return [];

    const entries = [
      {
        label: 'Submitted',
        date: complaint.createdAt,
        description: complaint.citizen_description || complaint.description || 'Complaint submitted by citizen.',
      },
      {
        label: 'Status',
        date: complaint.updatedAt || complaint.createdAt,
        description: complaint.status ? `Current status: ${complaint.status}` : 'Awaiting agency review.',
      },
    ];

    if (complaint.assignedTo) {
      entries.push({
        label: 'Assigned',
        date: complaint.updatedAt || complaint.createdAt,
        description: `Assigned to ${complaint.assignedTo}`,
      });
    }

    return entries;
  }, [complaint]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm text-slate-500">
        Loading complaint details...
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Complaint not found</h2>
        <Link to={APP_ROUTES.myComplaints} className="mt-4 inline-block text-cyan-700 font-semibold">
          Return to my complaints
        </Link>
      </div>
    );
  }

  const reportCode = complaint.report_code || complaint.id;
  const mapQuery = encodeURIComponent(complaint.landmark || complaint.address || complaint.location || 'Road issue');

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Complaint #{reportCode}</p>
            <h2 className="text-3xl font-bold text-slate-900">{complaint.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${
              statusMeta.tone === 'success' ? 'bg-emerald-100 text-emerald-700' :
              statusMeta.tone === 'warning' ? 'bg-amber-100 text-amber-700' :
              statusMeta.tone === 'info' ? 'bg-cyan-100 text-cyan-700' :
              statusMeta.tone === 'danger' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-700'
            }`}>
              {statusMeta.label}
            </span>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText?.(reportCode)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Copy report ID
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900">Issue summary</h3>
            <p className="mt-4 text-slate-600">{complaint.citizen_description || complaint.description}</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Report ID</p>
                <p className="mt-2 font-semibold text-slate-900">{reportCode}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Category</p>
                <p className="mt-2 font-semibold text-slate-900">{complaint.type}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Priority</p>
                <p className="mt-2 font-semibold text-slate-900">{complaint.priority}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Assigned to</p>
                <p className="mt-2 font-semibold text-slate-900">{complaint.assignedTo || 'Awaiting assignment'}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Location</p>
                <p className="mt-2 font-semibold text-slate-900">{complaint.address}</p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-sm font-medium text-cyan-700 hover:text-cyan-800"
                >
                  Open in Maps
                </a>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Landmark</p>
                <p className="mt-2 font-semibold text-slate-900">{complaint.landmark || 'Not provided'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900">Before / after</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium text-slate-500">Before</p>
                <img src={complaint.photoBefore || 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80'} alt="Before repair" className="h-56 w-full rounded-2xl object-cover" />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-slate-500">After</p>
                <img src={complaint.photoAfter || complaint.photoBefore || 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80'} alt="After repair" className="h-56 w-full rounded-2xl object-cover" />
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900">Review analysis</h3>
            <div className="mt-4 rounded-2xl bg-cyan-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Sentiment</p>
              <p className="mt-2 text-3xl font-bold text-cyan-800">{complaint.sentiment || 0}%</p>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {(complaint.insights?.length ? complaint.insights : ['Complaint submitted successfully.']).map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-cyan-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900">Status timeline</h3>
            <div className="mt-4 space-y-4">
              {timeline.map((item) => (
                <div key={`${item.label}-${item.date}`} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="mt-1 h-3 w-3 rounded-full bg-cyan-500" />
                    <span className="mt-2 h-full w-px bg-slate-200" />
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <p className="text-xs text-slate-500">{formatDate(item.date)}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900">Resolution note</h3>
            <p className="mt-3 text-slate-600">{complaint.resolutionNote || 'No resolution note yet.'}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import adminService from '../../shared/adminService';
import { COMPLAINT_STATUS, SEVERITY_META, STATUS_META } from '../../shared/constants';

const nextStatusMap = {
  [COMPLAINT_STATUS.PENDING]: COMPLAINT_STATUS.IN_PROGRESS,
  [COMPLAINT_STATUS.IN_PROGRESS]: COMPLAINT_STATUS.RESOLVED,
};

export default function ComplaintDetail() {
  const { id } = useParams();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const loadComplaint = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await adminService.getComplaintById(id);
      setComplaint(response);
    } catch (err) {
      setError(err?.message || 'Failed to load complaint details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaint();
  }, [id]);

  const statusMeta = useMemo(
    () => STATUS_META[complaint?.status] || STATUS_META.pending,
    [complaint],
  );

  const severityMeta = useMemo(
    () => SEVERITY_META[complaint?.analysis?.severity] || SEVERITY_META.medium,
    [complaint],
  );

  const handleStatusAdvance = async () => {
    if (!complaint || !nextStatusMap[complaint.status]) return;

    setSaving(true);
    setError('');

    try {
      const updated = await adminService.updateComplaintStatus(complaint.id, nextStatusMap[complaint.status]);
      setComplaint(updated);
    } catch (err) {
      setError(err?.message || 'Unable to update complaint status.');
    } finally {
      setSaving(false);
    }
  };

  const handleAfterImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !complaint) return;

    setUploading(true);
    setError('');

    try {
      const updated = await adminService.uploadAfterImage(complaint.id, {
        ...file,
        preview: URL.createObjectURL(file),
      });
      setComplaint(updated);
    } catch (err) {
      setError(err?.message || 'Unable to upload the after image.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">Loading complaint...</div>;
  }

  if (error && !complaint) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-red-700">Complaint unavailable</h2>
        <p className="mt-2 text-red-700">{error}</p>
        <Link to="/admin/complaints" className="mt-4 inline-block rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          Return to queue
        </Link>
      </div>
    );
  }

  const nextStatusLabel = nextStatusMap[complaint?.status];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Complaint case</p>
            <h2 className="text-3xl font-bold text-slate-900">{complaint.id}</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${
              statusMeta.tone === 'success' ? 'bg-emerald-100 text-emerald-700' :
              statusMeta.tone === 'warning' ? 'bg-amber-100 text-amber-700' :
              statusMeta.tone === 'neutral' ? 'bg-slate-200 text-slate-700' : 'bg-cyan-100 text-cyan-700'
            }`}>
              {statusMeta.label}
            </span>

            {nextStatusLabel ? (
              <button
                type="button"
                onClick={handleStatusAdvance}
                disabled={saving}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Updating...' : `Mark as ${STATUS_META[nextStatusLabel].label}`}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Issue details</h3>
            <p className="mt-4 text-slate-600">{complaint.analysis.description}</p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">Issue type</p>
                <p className="mt-2 font-semibold text-slate-900">{complaint.analysis.issue_type}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">Severity</p>
                <p className="mt-2 font-semibold text-slate-900">{severityMeta.label}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">Risk</p>
                <p className="mt-2 font-semibold capitalize text-slate-900">{complaint.analysis.accident_risk}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">Reporter</p>
                <p className="mt-2 font-semibold text-slate-900">{complaint.reporter.name}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Before / after</h3>
              <label className="cursor-pointer rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">
                {uploading ? 'Uploading...' : 'Upload after image'}
                <input type="file" accept="image/*" className="hidden" onChange={handleAfterImageUpload} />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium text-slate-500">Before</p>
                <img src={complaint.image_url} alt="Before report" className="h-60 w-full rounded-2xl object-cover" />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-slate-500">After</p>
                <img
                  src={complaint.after_image_url || 'https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?auto=format&fit=crop&w=1200&q=80'}
                  alt="After work"
                  className="h-60 w-full rounded-2xl object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Location</h3>
            <p className="mt-3 text-sm text-slate-600">{complaint.location.address}</p>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">Coordinates</p>
              <p className="mt-2 text-sm text-slate-700">
                {complaint.location.lat.toFixed(4)}, {complaint.location.lng.toFixed(4)}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Status timeline</h3>
            <div className="mt-4 space-y-4">
              {complaint.status_history.map((item) => (
                <div key={`${item.status}-${item.at}`} className="flex gap-3">
                  <div className="mt-1 h-2.5 w-2.5 rounded-full bg-slate-900" />
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{STATUS_META[item.status]?.label || item.status}</p>
                    <p className="text-xs text-slate-500">{new Date(item.at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

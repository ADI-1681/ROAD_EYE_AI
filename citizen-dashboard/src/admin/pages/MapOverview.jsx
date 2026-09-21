import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import adminService from '../../shared/adminService';
import { SEVERITY_META, STATUS_META } from '../../shared/constants';

export default function MapOverview() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadComplaints = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await adminService.getComplaints({ page: 1, page_size: 100, sort: 'newest' });
        setComplaints(response.items || []);
      } catch (err) {
        setError(err?.message || 'Failed to load map data.');
      } finally {
        setLoading(false);
      }
    };

    loadComplaints();
  }, []);

  const summary = useMemo(() => {
    const counts = { total: complaints.length, pending: 0, in_progress: 0, resolved: 0 };

    complaints.forEach((complaint) => {
      counts[complaint.status] = (counts[complaint.status] || 0) + 1;
    });

    return counts;
  }, [complaints]);

  const center = useMemo(() => {
    if (complaints.length === 0) return [12.9716, 77.5946];
    const averageLat = complaints.reduce((sum, item) => sum + item.location.lat, 0) / complaints.length;
    const averageLng = complaints.reduce((sum, item) => sum + item.location.lng, 0) / complaints.length;
    return [averageLat, averageLng];
  }, [complaints]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Map overview</h2>
        <p className="mt-2 text-sm text-slate-600">Live complaint density and issue clusters across the city.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total markers</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{summary.total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Pending</p>
          <p className="mt-3 text-3xl font-bold text-amber-600">{summary.pending || 0}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">In progress</p>
          <p className="mt-3 text-3xl font-bold text-cyan-600">{summary.in_progress || 0}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Resolved</p>
          <p className="mt-3 text-3xl font-bold text-emerald-600">{summary.resolved || 0}</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-slate-600">Loading map data...</div>
        ) : (
          <MapContainer center={center} zoom={11} scrollWheelZoom className="h-[560px] w-full">
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {complaints.map((complaint) => {
              const statusMeta = STATUS_META[complaint.status] || STATUS_META.pending;
              const severityMeta = SEVERITY_META[complaint.analysis.severity] || SEVERITY_META.medium;

              const colorMap = {
                neutral: '#64748b',
                warning: '#f59e0b',
                success: '#10b981',
                danger: '#ef4444',
              };

              const statusColor = colorMap[statusMeta.tone] || '#64748b';
              const severityColor = colorMap[severityMeta.tone] || '#64748b';

              return (
                <CircleMarker
                  key={complaint.id}
                  center={[complaint.location.lat, complaint.location.lng]}
                  radius={12}
                  pathOptions={{
                    color: complaint.status === 'resolved' ? statusColor : severityColor,
                    fillColor: complaint.status === 'resolved' ? statusColor : severityColor,
                    fillOpacity: 0.85,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="space-y-2">
                      <div className="font-bold text-slate-900">{complaint.id}</div>
                      <div className="text-sm text-slate-600">{complaint.analysis.issue_type}</div>
                      <div className="text-xs text-slate-500">{complaint.location.address}</div>
                      <div className="flex gap-2 pt-1">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700">
                          {statusMeta.label}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700">
                          {severityMeta.label}
                        </span>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        )}
      </div>
    </div>
  );
}

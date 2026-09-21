import { Link } from 'react-router-dom';
import { COMPLAINT_STATUS, SEVERITY_META, STATUS_META } from '../../shared/constants';

export default function ComplaintsTable({ complaints }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Complaint</th>
              <th className="px-4 py-3 font-semibold">Issue</th>
              <th className="px-4 py-3 font-semibold">Severity</th>
              <th className="px-4 py-3 font-semibold">Risk</th>
              <th className="px-4 py-3 font-semibold">Location</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody>
            {complaints.map((complaint) => {
              const statusMeta = STATUS_META[complaint.status] || STATUS_META.pending;
              const severityMeta = SEVERITY_META[complaint.analysis.severity] || SEVERITY_META.medium;

              return (
                <tr key={complaint.id} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/admin/complaints/${complaint.id}`} className="font-semibold text-slate-900 hover:text-slate-700">
                      {complaint.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{complaint.analysis.issue_type}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      severityMeta.tone === 'danger' ? 'bg-red-100 text-red-700' :
                      severityMeta.tone === 'warning' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-200 text-slate-700'
                    }`}>
                      {severityMeta.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-700">{complaint.analysis.accident_risk}</td>
                  <td className="px-4 py-3 text-slate-700">{complaint.location.address}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      statusMeta.tone === 'success' ? 'bg-emerald-100 text-emerald-700' :
                      statusMeta.tone === 'warning' ? 'bg-amber-100 text-amber-700' :
                      statusMeta.tone === 'neutral' ? 'bg-slate-200 text-slate-700' : 'bg-cyan-100 text-cyan-700'
                    }`}>
                      {statusMeta.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{new Date(complaint.created_at).toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

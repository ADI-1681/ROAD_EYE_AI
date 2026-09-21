import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ComplaintsTable from '../components/ComplaintsTable';
import FiltersBar from '../components/FiltersBar';
import adminService from '../../shared/adminService';
import { adminIssueTypes } from '../../shared/adminMockData';

const defaultFilters = {
  status: '',
  severity: '',
  issue_type: '',
  search: '',
  sort: 'newest',
  page: 1,
};

export default function ComplaintsList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pageInfo, setPageInfo] = useState({ total: 0, page: 1, page_size: 10 });

  const queryFilters = useMemo(() => ({
    status: searchParams.get('status') || '',
    severity: searchParams.get('severity') || '',
    issue_type: searchParams.get('issue_type') || '',
    search: searchParams.get('search') || '',
    sort: searchParams.get('sort') || 'newest',
    page: Number(searchParams.get('page')) || 1,
  }), [searchParams]);

  const updateQuery = (nextFilters) => {
    const params = new URLSearchParams();

    Object.entries(nextFilters).forEach(([key, value]) => {
      if (key === 'page') {
        if (Number(value) > 1) params.set('page', String(value));
        return;
      }

      if (value) params.set(key, value);
    });

    setSearchParams(params);
  };

  const setFilters = (updater) => {
    const resolved = typeof updater === 'function' ? updater(queryFilters) : updater;
    const next = { ...defaultFilters, ...resolved, page: 1 };
    updateQuery(next);
  };

  useEffect(() => {
    const loadComplaints = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await adminService.getComplaints({
          status: queryFilters.status,
          severity: queryFilters.severity,
          issue_type: queryFilters.issue_type,
          search: queryFilters.search,
          sort: queryFilters.sort,
          page: queryFilters.page,
          page_size: 10,
        });

        setComplaints(response.items || []);
        setPageInfo({
          total: response.total || 0,
          page: response.page || 1,
          page_size: response.page_size || 10,
        });
      } catch (err) {
        setError(err?.message || 'Failed to load complaints.');
      } finally {
        setLoading(false);
      }
    };

    loadComplaints();
  }, [queryFilters]);

  const totalPages = Math.max(1, Math.ceil(pageInfo.total / pageInfo.page_size));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Complaint queue</p>
          <h2 className="text-2xl font-bold text-slate-900">Complaints</h2>
        </div>
        <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700">
          {pageInfo.total} total
        </div>
      </div>

      <FiltersBar
        filters={queryFilters}
        setFilters={setFilters}
        issueTypes={adminIssueTypes}
        onReset={() => updateQuery(defaultFilters)}
      />

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
          Loading complaints...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm">
          {error}
        </div>
      ) : complaints.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
          No complaints match the selected filters.
        </div>
      ) : (
        <>
          <ComplaintsTable complaints={complaints} />

          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-sm text-slate-600">
              Page {queryFilters.page} of {totalPages}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => updateQuery({ ...queryFilters, page: Math.max(1, queryFilters.page - 1) })}
                disabled={queryFilters.page <= 1}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => updateQuery({ ...queryFilters, page: Math.min(totalPages, queryFilters.page + 1) })}
                disabled={queryFilters.page >= totalPages}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

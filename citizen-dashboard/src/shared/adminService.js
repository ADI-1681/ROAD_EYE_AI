import { USE_MOCK } from '../constants/app';
import adminApi from './adminApi';
import { adminMockApi } from './adminMockData';

const normalizeAdminStats = (stats = {}) => ({
  total: stats.total ?? stats.totalComplaints ?? 0,
  pending: stats.pending ?? stats.openComplaints ?? 0,
  in_progress: stats.in_progress ?? 0,
  resolved: stats.resolved ?? stats.resolvedToday ?? 0,
  high_severity_open: stats.high_severity_open ?? stats.criticalIssues ?? 0,
});

const normalizeAdminComplaint = (complaint = {}) => ({
  ...complaint,
  status: complaint.status || 'pending',
  created_at: complaint.created_at || complaint.createdAt || new Date().toISOString(),
  updated_at: complaint.updated_at || complaint.updatedAt || complaint.created_at || new Date().toISOString(),
  analysis: complaint.analysis || {
    issue_type: complaint.type || 'Road Pothole',
    severity: complaint.severity || 'medium',
    accident_risk: complaint.accident_risk || 'medium',
    description: complaint.description || '',
  },
  location: complaint.location || { address: complaint.address || 'Location unavailable' },
  image_url: complaint.image_url || complaint.photoBefore || '',
  after_image_url: complaint.after_image_url ?? complaint.photoAfter ?? null,
  reporter: complaint.reporter || { id: 'citizen-101', name: 'Citizen', email: 'your@gmail.com' },
});

const adminService = USE_MOCK ? adminMockApi : {
  async login(payload) {
    const response = await adminApi.post('/admin/auth/login', payload);
    return response.data;
  },

  async me() {
    const response = await adminApi.get('/admin/me');
    return response.data;
  },

  async getStats() {
    const response = await adminApi.get('/admin/stats');
    return normalizeAdminStats(response.data);
  },

  async getComplaints(params = {}) {
    const response = await adminApi.get('/admin/complaints', { params });
    const payload = response.data || {};
    const items = Array.isArray(payload.items) ? payload.items.map(normalizeAdminComplaint) : Array.isArray(payload) ? payload.map(normalizeAdminComplaint) : [];

    return {
      items,
      total: payload.total ?? items.length,
      page: payload.page ?? 1,
      page_size: payload.page_size ?? items.length,
    };
  },

  async getComplaintById(id) {
    const response = await adminApi.get(`/admin/complaints/${id}`);
    return normalizeAdminComplaint(response.data);
  },

  async updateComplaintStatus(id, status) {
    const response = await adminApi.patch(`/admin/complaints/${id}/status`, { status });
    return response.data;
  },

  async uploadAfterImage(id, imageFile) {
    const formData = new FormData();
    formData.append('image', imageFile);
    const response = await adminApi.post(`/admin/complaints/${id}/after-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export default adminService;

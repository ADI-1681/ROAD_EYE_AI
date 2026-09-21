import axios from 'axios';
import { API_BASE_URL } from '../constants/app';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('road-eye-citizen-token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('road-eye-citizen-token');
      localStorage.removeItem('road-eye-citizen-user');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  },
);

const normalizeComplaint = (complaint = {}) => ({
  ...complaint,
  status: complaint.status === 'submitted' ? 'pending' : complaint.status || 'pending',
  priority: complaint.priority || 'Medium',
  assignedTo: complaint.assignedTo || 'Awaiting assignment',
  report_code: complaint.report_code || complaint.reportCode || complaint.id || '',
  landmark: complaint.landmark || '',
  citizen_description: complaint.citizen_description || complaint.citizenDescription || complaint.description || '',
  insights: complaint.insights || [],
});

const normalizeAnalysisResult = (result = {}) => ({
  ...result,
  confidence: typeof result.confidence === 'number' ? result.confidence : undefined,
  authenticity: result.authenticity || 'unverified',
  issue_type: result.issue_type || result.issueType || 'Road Pothole',
  severity: result.severity || 'medium',
  accident_risk: result.accident_risk || result.accidentRisk || 'medium',
  description: result.description || '',
});

const apiService = {
  async login(credentials) {
    const { data } = await api.post('/auth/login', credentials);
    return { user: data.user, token: data.token };
  },

  async register(payload) {
    const { data } = await api.post('/auth/register', payload);
    return { user: data.user, token: data.token };
  },

  async getDashboardSummary() {
    const { data } = await api.get('/dashboard/summary');
    return data;
  },

  async getComplaints() {
    const { data } = await api.get('/complaints');
    return Array.isArray(data) ? data.map(normalizeComplaint) : [];
  },

  async getComplaintById(id) {
    const { data } = await api.get(`/complaints/${id}`);
    return normalizeComplaint(data);
  },

  async createComplaint(payload) {
    const { data } = await api.post('/complaints', payload);
    return normalizeComplaint(data);
  },

  async deleteComplaint(id) {
    await api.delete(`/complaints/${id}`);
  },

  async analyzeComplaint(payload) {
    try {
      const formData = new FormData();
      formData.append('image', payload);
      const { data } = await api.post('/complaints/analyze', formData);
      return normalizeAnalysisResult(data?.analysis || data || {});
    } catch (error) {
      if (error?.response?.status === 422 && error?.response?.data) {
        const details = error.response.data;
        throw {
          ...error,
          response: {
            ...error.response,
            data: {
              ...details,
              code: details?.code || 'analysis_failed',
            },
          },
        };
      }
      throw error;
    }
  },

  async confirmComplaint(draftId, payload = {}) {
    const { data } = await api.post(`/complaints/${draftId}/confirm`, payload);
    return normalizeComplaint(data);
  },

  async getNotifications() {
    const { data } = await api.get('/notifications');
    return data;
  },
};

export default apiService;

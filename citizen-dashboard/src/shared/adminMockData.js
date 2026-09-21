import { ISSUE_TYPES } from './constants';

export const adminMockUser = {
  id: 'admin-1',
  name: 'Road Eye Admin',
  email: 'adityasrivastava20060825@gmail.com',
  role: 'admin',
};

export const adminMockComplaints = [];

export const adminMockState = {
  getComplaints() {
    return [];
  },
  getComplaintById() {
    return null;
  },
  getStats() {
    return {
      total: 0,
      pending: 0,
      in_progress: 0,
      resolved: 0,
      high_severity_open: 0,
    };
  },
  login({ email, password }) {
    if (String(email).trim().toLowerCase() === 'adityasrivastava20060825@gmail.com' && password === 'aditya2006') {
      return { token: 'mock-admin-token', user: adminMockUser };
    }
    throw new Error('Invalid admin credentials.');
  },
  me() {
    return adminMockUser;
  },
  updateStatus() {
    throw new Error('No complaint data available.');
  },
  uploadAfterImage() {
    throw new Error('No complaint data available.');
  },
};

export const adminMockApi = {
  async login(payload) {
    return adminMockState.login(payload);
  },
  async me() {
    return adminMockState.me();
  },
  async getStats() {
    return adminMockState.getStats();
  },
  async getComplaints() {
    return { items: [], total: 0, page: 1, page_size: 0 };
  },
  async getComplaintById(id) {
    const complaint = adminMockState.getComplaintById(id);
    if (!complaint) throw new Error('Complaint not found.');
    return complaint;
  },
  async updateComplaintStatus() {
    return adminMockState.updateStatus();
  },
  async uploadAfterImage() {
    return adminMockState.uploadAfterImage();
  },
};

export const adminIssueTypes = ISSUE_TYPES;

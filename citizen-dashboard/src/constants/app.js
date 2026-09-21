export const APP_NAME = 'Road Eye';
export const APP_TAGLINE = 'Citizen Service Dashboard';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export const APP_ROUTES = {
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  dashboard: '/dashboard',
  myComplaints: '/my-complaints',
  reportIssue: '/report-issue',
  complaintDetail: '/complaints/:id',
};

export const AUTH_TOKEN_KEY = 'road-eye-citizen-token';
export const USER_STORAGE_KEY = 'road-eye-citizen-user';

export const COMPLAINT_TYPES = [
  'Road Pothole',
  'Broken Road',
  'Waterlogging',
  'Street Light',
  'Drainage',
  'Garbage',
  'Traffic Sign',
  'Water Supply',
  'Public Safety',
  'Other',
];

export const PRIORITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'];

export const STATUS_META = {
  submitted: { label: 'Submitted', tone: 'neutral' },
  assigned: { label: 'Assigned', tone: 'info' },
  in_progress: { label: 'In Progress', tone: 'warning' },
  resolved: { label: 'Resolved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
};

export const DASHBOARD_SUMMARY = {
  totalComplaints: 0,
  resolvedThisMonth: 0,
  avgResolutionHours: 0,
  responseRate: 0,
};

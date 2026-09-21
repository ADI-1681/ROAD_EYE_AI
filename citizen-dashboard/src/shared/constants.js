export const ADMIN_TOKEN_KEY = 'road-eye-admin-token';
export const ADMIN_USER_KEY = 'road-eye-admin-user';

export const COMPLAINT_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
};

export const COMPLAINT_STATUS_ORDER = [
  COMPLAINT_STATUS.PENDING,
  COMPLAINT_STATUS.IN_PROGRESS,
  COMPLAINT_STATUS.RESOLVED,
];

export const COMPLAINT_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
};

export const ACCIDENT_RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
};

export const ISSUE_TYPES = [
  'Road Pothole',
  'Street Light',
  'Drainage',
  'Garbage',
  'Traffic Sign',
  'Water Supply',
  'Road Marking',
  'Public Safety',
  'Other',
];

export const ADMIN_SORT_OPTIONS = {
  NEWEST: 'newest',
  OLDEST: 'oldest',
  SEVERITY: 'severity',
};

export const STATUS_META = {
  pending: { label: 'Pending', tone: 'neutral' },
  in_progress: { label: 'In Progress', tone: 'warning' },
  resolved: { label: 'Resolved', tone: 'success' },
};

export const SEVERITY_META = {
  low: { label: 'Low', tone: 'neutral' },
  medium: { label: 'Medium', tone: 'warning' },
  high: { label: 'High', tone: 'danger' },
};

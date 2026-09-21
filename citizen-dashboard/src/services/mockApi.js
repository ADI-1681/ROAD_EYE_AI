import { mockComplaints, mockDashboardStats, mockNotifications, mockUser } from '../data/mockData';

const wait = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));
const buildToken = () => `mock-token-${Date.now()}`;
let nextReportSequence = 123;

const buildReportCode = () => {
  nextReportSequence += 1;
  return `ROADEYE-2026-${String(nextReportSequence).padStart(5, '0')}`;
};

const getFilenameOverride = (fileName = '') => {
  const lowerName = String(fileName).toLowerCase();

  // Dev override: every outcome is testable by filename without exposing any API secrets.
  // If the filename contains pothole, broken, water, clean, irrelevant or aigen, return that outcome.
  // All other filenames use a deterministic result derived from the file content below.
  if (lowerName.includes('pothole')) {
    return {
      issue_type: 'Road Pothole',
      severity: 'high',
      accident_risk: 'high',
      confidence: 0.94,
      authenticity: 'authentic',
      description: 'A deep pothole is visible on the road surface and may affect vehicle stability.',
      code: 'valid',
    };
  }

  if (lowerName.includes('broken')) {
    return {
      issue_type: 'Broken Road',
      severity: 'high',
      accident_risk: 'high',
      confidence: 0.92,
      authenticity: 'authentic',
      description: 'Damaged road surface is visible and likely needs maintenance.',
      code: 'valid',
    };
  }

  if (lowerName.includes('water')) {
    return {
      issue_type: 'Waterlogging',
      severity: 'medium',
      accident_risk: 'medium',
      confidence: 0.89,
      authenticity: 'authentic',
      description: 'Standing water is visible on the road, which could affect drainage and driving conditions.',
      code: 'valid',
    };
  }

  if (lowerName.includes('clean')) {
    return {
      code: 'no_problem_found',
      message: 'Issue Detected: None. No road-related problem was found in the uploaded image.',
    };
  }

  if (lowerName.includes('irrelevant')) {
    return {
      code: 'not_road_issue',
      message: 'Invalid Report. The uploaded image does not appear to show a road/public infrastructure issue. Please upload a relevant image.',
    };
  }

  if (lowerName.includes('aigen')) {
    return {
      issue_type: 'Road Pothole',
      severity: 'medium',
      accident_risk: 'medium',
      confidence: 0.62,
      authenticity: 'possibly_ai_generated',
      description: 'This image may have been generated or altered and should be reviewed manually.',
      code: 'valid',
    };
  }

  return null;
};

const getContentSeed = async (file) => {
  if (typeof file?.arrayBuffer !== 'function') return 0;

  const bytes = new Uint8Array(await file.arrayBuffer());
  let hash = 2166136261;

  for (let index = 0; index < bytes.length; index += 1) {
    hash ^= bytes[index];
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) % 4;
};

const buildAnalysisOutcome = async (file) => {
  const override = getFilenameOverride(file?.name);
  if (override) return override;

  const outcomeSeed = await getContentSeed(file);

  if (outcomeSeed === 0) {
    return {
      issue_type: 'Road Pothole',
      severity: 'high',
      accident_risk: 'high',
      confidence: 0.9,
      authenticity: 'authentic',
      description: 'The uploaded image indicates a road hazard requiring maintenance attention.',
      code: 'valid',
    };
  }

  if (outcomeSeed === 1) {
    return {
      issue_type: 'Street Light',
      severity: 'medium',
      accident_risk: 'medium',
      confidence: 0.84,
      authenticity: 'unverified',
      description: 'The image suggests a street lighting issue in the public right-of-way.',
      code: 'valid',
    };
  }

  if (outcomeSeed === 2) {
    return {
      issue_type: 'Waterlogging',
      severity: 'medium',
      accident_risk: 'medium',
      confidence: 0.86,
      authenticity: 'authentic',
      description: 'Road drainage appears affected by standing water and poor runoff.',
      code: 'valid',
    };
  }

  return {
    issue_type: 'Road Pothole',
    severity: 'low',
    accident_risk: 'low',
    confidence: 0.78,
    authenticity: 'unverified',
    description: 'A minor road condition is visible and may require a routine inspection.',
    code: 'valid',
  };
};

const withAnalysisError = (code, message) => {
  const err = new Error(message);
  err.response = {
    status: 422,
    data: { code, message },
  };
  return err;
};

export const mockApi = {
  async login(credentials) {
    await wait();

    if (!credentials?.email || !credentials?.password) {
      throw new Error('Email and password are required.');
    }

    const email = String(credentials.email).trim();
    const normalizedUser = {
      ...mockUser,
      name: credentials.name || 'Citizen',
      email,
      phone: credentials.phone || '',
      aadhaarLast4: '',
      ward: 'Not provided',
    };

    return {
      user: normalizedUser,
      token: buildToken(),
    };
  },

  async register(payload) {
    await wait();

    if (!payload?.name || !payload?.email || !payload?.password) {
      throw new Error('Please complete all required fields.');
    }

    return {
      user: {
        ...mockUser,
        ...payload,
        id: 'citizen-new',
        name: payload.name || 'Citizen',
        email: String(payload.email).trim(),
        phone: payload.phone || '',
        aadhaarLast4: '',
        ward: 'Not provided',
      },
      token: buildToken(),
    };
  },

  async getDashboardSummary() {
    await wait();
    const resolved = mockComplaints.filter((item) => item.status === 'resolved').length;
    return {
      ...mockDashboardStats,
      totalComplaints: mockComplaints.length,
      resolvedThisMonth: resolved,
      responseRate: mockComplaints.length ? 100 : 0,
    };
  },

  async getComplaints() {
    await wait();
    return mockComplaints;
  },

  async analyzeComplaint(file) {
    await wait(500);
    const outcome = await buildAnalysisOutcome(file);

    if (outcome.code === 'no_problem_found') {
      throw withAnalysisError('no_problem_found', outcome.message);
    }

    if (outcome.code === 'not_road_issue') {
      throw withAnalysisError('not_road_issue', outcome.message);
    }

    return {
      analysis: {
        issue_type: outcome.issue_type,
        severity: outcome.severity,
        accident_risk: outcome.accident_risk,
        confidence: outcome.confidence,
        authenticity: outcome.authenticity || 'unverified',
        description: outcome.description,
      },
    };
  },

  async confirmComplaint(draftId, payload = {}) {
    await wait(500);
    const complaint = mockComplaints.find((item) => item.id === draftId) || {
      id: draftId,
      title: 'Road issue report',
      type: 'Road Pothole',
      status: 'pending',
      priority: 'Medium',
      location: '12.9716, 77.5946',
      address: 'Road issue reported',
      description: payload.description || 'Issue reported by citizen.',
      landmark: payload.landmark || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignedTo: 'Awaiting assignment',
      resolutionNote: 'Complaint submitted and awaiting validation.',
      photoBefore: '',
      photoAfter: '',
      sentiment: 75,
      insights: ['Submitted successfully'],
    };

    const nextComplaint = {
      ...complaint,
      id: draftId,
      report_code: complaint.report_code || buildReportCode(),
      title: complaint.title || 'Road issue report',
      type: complaint.type || 'Road Pothole',
      status: 'pending',
      priority: complaint.priority || 'Medium',
      location: complaint.location || '12.9716, 77.5946',
      address: complaint.address || 'Road issue reported',
      description: payload.description || complaint.description || 'Issue reported by citizen.',
      landmark: payload.landmark || complaint.landmark || '',
      citizen_description: payload.description || complaint.citizen_description || complaint.description || '',
      createdAt: complaint.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignedTo: complaint.assignedTo || 'Awaiting assignment',
      resolutionNote: complaint.resolutionNote || 'Complaint submitted and awaiting validation.',
      photoBefore: complaint.photoBefore || '',
      photoAfter: complaint.photoAfter || '',
      sentiment: complaint.sentiment || 75,
      insights: complaint.insights || ['Submitted successfully'],
    };

    const existingIndex = mockComplaints.findIndex((item) => item.id === draftId);
    if (existingIndex >= 0) {
      mockComplaints[existingIndex] = nextComplaint;
    } else {
      mockComplaints.unshift(nextComplaint);
    }

    return nextComplaint;
  },

  async getComplaintById(id) {
    await wait();
    const complaint = mockComplaints.find((item) => item.id === id);

    if (!complaint) {
      throw new Error('Complaint not found');
    }

    return complaint;
  },

  async createComplaint(payload) {
    await wait();

    const complaint = {
      id: `CMP-${Date.now()}`,
      report_code: buildReportCode(),
      title: payload.title,
      type: payload.type,
      status: 'pending',
      priority: payload.priority || 'Medium',
      location: payload.location || '0,0',
      address: payload.address || 'Address not provided',
      description: payload.description,
      landmark: payload.landmark || '',
      citizen_description: payload.description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignedTo: 'Awaiting assignment',
      resolutionNote: 'Complaint submitted and awaiting validation.',
      photoBefore: payload.photoBefore || '',
      photos: (payload.photos || []).slice(0, 5),
      photoLocations: (payload.photoLocations || []).slice(0, 5),
      photoAfter: payload.photoAfter || '',
      sentiment: 60,
      insights: ['Submitted successfully'],
    };

    mockComplaints.unshift(complaint);
    return complaint;
  },

  async deleteComplaint(id) {
    await wait(300);
    const complaintIndex = mockComplaints.findIndex((item) => item.id === id);
    if (complaintIndex < 0) throw new Error('Complaint not found');
    mockComplaints.splice(complaintIndex, 1);
  },

  async getNotifications() {
    await wait();
    return mockNotifications;
  },
};

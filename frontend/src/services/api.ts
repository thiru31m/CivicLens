import {
  User, Department, Category, Project, CitizenReport, CivicPostComment,
  Notification, MatchingAnalysisResponse, ModerationFlag, AuditLog
} from '../types';

const API_BASE = '/api';

export function getToken(): string | null {
  return localStorage.getItem('civiclens_token');
}

export function setToken(token: string) {
  localStorage.setItem('civiclens_token', token);
}

export function clearToken() {
  localStorage.removeItem('civiclens_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // If body is not FormData, set Content-Type to application/json
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = 'An unexpected error occurred';
    try {
      const errorData = await response.json();
      errorDetail = errorData.detail || errorData.message || JSON.stringify(errorData);
    } catch {
      errorDetail = response.statusText;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Auth
  async login(username: string, password: string): Promise<{ access_token: string; user: User }> {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  async register(data: { username: string; email: string; full_name: string; password: string }): Promise<{ access_token: string; user: User }> {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getMe(): Promise<User> {
    return request('/auth/me');
  },

  async getDemoAccounts(): Promise<Array<{ role: string; username: string; password: string; label: string; description: string }>> {
    return request('/auth/demo-accounts');
  },

  // Projects
  async getProjects(params?: {
    q?: string;
    category_id?: number;
    status?: string;
    lat?: number;
    lng?: number;
    radius_km?: number;
  }): Promise<Project[]> {
    const query = new URLSearchParams();
    if (params?.q) query.set('q', params.q);
    if (params?.category_id) query.set('category_id', params.category_id.toString());
    if (params?.status) query.set('status', params.status);
    if (params?.lat !== undefined) query.set('lat', params.lat.toString());
    if (params?.lng !== undefined) query.set('lng', params.lng.toString());
    if (params?.radius_km !== undefined) query.set('radius_km', params.radius_km.toString());

    return request(`/projects?${query.toString()}`);
  },

  async getProject(id: number): Promise<Project> {
    return request(`/projects/${id}`);
  },

  async getProjectRelatedReports(id: number): Promise<CitizenReport[]> {
    return request(`/projects/${id}/related-reports`);
  },

  async updateProject(id: number, data: {
    status?: string;
    budget?: number;
    planned_start_date?: string;
    planned_completion_date?: string;
    contractor?: string;
    explanation: string;
  }): Promise<Project> {
    return request(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async addMilestone(projectId: number, data: {
    title: string;
    description?: string;
    target_date?: string;
    status: string;
    completion_date?: string;
    evidence_notes?: string;
  }) {
    return request(`/projects/${projectId}/milestones`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Reports
  async checkDuplicates(formData: FormData): Promise<MatchingAnalysisResponse> {
    return request('/reports/check-duplicates', {
      method: 'POST',
      body: formData,
    });
  },

  async submitReport(formData: FormData): Promise<CitizenReport> {
    return request('/reports', {
      method: 'POST',
      body: formData,
    });
  },

  async getMyReports(): Promise<CitizenReport[]> {
    return request('/reports/my-reports');
  },

  async getReport(id: number): Promise<CitizenReport> {
    return request(`/reports/${id}`);
  },

  async respondToReport(id: number, formData: FormData): Promise<CitizenReport> {
    return request(`/reports/${id}/respond`, {
      method: 'POST',
      body: formData,
    });
  },

  // Civic Feed
  async getFeed(params?: {
    sort_by?: 'latest' | 'active';
    category_id?: number;
    status?: string;
    area?: string;
  }): Promise<CitizenReport[]> {
    const query = new URLSearchParams();
    if (params?.sort_by) query.set('sort_by', params.sort_by);
    if (params?.category_id) query.set('category_id', params.category_id.toString());
    if (params?.status) query.set('status', params.status);
    if (params?.area) query.set('area', params.area);

    return request(`/feed?${query.toString()}`);
  },

  async toggleLike(reportId: number): Promise<{ liked: boolean; likes_count: number; message: string }> {
    return request(`/feed/${reportId}/like`, { method: 'POST' });
  },

  async getComments(reportId: number): Promise<CivicPostComment[]> {
    return request(`/feed/${reportId}/comments`);
  },

  async addComment(reportId: number, content: string): Promise<CivicPostComment> {
    return request(`/feed/${reportId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  async flagReport(reportId: number, reason: string, notes?: string) {
    return request(`/feed/${reportId}/flag`, {
      method: 'POST',
      body: JSON.stringify({ reason, notes }),
    });
  },

  // Review Dashboard
  async getReviewQueue(status_filter?: string, category_id?: number): Promise<CitizenReport[]> {
    const query = new URLSearchParams();
    if (status_filter) query.set('status_filter', status_filter);
    if (category_id) query.set('category_id', category_id.toString());
    return request(`/review/reports?${query.toString()}`);
  },

  async getReportMatchingCandidates(reportId: number): Promise<MatchingAnalysisResponse> {
    return request(`/review/reports/${reportId}/match-candidates`);
  },

  async transitionReportStatus(reportId: number, action: string, explanation: string, referred_department_id?: number): Promise<CitizenReport> {
    return request(`/review/reports/${reportId}/transition`, {
      method: 'POST',
      body: JSON.stringify({ action, explanation, referred_department_id }),
    });
  },

  async linkReportToProject(reportId: number, projectId: number, explanation: string): Promise<CitizenReport> {
    return request(`/review/reports/${reportId}/link-project`, {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId, explanation }),
    });
  },

  async verifyAndCreateProject(reportId: number, data: {
    title: string;
    description: string;
    purpose: string;
    category_id: number;
    department_id: number;
    contractor?: string;
    location_name: string;
    latitude?: number;
    longitude?: number;
    planned_start_date?: string;
    planned_completion_date?: string;
    budget?: number;
    status: string;
    source_documents?: string;
    explanation: string;
  }): Promise<CitizenReport> {
    return request(`/review/reports/${reportId}/verify-create-project`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Admin
  async getAllUsers(): Promise<User[]> {
    return request('/admin/users');
  },

  async updateUserRole(userId: number, role: string, department_id?: number | null): Promise<User> {
    return request(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role, department_id }),
    });
  },

  async getDepartments(): Promise<Department[]> {
    return request('/admin/departments');
  },

  async createDepartment(data: { name: string; jurisdiction: string; contact_email?: string; description?: string }): Promise<Department> {
    return request('/admin/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getCategories(): Promise<Category[]> {
    return request('/admin/categories');
  },

  async createCategory(data: { name: string; icon_name?: string; description?: string }): Promise<Category> {
    return request('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getModerationFlags(status_filter?: string): Promise<ModerationFlag[]> {
    const query = new URLSearchParams();
    if (status_filter) query.set('status_filter', status_filter);
    return request(`/admin/flags?${query.toString()}`);
  },

  async moderateFlag(flagId: number, action: 'hide_post' | 'dismiss_flag') {
    return request(`/admin/flags/${flagId}/moderate?action=${action}`, {
      method: 'POST',
    });
  },

  async getAuditLogs(limit?: number): Promise<AuditLog[]> {
    const query = new URLSearchParams();
    if (limit) query.set('limit', limit.toString());
    return request(`/admin/audit-logs?${query.toString()}`);
  },

  // Notifications
  async getNotifications(): Promise<Notification[]> {
    return request('/notifications');
  },

  async markNotificationRead(id: number) {
    return request(`/notifications/${id}/read`, { method: 'POST' });
  },

  async markAllNotificationsRead() {
    return request('/notifications/read-all', { method: 'POST' });
  },
};

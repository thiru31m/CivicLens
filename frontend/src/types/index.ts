export type UserRole = 'citizen' | 'reviewer' | 'admin';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  display_alias: string;
  role: UserRole;
  department_id?: number | null;
  department_name?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Department {
  id: number;
  name: string;
  jurisdiction: string;
  contact_email?: string | null;
  description?: string | null;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  icon_name?: string;
  description?: string | null;
  created_at: string;
}

export interface ProjectMilestone {
  id: number;
  project_id: number;
  title: string;
  description?: string | null;
  target_date?: string | null;
  status: 'Pending' | 'In Progress' | 'Completed';
  completion_date?: string | null;
  evidence_notes?: string | null;
  created_at: string;
}

export interface ProjectUpdateHistory {
  id: number;
  project_id: number;
  actor_name: string;
  previous_status?: string | null;
  new_status: string;
  explanation: string;
  field_changes?: string | null;
  timestamp: string;
}

export interface Project {
  id: number;
  project_code: string;
  title: string;
  description: string;
  purpose: string;
  category_id: number;
  category_name?: string | null;
  department_id: number;
  department_name?: string | null;
  contractor?: string | null;
  location_name: string;
  latitude?: number | null;
  longitude?: number | null;
  planned_start_date?: string | null;
  planned_completion_date?: string | null;
  budget?: number | null;
  status: 'Planned' | 'Ongoing' | 'Delayed' | 'Completed';
  source_documents?: string | null;
  created_at: string;
  updated_at: string;
  milestones: ProjectMilestone[];
  update_history: ProjectUpdateHistory[];
  linked_reports_count: number;
}

export interface EvidenceAttachment {
  id: number;
  file_path: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  caption?: string | null;
  is_public: boolean;
  created_at: string;
}

export interface ReportReviewAction {
  id: number;
  actor_name: string;
  actor_role: string;
  previous_status?: string | null;
  new_status: string;
  action_type: string;
  explanation: string;
  created_at: string;
}

export interface CitizenReport {
  id: number;
  case_id: string;
  title: string;
  description: string;
  category_id: number;
  category_name?: string | null;
  location_name: string;
  latitude?: number | null;
  longitude?: number | null;
  observed_date?: string | null;
  additional_context?: string | null;
  reporter_alias: string;
  status:
    | 'Awaiting Review'
    | 'Under Review'
    | 'More Information Requested'
    | 'Linked to Existing Project'
    | 'Official Record Verified'
    | 'Referred to Another Department'
    | 'Closed — Outcome Explained';
  linked_project_id?: number | null;
  linked_project_title?: string | null;
  review_outcome_explanation?: string | null;
  referred_department_name?: string | null;
  moderation_status: 'approved' | 'flagged' | 'hidden';
  likes_count: number;
  comments_count: number;
  has_liked: boolean;
  created_at: string;
  updated_at: string;
  evidence: EvidenceAttachment[];
  review_actions: ReportReviewAction[];
}

export interface CivicPostComment {
  id: number;
  report_id: number;
  author_alias: string;
  content: string;
  is_official: boolean;
  created_at: string;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  link_url?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface CandidateMatch {
  target_type: 'project' | 'report';
  id: number;
  code: string;
  title: string;
  location_name: string;
  category_name: string;
  distance_km?: number | null;
  similarity_score: number;
  match_reasons: string[];
}

export interface MatchingAnalysisResponse {
  candidates: CandidateMatch[];
  total_evaluated: number;
  threshold: number;
}

export interface ModerationFlag {
  id: number;
  report_id: number;
  case_id?: string | null;
  report_title?: string | null;
  flagged_by_username: string;
  reason: string;
  notes?: string | null;
  status: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  actor_username: string;
  actor_role: string;
  action: string;
  target_type: string;
  target_id: string;
  details?: string | null;
  timestamp: string;
}

from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, EmailStr, Field


# User Schemas
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100)
    display_alias: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    role: Optional[str] = "citizen"  # Only admin can set non-citizen, validated in route


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    display_alias: str
    role: str
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class RoleUpdateRequest(BaseModel):
    role: str
    department_id: Optional[int] = None


# Department & Category
class DepartmentBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    jurisdiction: str = Field(..., min_length=2, max_length=100)
    contact_email: Optional[EmailStr] = None
    description: Optional[str] = None


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentResponse(BaseModel):
    id: int
    name: str
    jurisdiction: str
    contact_email: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CategoryBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    icon_name: Optional[str] = "Building2"
    description: Optional[str] = None


class CategoryCreate(CategoryBase):
    pass


class CategoryResponse(CategoryBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Milestone & History
class ProjectMilestoneBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=150)
    description: Optional[str] = None
    target_date: Optional[str] = None
    status: str = "Pending"  # Pending, In Progress, Completed
    completion_date: Optional[str] = None
    evidence_notes: Optional[str] = None


class ProjectMilestoneCreate(ProjectMilestoneBase):
    pass


class ProjectMilestoneResponse(ProjectMilestoneBase):
    id: int
    project_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ProjectUpdateHistoryResponse(BaseModel):
    id: int
    project_id: int
    actor_name: str
    previous_status: Optional[str] = None
    new_status: str
    explanation: str
    field_changes: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True


# Projects
class ProjectBase(BaseModel):
    title: str = Field(..., min_length=5, max_length=200)
    description: str = Field(..., min_length=10)
    purpose: str = Field(..., min_length=5)
    category_id: int
    department_id: int
    contractor: Optional[str] = None
    location_name: str = Field(..., min_length=2, max_length=200)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    planned_start_date: Optional[str] = None
    planned_completion_date: Optional[str] = None
    budget: Optional[float] = None
    status: str = "Ongoing"  # Planned, Ongoing, Delayed, Completed
    source_documents: Optional[str] = None


class ProjectCreate(ProjectBase):
    milestones: Optional[List[ProjectMilestoneCreate]] = None


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    purpose: Optional[str] = None
    category_id: Optional[int] = None
    department_id: Optional[int] = None
    contractor: Optional[str] = None
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    planned_start_date: Optional[str] = None
    planned_completion_date: Optional[str] = None
    budget: Optional[float] = None
    status: Optional[str] = None
    source_documents: Optional[str] = None
    explanation: str = Field(..., min_length=5, description="Explanation for audit log")


class ProjectResponse(ProjectBase):
    id: int
    project_code: str
    category_name: Optional[str] = None
    department_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    milestones: List[ProjectMilestoneResponse] = []
    update_history: List[ProjectUpdateHistoryResponse] = []
    linked_reports_count: int = 0

    class Config:
        from_attributes = True


# Evidence & Reports
class EvidenceResponse(BaseModel):
    id: int
    file_path: str
    original_filename: str
    file_type: str
    file_size: int
    caption: Optional[str] = None
    is_public: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ReportReviewActionResponse(BaseModel):
    id: int
    actor_name: str
    actor_role: str
    previous_status: Optional[str] = None
    new_status: str
    action_type: str
    explanation: str
    created_at: datetime

    class Config:
        from_attributes = True


class CitizenReportCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=200)
    description: str = Field(..., min_length=10)
    category_id: int
    location_name: str = Field(..., min_length=3, max_length=200)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    observed_date: Optional[str] = None
    additional_context: Optional[str] = None
    related_project_id: Optional[int] = None


class CitizenReportResponse(BaseModel):
    id: int
    case_id: str
    title: str
    description: str
    category_id: int
    category_name: Optional[str] = None
    location_name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    observed_date: Optional[str] = None
    additional_context: Optional[str] = None
    reporter_alias: str
    status: str
    linked_project_id: Optional[int] = None
    linked_project_title: Optional[str] = None
    review_outcome_explanation: Optional[str] = None
    referred_department_name: Optional[str] = None
    moderation_status: str
    likes_count: int = 0
    comments_count: int = 0
    has_liked: bool = False
    created_at: datetime
    updated_at: datetime
    evidence: List[EvidenceResponse] = []
    review_actions: List[ReportReviewActionResponse] = []

    class Config:
        from_attributes = True


# Comments & Likes
class CommentCreate(BaseModel):
    content: str = Field(..., min_length=2, max_length=1000)


class CommentResponse(BaseModel):
    id: int
    report_id: int
    author_alias: str
    content: str
    is_official: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ModerationFlagCreate(BaseModel):
    reason: str = Field(..., min_length=3, max_length=100)
    notes: Optional[str] = None


class ModerationFlagResponse(BaseModel):
    id: int
    report_id: int
    case_id: Optional[str] = None
    report_title: Optional[str] = None
    flagged_by_username: str
    reason: str
    notes: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# Review Actions
class ReviewTransitionRequest(BaseModel):
    action: str  # "under_review", "request_info", "refer_department", "close", "reopen"
    explanation: str = Field(..., min_length=5)
    referred_department_id: Optional[int] = None


class LinkProjectRequest(BaseModel):
    project_id: int
    explanation: str = Field(..., min_length=5)


class VerifyCreateProjectRequest(BaseModel):
    project_code: Optional[str] = None
    title: str = Field(..., min_length=5)
    description: str = Field(..., min_length=10)
    purpose: str = Field(..., min_length=5)
    category_id: int
    department_id: int
    contractor: Optional[str] = None
    location_name: str = Field(..., min_length=3)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    planned_start_date: Optional[str] = None
    planned_completion_date: Optional[str] = None
    budget: Optional[float] = None
    status: str = "Ongoing"
    source_documents: Optional[str] = None
    explanation: str = Field(..., min_length=5)


class CitizenResponseRequest(BaseModel):
    response_text: str = Field(..., min_length=5)


# Matching Engine
class CandidateMatch(BaseModel):
    target_type: str  # "project" or "report"
    id: int
    code: str  # project_code or case_id
    title: str
    location_name: str
    category_name: str
    distance_km: Optional[float] = None
    similarity_score: float  # 0 to 100
    match_reasons: List[str]


class MatchingAnalysisResponse(BaseModel):
    candidates: List[CandidateMatch]
    total_evaluated: int
    threshold: float


# Notification
class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    link_url: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Audit Log
class AuditLogResponse(BaseModel):
    id: int
    actor_username: str
    actor_role: str
    action: str
    target_type: str
    target_id: str
    details: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

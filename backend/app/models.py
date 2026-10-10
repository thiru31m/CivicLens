from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey,
    UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from backend.app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    display_alias = Column(String(50), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="citizen", nullable=False)  # citizen, reviewer, admin
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    department = relationship("Department", back_populates="users")
    reports = relationship("CitizenReport", back_populates="reporter", foreign_keys="CitizenReport.reporter_id")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    jurisdiction = Column(String(100), nullable=False)
    contact_email = Column(String(120), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="department")
    projects = relationship("Project", back_populates="department")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    icon_name = Column(String(50), default="Building2")
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    projects = relationship("Project", back_populates="category")
    reports = relationship("CitizenReport", back_populates="category")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    project_code = Column(String(30), unique=True, index=True, nullable=False)  # e.g. PRJ-2026-001
    title = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=False)
    purpose = Column(Text, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    contractor = Column(String(150), nullable=True)
    
    # Location
    location_name = Column(String(200), nullable=False, index=True)  # Area, road, landmark
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    # Timeline & Budget
    planned_start_date = Column(String(20), nullable=True)
    planned_completion_date = Column(String(20), nullable=True)
    budget = Column(Float, nullable=True)
    status = Column(String(30), default="Ongoing", nullable=False, index=True)  # Planned, Ongoing, Delayed, Completed
    source_documents = Column(Text, nullable=True)  # Citations, official gazette, tender IDs
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    category = relationship("Category", back_populates="projects")
    department = relationship("Department", back_populates="projects")
    milestones = relationship("ProjectMilestone", back_populates="project", cascade="all, delete-orphan", order_by="ProjectMilestone.id")
    update_history = relationship("ProjectUpdateHistory", back_populates="project", cascade="all, delete-orphan", order_by="ProjectUpdateHistory.timestamp.desc()")
    linked_reports = relationship("CitizenReport", back_populates="linked_project")


class ProjectMilestone(Base):
    __tablename__ = "project_milestones"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    target_date = Column(String(20), nullable=True)
    status = Column(String(30), default="Pending", nullable=False)  # Pending, In Progress, Completed
    completion_date = Column(String(20), nullable=True)
    evidence_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="milestones")


class ProjectUpdateHistory(Base):
    __tablename__ = "project_update_history"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    updated_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    actor_name = Column(String(100), nullable=False)
    previous_status = Column(String(30), nullable=True)
    new_status = Column(String(30), nullable=False)
    explanation = Column(Text, nullable=False)
    field_changes = Column(Text, nullable=True)  # JSON representation of changed fields
    timestamp = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="update_history")


class CitizenReport(Base):
    __tablename__ = "citizen_reports"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(30), unique=True, index=True, nullable=False)  # e.g. REP-2026-1042
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reporter_alias = Column(String(50), nullable=False)  # Privacy-preserving alias
    
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    
    # Location
    location_name = Column(String(200), nullable=False, index=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    observed_date = Column(String(20), nullable=True)
    additional_context = Column(Text, nullable=True)
    
    # Review & Lifecycle
    # Statuses:
    # Awaiting Review, Under Review, More Information Requested, Linked to Existing Project,
    # Official Record Verified, Referred to Another Department, Closed — Outcome Explained
    status = Column(String(40), default="Awaiting Review", nullable=False, index=True)
    
    linked_project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    review_outcome_explanation = Column(Text, nullable=True)
    referred_department_name = Column(String(100), nullable=True)
    
    # Moderation
    moderation_status = Column(String(20), default="approved", nullable=False)  # approved, flagged, hidden
    moderation_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    reporter = relationship("User", back_populates="reports", foreign_keys=[reporter_id])
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    category = relationship("Category", back_populates="reports")
    linked_project = relationship("Project", back_populates="linked_reports")
    
    evidence = relationship("EvidenceAttachment", back_populates="report", cascade="all, delete-orphan")
    review_actions = relationship("ReportReviewAction", back_populates="report", cascade="all, delete-orphan", order_by="ReportReviewAction.created_at.asc()")
    likes = relationship("CivicPostLike", back_populates="report", cascade="all, delete-orphan")
    comments = relationship("CivicPostComment", back_populates="report", cascade="all, delete-orphan", order_by="CivicPostComment.created_at.asc()")
    flags = relationship("ModerationFlag", back_populates="report", cascade="all, delete-orphan")


class EvidenceAttachment(Base):
    __tablename__ = "evidence_attachments"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("citizen_reports.id"), nullable=False)
    uploader_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    file_path = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)
    file_size = Column(Integer, nullable=False)
    caption = Column(String(255), nullable=True)
    is_public = Column(Boolean, default=True)  # Approved for publication
    created_at = Column(DateTime, default=datetime.utcnow)

    report = relationship("CitizenReport", back_populates="evidence")


class ReportReviewAction(Base):
    __tablename__ = "report_review_actions"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("citizen_reports.id"), nullable=False)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    actor_name = Column(String(100), nullable=False)
    actor_role = Column(String(30), nullable=False)
    previous_status = Column(String(40), nullable=True)
    new_status = Column(String(40), nullable=False)
    action_type = Column(String(40), nullable=False)  # status_change, request_info, citizen_response, link_project, verify_create_project, refer_department, close, reopen
    explanation = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    report = relationship("CitizenReport", back_populates="review_actions")


class CivicPostLike(Base):
    __tablename__ = "civic_post_likes"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("citizen_reports.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    report = relationship("CitizenReport", back_populates="likes")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint('report_id', 'user_id', name='uq_report_user_like'),
    )


class CivicPostComment(Base):
    __tablename__ = "civic_post_comments"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("citizen_reports.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    author_alias = Column(String(50), nullable=False)
    content = Column(Text, nullable=False)
    is_official = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    report = relationship("CitizenReport", back_populates="comments")
    author = relationship("User")


class ModerationFlag(Base):
    __tablename__ = "moderation_flags"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("citizen_reports.id"), nullable=False)
    flagged_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reason = Column(String(100), nullable=False)  # abusive, misleading, spam, duplicate, other
    notes = Column(Text, nullable=True)
    status = Column(String(20), default="pending", nullable=False)  # pending, reviewed, dismissed
    created_at = Column(DateTime, default=datetime.utcnow)

    report = relationship("CitizenReport", back_populates="flags")
    flagged_by = relationship("User")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    link_url = Column(String(200), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    actor_username = Column(String(50), nullable=False)
    actor_role = Column(String(30), nullable=False)
    action = Column(String(100), nullable=False)
    target_type = Column(String(50), nullable=False)  # project, report, user, department, comment
    target_id = Column(String(50), nullable=False)
    details = Column(Text, nullable=True)  # JSON string
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

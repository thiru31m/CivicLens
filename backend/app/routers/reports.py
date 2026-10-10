import os
import uuid
import json
from pathlib import Path
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database import get_db
from backend.app.models import (
    CitizenReport, EvidenceAttachment, ReportReviewAction, Project,
    Category, User, Notification, AuditLog
)
from backend.app.schemas import (
    CitizenReportResponse, CitizenReportCreate, EvidenceResponse,
    MatchingAnalysisResponse, CandidateMatch, CitizenResponseRequest,
    ReportReviewActionResponse
)
from backend.app.auth import get_current_user, get_optional_user, require_role
from backend.app.config import (
    UPLOAD_DIR, ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, MAX_FILE_SIZE
)
from backend.app.matching import matching_engine

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.post("/check-duplicates", response_model=MatchingAnalysisResponse)
def check_duplicates(
    title: str = Form(...),
    description: str = Form(...),
    category_id: int = Form(...),
    location_name: str = Form(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    observed_date: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Deterministic pre-submission duplicate check returning matched projects & reports with transparent scores and reasons."""
    projects = db.query(Project).all()
    reports = db.query(CitizenReport).filter(CitizenReport.moderation_status != "hidden").all()

    project_candidates = matching_engine.evaluate_against_projects(
        report_title=title,
        report_desc=description,
        report_category_id=category_id,
        report_location_name=location_name,
        report_lat=latitude,
        report_lon=longitude,
        report_date=observed_date,
        projects=projects,
    )

    report_candidates = matching_engine.evaluate_against_reports(
        report_title=title,
        report_desc=description,
        report_category_id=category_id,
        report_location_name=location_name,
        report_lat=latitude,
        report_lon=longitude,
        report_date=observed_date,
        reports=reports,
    )

    all_candidates = project_candidates + report_candidates
    all_candidates.sort(key=lambda x: x["similarity_score"], reverse=True)

    return MatchingAnalysisResponse(
        candidates=[CandidateMatch(**c) for c in all_candidates],
        total_evaluated=len(projects) + len(reports),
        threshold=matching_engine.candidate_threshold,
    )


@router.post("", response_model=CitizenReportResponse)
async def submit_report(
    title: str = Form(..., min_length=5, max_length=200),
    description: str = Form(..., min_length=10),
    category_id: int = Form(...),
    location_name: str = Form(..., min_length=3, max_length=200),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    observed_date: Optional[str] = Form(None),
    additional_context: Optional[str] = Form(None),
    related_project_id: Optional[int] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    # Verify category exists
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=400, detail="Invalid category ID")

    # Generate Case ID e.g. REP-2026-1042
    year = datetime.utcnow().year
    count = db.query(CitizenReport).count() + 1001
    case_id = f"REP-{year}-{count}"

    # Determine reporter alias
    if current_user:
        alias = current_user.display_alias
        user_id = current_user.id
    else:
        alias = f"CitizenObserver_{uuid.uuid4().hex[:6]}"
        user_id = None

    # Enforce safe initial status
    initial_status = "Awaiting Review"

    report = CitizenReport(
        case_id=case_id,
        reporter_id=user_id,
        reporter_alias=alias,
        title=title.strip(),
        description=description.strip(),
        category_id=category_id,
        location_name=location_name.strip(),
        latitude=latitude,
        longitude=longitude,
        observed_date=observed_date,
        additional_context=additional_context,
        status=initial_status,
        linked_project_id=related_project_id,
        moderation_status="approved",  # Pass basic moderation filter
    )
    db.add(report)
    db.flush()

    # Initial review action / timeline event
    initial_action = ReportReviewAction(
        report_id=report.id,
        actor_id=user_id,
        actor_name=alias,
        actor_role="citizen",
        previous_status=None,
        new_status=initial_status,
        action_type="status_change",
        explanation="Report submitted by citizen and queued for official review.",
    )
    db.add(initial_action)

    # Secure file upload validation and storage
    if file and file.filename:
        # Check extension
        ext = Path(file.filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            )

        content = await file.read()
        file_size = len(content)

        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE // (1024*1024)}MB"
            )

        # Generate unique, non-guessable filename
        safe_filename = f"{uuid.uuid4().hex}{ext}"
        saved_path = UPLOAD_DIR / safe_filename

        with open(saved_path, "wb") as f_out:
            f_out.write(content)

        attachment = EvidenceAttachment(
            report_id=report.id,
            uploader_user_id=user_id,
            file_path=f"/uploads/{safe_filename}",
            original_filename=file.filename[:250],
            file_type=file.content_type or "application/octet-stream",
            file_size=file_size,
            caption="Supporting evidence submitted with initial report",
            is_public=True,
        )
        db.add(attachment)

    # Notify user if logged in
    if current_user:
        notif = Notification(
            user_id=current_user.id,
            title="Report Submission Confirmed",
            message=f"Your observation has been registered as {case_id}. Reviewers will investigate your submission.",
            link_url=f"/my-reports?case={case_id}",
        )
        db.add(notif)

    # Audit log
    audit = AuditLog(
        actor_id=user_id,
        actor_username=alias,
        actor_role="citizen",
        action="report_submitted",
        target_type="report",
        target_id=case_id,
        details=json.dumps({"title": report.title, "location": report.location_name}),
    )
    db.add(audit)

    db.commit()
    db.refresh(report)

    return get_report_by_id(report.id, current_user, db)


@router.get("/my-reports", response_model=List[CitizenReportResponse])
def get_my_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all reports submitted by the logged-in citizen."""
    reports = db.query(CitizenReport).filter(
        CitizenReport.reporter_id == current_user.id
    ).order_by(desc(CitizenReport.created_at)).all()

    res = []
    for r in reports:
        res.append(_build_report_response(r, current_user))
    return res


@router.get("/{id}", response_model=CitizenReportResponse)
def get_report_by_id(
    id: int,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    report = db.query(CitizenReport).filter(CitizenReport.id == id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if report.moderation_status == "hidden" and (not current_user or current_user.role not in ["reviewer", "admin"]):
        raise HTTPException(status_code=404, detail="Report not found or has been hidden")

    return _build_report_response(report, current_user)


@router.post("/{id}/respond", response_model=CitizenReportResponse)
async def respond_to_more_info(
    id: int,
    response_text: str = Form(..., min_length=5),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    report = db.query(CitizenReport).filter(CitizenReport.id == id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Only original reporter or reviewer/admin can respond
    if report.reporter_id != current_user.id and current_user.role not in ["reviewer", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to provide evidence on this report")

    prev_status = report.status
    report.status = "Under Review"  # Transition back to Under Review

    action = ReportReviewAction(
        report_id=report.id,
        actor_id=current_user.id,
        actor_name=current_user.display_alias,
        actor_role=current_user.role,
        previous_status=prev_status,
        new_status="Under Review",
        action_type="citizen_response",
        explanation=f"Citizen provided additional evidence/clarification: {response_text.strip()}",
    )
    db.add(action)

    # Optional file upload
    if file and file.filename:
        ext = Path(file.filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail="Unsupported file format")
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large")

        safe_filename = f"{uuid.uuid4().hex}{ext}"
        saved_path = UPLOAD_DIR / safe_filename
        with open(saved_path, "wb") as f_out:
            f_out.write(content)

        attachment = EvidenceAttachment(
            report_id=report.id,
            uploader_user_id=current_user.id,
            file_path=f"/uploads/{safe_filename}",
            original_filename=file.filename[:250],
            file_type=file.content_type or "application/octet-stream",
            file_size=len(content),
            caption=f"Follow-up evidence from citizen: {response_text[:100]}",
            is_public=True,
        )
        db.add(attachment)

    # If report has an assigned reviewer, notify reviewer
    if report.reviewer_id:
        notif = Notification(
            user_id=report.reviewer_id,
            title=f"Citizen Responded: {report.case_id}",
            message=f"Additional evidence submitted for case {report.case_id}.",
            link_url=f"/review?case={report.case_id}",
        )
        db.add(notif)

    db.commit()
    db.refresh(report)
    return _build_report_response(report, current_user)


def _build_report_response(r: CitizenReport, current_user: Optional[User] = None) -> CitizenReportResponse:
    has_liked = False
    if current_user:
        has_liked = any(l.user_id == current_user.id for l in r.likes)

    return CitizenReportResponse(
        id=r.id,
        case_id=r.case_id,
        title=r.title,
        description=r.description,
        category_id=r.category_id,
        category_name=r.category.name if r.category else None,
        location_name=r.location_name,
        latitude=r.latitude,
        longitude=r.longitude,
        observed_date=r.observed_date,
        additional_context=r.additional_context,
        reporter_alias=r.reporter_alias,
        status=r.status,
        linked_project_id=r.linked_project_id,
        linked_project_title=r.linked_project.title if r.linked_project else None,
        review_outcome_explanation=r.review_outcome_explanation,
        referred_department_name=r.referred_department_name,
        moderation_status=r.moderation_status,
        likes_count=len(r.likes),
        comments_count=len(r.comments),
        has_liked=has_liked,
        created_at=r.created_at,
        updated_at=r.updated_at,
        evidence=[EvidenceResponse.from_orm(e) for e in r.evidence if e.is_public],
        review_actions=[ReportReviewActionResponse.from_orm(a) for a in r.review_actions],
    )

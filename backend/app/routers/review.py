import json
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import (
    CitizenReport, ReportReviewAction, Project, ProjectUpdateHistory,
    Department, Category, User, Notification, AuditLog
)
from app.schemas import (
    CitizenReportResponse, ReviewTransitionRequest, LinkProjectRequest,
    VerifyCreateProjectRequest, MatchingAnalysisResponse, CandidateMatch
)
from app.auth import require_role
from app.matching import matching_engine
from app.routers.reports import _build_report_response

router = APIRouter(prefix="/api/review", tags=["review"])


@router.get("/reports", response_model=List[CitizenReportResponse])
def get_review_queue(
    status_filter: Optional[str] = Query(None, description="'Awaiting Review', 'Under Review', 'More Information Requested', 'all'"),
    category_id: Optional[int] = Query(None),
    current_user: User = Depends(require_role(["reviewer", "admin"])),
    db: Session = Depends(get_db)
):
    query = db.query(CitizenReport)

    if status_filter and status_filter.lower() != "all":
        query = query.filter(CitizenReport.status.ilike(status_filter))

    if category_id:
        query = query.filter(CitizenReport.category_id == category_id)

    reports = query.order_by(desc(CitizenReport.created_at)).all()
    return [_build_report_response(r, current_user) for r in reports]


@router.get("/reports/{id}/match-candidates", response_model=MatchingAnalysisResponse)
def get_report_candidates_for_reviewer(
    id: int,
    current_user: User = Depends(require_role(["reviewer", "admin"])),
    db: Session = Depends(get_db)
):
    report = db.query(CitizenReport).filter(CitizenReport.id == id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    projects = db.query(Project).all()
    reports = db.query(CitizenReport).all()

    project_candidates = matching_engine.evaluate_against_projects(
        report_title=report.title,
        report_desc=report.description,
        report_category_id=report.category_id,
        report_location_name=report.location_name,
        report_lat=report.latitude,
        report_lon=report.longitude,
        report_date=report.observed_date,
        projects=projects,
    )

    report_candidates = matching_engine.evaluate_against_reports(
        report_title=report.title,
        report_desc=report.description,
        report_category_id=report.category_id,
        report_location_name=report.location_name,
        report_lat=report.latitude,
        report_lon=report.longitude,
        report_date=report.observed_date,
        reports=reports,
        exclude_report_id=report.id,
    )

    all_candidates = project_candidates + report_candidates
    all_candidates.sort(key=lambda x: x["similarity_score"], reverse=True)

    return MatchingAnalysisResponse(
        candidates=[CandidateMatch(**c) for c in all_candidates],
        total_evaluated=len(projects) + len(reports),
        threshold=matching_engine.candidate_threshold,
    )


@router.post("/reports/{id}/transition", response_model=CitizenReportResponse)
def transition_report_status(
    id: int,
    data: ReviewTransitionRequest,
    current_user: User = Depends(require_role(["reviewer", "admin"])),
    db: Session = Depends(get_db)
):
    report = db.query(CitizenReport).filter(CitizenReport.id == id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    prev_status = report.status
    action_type = data.action.lower()

    # Valid transitions
    if action_type == "under_review":
        target_status = "Under Review"
    elif action_type == "request_info":
        target_status = "More Information Requested"
    elif action_type == "refer_department":
        target_status = "Referred to Another Department"
        if data.referred_department_id:
            dept = db.query(Department).filter(Department.id == data.referred_department_id).first()
            if dept:
                report.referred_department_name = dept.name
    elif action_type == "close":
        target_status = "Closed — Outcome Explained"
    elif action_type == "reopen":
        if prev_status != "Closed — Outcome Explained":
            raise HTTPException(status_code=400, detail="Only closed cases can be reopened")
        target_status = "Under Review"
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported transition action '{data.action}'")

    # Update report
    report.status = target_status
    report.reviewer_id = current_user.id
    report.review_outcome_explanation = data.explanation
    report.updated_at = datetime.utcnow()

    # Record review action
    action = ReportReviewAction(
        report_id=report.id,
        actor_id=current_user.id,
        actor_name=f"{current_user.full_name} ({current_user.role.title()})",
        actor_role=current_user.role,
        previous_status=prev_status,
        new_status=target_status,
        action_type=action_type,
        explanation=data.explanation,
    )
    db.add(action)

    # Notify citizen
    if report.reporter_id:
        notif = Notification(
            user_id=report.reporter_id,
            title=f"Review Update: {report.case_id}",
            message=f"Status changed to '{target_status}'. Note: {data.explanation[:120]}",
            link_url=f"/my-reports?case={report.case_id}",
        )
        db.add(notif)

    # Audit log
    audit = AuditLog(
        actor_id=current_user.id,
        actor_username=current_user.username,
        actor_role=current_user.role,
        action=f"report_transition_{action_type}",
        target_type="report",
        target_id=report.case_id,
        details=json.dumps({"from": prev_status, "to": target_status, "explanation": data.explanation}),
    )
    db.add(audit)

    db.commit()
    db.refresh(report)
    return _build_report_response(report, current_user)


@router.post("/reports/{id}/link-project", response_model=CitizenReportResponse)
def link_report_to_project(
    id: int,
    data: LinkProjectRequest,
    current_user: User = Depends(require_role(["reviewer", "admin"])),
    db: Session = Depends(get_db)
):
    report = db.query(CitizenReport).filter(CitizenReport.id == id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    project = db.query(Project).filter(Project.id == data.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Target project not found")

    prev_status = report.status
    target_status = "Linked to Existing Project"

    report.status = target_status
    report.linked_project_id = project.id
    report.reviewer_id = current_user.id
    report.review_outcome_explanation = f"Observation linked to official project {project.project_code} ('{project.title}'): {data.explanation}"
    report.updated_at = datetime.utcnow()

    # Timeline record
    action = ReportReviewAction(
        report_id=report.id,
        actor_id=current_user.id,
        actor_name=f"{current_user.full_name} ({current_user.role.title()})",
        actor_role=current_user.role,
        previous_status=prev_status,
        new_status=target_status,
        action_type="link_project",
        explanation=f"Linked to {project.project_code} ({project.title}). {data.explanation}",
    )
    db.add(action)

    # Project update history
    proj_history = ProjectUpdateHistory(
        project_id=project.id,
        updated_by_user_id=current_user.id,
        actor_name=current_user.full_name,
        previous_status=project.status,
        new_status=project.status,
        explanation=f"Citizen report {report.case_id} was investigated and verified as relating to this project.",
        field_changes=json.dumps({"linked_report_case_id": report.case_id}),
    )
    db.add(proj_history)

    # Notify citizen
    if report.reporter_id:
        notif = Notification(
            user_id=report.reporter_id,
            title=f"Report Verified & Linked: {report.case_id}",
            message=f"Your report has been successfully linked to official project {project.project_code}: {project.title}.",
            link_url=f"/projects/{project.id}",
        )
        db.add(notif)

    # Audit log
    audit = AuditLog(
        actor_id=current_user.id,
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="report_linked_to_project",
        target_type="report",
        target_id=report.case_id,
        details=json.dumps({"project_id": project.id, "project_code": project.project_code}),
    )
    db.add(audit)

    db.commit()
    db.refresh(report)
    return _build_report_response(report, current_user)


@router.post("/reports/{id}/verify-create-project", response_model=CitizenReportResponse)
def verify_and_create_project(
    id: int,
    data: VerifyCreateProjectRequest,
    current_user: User = Depends(require_role(["reviewer", "admin"])),
    db: Session = Depends(get_db)
):
    report = db.query(CitizenReport).filter(CitizenReport.id == id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Generate unique project code
    count = db.query(Project).count() + 1
    year = datetime.utcnow().year
    code = data.project_code or f"PRJ-{year}-{count:03d}"

    # Create official project record from reviewed information
    project = Project(
        project_code=code,
        title=data.title,
        description=data.description,
        purpose=data.purpose,
        category_id=data.category_id,
        department_id=data.department_id,
        contractor=data.contractor,
        location_name=data.location_name,
        latitude=data.latitude or report.latitude,
        longitude=data.longitude or report.longitude,
        planned_start_date=data.planned_start_date or report.observed_date,
        planned_completion_date=data.planned_completion_date,
        budget=data.budget,
        status=data.status,
        source_documents=data.source_documents or f"Verified via Citizen Case {report.case_id}",
    )
    db.add(project)
    db.flush()

    # Initial history for project
    proj_history = ProjectUpdateHistory(
        project_id=project.id,
        updated_by_user_id=current_user.id,
        actor_name=current_user.full_name,
        previous_status=None,
        new_status=project.status,
        explanation=f"Official project record established following investigation of citizen report {report.case_id}. Review explanation: {data.explanation}",
        field_changes=json.dumps({"originating_case_id": report.case_id}),
    )
    db.add(proj_history)

    # Update report status to Official Record Verified and link to new project
    prev_status = report.status
    target_status = "Official Record Verified"

    report.status = target_status
    report.linked_project_id = project.id
    report.reviewer_id = current_user.id
    report.review_outcome_explanation = f"Observation investigated and confirmed as official public works. Created official project {code}: {data.explanation}"
    report.updated_at = datetime.utcnow()

    action = ReportReviewAction(
        report_id=report.id,
        actor_id=current_user.id,
        actor_name=f"{current_user.full_name} ({current_user.role.title()})",
        actor_role=current_user.role,
        previous_status=prev_status,
        new_status=target_status,
        action_type="verify_create_project",
        explanation=f"Verified and published as new official project {code}. {data.explanation}",
    )
    db.add(action)

    # Notify citizen
    if report.reporter_id:
        notif = Notification(
            user_id=report.reporter_id,
            title=f"New Official Project Created: {code}",
            message=f"Your observation {report.case_id} led to the official verification and publishing of project {code}: {project.title}.",
            link_url=f"/projects/{project.id}",
        )
        db.add(notif)

    # Audit log
    audit = AuditLog(
        actor_id=current_user.id,
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="project_created_from_report_verification",
        target_type="project",
        target_id=str(project.id),
        details=json.dumps({"report_case_id": report.case_id, "project_code": code}),
    )
    db.add(audit)

    db.commit()
    db.refresh(report)
    return _build_report_response(report, current_user)

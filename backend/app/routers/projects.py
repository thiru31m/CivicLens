import json
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.database import get_db
from app.models import (
    Project, ProjectMilestone, ProjectUpdateHistory, Department, Category,
    CitizenReport, User, AuditLog
)
from app.schemas import (
    ProjectResponse, ProjectCreate, ProjectUpdate,
    ProjectMilestoneCreate, ProjectMilestoneResponse,
    ProjectUpdateHistoryResponse, CitizenReportResponse
)
from app.auth import require_role, get_current_user
from app.matching import haversine_distance_km

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=List[ProjectResponse])
def get_projects(
    q: Optional[str] = Query(None, description="Search by area, road, landmark, title, or keyword"),
    category_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None, description="Planned, Ongoing, Delayed, Completed"),
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    radius_km: Optional[float] = Query(10.0, description="Radius in km for proximity search"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(Project)

    if category_id:
        query = query.filter(Project.category_id == category_id)

    if status and status.lower() != "all":
        query = query.filter(Project.status.ilike(status))

    if q and q.strip():
        search_term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Project.title.ilike(search_term),
                Project.description.ilike(search_term),
                Project.location_name.ilike(search_term),
                Project.project_code.ilike(search_term),
                Project.contractor.ilike(search_term),
            )
        )

    projects = query.order_by(desc(Project.updated_at)).all()

    # If coordinates are specified, apply geographic proximity filtering and sorting
    if lat is not None and lng is not None:
        filtered = []
        for p in projects:
            if p.latitude is not None and p.longitude is not None:
                dist = haversine_distance_km(lat, lng, p.latitude, p.longitude)
                if dist <= radius_km:
                    filtered.append((dist, p))
        filtered.sort(key=lambda x: x[0])
        projects = [item[1] for item in filtered]

    # Apply pagination
    paginated = projects[skip : skip + limit]

    response = []
    for p in paginated:
        resp = ProjectResponse(
            id=p.id,
            project_code=p.project_code,
            title=p.title,
            description=p.description,
            purpose=p.purpose,
            category_id=p.category_id,
            category_name=p.category.name if p.category else None,
            department_id=p.department_id,
            department_name=p.department.name if p.department else None,
            contractor=p.contractor,
            location_name=p.location_name,
            latitude=p.latitude,
            longitude=p.longitude,
            planned_start_date=p.planned_start_date,
            planned_completion_date=p.planned_completion_date,
            budget=p.budget,
            status=p.status,
            source_documents=p.source_documents,
            created_at=p.created_at,
            updated_at=p.updated_at,
            milestones=[
                ProjectMilestoneResponse.from_orm(m) for m in p.milestones
            ],
            update_history=[
                ProjectUpdateHistoryResponse.from_orm(h) for h in p.update_history
            ],
            linked_reports_count=len(p.linked_reports),
        )
        response.append(resp)

    return response


@router.get("/{id}", response_model=ProjectResponse)
def get_project_by_id(id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    return ProjectResponse(
        id=project.id,
        project_code=project.project_code,
        title=project.title,
        description=project.description,
        purpose=project.purpose,
        category_id=project.category_id,
        category_name=project.category.name if project.category else None,
        department_id=project.department_id,
        department_name=project.department.name if project.department else None,
        contractor=project.contractor,
        location_name=project.location_name,
        latitude=project.latitude,
        longitude=project.longitude,
        planned_start_date=project.planned_start_date,
        planned_completion_date=project.planned_completion_date,
        budget=project.budget,
        status=project.status,
        source_documents=project.source_documents,
        created_at=project.created_at,
        updated_at=project.updated_at,
        milestones=[ProjectMilestoneResponse.from_orm(m) for m in project.milestones],
        update_history=[ProjectUpdateHistoryResponse.from_orm(h) for h in project.update_history],
        linked_reports_count=len(project.linked_reports),
    )


@router.get("/{id}/related-reports", response_model=List[CitizenReportResponse])
def get_project_related_reports(id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    reports = db.query(CitizenReport).filter(
        CitizenReport.linked_project_id == id,
        CitizenReport.moderation_status != "hidden"
    ).all()

    res = []
    for r in reports:
        res.append(
            CitizenReportResponse(
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
                linked_project_title=project.title,
                review_outcome_explanation=r.review_outcome_explanation,
                referred_department_name=r.referred_department_name,
                moderation_status=r.moderation_status,
                likes_count=len(r.likes),
                comments_count=len(r.comments),
                has_liked=False,
                created_at=r.created_at,
                updated_at=r.updated_at,
                evidence=[e for e in r.evidence if e.is_public],
                review_actions=r.review_actions,
            )
        )
    return res


@router.post("", response_model=ProjectResponse)
def create_project(
    data: ProjectCreate,
    current_user: User = Depends(require_role(["reviewer", "admin"])),
    db: Session = Depends(get_db)
):
    # Auto-generate unique project code
    count = db.query(Project).count() + 1
    year = datetime.utcnow().year
    code = f"PRJ-{year}-{count:03d}"

    project = Project(
        project_code=code,
        title=data.title,
        description=data.description,
        purpose=data.purpose,
        category_id=data.category_id,
        department_id=data.department_id,
        contractor=data.contractor,
        location_name=data.location_name,
        latitude=data.latitude,
        longitude=data.longitude,
        planned_start_date=data.planned_start_date,
        planned_completion_date=data.planned_completion_date,
        budget=data.budget,
        status=data.status,
        source_documents=data.source_documents,
    )
    db.add(project)
    db.flush()

    # Initial update history record
    history = ProjectUpdateHistory(
        project_id=project.id,
        updated_by_user_id=current_user.id,
        actor_name=current_user.full_name,
        previous_status=None,
        new_status=data.status,
        explanation=f"Official project record initiated with status '{data.status}'.",
        field_changes=json.dumps({"initial_creation": True, "code": code}),
    )
    db.add(history)

    # Optional initial milestones
    if data.milestones:
        for m in data.milestones:
            ms = ProjectMilestone(
                project_id=project.id,
                title=m.title,
                description=m.description,
                target_date=m.target_date,
                status=m.status,
                completion_date=m.completion_date,
                evidence_notes=m.evidence_notes,
            )
            db.add(ms)

    # Audit log
    audit = AuditLog(
        actor_id=current_user.id,
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="project_created",
        target_type="project",
        target_id=str(project.id),
        details=json.dumps({"project_code": code, "title": project.title}),
    )
    db.add(audit)

    db.commit()
    db.refresh(project)
    return get_project_by_id(project.id, db)


@router.patch("/{id}", response_model=ProjectResponse)
def update_project(
    id: int,
    data: ProjectUpdate,
    current_user: User = Depends(require_role(["reviewer", "admin"])),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    changes = {}
    prev_status = project.status

    if data.title and data.title != project.title:
        changes["title"] = {"old": project.title, "new": data.title}
        project.title = data.title
    if data.description and data.description != project.description:
        changes["description"] = {"old": "...", "new": "..."}
        project.description = data.description
    if data.purpose and data.purpose != project.purpose:
        changes["purpose"] = {"old": project.purpose, "new": data.purpose}
        project.purpose = data.purpose
    if data.status and data.status != project.status:
        changes["status"] = {"old": project.status, "new": data.status}
        project.status = data.status
    if data.planned_start_date and data.planned_start_date != project.planned_start_date:
        changes["planned_start_date"] = {"old": project.planned_start_date, "new": data.planned_start_date}
        project.planned_start_date = data.planned_start_date
    if data.planned_completion_date and data.planned_completion_date != project.planned_completion_date:
        changes["planned_completion_date"] = {"old": project.planned_completion_date, "new": data.planned_completion_date}
        project.planned_completion_date = data.planned_completion_date
    if data.budget is not None and data.budget != project.budget:
        changes["budget"] = {"old": project.budget, "new": data.budget}
        project.budget = data.budget
    if data.contractor and data.contractor != project.contractor:
        changes["contractor"] = {"old": project.contractor, "new": data.contractor}
        project.contractor = data.contractor
    if data.source_documents and data.source_documents != project.source_documents:
        changes["source_documents"] = {"old": "...", "new": "..."}
        project.source_documents = data.source_documents

    # Never silently overwrite: always record history
    history = ProjectUpdateHistory(
        project_id=project.id,
        updated_by_user_id=current_user.id,
        actor_name=current_user.full_name,
        previous_status=prev_status,
        new_status=project.status,
        explanation=data.explanation,
        field_changes=json.dumps(changes),
    )
    db.add(history)

    # Audit log
    audit = AuditLog(
        actor_id=current_user.id,
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="project_updated",
        target_type="project",
        target_id=str(project.id),
        details=json.dumps({"changes": changes, "explanation": data.explanation}),
    )
    db.add(audit)

    db.commit()
    db.refresh(project)
    return get_project_by_id(project.id, db)


@router.post("/{id}/milestones", response_model=ProjectMilestoneResponse)
def add_project_milestone(
    id: int,
    data: ProjectMilestoneCreate,
    current_user: User = Depends(require_role(["reviewer", "admin"])),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    milestone = ProjectMilestone(
        project_id=project.id,
        title=data.title,
        description=data.description,
        target_date=data.target_date,
        status=data.status,
        completion_date=data.completion_date,
        evidence_notes=data.evidence_notes,
    )
    db.add(milestone)
    db.commit()
    db.refresh(milestone)
    return milestone

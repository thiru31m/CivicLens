import json
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import (
    User, Department, Category, CitizenReport, ModerationFlag, AuditLog
)
from app.schemas import (
    UserResponse, RoleUpdateRequest, DepartmentCreate, DepartmentResponse,
    CategoryCreate, CategoryResponse, ModerationFlagResponse, AuditLogResponse
)
from app.auth import require_role

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users", response_model=List[UserResponse])
def get_all_users(
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    users = db.query(User).order_by(User.id.asc()).all()
    res = []
    for u in users:
        res.append(
            UserResponse(
                id=u.id,
                username=u.username,
                email=u.email,
                full_name=u.full_name,
                display_alias=u.display_alias,
                role=u.role,
                department_id=u.department_id,
                department_name=u.department.name if u.department else None,
                is_active=u.is_active,
                created_at=u.created_at,
            )
        )
    return res


@router.patch("/users/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: int,
    data: RoleUpdateRequest,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if data.role not in ["citizen", "reviewer", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role specified")

    old_role = user.role
    user.role = data.role
    if data.department_id is not None:
        user.department_id = data.department_id

    audit = AuditLog(
        actor_id=current_user.id,
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="user_role_updated",
        target_type="user",
        target_id=str(user.id),
        details=json.dumps({"old_role": old_role, "new_role": data.role, "department_id": data.department_id}),
    )
    db.add(audit)

    db.commit()
    db.refresh(user)

    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        display_alias=user.display_alias,
        role=user.role,
        department_id=user.department_id,
        department_name=user.department.name if user.department else None,
        is_active=user.is_active,
        created_at=user.created_at,
    )


# Departments
@router.get("/departments", response_model=List[DepartmentResponse])
def get_departments(db: Session = Depends(get_db)):
    return db.query(Department).order_by(Department.name.asc()).all()


@router.post("/departments", response_model=DepartmentResponse)
def create_department(
    data: DepartmentCreate,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    if db.query(Department).filter(Department.name == data.name).first():
        raise HTTPException(status_code=400, detail="Department already exists")

    dept = Department(
        name=data.name,
        jurisdiction=data.jurisdiction,
        contact_email=data.contact_email,
        description=data.description,
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


# Categories
@router.get("/categories", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    return db.query(Category).order_by(Category.id.asc()).all()


@router.post("/categories", response_model=CategoryResponse)
def create_category(
    data: CategoryCreate,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    if db.query(Category).filter(Category.name == data.name).first():
        raise HTTPException(status_code=400, detail="Category already exists")

    cat = Category(
        name=data.name,
        icon_name=data.icon_name or "Building2",
        description=data.description,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


# Moderation Queue
@router.get("/flags", response_model=List[ModerationFlagResponse])
def get_flagged_content(
    status_filter: Optional[str] = Query("pending"),
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    query = db.query(ModerationFlag)
    if status_filter and status_filter.lower() != "all":
        query = query.filter(ModerationFlag.status == status_filter)

    flags = query.order_by(desc(ModerationFlag.created_at)).all()
    res = []
    for f in flags:
        res.append(
            ModerationFlagResponse(
                id=f.id,
                report_id=f.report_id,
                case_id=f.report.case_id if f.report else None,
                report_title=f.report.title if f.report else None,
                flagged_by_username=f.flagged_by.username if f.flagged_by else "Unknown",
                reason=f.reason,
                notes=f.notes,
                status=f.status,
                created_at=f.created_at,
            )
        )
    return res


@router.post("/flags/{flag_id}/moderate")
def moderate_flag(
    flag_id: int,
    action: str = Query(..., description="'hide_post' or 'dismiss_flag'"),
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    flag = db.query(ModerationFlag).filter(ModerationFlag.id == flag_id).first()
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")

    report = flag.report

    if action == "hide_post":
        flag.status = "reviewed"
        if report:
            report.moderation_status = "hidden"
            report.moderation_notes = f"Hidden by administrator {current_user.username} upon reviewing flag."
        log_action = "report_hidden_by_moderator"
    elif action == "dismiss_flag":
        flag.status = "dismissed"
        if report and report.moderation_status == "flagged":
            report.moderation_status = "approved"
        log_action = "flag_dismissed_by_moderator"
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    # Audit log preserving moderation history without silent erasure
    audit = AuditLog(
        actor_id=current_user.id,
        actor_username=current_user.username,
        actor_role=current_user.role,
        action=log_action,
        target_type="flag",
        target_id=str(flag.id),
        details=json.dumps({"report_id": flag.report_id, "action": action}),
    )
    db.add(audit)

    db.commit()
    return {"success": True, "action": action, "flag_id": flag_id}


# Audit Logs
@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    logs = db.query(AuditLog).order_by(desc(AuditLog.timestamp)).limit(limit).all()
    return [
        AuditLogResponse(
            id=l.id,
            actor_username=l.actor_username,
            actor_role=l.actor_role,
            action=l.action,
            target_type=l.target_type,
            target_id=l.target_id,
            details=l.details,
            timestamp=l.timestamp,
        )
        for l in logs
    ]

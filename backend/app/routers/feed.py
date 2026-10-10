from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from backend.app.database import get_db
from backend.app.models import (
    CitizenReport, CivicPostLike, CivicPostComment, ModerationFlag,
    User, Notification, AuditLog
)
from backend.app.schemas import (
    CitizenReportResponse, CommentCreate, CommentResponse,
    ModerationFlagCreate, ModerationFlagResponse
)
from backend.app.auth import get_current_user, get_optional_user, require_role
from backend.app.routers.reports import _build_report_response

router = APIRouter(prefix="/api/feed", tags=["feed"])


@router.get("", response_model=List[CitizenReportResponse])
def get_feed(
    sort_by: str = Query("latest", description="'latest' or 'active' (by comments/updates)"),
    category_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None, description="Filter by verification status"),
    area: Optional[str] = Query(None, description="Filter by area / location string"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    query = db.query(CitizenReport).filter(CitizenReport.moderation_status != "hidden")

    if category_id:
        query = query.filter(CitizenReport.category_id == category_id)

    if status and status.lower() != "all":
        query = query.filter(CitizenReport.status.ilike(status))

    if area and area.strip():
        search_area = f"%{area.strip()}%"
        query = query.filter(CitizenReport.location_name.ilike(search_area))

    if sort_by == "active":
        query = query.order_by(desc(CitizenReport.updated_at))
    else:
        query = query.order_by(desc(CitizenReport.created_at))

    reports = query.offset(skip).limit(limit).all()

    return [_build_report_response(r, current_user) for r in reports]


@router.post("/{report_id}/like")
def toggle_like(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Enforce one support/like per user per post with unique DB constraint."""
    report = db.query(CitizenReport).filter(CitizenReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    existing_like = db.query(CivicPostLike).filter(
        CivicPostLike.report_id == report_id,
        CivicPostLike.user_id == current_user.id
    ).first()

    if existing_like:
        # Unlike
        db.delete(existing_like)
        db.commit()
        likes_count = db.query(CivicPostLike).filter(CivicPostLike.report_id == report_id).count()
        return {"liked": False, "likes_count": likes_count, "message": "Support removed"}
    else:
        # Like
        new_like = CivicPostLike(report_id=report_id, user_id=current_user.id)
        db.add(new_like)
        db.commit()
        likes_count = db.query(CivicPostLike).filter(CivicPostLike.report_id == report_id).count()
        return {"liked": True, "likes_count": likes_count, "message": "Support recorded"}


@router.get("/{report_id}/comments", response_model=List[CommentResponse])
def get_comments(
    report_id: int,
    db: Session = Depends(get_db)
):
    report = db.query(CitizenReport).filter(CitizenReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    comments = db.query(CivicPostComment).filter(
        CivicPostComment.report_id == report_id
    ).order_by(CivicPostComment.created_at.asc()).all()

    return [
        CommentResponse(
            id=c.id,
            report_id=c.report_id,
            author_alias=c.author_alias,
            content=c.content,
            is_official=c.is_official,
            created_at=c.created_at,
        )
        for c in comments
    ]


@router.post("/{report_id}/comments", response_model=CommentResponse)
def add_comment(
    report_id: int,
    data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    report = db.query(CitizenReport).filter(CitizenReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    is_official = current_user.role in ["reviewer", "admin"]
    alias = current_user.display_alias
    if is_official and current_user.department:
        alias = f"{current_user.display_alias} ({current_user.department.name})"

    comment = CivicPostComment(
        report_id=report.id,
        author_id=current_user.id,
        author_alias=alias,
        content=data.content.strip(),
        is_official=is_official,
    )
    db.add(comment)

    # Touch report updated_at timestamp to indicate engagement activity
    report.updated_at = datetime.utcnow()

    # Notify reporter if not commenting on their own post
    if report.reporter_id and report.reporter_id != current_user.id:
        notif = Notification(
            user_id=report.reporter_id,
            title=f"New comment on {report.case_id}",
            message=f"{alias} commented on your report: \"{data.content[:60]}...\"",
            link_url=f"/my-reports?case={report.case_id}",
        )
        db.add(notif)

    db.commit()
    db.refresh(comment)

    return CommentResponse(
        id=comment.id,
        report_id=comment.report_id,
        author_alias=comment.author_alias,
        content=comment.content,
        is_official=comment.is_official,
        created_at=comment.created_at,
    )


@router.post("/{report_id}/flag", response_model=ModerationFlagResponse)
def flag_post(
    report_id: int,
    data: ModerationFlagCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    report = db.query(CitizenReport).filter(CitizenReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    flag = ModerationFlag(
        report_id=report.id,
        flagged_by_user_id=current_user.id,
        reason=data.reason,
        notes=data.notes,
        status="pending",
    )
    db.add(flag)

    # If flags reach 3 or more, mark report as flagged
    flag_count = db.query(ModerationFlag).filter(ModerationFlag.report_id == report.id).count() + 1
    if flag_count >= 3:
        report.moderation_status = "flagged"

    db.commit()
    db.refresh(flag)

    return ModerationFlagResponse(
        id=flag.id,
        report_id=flag.report_id,
        case_id=report.case_id,
        report_title=report.title,
        flagged_by_username=current_user.username,
        reason=flag.reason,
        notes=flag.notes,
        status=flag.status,
        created_at=flag.created_at,
    )

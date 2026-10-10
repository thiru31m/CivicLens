import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import User, Department
from backend.app.schemas import UserCreate, UserLogin, UserResponse, TokenResponse
from backend.app.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if username or email already exists
    if db.query(User).filter(User.username == user_in.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Privacy-preserving alias: if not given, create one like CitizenObserver_xxx
    alias = user_in.display_alias
    if not alias:
        clean_name = re.sub(r"[^\w]", "", user_in.username)
        alias = f"Citizen_{clean_name[:12]}"

    # Citizens can NEVER grant themselves reviewer or admin role directly via register
    new_user = User(
        username=user_in.username,
        email=user_in.email,
        full_name=user_in.full_name,
        display_alias=alias,
        hashed_password=hash_password(user_in.password),
        role="citizen",  # Enforce citizen role on registration
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(data={"sub": new_user.username, "role": new_user.role})
    
    user_resp = UserResponse(
        id=new_user.id,
        username=new_user.username,
        email=new_user.email,
        full_name=new_user.full_name,
        display_alias=new_user.display_alias,
        role=new_user.role,
        department_id=new_user.department_id,
        department_name=new_user.department.name if new_user.department else None,
        is_active=new_user.is_active,
        created_at=new_user.created_at,
    )

    return TokenResponse(access_token=access_token, user=user_resp)


@router.post("/login", response_model=TokenResponse)
def login(creds: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == creds.username).first()
    if not user or not verify_password(creds.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is inactive"
        )

    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    
    user_resp = UserResponse(
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

    return TokenResponse(access_token=access_token, user=user_resp)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        display_alias=current_user.display_alias,
        role=current_user.role,
        department_id=current_user.department_id,
        department_name=current_user.department.name if current_user.department else None,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
    )


@router.get("/demo-accounts")
def get_demo_accounts():
    """Documented development helper for one-click reviewer/citizen/admin evaluation."""
    return [
        {
            "role": "citizen",
            "username": "citizen_rahul",
            "password": "Password123!",
            "label": "Rahul Sharma (Citizen Reporter)",
            "description": "Standard citizen account to explore, report discrepancies, and engage in the feed."
        },
        {
            "role": "reviewer",
            "username": "reviewer_priya",
            "password": "Password123!",
            "label": "Priya Verma (Public Works Reviewer)",
            "description": "Authorized reviewer in Municipal Roads & Infrastructure Department."
        },
        {
            "role": "admin",
            "username": "admin_civic",
            "password": "Password123!",
            "label": "Admin User (Civic Administrator)",
            "description": "System administrator with role management, jurisdiction settings, and audit logs."
        }
    ]

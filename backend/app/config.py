import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv("SECRET_KEY", "civiclens-super-secret-production-grade-key-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/civiclens.db")

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", BASE_DIR / "app" / "uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

# Roles
ROLE_CITIZEN = "citizen"
ROLE_REVIEWER = "reviewer"
ROLE_ADMIN = "admin"

ALL_ROLES = [ROLE_CITIZEN, ROLE_REVIEWER, ROLE_ADMIN]

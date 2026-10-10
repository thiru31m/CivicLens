from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.config import UPLOAD_DIR
from backend.app.database import engine, Base, SessionLocal
from backend.app.models import Project
from backend.app.seed import seed_database
from backend.app.routers import (
    auth, projects, reports, feed, review, admin, notifications
)

# Initialize database schema
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CivicLens API",
    description="Public Works Transparency and Community Verification Platform",
    version="1.0.0",
)

# Enable CORS for frontend development and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory for static evidence viewing
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Include Routers
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(reports.router)
app.include_router(feed.router)
app.include_router(review.router)
app.include_router(admin.router)
app.include_router(notifications.router)


@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        project_count = db.query(Project).count()
        if project_count == 0:
            print("No existing projects found in database. Automatically initializing seed dataset...")
            seed_database()
        else:
            print(f"Database already populated with {project_count} projects.")
    except Exception as e:
        print(f"Startup check failed: {e}")
    finally:
        db.close()


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "CivicLens Public Works Platform",
        "version": "1.0.0"
    }

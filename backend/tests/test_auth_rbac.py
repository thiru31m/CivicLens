import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import SessionLocal
from backend.app.models import User

client = TestClient(app)


def test_user_registration_enforces_citizen_role():
    # Attempt to spoof reviewer role during registration
    res = client.post("/api/auth/register", json={
        "username": "spoof_user_1",
        "email": "spoof1@example.com",
        "full_name": "Spoof Tester",
        "password": "Password123!",
        "role": "reviewer"  # Maliciously attempt to grant reviewer
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    # Role must strictly remain 'citizen'
    assert data["user"]["role"] == "citizen"


def test_login_flow():
    res = client.post("/api/auth/login", json={
        "username": "citizen_rahul",
        "password": "Password123!"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["role"] == "citizen"
    assert "access_token" in data


def test_role_based_access_control():
    # 1. Citizen token attempting reviewer endpoint -> 403
    citizen_login = client.post("/api/auth/login", json={
        "username": "citizen_rahul",
        "password": "Password123!"
    }).json()
    citizen_token = citizen_login["access_token"]

    res_forbidden = client.get(
        "/api/review/reports",
        headers={"Authorization": f"Bearer {citizen_token}"}
    )
    assert res_forbidden.status_code == 403

    # 2. Reviewer token accessing reviewer endpoint -> 200
    rev_login = client.post("/api/auth/login", json={
        "username": "reviewer_priya",
        "password": "Password123!"
    }).json()
    rev_token = rev_login["access_token"]

    res_allowed = client.get(
        "/api/review/reports",
        headers={"Authorization": f"Bearer {rev_token}"}
    )
    assert res_allowed.status_code == 200

    # 3. Reviewer attempting admin endpoint -> 403
    res_admin_forbidden = client.get(
        "/api/admin/users",
        headers={"Authorization": f"Bearer {rev_token}"}
    )
    assert res_admin_forbidden.status_code == 403

    # 4. Admin accessing admin endpoint -> 200
    admin_login = client.post("/api/auth/login", json={
        "username": "admin_civic",
        "password": "Password123!"
    }).json()
    admin_token = admin_login["access_token"]

    res_admin_allowed = client.get(
        "/api/admin/users",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_admin_allowed.status_code == 200

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_search_projects_by_keyword():
    res = client.get("/api/projects?q=Vandalur")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    assert "Vandalur" in data[0]["title"] or "Vandalur" in data[0]["location_name"]


def test_filter_projects_by_category():
    res = client.get("/api/projects?category_id=1")
    assert res.status_code == 200
    data = res.json()
    for p in data:
        assert p["category_id"] == 1


def test_filter_projects_by_status():
    res = client.get("/api/projects?status=Completed")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    for p in data:
        assert p["status"] == "Completed"


def test_proximity_search_by_coordinates():
    # Vandalur coords: 12.8624, 80.1192
    res = client.get("/api/projects?lat=12.8624&lng=80.1192&radius_km=5.0")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    assert data[0]["project_code"] == "PRJ-2026-001"


def test_project_update_preserves_history():
    rev_login = client.post("/api/auth/login", json={
        "username": "reviewer_priya",
        "password": "Password123!"
    }).json()
    token = rev_login["access_token"]

    # Update PRJ-2026-002
    res = client.patch(
        "/api/projects/2",
        json={
            "status": "Ongoing",
            "budget": 12500000.0,
            "explanation": "Budget revised by 1.3M to accommodate additional pier foundation seismic grouting."
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    updated = res.json()
    assert updated["budget"] == 12500000.0
    # Must have an update history entry
    assert len(updated["update_history"]) >= 1
    assert "seismic grouting" in updated["update_history"][0]["explanation"]

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_complete_review_lifecycle_and_notification():
    # 1. Citizen submits report
    citizen_login = client.post("/api/auth/login", json={
        "username": "citizen_rahul",
        "password": "Password123!"
    }).json()
    citizen_token = citizen_login["access_token"]

    submit_res = client.post(
        "/api/reports",
        data={
            "title": "Unmarked culvert construction near Kelambakkam Bypass",
            "description": "Concrete pipes unloaded on road shoulder and excavation started without signage.",
            "category_id": 1,
            "location_name": "Kelambakkam Bypass Road",
            "latitude": 12.8425,
            "longitude": 80.1495,
            "observed_date": "2026-04-10"
        },
        headers={"Authorization": f"Bearer {citizen_token}"}
    )
    assert submit_res.status_code == 200
    report = submit_res.json()
    report_id = report["id"]
    case_id = report["case_id"]
    assert report["status"] == "Awaiting Review"

    # 2. Reviewer moves to Under Review
    rev_login = client.post("/api/auth/login", json={
        "username": "reviewer_priya",
        "password": "Password123!"
    }).json()
    rev_token = rev_login["access_token"]

    res_under_review = client.post(
        f"/api/review/reports/{report_id}/transition",
        json={
            "action": "under_review",
            "explanation": "Field surveyor assigned to cross-check project register."
        },
        headers={"Authorization": f"Bearer {rev_token}"}
    )
    assert res_under_review.status_code == 200
    assert res_under_review.json()["status"] == "Under Review"

    # 3. Reviewer requests more information
    res_req_info = client.post(
        f"/api/review/reports/{report_id}/transition",
        json={
            "action": "request_info",
            "explanation": "Please specify whether work is on the north or south side of the bypass."
        },
        headers={"Authorization": f"Bearer {rev_token}"}
    )
    assert res_req_info.status_code == 200
    assert res_req_info.json()["status"] == "More Information Requested"

    # 4. Citizen responds with clarification
    res_citizen_reply = client.post(
        f"/api/reports/{report_id}/respond",
        data={
            "response_text": "The work is on the south side near the electrical transformer."
        },
        headers={"Authorization": f"Bearer {citizen_token}"}
    )
    assert res_citizen_reply.status_code == 200
    assert res_citizen_reply.json()["status"] == "Under Review"

    # 5. Reviewer verifies and links to Project 1
    res_link = client.post(
        f"/api/review/reports/{report_id}/link-project",
        json={
            "project_id": 1,
            "explanation": "Confirmed as auxiliary culvert extension of PRJ-2026-001 widening project."
        },
        headers={"Authorization": f"Bearer {rev_token}"}
    )
    assert res_link.status_code == 200
    linked_report = res_link.json()
    assert linked_report["status"] == "Linked to Existing Project"
    assert linked_report["linked_project_id"] == 1

    # 6. Verify citizen received notification
    notifs_res = client.get(
        "/api/notifications",
        headers={"Authorization": f"Bearer {citizen_token}"}
    )
    assert notifs_res.status_code == 200
    user_notifs = notifs_res.json()
    assert len(user_notifs) >= 1
    assert any(case_id in n["title"] or case_id in n["message"] for n in user_notifs)


def test_close_and_reopen_workflow():
    rev_login = client.post("/api/auth/login", json={
        "username": "reviewer_priya",
        "password": "Password123!"
    }).json()
    token = rev_login["access_token"]

    # Close report 5
    res_close = client.post(
        "/api/review/reports/5/transition",
        json={
            "action": "close",
            "explanation": "Inspected on-site; issue resolved by municipal maintenance team."
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_close.status_code == 200
    assert res_close.json()["status"] == "Closed — Outcome Explained"

    # Reopen report 5
    res_reopen = client.post(
        "/api/review/reports/5/transition",
        json={
            "action": "reopen",
            "explanation": "Citizen provided new evidence showing persistent leakage at night."
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_reopen.status_code == 200
    assert res_reopen.json()["status"] == "Under Review"

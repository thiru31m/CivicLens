import io
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_submit_report_validation():
    citizen_login = client.post("/api/auth/login", json={
        "username": "citizen_rahul",
        "password": "Password123!"
    }).json()
    token = citizen_login["access_token"]

    # Missing description or too short -> 422
    res_bad = client.post(
        "/api/reports",
        data={
            "title": "Road digging",
            "description": "Short",  # < 10 chars
            "category_id": 1,
            "location_name": "Main Street"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_bad.status_code == 422

    # Valid report submission
    res_valid = client.post(
        "/api/reports",
        data={
            "title": "Fresh asphalt trench left unpaved on Gandhi Road",
            "description": "Workers dug up a 50m strip for electric line and covered with loose gravel only.",
            "category_id": 1,
            "location_name": "Gandhi Road Tambaram",
            "latitude": 12.9249,
            "longitude": 80.1265,
            "observed_date": "2026-04-10"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_valid.status_code == 200
    report = res_valid.json()
    assert report["case_id"].startswith("REP-")
    assert report["status"] == "Awaiting Review"
    assert report["reporter_alias"] == "Citizen_RahulS"


def test_file_upload_restriction():
    citizen_login = client.post("/api/auth/login", json={
        "username": "citizen_rahul",
        "password": "Password123!"
    }).json()
    token = citizen_login["access_token"]

    # Upload invalid file type (.exe)
    fake_exe = io.BytesIO(b"MZ executable content")
    res_exe = client.post(
        "/api/reports",
        data={
            "title": "Testing invalid file upload restriction",
            "description": "Executable file should be strictly rejected by validation.",
            "category_id": 1,
            "location_name": "Test Location"
        },
        files={"file": ("malicious.exe", fake_exe, "application/x-msdownload")},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_exe.status_code == 400
    assert "Unsupported file format" in res_exe.json()["detail"]


def test_unique_like_constraint():
    citizen_login = client.post("/api/auth/login", json={
        "username": "citizen_rahul",
        "password": "Password123!"
    }).json()
    token = citizen_login["access_token"]

    # Toggle like on report 2
    res1 = client.post(
        "/api/feed/2/like",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res1.status_code == 200
    state1 = res1.json()

    # Toggle like again -> removes support (no duplicate like in DB)
    res2 = client.post(
        "/api/feed/2/like",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res2.status_code == 200
    state2 = res2.json()
    assert state2["liked"] != state1["liked"]


def test_comment_creation_and_feed():
    citizen_login = client.post("/api/auth/login", json={
        "username": "citizen_anita",
        "password": "Password123!"
    }).json()
    token = citizen_login["access_token"]

    res_comment = client.post(
        "/api/feed/1/comments",
        json={"content": "I passed by today and the contractor has indeed placed safety flags."},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_comment.status_code == 200
    comment = res_comment.json()
    assert comment["author_alias"] == "Citizen_AnitaD"
    assert "safety flags" in comment["content"]

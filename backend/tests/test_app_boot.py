from fastapi.testclient import TestClient

from main import app


def test_health_reports_drug_count_without_database():
    with TestClient(app) as client:
        res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["drug_count"] > 800


def test_korean_drug_search_resolves_ingredient():
    with TestClient(app) as client:
        res = client.get("/api/drugs/search", params={"q": "멜록시캄", "limit": 3})
    assert res.status_code == 200
    ids = [d["id"] for d in res.json()["results"]]
    assert "meloxicam" in ids


def test_no_default_admin_credentials():
    with TestClient(app) as client:
        res = client.post("/api/auth/login", json={"username": "admin", "password": "admin"})
    assert res.status_code in (401, 503)

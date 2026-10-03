import os
import subprocess
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from claims.knowledge import resolve_drug
from main import app

BACKEND = Path(__file__).resolve().parents[1]


def test_health_reports_drug_count_without_database():
    with TestClient(app) as client:
        res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["drug_count"] > 800


@pytest.mark.parametrize("method,path", [
    ("get", "/api/drugs/search?q=meloxicam"),
    ("get", "/api/drugs/ketoconazole_systemic"),
    ("get", "/api/drugs?limit=200"),
    ("get", "/api/breeds"),
    ("get", "/api/conditions"),
    ("post", "/api/ocr/extract-patient"),
    ("post", "/api/format/mechanism"),
    ("post", "/api/admin/drugs/reload"),
])
def test_legacy_drug_endpoints_are_not_served(method, path):
    """The legacy DUR routers served compendium-derived records and text; nothing in the frontend calls them."""
    with TestClient(app) as client:
        res = getattr(client, method)(path)
    assert res.status_code == 404


def test_korean_drug_name_still_resolves_for_claims():
    assert resolve_drug("멜록시캄")[0] == "meloxicam"


def test_no_default_admin_credentials():
    with TestClient(app) as client:
        res = client.post("/api/auth/login", json={"username": "admin", "password": "admin"})
    assert res.status_code in (401, 503)


@pytest.mark.parametrize("username", ["admin", "ADMIN", " root ", "system"])
def test_signup_rejects_reserved_usernames(username):
    with TestClient(app) as client:
        res = client.post("/api/auth/signup", json={"username": username, "password": "xxxxxxxx"})
    assert res.status_code == 400
    assert res.json()["detail"] == "Username not allowed"


def test_init_db_replaces_legacy_default_admin_password(monkeypatch):
    import bcrypt

    import auth

    executed = []

    class Cursor:
        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

        def execute(self, sql, params=None):
            executed.append((" ".join(sql.split()), params))

        def fetchone(self):
            return ("admin-id", bcrypt.hashpw(b"admin", bcrypt.gensalt(4)).decode())

    class Conn:
        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

        def cursor(self):
            return Cursor()

    monkeypatch.setattr(auth, "_configured_db_url", lambda: "postgresql://fake")
    monkeypatch.setattr(auth.psycopg2, "connect", lambda url: Conn())
    monkeypatch.delenv("NUVOVET_ADMIN_PASSWORD", raising=False)
    auth.init_db()

    updates = [p for sql, p in executed if sql.startswith("UPDATE accounts SET password_hash")]
    assert len(updates) == 1
    new_hash, account_id = updates[0]
    assert account_id == "admin-id"
    assert not bcrypt.checkpw(b"admin", new_hash.encode())


def test_production_refuses_to_start_without_cors_origins():
    env = {k: v for k, v in os.environ.items() if not k.startswith(("NUVOVET_", "DB_", "DATABASE_URL"))}
    env.update(NUVOVET_ENV="production", NUVOVET_SECRET_KEY="x" * 48)
    proc = subprocess.run([sys.executable, "-c", "import main"], cwd=BACKEND, env=env, capture_output=True, text=True)
    assert proc.returncode != 0
    assert "NUVOVET_CORS_ORIGINS must be set" in proc.stderr

    env["NUVOVET_CORS_ORIGINS"] = "https://app.example"
    proc = subprocess.run([sys.executable, "-c", "import main"], cwd=BACKEND, env=env, capture_output=True, text=True)
    assert proc.returncode == 0, proc.stderr[-500:]

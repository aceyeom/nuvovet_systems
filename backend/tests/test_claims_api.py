from fastapi.testclient import TestClient

from main import app

CLAIM = {
    "claim_id": "T-1", "visit_date": "2026-09-01",
    "clinic": {"clinic_id": "H1", "region": "서울"},
    "patient": {"patient_id": "P1", "species": "cat", "weight_kg": 4.0},
    "diagnoses": ["방광염"],
    "line_items": [{"description": "초진료", "unit_price": 11000}, {"description": "요검사", "unit_price": 20000},
                   {"description": "고양이 모래", "unit_price": 15000}],
    "prescriptions": [{"drug": "타이레놀", "dose_mg_per_kg": 10}],
}


def test_adjudicate_endpoint_defaults_policy():
    with TestClient(app) as c:
        r = c.post("/api/claims/adjudicate", json={"claim": CLAIM})
    assert r.status_code == 200
    body = r.json()
    assert body["decision"] == "review"
    assert body["payable"]["ineligible"] == 15000


def test_precheck_reports_issues_for_clinic():
    with TestClient(app) as c:
        r = c.post("/api/claims/precheck", json=CLAIM)
    body = r.json()
    assert body["ready_to_submit"] is False
    assert any(i["rule"] == "clinical.species.cat_acetaminophen" for i in body["issues"])
    # Cat litter is mapped but not covered: the clinic should split it off before the owner files.
    assert body["blocking_count"] >= 2


def test_precheck_clean_claim_is_ready():
    clean = {**CLAIM, "line_items": CLAIM["line_items"][:2], "prescriptions": []}
    with TestClient(app) as c:
        body = c.post("/api/claims/precheck", json=clean).json()
    assert body["ready_to_submit"] is True


def test_demo_batch_is_labelled_synthetic():
    with TestClient(app) as c:
        r = c.get("/api/claims/demo", params={"n": 120, "limit": 10})
    body = r.json()
    assert body["synthetic"] is True
    assert body["summary"]["claims"] >= 120
    assert len(body["claims"]) == 10


def test_extract_without_credentials_returns_503(monkeypatch):
    for var in ("ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN"):
        monkeypatch.delenv(var, raising=False)
    with TestClient(app) as c:
        r = c.post("/api/claims/extract", files={"image": ("a.png", b"\x89PNG", "image/png")})
    assert r.status_code in (503,)


def test_extract_rejects_unsupported_type():
    with TestClient(app) as c:
        r = c.post("/api/claims/extract", files={"image": ("a.pdf", b"%PDF", "application/pdf")})
    assert r.status_code == 415

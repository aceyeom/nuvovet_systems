"""Input bounds, request-size limits and rate limits on the public claims API."""

import copy
import json

import pytest
from fastapi.testclient import TestClient

import routers.claims as claims_router
from main import MAX_BODY_BYTES, app
from routers.claims import MAX_UPLOAD_BYTES, RateLimiter

CLAIM = {
    "claim_id": "T-1", "visit_date": "2026-09-01",
    "clinic": {"clinic_id": "H1", "region": "서울"},
    "patient": {"patient_id": "P1", "species": "dog", "weight_kg": 4.0},
    "diagnoses": ["외이염"],
    "line_items": [{"description": "진찰료", "unit_price": 10000}],
    "prescriptions": [{"drug": "멜록시캄", "dose_mg_per_kg": 0.1}],
}


@pytest.fixture(scope="module")
def client():
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


def _post_raw(client, body: str):
    return client.post("/api/claims/adjudicate", content=body, headers={"content-type": "application/json"})


def _with(path, value):
    claim = copy.deepcopy(CLAIM)
    target = claim
    for key in path[:-1]:
        target = target[key]
    target[path[-1]] = value
    return claim


@pytest.mark.parametrize("literal", ["Infinity", "-Infinity", "NaN", "1e308"])
def test_non_finite_or_huge_quantity_is_rejected(client, literal):
    body = json.dumps({"claim": CLAIM}).replace('"unit_price": 10000', f'"unit_price": 10000, "quantity": {literal}')
    res = _post_raw(client, body)
    assert res.status_code == 422, res.text[:200]


@pytest.mark.parametrize("literal", ["NaN", "Infinity", "0", "-5", "1000"])
def test_implausible_weight_is_rejected(client, literal):
    body = json.dumps({"claim": CLAIM}).replace('"weight_kg": 4.0', f'"weight_kg": {literal}')
    res = _post_raw(client, body)
    assert res.status_code == 422, res.text[:200]


@pytest.mark.parametrize("path,value", [
    (("line_items", 0, "unit_price"), 10**30),
    (("line_items", 0, "quantity"), -1),
    (("line_items", 0, "description"), "가" * 501),
    (("prescriptions", 0, "drug"), "아포퀠" * 200),
    (("prescriptions", 0, "dose_mg_per_kg"), -0.5),
    (("prescriptions", 0, "days"), 10_000),
    (("diagnoses",), ["외이염 " * 200]),
    (("line_items",), [{"description": f"혈액검사 {i}", "unit_price": 30000} for i in range(501)]),
    (("diagnoses",), ["외이염"] * 51),
])
def test_out_of_bounds_claim_fields_are_rejected(client, path, value):
    res = client.post("/api/claims/adjudicate", json={"claim": _with(path, value)})
    assert res.status_code == 422


def test_history_is_capped(client):
    history = [dict(CLAIM, claim_id=f"H{i}", line_items=[]) for i in range(101)]
    res = client.post("/api/claims/adjudicate", json={"claim": CLAIM, "history": history})
    assert res.status_code == 422
    res = client.post("/api/claims/adjudicate", json={"claim": CLAIM, "history": history[:5]})
    assert res.status_code == 200


def test_bounded_claim_still_adjudicates(client):
    res = client.post("/api/claims/adjudicate", json={"claim": CLAIM})
    assert res.status_code == 200


def test_oversized_json_body_is_rejected_on_declared_length(client):
    body = json.dumps({"claim": CLAIM, "pad": "x" * (MAX_BODY_BYTES + 1)})
    res = _post_raw(client, body)
    assert res.status_code == 413


def test_oversized_streamed_body_is_rejected_without_declared_length(client):
    chunk = b" " * 65536

    def stream():
        for _ in range(MAX_BODY_BYTES // len(chunk) + 2):
            yield chunk

    res = client.post("/api/claims/adjudicate", content=stream(), headers={"content-type": "application/json"})
    assert res.status_code == 413


def test_oversized_upload_is_rejected_before_parsing(client, monkeypatch):
    def fail(*args, **kwargs):  # the endpoint must never see the body
        raise AssertionError("extract_document called for an oversized upload")

    monkeypatch.setattr(claims_router, "extract_document", fail)
    payload = b"\x89PNG" + b"0" * (MAX_UPLOAD_BYTES + 128 * 1024)
    res = client.post("/api/claims/extract", files={"image": ("a.png", payload, "image/png")})
    assert res.status_code == 413


def test_extract_is_rate_limited(client, monkeypatch):
    for var in ("ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN"):
        monkeypatch.delenv(var, raising=False)
    monkeypatch.setattr(claims_router, "extract_limiter", RateLimiter(2, 60, 100, 3600))
    codes = [client.post("/api/claims/extract", files={"image": ("a.png", b"\x89PNG", "image/png")}).status_code
             for _ in range(3)]
    assert codes == [503, 503, 429]


def test_rate_limiter_total_cap_and_window():
    rl = RateLimiter(per_client=2, per_client_window_s=60, total=3, total_window_s=3600)
    assert rl.hit("a", now=0) is None and rl.hit("a", now=1) is None
    assert rl.hit("a", now=2) is not None  # per-client limit
    assert rl.hit("b", now=3) is None
    assert rl.hit("c", now=4) is not None  # total cap, whoever asks
    assert rl.hit("a", now=61) is not None  # client window has room again, total still full
    assert rl.hit("c", now=3601) is None  # total window rolled over


def test_demo_ignores_caller_supplied_batch_size_and_seed(client):
    a = client.get("/api/claims/demo", params={"limit": 1}).json()
    b = client.get("/api/claims/demo", params={"limit": 1, "n": 1000, "seed": 99}).json()
    assert a["summary"] == b["summary"]
    assert a["claims"] == b["claims"]
    ev = client.get("/api/claims/evaluation", params={"n": 2000, "seed": 99}).json()
    assert ev["synthetic"] is True


@pytest.mark.parametrize("policy", [
    {"policy_id": "X", "start_date": "9999-12-31"},
    {"policy_id": "X", "start_date": "2020-01-01", "illness_waiting_days": 10**12},
    {"policy_id": "X", "start_date": "2020-01-01", "waiting_periods": {"illness": 10**9}},
    {"policy_id": "X", "start_date": "2020-01-01", "waiting_periods": {"groups": {"patella_hip": 10**9}}},
])
def test_policy_values_that_overflow_date_arithmetic_are_rejected(client, policy):
    res = client.post("/api/claims/adjudicate", json={"claim": CLAIM, "policy": policy})
    assert res.status_code == 422


def test_boundary_dates_adjudicate_without_server_error(client):
    claim = _with(("visit_date",), "2100-12-31")
    policy = {"policy_id": "X", "start_date": "2100-12-31", "waiting_periods": {"illness": 3650, "groups": {"patella_hip": 3650}}}
    history = [dict(CLAIM, claim_id="H", visit_date="1990-01-01")]
    res = client.post("/api/claims/adjudicate", json={"claim": claim, "policy": policy, "history": history})
    assert res.status_code == 200

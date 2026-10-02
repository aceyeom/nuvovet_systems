"""
Claims endpoints — standardization and adjudication for pet-insurance claims (schema v2).

  POST /api/claims/adjudicate   claim (+ policy, history) → decision, pend reasons, SIU flags, line decisions, documents
  POST /api/claims/precheck     clinic-side clean-claim check before submission (?insurer_id=kb selects a profile)
  POST /api/claims/extract      receipt image → claim draft (LLM transcription; rate-limited, ≤ 10 MB)
  GET  /api/claims/demo         labelled synthetic batch, adjudicated, with summary (fixed n=300, seed=7)
  GET  /api/claims/demo/{id}    one synthetic claim with its adjudication
  GET  /api/claims/evaluation   engine recall / false-alarm / pend rates on the same synthetic batch
  GET  /api/claims/insurers     insurer intake profiles (documents, thresholds, sources; verified: false)
  GET  /api/claims/codes        procedure and diagnosis codebooks

v1 request bodies are accepted unchanged; responses only gain fields.
"""

from __future__ import annotations

import logging
import os
import threading
import time
from collections import deque
from datetime import date
from functools import lru_cache
from typing import Any, Deque, Dict, List, Optional

from fastapi import APIRouter, File, HTTPException, Query, Request, UploadFile
from pydantic import BaseModel, Field

from claims.codebook import diagnosis_book, procedure_book
from claims.engine import adjudicate, insurer_profile, insurer_profiles, insurer_profiles_book
from claims.extract import ExtractionUnavailable, extract_document
from claims.models import Adjudication, Claim, Policy
from claims.synthetic import evaluate, generate

logger = logging.getLogger("nuvovet")
router = APIRouter(prefix="/api/claims", tags=["claims"])

CLINIC_FACING_CATEGORIES = {"data", "clinical", "pricing", "coverage", "documents"}
NOT_CLINIC_ISSUES = {"coverage.policy_terms_check", "data.line_routed_to_drug"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
EXTRACT_PATH = "/api/claims/extract"  # main.py gives this path a larger request-body limit
DEMO_N, DEMO_SEED = 300, 7  # the one synthetic batch served; other sizes/seeds cost seconds of CPU per request
MAX_HISTORY_CLAIMS = 100

# Pend reasons the clinic can fix, phrased as the clinic action.
CLINIC_ACTION_KO = {
    "RECEIPT_NOT_ITEMIZED": "영수증을 항목별로 발급해 주세요",
    "MIXED_BASKET_UNSPLIT": "진료비와 비의료 항목(사료·미용·호텔)을 나눠 발급해 주세요",
    "MISSING_DX": "진단명을 기재해 주세요",
    "DX_UNMAPPED": "표준 진단명으로 기재해 주세요",
    "NEED_DX_CERT": "진단서가 필요합니다",
    "IMAGING_NO_TIMESTAMP": "영상 자료에 촬영 일시가 보이도록 발급해 주세요",
}


class AdjudicateRequest(BaseModel):
    claim: Claim
    policy: Optional[Policy] = None
    history: List[Claim] = Field(default_factory=list, max_length=MAX_HISTORY_CLAIMS)


def _default_policy(claim: Claim, insurer_id: Optional[str] = None) -> Policy:
    """A standard post-2025.5 product (70% / ₩30,000) with no waiting-period effect."""
    return Policy(policy_id="STANDARD", start_date=date(2000, 1, 1), coverage_ratio=0.7,
                  deductible_per_visit=30_000, per_visit_limit=None, insurer_id=insurer_id)


@router.post("/adjudicate", response_model=Adjudication)
def adjudicate_claim(req: AdjudicateRequest):
    return adjudicate(req.claim, req.policy or _default_policy(req.claim), req.history)


def _clinic_action_title(code: str, result: Adjudication) -> str:
    if code == "NEED_DX_CERT":
        doc = next((d for d in result.required_documents if d.pend_code == "NEED_DX_CERT"), None)
        if doc:
            return doc.why_ko.split(" — ")[0]
    return CLINIC_ACTION_KO.get(code, code)


@router.post("/precheck")
def precheck_claim(claim: Claim, insurer_id: Optional[str] = Query(None, description="Insurer profile id (kb, samsung, meritz, …)")):
    """What a clinic should fix before sending: items insurers won't pay, missing or unmapped data, documents to issue."""
    result = adjudicate(claim, _default_policy(claim, insurer_id), mode="precheck")
    clinic_pends = [p for p in result.pend_reasons if p.actor == "clinic"]
    owner_pends = [p for p in result.pend_reasons if p.actor == "owner"]
    pend_codes = {p.code for p in clinic_pends}

    # Non-medical / non-covered products mixed into the invoice: better split onto a separate receipt.
    split_lines = {result.lines[d.line_index].description for d in result.line_decisions
                   if d.source == "line" and (d.reason_code == "non_medical" or d.reason_code.startswith("noncovered_product"))}
    findings = [f for f in result.findings if f.category in CLINIC_FACING_CATEGORIES and f.rule not in NOT_CLINIC_ISSUES
                and not (f.rule == "data.unmapped_diagnosis" and "DX_UNMAPPED" in pend_codes)]

    def is_blocking(f) -> bool:
        if f.rule == "coverage.line_ineligible":
            return any(f.title.endswith(desc) for desc in split_lines)
        if f.category == "documents":
            return False
        return f.severity.value != "info" or f.category == "data"

    actions = [{"rule": f"pend.{p.code}", "category": "documents", "severity": "warning",
                "title": _clinic_action_title(p.code, result), "detail": p.detail_ko, "item_ref": None,
                "amount_at_risk": 0, "evidence": [], "requests": p.requests} for p in clinic_pends]
    issues = actions + [f.model_dump() for f in findings]
    blocking = len(actions) + sum(1 for f in findings if is_blocking(f))
    return {
        "claim_id": claim.claim_id,
        "ready_to_submit": blocking == 0,
        "blocking_count": blocking,
        "decision": result.decision,
        "standardized": {"diagnoses": result.diagnoses, "lines": result.lines, "drugs": result.drugs},
        "issues": issues,
        "pend_reasons": result.pend_reasons,
        "clinic_actions": actions,
        "owner_guidance": [{"code": p.code, "detail": p.detail_ko, "requests": p.requests} for p in owner_pends],
        "documents_to_issue": [d for d in result.required_documents if d.actor == "clinic"],
        "required_documents": result.required_documents,
        "line_decisions": result.line_decisions,
        "insurer_profile": result.insurer_profile,
        "estimated_payable": result.payable,
        "engine_version": result.engine_version,
    }


class RateLimiter:
    """Sliding-window limits for an endpoint that spends the server's model API key: per client address and in
    total. The total cap bounds the spend even when client addresses rotate. In-process only: with several
    workers each enforces its own window. Behind a reverse proxy, run uvicorn with --proxy-headers so the client
    address is the caller's, not the proxy's."""

    def __init__(self, per_client: int, per_client_window_s: float, total: int, total_window_s: float):
        self.per_client, self.per_client_window = per_client, per_client_window_s
        self.total, self.total_window = total, total_window_s
        self._clients: Dict[str, Deque[float]] = {}
        self._all: Deque[float] = deque()
        self._lock = threading.Lock()

    def hit(self, client: str, now: Optional[float] = None) -> Optional[int]:
        """Record one call; return None if allowed, else the seconds to wait."""
        now = time.monotonic() if now is None else now
        with self._lock:
            while self._all and now - self._all[0] >= self.total_window:
                self._all.popleft()
            calls = self._clients.setdefault(client, deque())
            while calls and now - calls[0] >= self.per_client_window:
                calls.popleft()
            if len(calls) >= self.per_client:
                return max(1, int(self.per_client_window - (now - calls[0])) + 1)
            if len(self._all) >= self.total:
                return max(1, int(self.total_window - (now - self._all[0])) + 1)
            calls.append(now)
            self._all.append(now)
            if len(self._clients) > 10_000:  # drop idle clients so the table cannot grow without bound
                for key in [k for k, v in self._clients.items() if not v]:
                    del self._clients[key]
            return None


extract_limiter = RateLimiter(
    per_client=int(os.getenv("NUVOVET_EXTRACT_PER_MINUTE") or 10), per_client_window_s=60,
    total=int(os.getenv("NUVOVET_EXTRACT_PER_HOUR") or 200), total_window_s=3600,
)


@router.post("/extract")
async def extract_claim(request: Request, image: UploadFile = File(...)):
    """Unauthenticated (the clinic page has no login), so it is bounded instead: main.py rejects bodies over
    10 MB before parsing, and calls are rate-limited per client and in total."""
    allowed = {"image/png", "image/jpeg", "image/webp", "image/gif"}
    if (image.content_type or "") not in allowed:
        raise HTTPException(status_code=415, detail=f"Unsupported file type. Allowed: {sorted(allowed)}")
    data = await image.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image larger than 10 MB")
    wait = extract_limiter.hit(request.client.host if request.client else "unknown")
    if wait is not None:
        raise HTTPException(status_code=429, detail="Too many receipt extractions; retry later",
                            headers={"Retry-After": str(wait)})
    try:
        doc = extract_document(data, image.content_type)
    except ExtractionUnavailable as exc:
        raise HTTPException(status_code=503, detail=f"Extraction unavailable: {exc}")
    return {"draft": doc, "note": "Transcription only — review before adjudication."}


@lru_cache(maxsize=4)
def _demo(n: int, seed: int):
    cases = generate(n=n, seed=seed)
    ev = evaluate(cases)
    return cases, ev


RISK_CATEGORIES = ("pricing", "integrity", "clinical")


def _summary(ev: dict) -> Dict[str, Any]:
    results = ev["_results"]
    n = len(results) or 1
    billed = sum(r.payable.billed for _, r in results)
    reimbursed = sum(r.payable.reimbursed for _, r in results)
    at_risk = sum(sum(f.amount_at_risk for f in r.findings if f.category in RISK_CATEGORIES) for _, r in results)
    by_clinic: Dict[str, Dict[str, Any]] = {}
    for case, r in results:
        c = case.claim.clinic
        row = by_clinic.setdefault(c.clinic_id, {"clinic_id": c.clinic_id, "name": c.name, "region": c.region,
                                                 "claims": 0, "billed": 0, "flagged": 0, "pended": 0, "siu": 0, "at_risk": 0})
        row["claims"] += 1
        row["billed"] += r.payable.billed
        row["flagged"] += int(r.decision.value in ("review", "deny_recommended"))
        row["pended"] += int(r.decision.value == "pend")
        row["siu"] += int(bool(r.siu_flags))
        row["at_risk"] += sum(f.amount_at_risk for f in r.findings if f.category in RISK_CATEGORIES)
    clinics = sorted(by_clinic.values(), key=lambda x: -x["at_risk"])
    return {
        "claims": len(results),
        "billed": billed,
        "reimbursed": reimbursed,
        "amount_flagged": at_risk,
        "decisions": ev["decisions"],
        "auto_approve_rate": round(ev["decisions"].get("auto_approve", 0) / n, 4),
        "pend_rate": round(ev["decisions"].get("pend", 0) / n, 4),
        "pend_reasons": ev.get("pend_reasons", {}),
        "siu_flags": ev.get("siu_flags", {}),
        "siu_claims": sum(1 for _, r in results if r.siu_flags),
        "rule_hits": ev["rule_hits"],
        "clinics": clinics,
    }


def _row(case, r: Adjudication) -> Dict[str, Any]:
    texts = case.claim.diagnosis_texts()
    actionable = [f for f in r.findings if f.severity.value != "info"]
    top = actionable[0].title if actionable else None  # pend-only rows: the console labels them from pend_codes
    return {
        "claim_id": r.claim_id,
        "visit_date": case.claim.visit_date,
        "clinic": case.claim.clinic.name,
        "region": case.claim.clinic.region,
        "species": case.claim.patient.species.value,
        "diagnosis": texts[0] if texts else "(진단명 없음)",
        "billed": r.payable.billed,
        "reimbursed": r.payable.reimbursed,
        "decision": r.decision.value,
        "top_finding": top,
        "finding_count": len(actionable),
        "pend_codes": [p.code for p in r.pend_reasons],
        "siu": [s.code for s in r.siu_flags],
        "insurer": r.insurer_profile.id if r.insurer_profile else None,
        "intake_channel": case.claim.intake_channel.value if case.claim.intake_channel else None,
        "labels": case.labels,
    }


DECISION_ORDER = {"deny_recommended": 0, "review": 1, "pend": 2, "auto_approve": 3}


def _sorted_rows(results) -> List[Dict[str, Any]]:
    rows = [_row(c, r) for c, r in results]
    rows.sort(key=lambda x: (x["decision"] == "auto_approve", -x["finding_count"], -len(x["pend_codes"]), -x["billed"]))
    return rows


@router.get("/demo")
def demo_batch(limit: int = Query(200, ge=0, le=1000)):
    _, ev = _demo(DEMO_N, DEMO_SEED)
    rows = _sorted_rows(ev["_results"])
    return {"synthetic": True, "summary": _summary(ev), "claims": rows[:limit]}


@router.get("/demo/{claim_id}")
def demo_claim(claim_id: str):
    _, ev = _demo(DEMO_N, DEMO_SEED)
    for case, r in ev["_results"]:
        if r.claim_id == claim_id:
            return {"synthetic": True, "claim": case.claim, "policy": case.policy, "labels": case.labels, "adjudication": r}
    raise HTTPException(status_code=404, detail="Claim not found in demo batch")


@router.get("/evaluation")
def evaluation():
    _, ev = _demo(DEMO_N, DEMO_SEED)
    return {"synthetic": True, **{k: v for k, v in ev.items() if k != "_results"}}


def insurer_profiles_payload() -> Dict[str, Any]:
    meta = insurer_profiles_book()["_meta"]
    return {"as_of": meta["as_of"], "version": meta["version"], "verified": False,
            "statutory": meta["statutory"], "profiles": insurer_profiles()}


@router.get("/insurers")
def insurers():
    return insurer_profiles_payload()


@router.get("/insurers/{insurer_id}")
def insurer(insurer_id: str):
    profile = insurer_profile(insurer_id)
    if profile["id"] != insurer_id.lower():
        raise HTTPException(status_code=404, detail="Unknown insurer profile")
    return profile


@router.get("/codes")
def codes():
    return {"procedures": procedure_book(), "diagnoses": diagnosis_book()}

"""
Claims endpoints — standardization and adjudication for pet-insurance claims.

  POST /api/claims/adjudicate   claim (+ policy, history) → decision with findings
  POST /api/claims/precheck     clinic-side clean-claim check before submission
  POST /api/claims/extract      receipt image → claim draft (LLM transcription)
  GET  /api/claims/demo         labelled synthetic batch, adjudicated, with summary
  GET  /api/claims/demo/{id}    one synthetic claim with its adjudication
  GET  /api/claims/evaluation   engine recall / false-alarm rates on synthetic data
  GET  /api/claims/codes        procedure and diagnosis codebooks
"""

from __future__ import annotations

import logging
from datetime import date
from functools import lru_cache
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from pydantic import BaseModel

from claims.codebook import diagnosis_book, procedure_book
from claims.engine import adjudicate
from claims.extract import ExtractionUnavailable, extract_document
from claims.models import Adjudication, Claim, Policy
from claims.synthetic import evaluate, generate

logger = logging.getLogger("nuvovet")
router = APIRouter(prefix="/api/claims", tags=["claims"])

CLINIC_FACING_CATEGORIES = {"data", "clinical", "pricing", "coverage"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024


class AdjudicateRequest(BaseModel):
    claim: Claim
    policy: Optional[Policy] = None
    history: List[Claim] = []


def _default_policy(claim: Claim) -> Policy:
    """A standard post-2025.5 product (70% / ₩30,000) with no waiting-period effect."""
    return Policy(policy_id="STANDARD", start_date=date(2000, 1, 1), coverage_ratio=0.7,
                  deductible_per_visit=30_000, per_visit_limit=None)


@router.post("/adjudicate", response_model=Adjudication)
def adjudicate_claim(req: AdjudicateRequest):
    return adjudicate(req.claim, req.policy or _default_policy(req.claim), req.history)


@router.post("/precheck")
def precheck_claim(claim: Claim):
    """What a clinic should fix before sending: unmapped items, missing data, items insurers won't pay."""
    result = adjudicate(claim, _default_policy(claim))
    clinic_findings = [f for f in result.findings if f.category in CLINIC_FACING_CATEGORIES
                       and f.rule not in ("coverage.policy_terms_check",)]
    # Items the clinic can fix before the owner files: anything above info, plus unmapped
    # data and non-covered items mixed into the invoice (better split onto a separate receipt).
    blocking = [f for f in clinic_findings
                if f.severity.value != "info" or f.category == "data" or f.rule == "coverage.line_ineligible"]
    return {
        "claim_id": claim.claim_id,
        "ready_to_submit": not blocking,
        "blocking_count": len(blocking),
        "standardized": {"diagnoses": result.diagnoses, "lines": result.lines, "drugs": result.drugs},
        "issues": clinic_findings,
        "estimated_payable": result.payable,
        "engine_version": result.engine_version,
    }


@router.post("/extract")
async def extract_claim(image: UploadFile = File(...)):
    allowed = {"image/png", "image/jpeg", "image/webp", "image/gif"}
    if (image.content_type or "") not in allowed:
        raise HTTPException(status_code=415, detail=f"Unsupported file type. Allowed: {sorted(allowed)}")
    data = await image.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image larger than 10 MB")
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


def _summary(ev: dict) -> Dict[str, Any]:
    results = ev["_results"]
    billed = sum(r.payable.billed for _, r in results)
    reimbursed = sum(r.payable.reimbursed for _, r in results)
    at_risk = sum(sum(f.amount_at_risk for f in r.findings if f.category in ("pricing", "integrity", "clinical")) for _, r in results)
    by_clinic: Dict[str, Dict[str, Any]] = {}
    for case, r in results:
        c = case.claim.clinic
        row = by_clinic.setdefault(c.clinic_id, {"clinic_id": c.clinic_id, "name": c.name, "region": c.region,
                                                 "claims": 0, "billed": 0, "flagged": 0, "at_risk": 0})
        row["claims"] += 1
        row["billed"] += r.payable.billed
        row["flagged"] += int(r.decision.value != "auto_approve")
        row["at_risk"] += sum(f.amount_at_risk for f in r.findings if f.category in ("pricing", "integrity", "clinical"))
    clinics = sorted(by_clinic.values(), key=lambda x: -x["at_risk"])
    return {
        "claims": len(results),
        "billed": billed,
        "reimbursed": reimbursed,
        "amount_flagged": at_risk,
        "decisions": ev["decisions"],
        "auto_approve_rate": round(ev["decisions"].get("auto_approve", 0) / len(results), 4),
        "rule_hits": ev["rule_hits"],
        "clinics": clinics,
    }


def _row(case, r: Adjudication) -> Dict[str, Any]:
    return {
        "claim_id": r.claim_id,
        "visit_date": case.claim.visit_date,
        "clinic": case.claim.clinic.name,
        "region": case.claim.clinic.region,
        "species": case.claim.patient.species.value,
        "diagnosis": case.claim.diagnoses[0],
        "billed": r.payable.billed,
        "reimbursed": r.payable.reimbursed,
        "decision": r.decision.value,
        "top_finding": r.findings[0].title if r.findings and r.findings[0].severity.value != "info" else None,
        "finding_count": sum(1 for f in r.findings if f.severity.value != "info"),
        "labels": case.labels,
    }


@router.get("/demo")
def demo_batch(n: int = Query(300, ge=20, le=1000), seed: int = 7, limit: int = Query(200, le=1000)):
    _, ev = _demo(n, seed)
    rows = [_row(c, r) for c, r in ev["_results"]]
    rows.sort(key=lambda x: (x["decision"] == "auto_approve", -x["finding_count"], -x["billed"]))
    return {"synthetic": True, "summary": _summary(ev), "claims": rows[:limit]}


@router.get("/demo/{claim_id}")
def demo_claim(claim_id: str, n: int = Query(300, ge=20, le=1000), seed: int = 7):
    _, ev = _demo(n, seed)
    for case, r in ev["_results"]:
        if r.claim_id == claim_id:
            return {"synthetic": True, "claim": case.claim, "policy": case.policy, "labels": case.labels, "adjudication": r}
    raise HTTPException(status_code=404, detail="Claim not found in demo batch")


@router.get("/evaluation")
def evaluation(n: int = Query(400, ge=50, le=2000), seed: int = 7):
    _, ev = _demo(n, seed)
    return {"synthetic": True, **{k: v for k, v in ev.items() if k != "_results"}}


@router.get("/codes")
def codes():
    return {"procedures": procedure_book(), "diagnoses": diagnosis_book()}

"""The landing page states figures and shows sample engine output; these tests keep both true.

  - frontend/src/data/landingStats.json (hero figures) must match what the repo computes now.
  - The four feature illustrations (frontend/src/pages/landing/features/*.jsx) show the engine's output for fixed
    sample claims; if the engine stops producing it, the illustration must change with it.

Regenerate the figures with `python scripts/export_claims_demo.py --stats-only` from backend/.
"""

import importlib.util
import json
from datetime import date
from pathlib import Path

from claims.engine import adjudicate
from claims.knowledge import resolve_drug_full
from claims.models import Claim, Clinic, LineItem, Patient, Policy, Prescription

BACKEND = Path(__file__).resolve().parents[1]
STATS = BACKEND.parent / "frontend" / "src" / "data" / "landingStats.json"


def _export_module():
    spec = importlib.util.spec_from_file_location("export_claims_demo", BACKEND / "scripts" / "export_claims_demo.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_landing_stats_match_current_data():
    stored = json.loads(STATS.read_text(encoding="utf-8"))
    current = _export_module().landing_stats(**stored["params"])
    hint = "stale landingStats.json: run python scripts/export_claims_demo.py --stats-only from backend/"
    assert stored["aliases"] == current["aliases"], hint
    pct = lambda s: 100 * s["findings"]["with_rule_and_explanation"] // max(1, s["findings"]["total"])  # noqa: E731
    assert pct(stored) == pct(current) == 100, hint


def _rules(result):
    return {f.rule: f for f in result.findings}


def test_explainable_review_example():
    claim = Claim(claim_id="C-3", visit_date=date(2026, 6, 1),
                  clinic=Clinic(clinic_id="H-4", region="서울", posted_prices={"CON-001": 9000}),
                  patient=Patient(patient_id="Z", species="dog", breed="포메라니안", weight_kg=3.0), diagnoses=["급성 위장염"],
                  line_items=[LineItem(description="초진료", unit_price=15000), LineItem(description="복부 초음파", unit_price=180000),
                              LineItem(description="수액처치", unit_price=60000), LineItem(description="사료", unit_price=30000)])
    r = adjudicate(claim, Policy(policy_id="P", start_date=date(2024, 1, 1)))
    assert r.decision.value == "review"
    assert [ln.code for ln in r.lines] == ["CON-001", "IMG-002", "TRT-001", "NON-003"]
    rules = _rules(r)
    outlier = rules["pricing.regional_outlier"]
    assert outlier.title.endswith("(P99)") and outlier.amount_at_risk == 68000 and "중앙값 ₩67,200" in outlier.detail
    assert rules["pricing.above_posted_fee"].amount_at_risk == 6000
    assert rules["coverage.line_ineligible"].amount_at_risk == 30000


def test_brand_name_and_dose_example():
    expected = {"아포퀠 3.6mg": ("oclacitinib", "curated"), "바이트릴 50mg 정": ("enrofloxacin", "curated"),
                "메타캄": ("meloxicam", "curated"), "넥스가드 스펙트라": ("afoxolaner", "qia")}
    for name, (drug_id, source) in expected.items():
        res = resolve_drug_full(name)
        assert (res.drug_id, res.source) == (drug_id, source), name
    nexgard = resolve_drug_full("넥스가드 스펙트라")
    assert set(nexgard.ingredients) == {"afoxolaner", "milbemycin_oxime"} and nexgard.licence_no == "동물용의약품-수입-128-109"

    claim = Claim(claim_id="C-2", visit_date=date(2026, 6, 1), clinic=Clinic(clinic_id="H-1", region="서울"),
                  patient=Patient(patient_id="B", species="dog", breed="비숑 프리제", weight_kg=6.0), diagnoses=["아토피 피부염"],
                  line_items=[LineItem(description="진찰료", unit_price=10000)],
                  prescriptions=[Prescription(drug="아포퀠 3.6mg", dose_mg_per_kg=0.5, unit_price=30000),
                                 Prescription(drug="메타캄", dose_mg_per_kg=1.0, unit_price=12000)])
    dose = _rules(adjudicate(claim, Policy(policy_id="P", start_date=date(2024, 1, 1))))["clinical.dose_above_reference"]
    assert dose.severity.value == "critical" and "멜록시캄 (통상 용량의 5.0배)" in dose.title


def test_undisclosed_chronic_condition_example():
    claim = Claim(claim_id="C-1", visit_date=date(2026, 6, 1), clinic=Clinic(clinic_id="H-1", region="서울"),
                  patient=Patient(patient_id="A", species="dog", breed="말티즈", weight_kg=4.0), diagnoses=["외이염"],
                  line_items=[LineItem(description="진찰료", unit_price=10000), LineItem(description="귀 도말검사", unit_price=15000),
                              LineItem(description="귀 세척", unit_price=15000)],
                  prescriptions=[Prescription(drug="베트메딘", dose_mg_per_kg=0.25, unit_price=24000)])
    r = adjudicate(claim, Policy(policy_id="P", start_date=date(2026, 3, 1)))
    rules = _rules(r)
    chronic = rules["clinical.undisclosed_chronic_condition"]
    assert chronic.title == "미신고 만성질환 신호: 피모벤단"
    assert "추정 질환: 이첨판 폐쇄부전증 (MMVD), 비대성 심근병증 (HCM)" in chronic.evidence
    assert "보험 개시 후 92일" in chronic.evidence
    assert "clinical.procedure_not_indicated" not in rules  # ear cytology and cleaning fit otitis externa
    assert [s.code for s in r.siu_flags] == ["UNDISCLOSED_CHRONIC"] and r.siu_flags[0].requests_record


def test_integrity_example():
    lines = [LineItem(description="재진료", unit_price=8000), LineItem(description="종합백신 DHPPL", unit_price=35000),
             LineItem(description="혈액검사(CBC)", unit_price=40000)]

    def cat_claim(claim_id, clinic_id, weight):
        return Claim(claim_id=claim_id, visit_date=date(2026, 6, 1), clinic=Clinic(clinic_id=clinic_id, region="경기"),
                     patient=Patient(patient_id="K", species="cat", breed="코리안 숏헤어", weight_kg=weight),
                     diagnoses=["방광염"], line_items=lines)

    r = adjudicate(cat_claim("C-9", "H-2", 14.5), Policy(policy_id="P", start_date=date(2025, 6, 1)), [cat_claim("C-8", "H-3", 4.5)])
    rules = _rules(r)
    assert rules["integrity.species_mismatch_item"].title == "종 불일치 항목: 개 종합백신 (DHPPL)"
    assert "14.5kg" in rules["integrity.weight_implausible"].detail
    assert "C-8" in rules["integrity.duplicate_claim"].detail and "100%" in rules["integrity.duplicate_claim"].detail
    assert "coverage.before_policy_start" not in rules
    assert r.decision.value == "deny_recommended"
    assert {s.code for s in r.siu_flags} == {"IDENTITY_MISMATCH", "DUPLICATE_ACROSS_CLAIMS"}

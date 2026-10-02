"""
Labelled synthetic claims for demos and engine evaluation.

Everything here is generated: clinics are named '샘플동물병원', prices are drawn
from the seed benchmarks, and anomalies are injected at known rates so recall
and false-positive rates can be measured. Synthetic results say nothing about
real-world performance; they test that the rules do what they claim to do.
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Dict, List, Optional, Tuple

from .codebook import procedures_by_code
from .benchmarks import region_multiplier
from .models import Claim, Clinic, LineItem, Patient, Policy, Prescription

REGIONS = ["서울"] * 5 + ["경기"] * 5 + ["인천", "부산", "부산", "대구", "광주", "대전", "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"]
DOG_BREEDS = [("말티즈", 2.5, 5), ("토이푸들", 2.5, 5), ("포메라니안", 2, 4), ("비숑 프리제", 4, 8), ("시츄", 4, 8), ("웰시코기", 10, 15), ("골든 리트리버", 25, 35), ("진돗개", 15, 22), ("셰틀랜드 쉽독", 6, 11), ("닥스훈트", 5, 10)]
CAT_BREEDS = [("코리안 숏헤어", 3, 6), ("페르시안", 3, 5.5), ("러시안 블루", 3, 5.5), ("스코티시 폴드", 3, 5.5), ("브리티시 숏헤어", 4, 7)]

# diagnosis text → (species, [(line description, code, qty range)], [(drug, mg/kg range, freq, days)], weight)
SCENARIOS: Dict[str, dict] = {
    "아토피 피부염": {"species": None, "w": 10, "lines": [("재진료", "CON-002", (1, 1)), ("피부 세포검사", "LAB-006", (1, 2)), ("귀 도말검사", "LAB-007", (0, 1))],
                  "rx": [("아포퀠", (0.4, 0.6), "BID", 14), ("세파렉신", (15, 22), "BID", 14)]},
    "외이염": {"species": None, "w": 12, "lines": [("초진료", "CON-001", (1, 1)), ("귀 도말검사", "LAB-007", (1, 1)), ("귀 세척", "TRT-005", (1, 1)), ("귀약(외용제)", "RX-002", (1, 1))],
            "rx": []},
    "급성 위장염": {"species": None, "w": 14, "lines": [("초진료", "CON-001", (1, 1)), ("혈액검사(CBC)", "LAB-001", (1, 1)), ("혈청화학검사", "LAB-002", (1, 1)), ("복부 방사선", "IMG-001", (2, 2)), ("정맥 수액 처치", "TRT-001", (1, 1)), ("주사료", "TRT-003", (1, 2))],
               "rx": [("세레니아", (1, 1), "SID", 3), ("파모티딘", (0.5, 1), "BID", 5), ("메트로니다졸", (10, 15), "BID", 5)]},
    "췌장염": {"species": None, "w": 5, "lines": [("초진료", "CON-001", (1, 1)), ("cPL 키트검사", "LAB-009", (1, 1)), ("혈액검사(CBC)", "LAB-001", (1, 1)), ("혈청화학검사", "LAB-002", (1, 1)), ("복부초음파", "IMG-002", (1, 1)), ("입원비", "HOS-001", (2, 4)), ("정맥 수액 처치", "TRT-001", (2, 4))],
            "rx": [("세레니아", (1, 1), "SID", 4), ("부프레노르핀", (0.01, 0.02), "TID", 3)]},
    "슬개골 탈구": {"species": "dog", "w": 7, "lines": [("초진료", "CON-001", (1, 1)), ("방사선 촬영", "IMG-001", (2, 3)), ("혈액검사(CBC)", "LAB-001", (1, 1)), ("혈청화학검사", "LAB-002", (1, 1)), ("호흡마취", "ANE-001", (1, 1)), ("슬개골 탈구 정복술", "SUR-001", (1, 1)), ("입원비", "HOS-001", (2, 3))],
              "rx": [("메타캄", (0.1, 0.1), "SID", 7), ("세파렉신", (20, 22), "BID", 7), ("가바펜틴", (5, 10), "BID", 7)]},
    "이첨판 폐쇄부전증": {"species": "dog", "w": 6, "lines": [("재진료", "CON-002", (1, 1)), ("심장초음파", "IMG-003", (1, 1)), ("흉부 방사선", "IMG-001", (1, 2)), ("NT-proBNP", "LAB-014", (0, 1))],
                  "rx": [("베트메딘", (0.2, 0.3), "BID", 30), ("푸로세미드", (1, 2), "BID", 30)]},
    "고양이 하부요로계 질환": {"species": "cat", "w": 6, "lines": [("초진료", "CON-001", (1, 1)), ("요검사", "LAB-004", (1, 1)), ("복부 방사선", "IMG-001", (1, 2)), ("복부초음파", "IMG-002", (1, 1))],
                      "rx": [("가바펜틴", (5, 10), "BID", 7), ("부프레노르핀", (0.01, 0.02), "BID", 3)]},
    "세균성 방광염": {"species": "dog", "w": 5, "lines": [("초진료", "CON-001", (1, 1)), ("요검사", "LAB-004", (1, 1)), ("세균배양·감수성검사", "LAB-008", (0, 1))],
                "rx": [("클라바목스", (12.5, 13.75), "BID", 10)]},
    "만성 신장병": {"species": "cat", "w": 4, "lines": [("재진료", "CON-002", (1, 1)), ("혈청화학검사", "LAB-002", (1, 1)), ("요검사", "LAB-004", (1, 1)), ("피하 수액", "TRT-002", (1, 1)), ("혈압 측정", "TRT-009", (1, 1))],
               "rx": [("세레니아", (1, 1), "SID", 7)]},
    "결막염": {"species": None, "w": 5, "lines": [("초진료", "CON-001", (1, 1)), ("형광 염색검사", "TRT-007", (1, 1)), ("눈물량 검사", "TRT-008", (1, 1)), ("점안액", "RX-002", (1, 2))],
            "rx": []},
    "켄넬코프": {"species": "dog", "w": 5, "lines": [("초진료", "CON-001", (1, 1)), ("흉부 방사선", "IMG-001", (1, 2))],
              "rx": [("독시사이클린", (5, 5), "BID", 10)]},
    "위장관 이물": {"species": "dog", "w": 3, "lines": [("야간 응급 진찰", "CON-004", (1, 1)), ("방사선 촬영", "IMG-001", (2, 3)), ("복부초음파", "IMG-002", (1, 1)), ("혈액검사(CBC)", "LAB-001", (1, 1)), ("호흡마취", "ANE-001", (1, 1)), ("위장관 이물 제거술", "SUR-003", (1, 1)), ("입원비", "HOS-001", (2, 4)), ("정맥 수액 처치", "TRT-001", (2, 4))],
               "rx": [("세레니아", (1, 1), "SID", 3), ("클라바목스", (12.5, 13.75), "BID", 7)]},
    "예방접종": {"species": "dog", "w": 6, "lines": [("재진료", "CON-002", (1, 1)), ("DHPPL 종합백신", "PRE-003", (1, 1)), ("광견병 백신", "PRE-005", (0, 1))], "rx": []},
}

ANOMALIES = ["inflated_price", "unindicated_procedure", "undisclosed_chronic", "species_mismatch", "duplicate",
             "ineligible_items", "overdose", "waiting_period", "pre_policy"]

# anomaly → rule ids that count as detecting it
DETECTED_BY = {
    "inflated_price": ("pricing.regional_outlier", "pricing.above_posted_fee"),
    "unindicated_procedure": ("clinical.procedure_not_indicated",),
    "undisclosed_chronic": ("clinical.undisclosed_chronic_condition",),
    "species_mismatch": ("integrity.species_mismatch_item", "integrity.breed_species_mismatch", "integrity.species_mismatch_diagnosis"),
    "duplicate": ("integrity.duplicate_claim",),
    "ineligible_items": ("coverage.line_ineligible",),
    "overdose": ("clinical.dose_above_reference",),
    "waiting_period": ("coverage.diagnosis_excluded",),
    "pre_policy": ("coverage.before_policy_start",),
}


@dataclass
class SyntheticCase:
    claim: Claim
    policy: Policy
    labels: List[str] = field(default_factory=list)


def _clinics(rng: random.Random, n: int) -> List[Tuple[Clinic, float]]:
    out = []
    for i in range(n):
        region = rng.choice(REGIONS)
        high = i % 9 == 4  # a few systematically expensive clinics
        factor = rng.uniform(2.4, 3.0) if high else rng.lognormvariate(0, 0.1)
        clinic = Clinic(clinic_id=f"HOSP-{1000 + i}", name=f"샘플동물병원 {i + 1:02d}", region=region)
        out.append((clinic, factor))
    return out


def _price(rng, code: str, region: str, factor: float) -> int:
    p50 = procedures_by_code()[code]["benchmark"]["p50"]
    return int(round(p50 * region_multiplier(region) * factor * rng.lognormvariate(0, 0.12), -2))


def generate(n: int = 400, seed: int = 7, anomaly_rate: float = 0.35, as_of: date = date(2026, 9, 30)) -> List[SyntheticCase]:
    rng = random.Random(seed)
    clinics = _clinics(rng, 36)
    scenario_names = list(SCENARIOS)
    weights = [SCENARIOS[s]["w"] for s in scenario_names]
    cases: List[SyntheticCase] = []

    for i in range(n):
        name = rng.choices(scenario_names, weights)[0]
        sc = SCENARIOS[name]
        species = sc["species"] or rng.choice(["dog", "dog", "dog", "cat"])
        breed, lo, hi = rng.choice(DOG_BREEDS if species == "dog" else CAT_BREEDS)
        weight = round(rng.uniform(lo, hi), 1)
        clinic, factor = rng.choice(clinics)
        visit = as_of - timedelta(days=rng.randint(0, 180))
        policy_start = visit - timedelta(days=rng.randint(400, 1400))
        labels: List[str] = []
        if factor > 2:
            labels.append("inflated_price")

        lines = []
        for desc, code, (qlo, qhi) in sc["lines"]:
            q = rng.randint(qlo, qhi)
            if q:
                lines.append(LineItem(description=desc, code=None, quantity=q, unit_price=_price(rng, code, clinic.region, factor)))
        rx = [Prescription(drug=d, dose_mg_per_kg=round(rng.uniform(*rng_range), 3), frequency=f, days=days,
                           unit_price=rng.choice([800, 1200, 1500, 2000]), quantity=days * (2 if f == "BID" else 3 if f == "TID" else 1))
              for d, rng_range, f, days in sc["rx"]]

        if rng.random() < anomaly_rate:
            kind = rng.choice(ANOMALIES)
            if kind == "inflated_price" and lines:
                j = rng.randrange(len(lines))
                lines[j] = lines[j].model_copy(update={"unit_price": int(lines[j].unit_price * rng.uniform(2.6, 3.4))})
            elif kind == "unindicated_procedure" and name in ("아토피 피부염", "외이염", "결막염", "켄넬코프"):
                lines.append(LineItem(description="MRI 촬영", unit_price=_price(rng, "IMG-005", clinic.region, 1.0)))
            elif kind == "undisclosed_chronic" and name not in ("이첨판 폐쇄부전증", "예방접종"):
                policy_start = visit - timedelta(days=rng.randint(35, 200))
                drug = rng.choice([("베트메딘", 0.25), ("씬지로이드", 0.02), ("페노바르비탈", 2.5), ("트릴로스탄", 1.0)]) if species == "dog" \
                    else rng.choice([("메티마졸", 0.5), ("베트메딘", 0.25)])
                rx.append(Prescription(drug=drug[0], dose_mg_per_kg=drug[1], frequency="BID", days=30, unit_price=1500, quantity=60))
            elif kind == "species_mismatch" and species == "cat":
                lines.append(LineItem(description="DHPPL 종합백신", unit_price=_price(rng, "PRE-003", clinic.region, 1.0)))
            elif kind == "species_mismatch" and species == "dog":
                breed = rng.choice(["러시안 블루", "페르시안"])
            elif kind == "ineligible_items":
                lines.append(LineItem(description=rng.choice(["위생미용", "처방식 사료", "호텔 1박", "넥카라"]), unit_price=rng.choice([25000, 38000, 45000])))
            elif kind == "overdose" and rx:
                j = rng.randrange(len(rx))
                rx[j] = rx[j].model_copy(update={"dose_mg_per_kg": round(rx[j].dose_mg_per_kg * 10, 3)})
            elif kind == "waiting_period" and name != "예방접종" and name != "위장관 이물":
                policy_start = visit - timedelta(days=rng.randint(3, 25))
            elif kind == "pre_policy":
                policy_start = visit + timedelta(days=rng.randint(5, 60))
            elif kind != "duplicate":
                kind = None
            if kind and kind != "duplicate":
                labels.append(kind)
            elif kind == "duplicate":
                labels.append("__duplicate_source__")

        claim = Claim(
            claim_id=f"SYN-{as_of.year}-{i + 1:05d}",
            visit_date=visit,
            submitted_date=visit + timedelta(days=rng.randint(0, 20)),
            clinic=clinic,
            patient=Patient(patient_id=f"PET-{rng.randint(10000, 99999)}", species=species, breed=breed,
                            age_years=round(rng.uniform(0.5, 14), 1), weight_kg=weight),
            diagnoses=[name],
            line_items=lines,
            prescriptions=rx,
        )
        policy = Policy(policy_id=f"POL-{i + 1:05d}", start_date=policy_start, coverage_ratio=0.7,
                        deductible_per_visit=30000, per_visit_limit=None, annual_limit=5_000_000)
        cases.append(SyntheticCase(claim, policy, [l for l in labels if l != "__duplicate_source__"]))
        if "__duplicate_source__" in labels:
            dup = claim.model_copy(update={"claim_id": claim.claim_id + "-R", "submitted_date": claim.submitted_date + timedelta(days=9)})
            cases.append(SyntheticCase(dup, policy, ["duplicate"]))
    return cases


def evaluate(cases: List[SyntheticCase]) -> dict:
    """Recall per anomaly type and false-alarm rate on clean claims."""
    from .engine import adjudicate

    history: List[Claim] = []
    per_type = {a: {"injected": 0, "detected": 0} for a in ANOMALIES}
    clean = clean_flagged = clean_auto = 0
    decisions: Dict[str, int] = {}
    rule_hits: Dict[str, int] = {}
    results = []
    for case in cases:
        res = adjudicate(case.claim, case.policy, history)
        history.append(case.claim)
        results.append((case, res))
        decisions[res.decision.value] = decisions.get(res.decision.value, 0) + 1
        fired = {f.rule for f in res.findings}
        for r in fired:
            rule_hits[r] = rule_hits.get(r, 0) + 1
        if not case.labels:
            clean += 1
            if any(f.severity.value in ("warning", "critical") and f.category != "coverage" for f in res.findings):
                clean_flagged += 1
            if res.decision.value == "auto_approve":
                clean_auto += 1
        for label in case.labels:
            per_type[label]["injected"] += 1
            if any(r.startswith(p) for r in fired for p in DETECTED_BY[label]):
                per_type[label]["detected"] += 1
    return {
        "claims": len(cases),
        "clean_claims": clean,
        "clean_false_alarm_rate": round(clean_flagged / clean, 4) if clean else None,
        "clean_auto_approve_rate": round(clean_auto / clean, 4) if clean else None,
        "recall_by_anomaly": {k: {**v, "recall": round(v["detected"] / v["injected"], 3) if v["injected"] else None} for k, v in per_type.items()},
        "decisions": decisions,
        "rule_hits": dict(sorted(rule_hits.items(), key=lambda kv: -kv[1])),
        "_results": results,
    }

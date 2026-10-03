from datetime import date

import pytest

from claims.codebook import match_diagnosis, match_procedure
from claims.engine import adjudicate
from claims.knowledge import resolve_drug
from claims.models import Claim, Clinic, Decision, LineItem, Patient, Policy, Prescription
from claims.synthetic import evaluate, generate

POLICY = Policy(policy_id="P", start_date=date(2025, 1, 1), coverage_ratio=0.7,
                deductible_per_visit=30_000, per_visit_limit=None)


def make_claim(**overrides) -> Claim:
    base = dict(
        claim_id="C-1",
        visit_date=date(2026, 6, 1),
        clinic=Clinic(clinic_id="H-1", region="경기"),
        patient=Patient(patient_id="A-1", species="dog", breed="말티즈", weight_kg=4.0),
        diagnoses=["외이염"],
        line_items=[
            LineItem(description="초진료", unit_price=10_000),
            LineItem(description="귀 도말검사", unit_price=15_000),
            LineItem(description="귀 세척", unit_price=15_000),
        ],
        prescriptions=[],
    )
    base.update(overrides)
    return Claim(**base)


def rules(result):
    return {f.rule for f in result.findings}


# ── Normalization ────────────────────────────────────────────────

@pytest.mark.parametrize("text,code", [
    ("혈액검사(CBC)", "LAB-001"), ("심장 초음파", "IMG-003"), ("복부초음파", "IMG-002"),
    ("cPL 키트검사", "LAB-009"), ("파보 키트검사", "LAB-013"), ("X-ray 2매", "IMG-001"),
    ("슬개골 탈구 정복술(좌측)", "SUR-001"), ("위생미용", "NON-001"), ("진단서 발급", "ADM-001"),
])
def test_line_items_map_to_standard_codes(text, code):
    assert match_procedure(text)[0] == code


@pytest.mark.parametrize("text,code", [
    ("아토피성 피부염", "NVD-DER-001"), ("이첨판 폐쇄부전", "NVD-CAR-001"),
    ("CKD stage 2", "NVD-REN-001"), ("고양이 특발성 방광염", "NVD-URO-003"),
])
def test_diagnoses_map_to_standard_codes(text, code):
    assert match_diagnosis(text)[0] == code


@pytest.mark.parametrize("name,drug_id", [
    ("아포퀠 5.4mg", "oclacitinib"), ("베트메딘 1.25mg", "pimobendan"), ("소론도정 5mg", "prednisolone_prednisone"),
    ("사이클로스포린 점안액", "cyclosporine_ophthalmic"), ("아토피카", "cyclosporine_systemic"),
    ("멜록시캄", "meloxicam"), ("하트가드", "ivermectin"), ("레볼루션", "selamectin"),
])
def test_korean_brand_and_ingredient_names_resolve(name, drug_id):
    assert resolve_drug(name)[0] == drug_id


def test_unknown_drug_is_not_guessed():
    assert resolve_drug("zz알수없는약")[0] is None


# ── Decisions ────────────────────────────────────────────────────

def test_clean_claim_auto_approves_with_correct_payable():
    r = adjudicate(make_claim(), POLICY)
    assert r.decision == Decision.auto_approve
    assert r.payable.billed == 40_000
    assert r.payable.reimbursed == int((40_000 - 30_000) * 0.7)


def test_non_medical_items_are_excluded_from_payable():
    claim = make_claim(line_items=make_claim().line_items + [LineItem(description="위생미용", unit_price=35_000)])
    r = adjudicate(claim, POLICY)
    assert "coverage.line_ineligible" in rules(r)
    assert r.payable.ineligible == 35_000


def test_visit_before_policy_start_is_deny_recommended_never_auto_denied():
    r = adjudicate(make_claim(visit_date=date(2024, 12, 1)), POLICY)
    assert r.decision == Decision.deny_recommended
    assert r.payable.reimbursed == 0


def test_illness_in_waiting_period_excluded_but_accident_is_not():
    policy = POLICY.model_copy(update={"start_date": date(2026, 5, 20)})
    illness = adjudicate(make_claim(), policy)
    assert "coverage.diagnosis_excluded" in rules(illness)
    assert illness.payable.eligible == 0
    accident = adjudicate(make_claim(diagnoses=["교상"]), policy)
    assert "coverage.diagnosis_excluded" not in rules(accident)


def test_preventive_visit_is_not_covered():
    claim = make_claim(diagnoses=["예방접종"], line_items=[LineItem(description="DHPPL 종합백신", unit_price=25_000)])
    r = adjudicate(claim, POLICY)
    assert r.payable.eligible == 0
    assert r.decision == Decision.deny_recommended


# ── Clinical ─────────────────────────────────────────────────────

def test_mri_for_otitis_is_flagged_but_mri_for_ivdd_is_not():
    mri = LineItem(description="MRI 촬영", unit_price=800_000)
    otitis = adjudicate(make_claim(line_items=make_claim().line_items + [mri]), POLICY)
    assert "clinical.procedure_not_indicated" in rules(otitis)
    ivdd = adjudicate(make_claim(diagnoses=["디스크"], line_items=[mri]), POLICY)
    assert "clinical.procedure_not_indicated" not in rules(ivdd)


def test_cardiac_drug_in_ear_claim_signals_undisclosed_chronic_condition():
    rx = [Prescription(drug="베트메딘 1.25mg", dose_mg_per_kg=0.25, frequency="BID", days=30)]
    r = adjudicate(make_claim(prescriptions=rx), POLICY)
    assert "clinical.undisclosed_chronic_condition" in rules(r)
    assert r.decision == Decision.review


def test_cardiac_drug_with_cardiac_diagnosis_is_fine():
    rx = [Prescription(drug="베트메딘 1.25mg", dose_mg_per_kg=0.25, frequency="BID", days=30)]
    r = adjudicate(make_claim(diagnoses=["이첨판 폐쇄부전증"], line_items=[LineItem(description="심장초음파", unit_price=100_000)],
                              prescriptions=rx), POLICY)
    assert "clinical.undisclosed_chronic_condition" not in rules(r)


def test_acetaminophen_in_cat_is_critical():
    cat = Patient(patient_id="A-2", species="cat", breed="코리안 숏헤어", weight_kg=4.0)
    r = adjudicate(make_claim(patient=cat, prescriptions=[Prescription(drug="타이레놀", dose_mg_per_kg=10)]), POLICY)
    finding = next(f for f in r.findings if f.rule == "clinical.species.cat_acetaminophen")
    assert finding.severity.value == "critical"
    assert finding.evidence  # every clinical rule carries its reference


def test_enrofloxacin_cat_dose_ceiling_counts_daily_frequency():
    cat = Patient(patient_id="A-2", species="cat", weight_kg=4.0)
    ok = adjudicate(make_claim(patient=cat, prescriptions=[Prescription(drug="바이트릴", dose_mg_per_kg=5, frequency="SID")]), POLICY)
    high = adjudicate(make_claim(patient=cat, prescriptions=[Prescription(drug="바이트릴", dose_mg_per_kg=5, frequency="BID")]), POLICY)
    assert "clinical.species.cat_enrofloxacin_dose" not in rules(ok)
    assert "clinical.species.cat_enrofloxacin_dose" in rules(high)


def test_mdr1_breed_high_dose_ivermectin_only():
    collie = Patient(patient_id="A-3", species="dog", breed="셰틀랜드 쉽독", weight_kg=9)
    preventive = adjudicate(make_claim(patient=collie, prescriptions=[Prescription(drug="하트가드", dose_mg_per_kg=0.006)]), POLICY)
    mange = adjudicate(make_claim(patient=collie, prescriptions=[Prescription(drug="이버멕틴", dose_mg_per_kg=0.3)]), POLICY)
    assert "clinical.species.dog_mdr1_ivermectin" not in rules(preventive)
    assert "clinical.species.dog_mdr1_ivermectin" in rules(mange)


def test_nsaid_plus_steroid_combination():
    rx = [Prescription(drug="메타캄", dose_mg_per_kg=0.1), Prescription(drug="소론도", dose_mg_per_kg=1)]
    r = adjudicate(make_claim(diagnoses=["골관절염"], prescriptions=rx), POLICY)
    assert "clinical.combo.nsaid_plus_corticosteroid" in rules(r)


def test_decimal_shift_dose_error_is_caught():
    rx = [Prescription(drug="부프레노르핀", dose_mg_per_kg=0.2)]  # typical ~0.02
    r = adjudicate(make_claim(diagnoses=["췌장염"], prescriptions=rx), POLICY)
    assert "clinical.dose_above_reference" in rules(r)


# ── Pricing & integrity ──────────────────────────────────────────

def test_price_above_clinic_posted_fee():
    clinic = Clinic(clinic_id="H-1", region="경기", posted_prices={"CON-001": 9_000})
    r = adjudicate(make_claim(clinic=clinic), POLICY)
    f = next(f for f in r.findings if f.rule == "pricing.above_posted_fee")
    assert f.amount_at_risk == 1_000


def test_regional_price_outlier():
    lines = [LineItem(description="초진료", unit_price=10_000), LineItem(description="CT 촬영", unit_price=2_000_000)]
    r = adjudicate(make_claim(diagnoses=["디스크"], line_items=lines), POLICY)
    assert "pricing.regional_outlier" in rules(r)


def test_dog_vaccine_on_cat_claim_is_species_mismatch():
    cat = Patient(patient_id="A-2", species="cat", weight_kg=4.0)
    claim = make_claim(patient=cat, line_items=make_claim().line_items + [LineItem(description="DHPPL 종합백신", unit_price=25_000)])
    assert "integrity.species_mismatch_item" in rules(adjudicate(claim, POLICY))


def test_duplicate_resubmission_is_deny_recommended():
    first = make_claim()
    dup = make_claim(claim_id="C-2")
    r = adjudicate(dup, POLICY, history=[first])
    assert "integrity.duplicate_claim" in rules(r)
    assert r.decision == Decision.deny_recommended


# ── Regression gate on labelled synthetic data ───────────────────

@pytest.mark.parametrize("seed", [7, 11, 23])
def test_synthetic_recall_and_false_alarm_gate(seed):
    ev = evaluate(generate(n=400, seed=seed))
    assert ev["clean_false_alarm_rate"] <= 0.02
    assert ev["clean_auto_approve_rate"] >= 0.85
    # Pend (request information) is reported separately: complete clean claims must not pend.
    assert ev["clean_pend_rate"] <= 0.02 and ev["pend_rate"] == round(ev["decisions"].get("pend", 0) / ev["claims"], 4)
    for label, stats in ev["recall_by_anomaly"].items():
        if stats["injected"] >= 5:
            assert stats["recall"] >= 0.8, (label, stats)

"""Schema v2 (docs/claims/SCHEMA_V2_SPEC.md §B–G): documents, pend reasons, insurer profiles, policy regimes,
line decisions, SIU flags, v1 backward compatibility and registration-number masking."""

import json
import re
from datetime import date, datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from claims.benchmarks import price_position
from claims.codebook import compact, procedures_by_code
from claims.engine import adjudicate, insurer_profile, insurer_profiles
from claims.models import (
    Claim, Clinic, Decision, Diagnosis, DiagnosisCode, DocType, Document, ExclusionRider, IntakeChannel, LineItem,
    Limits, Patient, Policy, Prescription, Rider, Usage, WaitingPeriods,
)
from claims.synthetic import LINE_VARIANTS, PEND_ANOMALIES, evaluate, generate
from main import app

FIXTURES = Path(__file__).parent / "fixtures"
POLICY = Policy(policy_id="P", start_date=date(2025, 1, 1), coverage_ratio=0.7, deductible_per_visit=30_000, per_visit_limit=None)
REG = "410123456789012"
DOG = Patient(patient_id="A-1", species="dog", breed="말티즈", weight_kg=4.0, registration_no=REG)
EAR = [LineItem(description="초진료", unit_price=10_000), LineItem(description="귀 도말검사", unit_price=15_000),
       LineItem(description="귀 세척", unit_price=15_000)]
SURGERY = [LineItem(description="초진료", unit_price=10_000), LineItem(description="복부 방사선", quantity=2, unit_price=40_000),
           LineItem(description="호흡마취", unit_price=150_000), LineItem(description="위장관 이물 제거술", unit_price=1_300_000)]
RECEIPT = Document(doc_type="RECEIPT_ITEMIZED")


def make_claim(**overrides) -> Claim:
    base = dict(claim_id="C-1", visit_date=date(2026, 6, 1), submitted_date=date(2026, 6, 3),
                clinic=Clinic(clinic_id="H-1", region="경기"), patient=DOG, diagnoses=["외이염"], line_items=EAR)
    base.update(overrides)
    return Claim(**base)


def pend_codes(r):
    return [p.code for p in r.pend_reasons]


def pend(r, code):
    return next(p for p in r.pend_reasons if p.code == code)


def doc_item(r, doc_type, pend_code=None):
    return next(d for d in r.required_documents if d.doc_type.value == doc_type and (pend_code is None or d.pend_code == pend_code))


# ── Pend reasons, one by one ─────────────────────────────────────

def test_total_only_receipt_document_pends_receipt_not_itemized():
    r = adjudicate(make_claim(line_items=[LineItem(description="진료비 합계", unit_price=235_000)],
                              documents=[Document(doc_type="RECEIPT_TOTAL_ONLY")]), POLICY)
    assert r.decision == Decision.pend
    p = pend(r, "RECEIPT_NOT_ITEMIZED")
    assert p.actor == "clinic" and DocType.DETAIL_STATEMENT in p.requests
    assert doc_item(r, "RECEIPT_ITEMIZED").status == "missing"


def test_single_total_line_pends_even_without_documents():
    r = adjudicate(make_claim(line_items=[LineItem(description="진료비", unit_price=180_000)]), POLICY)
    assert "RECEIPT_NOT_ITEMIZED" in pend_codes(r)


def test_single_specific_line_is_itemized():
    r = adjudicate(make_claim(line_items=[LineItem(description="귀 세척", unit_price=15_000)]), POLICY)
    assert "RECEIPT_NOT_ITEMIZED" not in pend_codes(r)


def test_lines_must_reconcile_with_invoice_total_within_10_won():
    ok = adjudicate(make_claim(invoice_total=40_005), POLICY)
    off = adjudicate(make_claim(invoice_total=95_000), POLICY)
    assert "RECEIPT_NOT_ITEMIZED" not in pend_codes(ok)
    assert "RECEIPT_NOT_ITEMIZED" in pend_codes(off) and "₩55,000" in pend(off, "RECEIPT_NOT_ITEMIZED").detail_ko


@pytest.mark.parametrize("text", ["진료비(사료 포함)", "재진료+위생미용", "귀 세척 및 호텔 1박", "Buprenorphine inj+위생미용"])
def test_mixed_basket_line_pends(text):
    r = adjudicate(make_claim(line_items=[*EAR, LineItem(description=text, unit_price=60_000)]), POLICY)
    assert "MIXED_BASKET_UNSPLIT" in pend_codes(r)
    assert pend(r, "MIXED_BASKET_UNSPLIT").actor == "clinic"


@pytest.mark.parametrize("text", ["미용·목욕", "세균배양·감수성검사", "배양 및 감수성", "혈액검사(CBC)", "검사-X-ray(경상)"])
def test_single_category_lines_are_not_mixed(text):
    r = adjudicate(make_claim(line_items=[*EAR, LineItem(description=text, unit_price=30_000)]), POLICY)
    assert "MIXED_BASKET_UNSPLIT" not in pend_codes(r)


def test_missing_diagnosis_pends_instead_of_denying():
    r = adjudicate(make_claim(diagnoses=[]), POLICY)
    assert r.decision == Decision.pend and pend_codes(r) == ["MISSING_DX"]
    assert r.payable.eligible == 40_000  # unknown diagnosis goes to a human, never to denial


def test_unmapped_diagnosis_pends():
    r = adjudicate(make_claim(diagnoses=["zz알수없는 질환"]), POLICY)
    assert r.decision == Decision.pend and "DX_UNMAPPED" in pend_codes(r)
    assert "data.unmapped_diagnosis" in {f.rule for f in r.findings}


def test_above_threshold_without_certificate_pends_need_dx_cert():
    r = adjudicate(make_claim(diagnoses=["위장관 이물"], line_items=SURGERY, documents=[RECEIPT]), POLICY)
    p = pend(r, "NEED_DX_CERT")
    assert p.actor == "clinic" and "₩300,000" in p.detail_ko
    with_cert = adjudicate(make_claim(diagnoses=["위장관 이물"], line_items=SURGERY,
                                      documents=[RECEIPT, Document(doc_type="DX_CERT_STATUTORY")]), POLICY)
    assert "NEED_DX_CERT" not in pend_codes(with_cert)
    assert doc_item(with_cert, "DX_CERT_STATUTORY").status == "satisfied"


def test_below_threshold_needs_no_certificate():
    r = adjudicate(make_claim(documents=[RECEIPT]), POLICY)
    assert "NEED_DX_CERT" not in pend_codes(r)
    assert not [d for d in r.required_documents if d.doc_type == DocType.DX_CERT_STATUTORY]


def test_symptom_only_diagnosis_below_threshold_does_not_pend():
    # Review 2026-10-02: a symptom-only diagnosis (구토, 설사) pended at any amount, even on v1 bodies.
    for docs in (None, [RECEIPT]):
        r = adjudicate(make_claim(diagnoses=["구토"], documents=docs), POLICY)
        assert "NEED_DX_CERT" not in pend_codes(r) and r.decision == Decision.auto_approve
        cert = doc_item(r, "DX_CERT_STATUTORY")
        assert cert.required is False and cert.pend_code is None
        assert cert.status == ("unknown" if docs is None else "missing")
        assert "documents.symptom_only_diagnosis" in {f.rule for f in r.findings}


def test_symptom_only_diagnosis_above_threshold_needs_a_certificate():
    r = adjudicate(make_claim(diagnoses=["구토"], line_items=SURGERY, documents=[RECEIPT]), POLICY)
    assert "증상명" in pend(r, "NEED_DX_CERT").detail_ko and "₩300,000" in pend(r, "NEED_DX_CERT").detail_ko


def test_kb_requires_its_own_disease_code_on_any_certificate():
    kb = POLICY.model_copy(update={"insurer_id": "kb"})
    docs = [RECEIPT, Document(doc_type="DX_CERT_STATUTORY")]
    no_code = adjudicate(make_claim(documents=docs), kb)  # below ₩300k, but a 진단서 was submitted
    assert "KB_PET" in pend(no_code, "NEED_DX_CERT").detail_ko
    coded = adjudicate(make_claim(documents=docs, diagnoses=[Diagnosis(text_raw="외이염", codes=[DiagnosisCode(system="KB_PET", code="KB-TEST")])]), kb)
    assert "NEED_DX_CERT" not in pend_codes(coded)


def test_kb_threshold_is_inclusive_and_cumulative_per_condition():
    kb = Policy(policy_id="K", start_date=date(2025, 1, 1), insurer_id="kb", per_visit_limit=None,
                usage=Usage(condition_totals={"NVD-DER-004": 260_000}))
    r = adjudicate(make_claim(documents=[RECEIPT]), kb)  # 260k earlier + 40k now = 300k ≥ 300k
    p = pend(r, "NEED_DX_CERT")
    assert "질병별 누적" in p.detail_ko and "추론" in p.detail_ko


def test_imaging_document_without_timestamp_pends():
    lines = [*EAR, LineItem(description="흉부 방사선", unit_price=40_000)]
    bad = adjudicate(make_claim(line_items=lines, documents=[RECEIPT, Document(doc_type="IMAGING")]), POLICY)
    good = adjudicate(make_claim(line_items=lines, documents=[RECEIPT, Document(doc_type="IMAGING", captured_at=datetime(2026, 6, 1, 10, 30))]), POLICY)
    none_sent = adjudicate(make_claim(line_items=lines, documents=[RECEIPT]), POLICY)
    assert "IMAGING_NO_TIMESTAMP" in pend_codes(bad)
    assert "IMAGING_NO_TIMESTAMP" not in pend_codes(good) and "IMAGING_NO_TIMESTAMP" not in pend_codes(none_sent)


def test_unregistered_pet_without_photos_pends_for_the_owner():
    cat = Patient(patient_id="C-9", species="cat", weight_kg=4.0)
    r = adjudicate(make_claim(patient=cat, documents=[RECEIPT]), POLICY)
    assert pend(r, "PET_ID_UNVERIFIED").actor == "owner"
    photos = [Document(doc_type="PET_PHOTO_FRONT"), Document(doc_type="PET_PHOTO_SIDE")]
    assert "PET_ID_UNVERIFIED" not in pend_codes(adjudicate(make_claim(patient=cat, documents=[RECEIPT, *photos]), POLICY))
    assert "PET_ID_UNVERIFIED" not in pend_codes(adjudicate(make_claim(documents=[RECEIPT]), POLICY))  # registered dog


def test_hyundai_wants_photos_on_every_claim():
    hyundai = POLICY.model_copy(update={"insurer_id": "hyundai"})
    r = adjudicate(make_claim(documents=[RECEIPT]), hyundai)  # registered dog, still needs photos
    assert "PET_ID_UNVERIFIED" in pend_codes(r)
    assert {d.doc_type.value for d in r.required_documents if d.pend_code == "PET_ID_UNVERIFIED"} == {"PET_PHOTO_FRONT", "PET_PHOTO_SIDE"}


def test_originals_required_above_insurer_threshold():
    docs = [RECEIPT, Document(doc_type="DX_CERT_STATUTORY")]
    samsung = POLICY.model_copy(update={"insurer_id": "samsung"})
    r = adjudicate(make_claim(diagnoses=["위장관 이물"], line_items=SURGERY, documents=docs), samsung)
    assert pend(r, "ORIGINALS_REQUIRED").actor == "owner"
    received = [Document(doc_type="RECEIPT_ITEMIZED", original_received_at=datetime(2026, 6, 10, 9)), docs[1]]
    assert "ORIGINALS_REQUIRED" not in pend_codes(adjudicate(make_claim(diagnoses=["위장관 이물"], line_items=SURGERY, documents=received), samsung))
    lotte = POLICY.model_copy(update={"insurer_id": "lotte"})  # ₩3M threshold
    assert "ORIGINALS_REQUIRED" not in pend_codes(adjudicate(make_claim(diagnoses=["위장관 이물"], line_items=SURGERY, documents=docs), lotte))


def test_db_app_claim_limit():
    db = POLICY.model_copy(update={"insurer_id": "db"})
    big = [LineItem(description="척추 수술", unit_price=5_500_000)]
    docs = [RECEIPT, Document(doc_type="DX_CERT_STATUTORY")]
    app_claim = adjudicate(make_claim(diagnoses=["디스크"], line_items=big, documents=docs, intake_channel="insurer_app"), db)
    mail = adjudicate(make_claim(diagnoses=["디스크"], line_items=big, documents=docs, intake_channel="owner_upload"), db)
    assert "ORIGINALS_REQUIRED" in pend_codes(app_claim) and "ORIGINALS_REQUIRED" not in pend_codes(mail)


def test_live_counter_claim_needs_no_owner_documents():
    mybrown = POLICY.model_copy(update={"insurer_id": "mybrown"})
    cat = Patient(patient_id="C-9", species="cat", weight_kg=4.0)
    r = adjudicate(make_claim(patient=cat, diagnoses=["위장관 이물"], line_items=SURGERY, documents=[], intake_channel="live_counter"), mybrown)
    assert r.pend_reasons == []


# ── Decision precedence ──────────────────────────────────────────

def test_review_outranks_pend_and_pend_outranks_auto_approve():
    rx = [Prescription(drug="베트메딘 1.25mg", dose_mg_per_kg=0.25, frequency="BID", days=30)]
    both = adjudicate(make_claim(diagnoses=[], prescriptions=rx), POLICY)  # no dx → no chronic-marker check
    assert both.decision == Decision.pend
    review = adjudicate(make_claim(prescriptions=rx, invoice_total=1), POLICY)
    assert review.decision == Decision.review and "RECEIPT_NOT_ITEMIZED" in pend_codes(review)
    deny = adjudicate(make_claim(visit_date=date(2024, 12, 1), diagnoses=[]), POLICY)
    assert deny.decision == Decision.deny_recommended


def test_document_info_findings_never_force_review():
    late = adjudicate(make_claim(visit_date=date(2025, 3, 1), submitted_date=date(2026, 6, 1)), POLICY)
    f = next(f for f in late.findings if f.rule == "documents.medical_record_may_be_unavailable")
    assert f.severity.value == "info" and "1년" in f.detail
    assert late.decision != Decision.review


# ── Insurer profiles and the document checklist ──────────────────

def test_every_profile_cites_sources_and_is_unverified():
    book = json.loads((Path(__file__).parents[1] / "claims/data/insurer_profiles.json").read_text(encoding="utf-8"))
    assert {"default", "kb", "samsung", "meritz", "lotte", "db", "nh", "hyundai", "mybrown"} <= set(book["profiles"])
    for p in insurer_profiles():
        assert p["verified"] is False and p["as_of"] == "2026-10-02"
        assert p["source_urls"] and all(u.startswith("http") for u in p["source_urls"]), p["id"]
    assert book["_meta"]["statutory"]["medical_record_retention_days"] == 365  # 시행규칙 §13 (corrected)
    assert book["_meta"]["statutory"]["prescription_fee_cap"] == 5000


def test_profile_thresholds_match_the_research():
    assert insurer_profile("kb")["dx_certificate"]["basis_is_inference"] is True
    assert insurer_profile("kb")["accepted_file_types"] == ["jpg", "jpeg", "png"]
    assert insurer_profile("samsung")["originals"]["threshold"] == insurer_profile("meritz")["originals"]["threshold"] == 1_000_000
    assert insurer_profile("lotte")["originals"]["threshold"] == 3_000_000
    assert insurer_profile("db")["app_claim_max"] == 5_000_000
    assert insurer_profile("nh")["max_files"] == 30
    assert insurer_profile("hyundai")["pet_id"]["photos"] == "always"
    assert insurer_profile("mybrown")["live_counter"] is True
    assert insurer_profile("nonexistent")["id"] == "default"


def test_checklist_is_unknown_not_missing_for_v1_bodies():
    cat = Patient(patient_id="C-9", species="cat", weight_kg=4.0)
    r = adjudicate(make_claim(patient=cat), POLICY)  # documents absent
    assert doc_item(r, "PET_PHOTO_FRONT").status == "unknown"
    assert "PET_ID_UNVERIFIED" not in pend_codes(r)
    assert doc_item(r, "RECEIPT_ITEMIZED").status == "satisfied"  # evident from the itemized lines


def test_kb_checklist_lists_supplementary_documents_without_pending():
    kb = POLICY.model_copy(update={"insurer_id": "kb"})
    r = adjudicate(make_claim(documents=[RECEIPT]), kb)
    sup = [d for d in r.required_documents if not d.required]
    assert {d.doc_type.value for d in sup} >= {"DETAIL_STATEMENT", "OPINION_WITH_RX", "PAYMENT_SLIP"}
    assert r.decision == Decision.auto_approve


def test_kb_file_type_and_payment_slip_rules_are_info():
    kb = POLICY.model_copy(update={"insurer_id": "kb"})
    docs = [Document(doc_type="RECEIPT_ITEMIZED", source="pdf"), Document(doc_type="PAYMENT_SLIP")]
    r = adjudicate(make_claim(documents=docs, intake_channel="insurer_app"), kb)
    rules = {f.rule for f in r.findings}
    assert {"documents.file_type_not_accepted", "documents.payment_slip_without_brn"} <= rules


def test_nh_file_limit_is_info():
    nh = POLICY.model_copy(update={"insurer_id": "nh"})
    r = adjudicate(make_claim(documents=[Document(doc_type="RECEIPT_ITEMIZED", pages=31)], intake_channel="owner_upload"), nh)
    assert "documents.too_many_files" in {f.rule for f in r.findings}


# ── Policy regimes and v1 → v2 mapping ───────────────────────────

def test_v2_defaults_use_the_post_2025_deductible():
    p = Policy(policy_id="X", start_date=date(2025, 6, 1))
    assert p.deductible.amount == 30_000 and p.deductible.basis == "per_visit" and p.deductible_per_visit == 30_000
    assert p.copay_ratio == pytest.approx(0.3) and p.effective_regime == "fss_2025_05" and p.regime_inferred


def test_v1_fields_are_honoured_and_mirrored():
    p = Policy(policy_id="X", start_date=date(2024, 1, 1), coverage_ratio=0.9, deductible_per_visit=10_000,
               illness_waiting_days=60, per_visit_limit=200_000, annual_limit=3_000_000, used_this_year=500_000)
    assert p.copay_ratio == pytest.approx(0.1) and p.deductible.amount == 10_000
    assert p.waiting_periods.illness == 60 and p.waiting_periods.groups == {}  # v1 body: no group waiting periods
    assert p.limits.per_visit == 200_000 and p.limits.annual_amount == 3_000_000 and p.usage.amount_this_year == 500_000
    assert p.effective_regime == "legacy"


def test_v2_body_gets_condition_group_waiting_period():
    p = Policy(policy_id="X", start_date=date(2025, 6, 1), regime="fss_2025_05")
    assert p.waiting_periods.groups == {"patella_hip": 365}
    claim = make_claim(visit_date=date(2026, 3, 1), diagnoses=["슬개골 탈구"], line_items=[LineItem(description="초진료", unit_price=10_000)])
    r = adjudicate(claim, p)
    assert any(f.rule == "coverage.diagnosis_excluded" and "365일" in f.detail for f in r.findings)
    rider = Policy(policy_id="X", start_date=date(2025, 6, 1), waiting_periods=WaitingPeriods(groups={}))
    assert "coverage.diagnosis_excluded" not in {f.rule for f in adjudicate(claim, rider).findings}


def test_copay_and_coverage_must_agree():
    with pytest.raises(ValidationError):
        Policy(policy_id="X", start_date=date(2025, 6, 1), coverage_ratio=0.7, copay_ratio=0.4)
    assert Policy(policy_id="X", start_date=date(2025, 6, 1), copay_ratio=0.4).coverage_ratio == pytest.approx(0.6)


def test_legacy_coverage_is_not_capped_and_regime_violations_are_info():
    legacy = Policy(policy_id="L", start_date=date(2023, 1, 1), regime="legacy", copay_ratio=0.1, deductible=dict(amount=10_000))
    r = adjudicate(make_claim(), legacy)
    assert r.payable.reimbursed == int((40_000 - 10_000) * 0.9)
    assert "coverage.policy_terms_check" not in {f.rule for f in r.findings}
    fss = Policy(policy_id="F", start_date=date(2025, 6, 1), regime="fss_2025_05", copay_ratio=0.1)
    f = next(f for f in adjudicate(make_claim(), fss).findings if f.rule == "coverage.policy_terms_check")
    assert f.severity.value == "info"


def test_copay_max_method_and_per_day_deductible():
    lines = [LineItem(description="입원비", quantity=3, unit_price=60_000), LineItem(description="정맥 수액 처치", unit_price=40_000)]
    seq = Policy(policy_id="S", start_date=date(2025, 1, 1), regime="fss_2025_05", copay_ratio=0.3, limits=Limits())
    mx = seq.model_copy(update={"copay_method": "max"})
    per_day = seq.model_copy(update={"deductible": seq.deductible.model_copy(update={"basis": "per_day"})})
    claim = make_claim(diagnoses=["췌장염"], line_items=lines)
    assert adjudicate(claim, seq).payable.reimbursed == int((220_000 - 30_000) * 0.7)
    assert adjudicate(claim, mx).payable.reimbursed == int(220_000 - max(30_000, 220_000 * 0.3))
    r = adjudicate(claim, per_day)
    assert r.payable.days == 3 and r.payable.deductible == 90_000


def test_limits_per_surgery_and_annual_visits():
    claim = make_claim(diagnoses=["위장관 이물"], line_items=SURGERY)
    capped = adjudicate(claim, POLICY.model_copy(update={"limits": Limits(per_surgery=300_000)}))
    assert capped.payable.capped_by == "per_surgery_limit" and capped.payable.limit_reduction > 0
    used = POLICY.model_copy(update={"limits": Limits(annual_visits=20), "usage": Usage(visits_this_year=20)})
    assert adjudicate(claim, used).payable.reimbursed == 0


def test_riders_and_exclusion_riders():
    dental = make_claim(diagnoses=["치주 질환"], line_items=[LineItem(description="스케일링", unit_price=150_000)])
    assert adjudicate(dental, POLICY).payable.eligible == 0
    with_rider = POLICY.model_copy(update={"riders": [Rider(id="dental", start_date=date(2025, 1, 1))]})
    assert adjudicate(dental, with_rider).payable.eligible > 0
    no_skin = POLICY.model_copy(update={"exclusion_riders": [ExclusionRider(condition_group="ear", until=date(2026, 12, 31))]})
    r = adjudicate(make_claim(), no_skin)
    assert any(f.rule == "coverage.diagnosis_excluded" and "부담보" in f.detail for f in r.findings)


def test_waiting_period_keys_on_onset_date():
    policy = POLICY.model_copy(update={"start_date": date(2026, 5, 1)})
    late_visit = make_claim(visit_date=date(2026, 6, 15), diagnoses=[Diagnosis(text_raw="외이염", onset_date=date(2026, 5, 10))])
    r = adjudicate(late_visit, policy)
    assert any("발병" in f.detail for f in r.findings if f.rule == "coverage.diagnosis_excluded")
    pre = make_claim(diagnoses=[Diagnosis(text_raw="외이염", onset_date=date(2024, 12, 1))])
    assert "가입 전 발병" in next(f.detail for f in adjudicate(pre, POLICY).findings if f.rule == "coverage.diagnosis_excluded")


# ── Line decisions ───────────────────────────────────────────────

def test_line_decisions_cover_every_line_and_prescription():
    rx = [Prescription(drug="하트가드 플러스", unit_price=12_000), Prescription(drug="세파렉신", dose_mg_per_kg=20, unit_price=3_000)]
    lines = [*EAR, LineItem(description="위생미용", unit_price=35_000), LineItem(description="진단서 발급", unit_price=20_000),
             LineItem(description="의료폐기물", unit_price=2_000), LineItem(description="할인", unit_price=-5_000)]
    r = adjudicate(make_claim(line_items=lines, prescriptions=rx), POLICY)
    by = {(d.source, d.line_index): d for d in r.line_decisions}
    assert len(r.line_decisions) == len(lines) + len(rx)
    assert by[("line", 0)].eligible and by[("line", 0)].benefit_type == "outpatient"
    assert (by[("line", 3)].reason_code, by[("line", 3)].benefit_type) == ("non_medical", "non_medical")
    assert by[("line", 4)].reason_code == "document_fee" and not by[("line", 4)].eligible
    assert by[("line", 5)].reason_code == "admin"
    # The discount is spread pro rata over every positive item: ₩43,000 of the ₩112,000 billed is eligible.
    assert by[("line", 6)].reason_code == "discount" and by[("line", 6)].eligible_amount == round(-5_000 * 43_000 / 112_000)
    assert by[("prescription", 0)].reason_code == "noncovered_product:heartworm_preventive"
    assert by[("prescription", 1)].eligible
    assert r.payable.billed == sum(d.amount for d in r.line_decisions)
    assert r.payable.eligible == sum(d.eligible_amount for d in r.line_decisions)


def test_surgery_lines_are_surgery_benefit():
    r = adjudicate(make_claim(diagnoses=["위장관 이물"], line_items=SURGERY), POLICY)
    types = [d.benefit_type for d in r.line_decisions]
    assert r.benefit_type == "surgery" and types.count("surgery") == 2  # anaesthesia + the operation


def test_negative_price_only_on_discount_lines():
    assert LineItem(description="카드 할인", unit_price=-3_000).total == -3_000
    with pytest.raises(ValidationError):
        LineItem(description="초진료", unit_price=-3_000)


def test_noncovered_products_on_lines_and_prescriptions():
    r = adjudicate(make_claim(line_items=[*EAR, LineItem(description="넥스가드 스펙트라", unit_price=30_000)]), POLICY)
    line = r.line_decisions[3]
    assert not line.eligible and line.reason_code.startswith("noncovered_product:")
    rx = [Prescription(drug="하트가드 플러스", unit_price=12_000)]
    treat = adjudicate(make_claim(diagnoses=["심장사상충 감염증"], prescriptions=rx), POLICY)
    assert next(d for d in treat.line_decisions if d.source == "prescription").eligible  # treatment, not prevention
    assert treat.drugs[0].drug_id == "ivermectin" and len(treat.drugs[0].ingredients) == 2  # combination: every ingredient


def test_document_fee_and_prescription_fee_cap():
    r = adjudicate(make_claim(line_items=[*EAR, LineItem(description="처방전 발급", unit_price=8_000)]), POLICY)
    assert any(f.rule == "documents.prescription_fee_above_cap" and f.amount_at_risk == 3_000 for f in r.findings)
    assert r.line_decisions[3].reason_code == "document_fee"


# ── Drug-like line routing (spec A5) ─────────────────────────────

def test_drug_like_lines_route_to_the_drug_resolver_and_clinical_checks():
    r = adjudicate(make_claim(line_items=[*EAR, LineItem(description="Famotidine Inj.", unit_price=8_000),
                                          LineItem(description="Vetmedin 2.5mg", unit_price=30_000)]), POLICY)
    fam, vet = r.lines[3], r.lines[4]
    assert (fam.drug_id, fam.category, fam.code) == ("famotidine", "pharmacy", None)
    assert vet.drug_id == "pimobendan"
    assert "clinical.undisclosed_chronic_condition" in {f.rule for f in r.findings}  # dose unknown: still checked
    assert "data.unmapped_line" not in {f.rule for f in r.findings}


def test_null_benchmark_codes_never_crash_pricing():
    assert price_position("ADM-002", 2_000, "서울") is None
    rows = json.loads((FIXTURES / "emr_lines.json").read_text(encoding="utf-8"))
    texts = [row["text"] for row in rows["lines"] + rows["tuning_round2"]]
    claim = make_claim(line_items=[LineItem(description=t, unit_price=10_000) for t in texts if "할인" not in t])
    r = adjudicate(claim, POLICY)
    assert len(r.lines) == len(claim.line_items)
    assert all(l.benchmark_percentile is None for l in r.lines if l.code and not procedures_by_code()[l.code]["benchmark"])


def test_engine_lines_respect_matcher_false_positive_probe():
    rows = json.loads((FIXTURES / "emr_lines.json").read_text(encoding="utf-8"))["false_positive_probe"]
    r = adjudicate(make_claim(line_items=[LineItem(description=row["text"], unit_price=10_000) for row in rows]), POLICY)
    for row, line in zip(rows, r.lines):
        expected = row["expected"]
        ok = line.code in expected if isinstance(expected, list) else line.code == expected
        assert ok or (expected is None and line.drug_id), (row["text"], line.code)


# ── SIU ──────────────────────────────────────────────────────────

def test_undisclosed_chronic_within_a_year_is_siu_with_record_request():
    recent = POLICY.model_copy(update={"start_date": date(2026, 2, 1)})
    rx = [Prescription(drug="베트메딘 1.25mg", dose_mg_per_kg=0.25, frequency="BID", days=30)]
    r = adjudicate(make_claim(prescriptions=rx), recent)
    assert [s.code for s in r.siu_flags] == ["UNDISCLOSED_CHRONIC"]
    assert r.record_request_rule_id == "siu.undisclosed_chronic"
    assert doc_item(r, "MEDICAL_RECORD").status == "requested"


def test_no_siu_means_no_medical_record_request():
    r = adjudicate(make_claim(documents=[RECEIPT]), POLICY)
    assert r.siu_flags == [] and r.record_request_rule_id is None
    assert not [d for d in r.required_documents if d.doc_type == DocType.MEDICAL_RECORD]


def test_duplicate_and_identity_siu_flags():
    first = make_claim()
    dup = adjudicate(make_claim(claim_id="C-2"), POLICY, history=[first])
    assert "DUPLICATE_ACROSS_CLAIMS" in [s.code for s in dup.siu_flags]
    other_reg = Patient(patient_id="A-1", species="dog", breed="말티즈", weight_kg=4.0, registration_no="410999999999999")
    ident = adjudicate(make_claim(claim_id="C-3", visit_date=date(2026, 7, 1), patient=other_reg), POLICY, history=[first])
    assert "IDENTITY_MISMATCH" in [s.code for s in ident.siu_flags] and ident.record_request_rule_id == "siu.identity_mismatch"


def test_repeated_regional_price_outlier_needs_history():
    ct = [LineItem(description="초진료", unit_price=10_000), LineItem(description="CT 촬영", unit_price=2_000_000)]
    hist = [make_claim(claim_id=f"H-{i}", patient=Patient(patient_id=f"Z-{i}", species="dog"), diagnoses=["디스크"],
                       line_items=ct, visit_date=date(2026, 5, i + 1)) for i in range(3)]
    alone = adjudicate(make_claim(diagnoses=["디스크"], line_items=ct), POLICY)
    repeated = adjudicate(make_claim(diagnoses=["디스크"], line_items=ct), POLICY, history=hist)
    assert "REPEATED_PRICE_OUTLIER" not in [s.code for s in alone.siu_flags]
    assert "REPEATED_PRICE_OUTLIER" in [s.code for s in repeated.siu_flags]


# ── v1 backward compatibility (old request bodies) ───────────────

V1_CLAIM = {
    "claim_id": "T-1", "visit_date": "2026-09-01",
    "clinic": {"clinic_id": "H1", "region": "서울"},
    "patient": {"patient_id": "P1", "species": "dog", "weight_kg": 4.0},
    "diagnoses": ["외이염"],
    "line_items": [{"description": "초진료", "unit_price": 11000}, {"description": "귀 도말검사", "unit_price": 15000}],
    "prescriptions": [],
}
V1_POLICY = {"policy_id": "P-1", "start_date": "2026-07-01", "coverage_ratio": 0.7, "deductible_per_visit": 30000}


def test_v1_bodies_validate_and_adjudicate_with_new_fields():
    with TestClient(app) as c:
        body = c.post("/api/claims/adjudicate", json={"claim": V1_CLAIM, "policy": V1_POLICY}).json()
    assert body["decision"] == "auto_approve"
    assert body["payable"]["billed"] == 26_000 and body["payable"]["deductible"] == 26_000
    for key in ("pend_reasons", "siu_flags", "line_decisions", "required_documents", "record_request_rule_id", "insurer_profile"):
        assert key in body
    assert body["insurer_profile"]["id"] == "default" and body["schema_version"] == "2"


def test_v1_negative_price_still_rejected_and_strings_still_accepted():
    bad = {**V1_CLAIM, "line_items": [{"description": "초진료", "unit_price": -1}]}
    with TestClient(app) as c:
        assert c.post("/api/claims/adjudicate", json={"claim": bad}).status_code == 422
        mixed = {**V1_CLAIM, "diagnoses": ["외이염", {"text_raw": "결막염", "certainty": "presumptive"}]}
        body = c.post("/api/claims/adjudicate", json={"claim": mixed}).json()
    assert [d["code"] for d in body["diagnoses"]] == ["NVD-DER-004", "NVD-OPH-001"]
    assert body["diagnoses"][1]["certainty"] == "presumptive"


def test_v1_claim_and_policy_round_trip_unchanged():
    claim = Claim(**V1_CLAIM)
    dumped = claim.model_dump(mode="json")
    assert dumped["diagnoses"] == ["외이염"] and dumped["documents"] is None
    assert Claim(**dumped).model_dump(mode="json") == dumped


# ── Registration-number masking ──────────────────────────────────

def test_registration_number_is_masked_in_every_response():
    claim = make_claim()
    assert claim.patient.registration_no == REG  # the engine sees the real value
    assert claim.model_dump()["patient"]["registration_no"] == "***********9012"
    assert REG not in claim.model_dump_json()
    with TestClient(app) as c:
        demo = c.get("/api/claims/demo", params={"n": 60, "limit": 60}).json()
        cid = demo["claims"][0]["claim_id"]
        detail = c.get(f"/api/claims/demo/{cid}", params={"n": 60}).text
        pre = c.post("/api/claims/precheck", json=json.loads(claim.model_dump_json())).text
    assert not re.search(r"410\d{12}", detail) and not re.search(r"410\d{12}", pre)
    assert re.search(r'"registration_no":"\*{11}\d{4}"', detail) or '"registration_no":null' in detail


# ── Precheck (clinic side) ───────────────────────────────────────

def test_precheck_turns_clinic_pends_into_clinic_actions():
    total_only = {**V1_CLAIM, "line_items": [{"description": "진료비 합계", "unit_price": 186000}]}
    with TestClient(app) as c:
        body = c.post("/api/claims/precheck", json=total_only).json()
        big = {**V1_CLAIM, "diagnoses": ["위장관 이물"], "line_items": [{"description": "위장관 이물 제거술", "unit_price": 1300000},
                                                                     {"description": "호흡마취", "unit_price": 150000}]}
        cert = c.post("/api/claims/precheck", json=big).json()
        cert_kb = c.post("/api/claims/precheck", params={"insurer_id": "kb"}, json=big).json()
    titles = [a["title"] for a in body["clinic_actions"]]
    assert "영수증을 항목별로 발급해 주세요" in titles and body["ready_to_submit"] is False
    assert "진단서가 필요합니다 (₩300,000 초과)" in [a["title"] for a in cert["clinic_actions"]]
    assert any(d["doc_type"] == "DX_CERT_STATUTORY" for d in cert["documents_to_issue"])
    assert cert_kb["insurer_profile"]["id"] == "kb" and "이상" in cert_kb["clinic_actions"][0]["title"]


def test_precheck_owner_items_do_not_block_the_clinic():
    cat = {**V1_CLAIM, "patient": {"patient_id": "P2", "species": "cat", "weight_kg": 4.0}, "diagnoses": ["방광염"],
           "line_items": [{"description": "초진료", "unit_price": 11000}, {"description": "요검사", "unit_price": 20000}]}
    with TestClient(app) as c:
        body = c.post("/api/claims/precheck", json=cat).json()
    assert body["ready_to_submit"] is True
    assert [g["code"] for g in body["owner_guidance"]] == ["PET_ID_UNVERIFIED"]


def test_precheck_issued_documents_resolve_the_certificate_action():
    big = {**V1_CLAIM, "diagnoses": ["위장관 이물"], "line_items": [{"description": "위장관 이물 제거술", "unit_price": 1300000},
                                                                 {"description": "호흡마취", "unit_price": 150000}],
           "documents": [{"doc_type": "RECEIPT_ITEMIZED", "source": "emr"}, {"doc_type": "DX_CERT_STATUTORY", "source": "emr"}]}
    with TestClient(app) as c:
        body = c.post("/api/claims/precheck", json=big).json()
    assert not body["clinic_actions"] and body["ready_to_submit"] is True


# ── Synthetic data and evaluation ────────────────────────────────

def test_synthetic_vocabulary_is_mostly_not_codebook_terms():
    cases = generate(n=300, seed=5)
    terms = {compact(t) for p in procedures_by_code().values() for t in [p["name_ko"], p["name_en"], *p.get("synonyms", [])]}
    texts = [li.description for c in cases for li in c.claim.line_items]
    exact = sum(1 for t in texts if compact(t) in terms)
    assert exact / len(texts) < 0.5, exact / len(texts)
    assert sum(1 for t in texts if "-" in t) / len(texts) > 0.15  # EMR '<category>-<item>' style present
    variants = {v for vs in LINE_VARIANTS.values() for v in vs}
    assert len({t for t in texts if t in variants}) >= 60


def test_synthetic_claims_carry_documents_insurers_and_channels():
    cases = generate(n=200, seed=5)
    assert all(c.claim.documents is not None for c in cases)
    assert len({c.policy.insurer_id for c in cases}) >= 6
    assert {c.claim.intake_channel for c in cases} >= {IntakeChannel.insurer_app, IntakeChannel.owner_upload}
    assert any(isinstance(d, Diagnosis) for c in cases for d in c.claim.diagnoses)
    assert all(c.policy.insurer_id != "kb" for c in cases)  # KB 진단서 codes are not public; never fabricated


def test_new_anomalies_pend_and_pend_rate_is_reported():
    ev = evaluate(generate(n=400, seed=7))
    assert 0 < ev["pend_rate"] < 0.5 and ev["clean_pend_rate"] == 0
    for label in PEND_ANOMALIES:
        stats = ev["recall_by_anomaly"][label]
        assert stats["injected"] >= 3 and stats["recall"] >= 0.8, (label, stats)
    for case, res in ev["_results"]:
        if set(case.labels) & {"total_only_receipt", "missing_dx"} and len(case.labels) == 1:
            assert res.decision.value in ("pend", "review", "deny_recommended")


def test_evaluation_endpoint_reports_pend_rate():
    with TestClient(app) as c:
        body = c.get("/api/claims/evaluation", params={"n": 120}).json()
        ins = c.get("/api/claims/insurers").json()
    assert "pend_rate" in body and "pend" in body["decisions"]
    assert {p["id"] for p in ins["profiles"]} >= {"default", "kb", "hyundai"} and ins["verified"] is False


# ── 2026-10-02 review fixes ───────────────────────────────────────

def test_discharge_meds_line_is_charged_not_deducted():
    lines = [LineItem(description="재진료", unit_price=11_000), LineItem(description="정맥 수액 처치 1일", unit_price=40_000),
             LineItem(description="퇴원약(D/C) 7일", unit_price=21_000)]
    r = adjudicate(make_claim(diagnoses=["급성 위장염"], line_items=lines), POLICY)
    assert r.lines[2].code != "ADM-004" and r.lines[2].total == 21_000
    assert r.payable.billed == 72_000 and r.payable.eligible == 72_000


def test_positive_amount_on_a_text_matched_discount_is_not_negated():
    lines = [*EAR, LineItem(description="회원 할인", unit_price=5_000)]
    r = adjudicate(make_claim(line_items=lines), POLICY)
    assert r.lines[3].code == "ADM-004" and r.lines[3].total == 5_000  # sign kept …
    assert "data.discount_amount_positive" in {f.rule for f in r.findings} and r.decision == Decision.review  # … for a human
    exact = adjudicate(make_claim(line_items=[*EAR, LineItem(description="할인", unit_price=5_000)]), POLICY)
    assert exact.lines[3].total == -5_000  # a line that is exactly a discount word is a deduction


@pytest.mark.parametrize("text", ["미용 할인", "할인(미용)", "입원비 할인", "쿠폰", "포인트 사용", "적립금 사용", "원단위 절사", "단수 조정", "D/C"])
def test_receipt_adjustments_may_be_negative(text):
    r = adjudicate(make_claim(line_items=[*EAR, LineItem(description=text, unit_price=-1_000)]), POLICY)
    assert r.lines[3].code == "ADM-004" and r.lines[3].total == -1_000


def test_negative_quantities_and_prescription_prices_are_rejected():
    with pytest.raises(ValidationError):
        LineItem(description="초진료", quantity=-1, unit_price=11_000)
    with pytest.raises(ValidationError):
        Prescription(drug="파모티딘", unit_price=-5_000, quantity=10)
    with pytest.raises(ValidationError):
        Prescription(drug="파모티딘", unit_price=500, quantity=-10)


def test_discount_is_spread_pro_rata_and_named_discounts_follow_their_category():
    no_ded = Policy(policy_id="D", start_date=date(2025, 1, 1), deductible=dict(amount=0), limits=Limits())
    base = [LineItem(description="재진료", unit_price=10_000), LineItem(description="귀 세척", unit_price=20_000),
            LineItem(description="위생미용", unit_price=50_000)]
    member = adjudicate(make_claim(line_items=[*base, LineItem(description="회원 할인", unit_price=-20_000)]), no_ded)
    assert member.payable.eligible == 30_000 - 7_500  # 30k of the 80k billed is covered → 37.5% of the discount
    grooming = adjudicate(make_claim(line_items=[*base, LineItem(description="미용 할인", unit_price=-20_000)]), no_ded)
    assert grooming.payable.eligible == 30_000  # a grooming discount never reduces the covered amount
    for r in (member, grooming):
        assert r.payable.eligible == sum(d.eligible_amount for d in r.line_decisions)
        assert r.payable.billed == sum(d.amount for d in r.line_decisions) == 60_000


def test_per_surgery_cap_uses_the_surgery_share_of_positive_items():
    lines = [LineItem(description="초진료", unit_price=10_000), LineItem(description="이물 제거술", unit_price=1_000_000),
             LineItem(description="호흡마취", unit_price=150_000), LineItem(description="할인", unit_price=-200_000)]
    capped = Policy(policy_id="S", start_date=date(2025, 1, 1), limits=Limits(per_surgery=500_000))
    r = adjudicate(make_claim(diagnoses=["위장관 이물"], line_items=lines), capped)
    p = r.payable
    assert p.eligible == 960_000 and p.capped_by == "per_surgery_limit"
    before = int((960_000 - 30_000) * 0.7)
    surgery_part = before * 1_150_000 / 1_160_000
    assert p.reimbursed == int(before - (surgery_part - 500_000))  # ₩505,612, not below the cap itself
    assert p.reimbursed + p.copay_amount + p.deductible + p.limit_reduction == p.eligible


def test_mixed_bundles_are_held_and_pend_whatever_the_order():
    for text in ("위생미용+귀세척", "재진료+위생미용", "처방식+진료"):
        r = adjudicate(make_claim(line_items=[LineItem(description=text, unit_price=60_000)]), POLICY)
        d = r.line_decisions[0]
        assert (d.reason_code, d.eligible_amount) == ("mixed_unsplit", 0), text
        assert r.decision == Decision.pend and "MIXED_BASKET_UNSPLIT" in pend_codes(r), text
    with_others = adjudicate(make_claim(line_items=[*EAR, LineItem(description="재진료+위생미용", unit_price=60_000)]), POLICY)
    assert with_others.payable.eligible == 40_000 and with_others.decision == Decision.pend


def test_zero_eligible_still_denies_when_no_document_could_help():
    vaccine_only = adjudicate(make_claim(diagnoses=[], line_items=[LineItem(description="종합백신", unit_price=30_000)]), POLICY)
    assert vaccine_only.decision == Decision.deny_recommended  # a diagnosis cannot make a vaccine payable
    excluded = adjudicate(make_claim(diagnoses=["예방접종"], line_items=[LineItem(description="진료비 합계", unit_price=120_000)],
                                     documents=[Document(doc_type="RECEIPT_TOTAL_ONLY")]), POLICY)
    assert excluded.decision == Decision.deny_recommended  # itemizing cannot help an excluded diagnosis


# Policy: v1 fields next to v2 sub-objects

V1_PATELLA = dict(policy_id="P", start_date=date(2026, 3, 1), coverage_ratio=0.7, deductible_per_visit=30_000)


def test_insurer_id_alone_does_not_make_a_v1_policy_v2():
    claim = make_claim(visit_date=date(2026, 9, 1), diagnoses=["슬개골 탈구"],
                       line_items=[LineItem(description="초진료", unit_price=11_000), LineItem(description="방사선 촬영", quantity=2, unit_price=40_000)])
    plain = adjudicate(claim, Policy(**V1_PATELLA))
    for extra in ({"insurer_id": "samsung"}, {"usage": Usage(visits_this_year=1)}, {"copay_method": "max"}):
        p = Policy(**V1_PATELLA, **extra)
        assert p.waiting_periods.groups == {}, extra
    with_insurer = adjudicate(claim, Policy(**V1_PATELLA, insurer_id="samsung"))
    assert with_insurer.payable.eligible == plain.payable.eligible == 91_000
    assert with_insurer.decision == plain.decision == Decision.auto_approve


def test_v1_fields_are_merged_into_v2_sub_objects():
    p = Policy(policy_id="X", start_date=date(2025, 6, 1), deductible_per_visit=50_000, deductible=dict(basis="per_day"))
    assert (p.deductible.amount, p.deductible.basis) == (50_000, "per_day")
    p = Policy(policy_id="X", start_date=date(2025, 6, 1), illness_waiting_days=90, waiting_periods=dict(groups={"patella_hip": 365}))
    assert p.waiting_periods.illness == 90 and p.waiting_periods.groups == {"patella_hip": 365}
    p = Policy(policy_id="X", start_date=date(2025, 6, 1), per_visit_limit=200_000, annual_limit=3_000_000, limits=Limits(per_surgery=1_000_000))
    assert (p.limits.per_visit, p.limits.annual_amount, p.limits.per_surgery) == (200_000, 3_000_000, 1_000_000)
    p = Policy(policy_id="X", start_date=date(2025, 6, 1), used_this_year=4_900_000, usage=Usage(visits_this_year=3))
    assert (p.usage.amount_this_year, p.usage.visits_this_year) == (4_900_000, 3)


def test_v1_and_v2_values_that_disagree_are_rejected():
    for body in (dict(deductible_per_visit=50_000, deductible=dict(amount=30_000)),
                 dict(per_visit_limit=200_000, limits=dict(per_visit=100_000)),
                 dict(illness_waiting_days=90, waiting_periods=dict(illness=30)),
                 dict(used_this_year=10, usage=dict(amount_this_year=20))):
        with pytest.raises(ValidationError):
            Policy(policy_id="X", start_date=date(2025, 6, 1), **body)
    same = Policy(policy_id="X", start_date=date(2025, 6, 1), deductible_per_visit=30_000, deductible=dict(amount=30_000))
    assert Policy(**same.model_dump()).deductible == same.deductible  # a dumped policy round-trips


def test_annual_limit_survives_a_v2_usage_or_limits_object():
    claim = make_claim(diagnoses=["위장관 이물"], line_items=[LineItem(description="위장관 이물 제거술", unit_price=1_500_000),
                                                         LineItem(description="호흡마취", unit_price=150_000)])
    base = dict(policy_id="P", start_date=date(2024, 1, 1), annual_limit=3_000_000, used_this_year=2_990_000)
    for extra in ({}, {"usage": Usage(visits_this_year=2)}, {"limits": Limits(per_surgery=2_000_000)}):
        r = adjudicate(claim, Policy(**base, **extra))
        assert r.payable.reimbursed == 10_000 and r.payable.capped_by == "annual_limit", extra


# Diagnoses with coverage / SIU consequences (end to end)

def test_vaccine_reaction_pends_instead_of_preventive_denial():
    lines = [LineItem(description="초진료", unit_price=11_000), LineItem(description="주사(항히스타민)", unit_price=15_000)]
    r = adjudicate(make_claim(diagnoses=["예방접종 후 알레르기 반응"], line_items=lines), POLICY)
    assert r.decision == Decision.pend and pend_codes(r) == ["DX_UNMAPPED"] and r.payable.eligible == 26_000


def test_interstitial_pneumonia_is_not_undisclosed_epilepsy():
    recent = POLICY.model_copy(update={"start_date": date(2026, 4, 1)})
    r = adjudicate(make_claim(diagnoses=["간질성 폐렴"], line_items=[LineItem(description="흉부 방사선", unit_price=40_000)]), recent)
    assert r.diagnoses[0]["code"] == "NVD-RES-003" and r.siu_flags == [] and r.record_request_rule_id is None


def test_uveitis_in_the_illness_waiting_period_is_not_an_accident():
    policy = POLICY.model_copy(update={"start_date": date(2026, 5, 22)})
    r = adjudicate(make_claim(diagnoses=["포도막염"]), policy)
    assert r.diagnoses[0]["code"] != "NVD-TOX-001" and r.decision != Decision.auto_approve


def test_feline_panleukopenia_is_not_a_species_mismatch():
    cat = Patient(patient_id="C-9", species="cat", weight_kg=4.0, registration_no=REG)
    r = adjudicate(make_claim(patient=cat, diagnoses=["범백혈구감소증(고양이 파보)"]), POLICY)
    assert r.diagnoses[0]["code"] == "NVD-INF-005"
    assert "integrity.species_mismatch_diagnosis" not in {f.rule for f in r.findings}


def test_negative_heartworm_test_does_not_make_preventives_payable():
    rx = [Prescription(drug="하트가드 플러스", unit_price=12_000, quantity=6)]
    r = adjudicate(make_claim(diagnoses=["심장사상충 검사 음성"], line_items=[LineItem(description="심장사상충 검사(SNAP)", unit_price=30_000)],
                              prescriptions=rx), POLICY)
    rx_decision = next(d for d in r.line_decisions if d.source == "prescription")
    assert not rx_decision.eligible and rx_decision.reason_code == "noncovered_product:heartworm_preventive"


def test_heartworm_product_line_is_treatment_for_heartworm_disease():
    line = LineItem(description="하트가드 플러스", unit_price=12_000, quantity=6)
    r = adjudicate(make_claim(diagnoses=["심장사상충 감염증"], line_items=[*EAR, line]), POLICY)
    assert r.line_decisions[3].eligible  # same as the same product prescribed
    presumptive = adjudicate(make_claim(diagnoses=[Diagnosis(text_raw="심장사상충 감염증", certainty="presumptive")],
                                        line_items=[*EAR, line]), POLICY)
    assert not presumptive.line_decisions[3].eligible


# Documents

def test_per_condition_threshold_uses_diagnosis_refs():
    lines = [LineItem(description="초진료", unit_price=12_000),
             LineItem(description="귀 도말검사", unit_price=25_000, diagnosis_refs=[0]), LineItem(description="귀 세척", unit_price=25_000, diagnosis_refs=[0]),
             LineItem(description="비디오 이경 검사", unit_price=140_000, diagnosis_refs=[0]),
             LineItem(description="형광 염색", unit_price=20_000, diagnosis_refs=[1]), LineItem(description="안압 측정", unit_price=20_000, diagnosis_refs=[1]),
             LineItem(description="안과 검사(슬릿램프)", unit_price=110_000, diagnosis_refs=[1]), LineItem(description="눈물량 검사", unit_price=20_000, diagnosis_refs=[1])]
    r = adjudicate(make_claim(diagnoses=["외이염", "결막염"], line_items=lines, documents=[RECEIPT]), POLICY)
    assert r.payable.billed == 372_000 and "NEED_DX_CERT" not in pend_codes(r)  # ₩214k + ₩182k, each under ₩300k
    unreferenced = adjudicate(make_claim(diagnoses=["외이염", "결막염"], documents=[RECEIPT],
                                         line_items=[l.model_copy(update={"diagnosis_refs": None}) for l in lines]), POLICY)
    assert "NEED_DX_CERT" in pend_codes(unreferenced)  # without refs every diagnosis counts the whole claim


def test_lines_dated_before_the_policy_start_are_explained_and_referred():
    policy = Policy(policy_id="P", start_date=date(2026, 5, 1), per_visit_limit=None, illness_waiting_days=0)
    lines = [LineItem(description="입원비", unit_price=60_000, service_date=date(2026, 4, 29)),
             LineItem(description="입원비", unit_price=60_000, service_date=date(2026, 4, 30)),
             LineItem(description="입원비", unit_price=60_000, service_date=date(2026, 5, 1))]
    r = adjudicate(make_claim(visit_date=date(2026, 5, 3), diagnoses=["교상"], line_items=lines), policy)
    f = next(f for f in r.findings if f.rule == "coverage.service_before_policy_start")
    assert f.amount_at_risk == 120_000 and "2026-04-29" in f.detail
    assert [s.code for s in r.siu_flags] == ["UNDISCLOSED_CHRONIC"] and r.record_request_rule_id == "siu.undisclosed_chronic"
    all_before = adjudicate(make_claim(visit_date=date(2026, 5, 3), diagnoses=["교상"], line_items=lines[:2]), policy)
    assert all_before.decision == Decision.deny_recommended and all_before.findings  # never a silent denial


def test_validation_errors_never_echo_the_registration_number():
    body = {**V1_CLAIM, "patient": {"patient_id": "P1", "species": "dog", "registration_no": REG}}
    missing_date = {k: v for k, v in body.items() if k != "visit_date"}
    no_species = {**body, "patient": {"patient_id": "P1", "registration_no": REG}}
    with TestClient(app) as c:
        for bad in (missing_date, no_species):
            for path, payload in (("/api/claims/adjudicate", {"claim": bad}), ("/api/claims/precheck", bad)):
                res = c.post(path, json=payload)
                assert res.status_code == 422 and not re.search(r"410\d{12}", res.text), path
                assert all({"loc", "msg"} <= set(e) and "input" not in e for e in res.json()["detail"])


# Synthetic gate on wording the codebook was not tuned on (reported separately, spec §E)

def test_synthetic_gate_on_untuned_vocabulary():
    from claims.synthetic import ALT_LINE_VARIANTS
    cases = generate(n=400, seed=7, vocabulary="alt")
    texts = {li.description for c in cases for li in c.claim.line_items}
    assert len(texts & {v for vs in ALT_LINE_VARIANTS.values() for v in vs}) >= 60
    ev = evaluate(cases)
    assert ev["clean_false_alarm_rate"] <= 0.02  # the spec gate holds on unseen wording too
    # Measured 2026-10-02 after that round's fixes (auto-approve 0.57, clean pend 0.08; tuned vocabulary: 0.93 / 0.0).
    # Unseen wording goes to a human (low-confidence review, DX_UNMAPPED pend): these are regression floors, not targets.
    assert ev["clean_auto_approve_rate"] >= 0.5 and ev["clean_pend_rate"] <= 0.12


def test_total_only_receipts_are_not_all_declared():
    cases = [c for c in generate(n=400, seed=5) if "total_only_receipt" in c.labels]
    undeclared = [c for c in cases if all(d.doc_type != DocType.RECEIPT_TOTAL_ONLY for d in c.claim.documents)]
    assert undeclared and len(undeclared) < len(cases)
    assert any(c.claim.line_items[0].unit_price < 50_000 for c in cases)  # no amount floor above GENERIC_TOTAL_MIN

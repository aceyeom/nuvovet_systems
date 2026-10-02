"""
Claim adjudication (schema v2).

adjudicate(claim, policy, history) normalizes the claim, runs the rule families and returns a
Decision with every Finding, pend reason and SIU flag that drove it:

  coverage   what the policy pays for (waiting periods, riders, 부담보, non-medical items) → line_decisions, payable
  clinical   does the care make sense (drug ↔ diagnosis, dose, species safety)
  pricing    is the price in line with the region and the clinic's own posted fee
  integrity  duplicates, identity/species mismatches, implausible quantities
  documents  which documents the insurer profile requires → required_documents, pend reasons, info flags
  siu        referral-grade flags; the full 진료부 is requested only when one fires (record_request_rule_id)

Decision precedence: deny_recommended (hard rules, or nothing payable — unless an itemized receipt or a
split line could still reveal covered items, which pends) > review (warning/critical clinical, pricing,
integrity or data finding) > pend (missing information) > review (low normalization confidence) > auto_approve.

Discounts (ADM-004, the only negative lines) are spread pro rata over the items they apply to, so a
discount on non-covered items does not cut the covered amount; a mixed line ('재진료+위생미용') is held
(eligible 0) until the clinic splits it, whatever the order of its pieces.
The engine never auto-denies: the strongest outcome is `deny_recommended`, which still routes to a
human adjuster; `pend` means "request information", the commonest real outcome.

v1 request bodies keep their v1 behaviour: with `documents` absent the engine cannot know what was
attached, so only data-evident pend reasons fire (a total-only receipt, a missing or unmapped diagnosis,
a mixed basket); `mode='precheck'` treats absent documents as "none issued yet".
"""

from __future__ import annotations

import json
import re
from datetime import date, timedelta
from functools import lru_cache
from typing import Dict, FrozenSet, Iterable, List, Optional, Set, Tuple

from . import ENGINE_VERSION
from .benchmarks import has_benchmark, price_position
from .codebook import (
    DATA_DIR,
    DISCOUNT_CODE,
    NO_MATCH,
    Match,
    compact,
    diagnoses_by_code,
    diagnosis_book,
    discount_target,
    match_diagnosis_full,
    match_procedure,
    match_procedure_full,
    procedure_book,
    procedures_by_code,
)
from .knowledge import (
    chronic_marker_diagnoses,
    class_label,
    clinical_rules,
    dose_reference,
    drug_label,
    noncovered_product,
    resolve_drug_full,
    resolve_drug_line,
    therapeutic_class,
)
from .models import (
    Adjudication,
    Claim,
    Decision,
    DocType,
    Document,
    Finding,
    InsurerProfileRef,
    IntakeChannel,
    LineDecision,
    NormalizedDrug,
    NormalizedLine,
    Payable,
    PendReason,
    Policy,
    Prescription,
    RequiredDocument,
    Severity,
    SiuFlag,
)

CLAIM_LIMITATION_DAYS = 3 * 365  # 상법 §662: insurance claims prescribe after 3 years
SMALL_BREEDS = ("말티즈", "maltese", "포메라니안", "pomeranian", "치와와", "chihuahua", "요크셔", "yorkshire", "토이푸들", "toy poodle")
DOG_BREED_HINTS = SMALL_BREEDS + ("푸들", "poodle", "비숑", "bichon", "시츄", "shih", "진돗개", "리트리버", "retriever", "웰시코기", "corgi", "닥스훈트", "dachshund", "슈나우저", "schnauzer")
CAT_BREED_HINTS = ("코리안숏헤어", "코숏", "페르시안", "persian", "샴", "siamese", "러시안블루", "russian blue", "브리티시", "british", "스코티시", "scottish", "먼치킨", "munchkin", "랙돌", "ragdoll", "벵갈", "bengal")
SPECIES_ONLY_CODES = {"PRE-003": "dog", "PRE-006": "dog", "PRE-004": "cat"}
FREQ_PER_DAY = {"sid": 1, "q24h": 1, "once": 1, "1일1회": 1, "bid": 2, "q12h": 2, "1일2회": 2, "tid": 3, "q8h": 3, "1일3회": 3, "qid": 4, "q6h": 4, "1일4회": 4, "eod": 0.5, "q48h": 0.5}

DX_DOCS = (DocType.DX_CERT_STATUTORY, DocType.INSURER_TX_CONFIRMATION)
ITEMIZATION_DOCS = (DocType.RECEIPT_ITEMIZED, DocType.DETAIL_STATEMENT)
LIVE_CHANNELS = (IntakeChannel.emr_autoclaim, IntakeChannel.live_counter)
ONLINE_CHANNELS = (IntakeChannel.owner_upload, IntakeChannel.insurer_app, IntakeChannel.fax_email)
PEND_ORDER = ("RECEIPT_NOT_ITEMIZED", "MIXED_BASKET_UNSPLIT", "MISSING_DX", "DX_UNMAPPED", "NEED_DX_CERT",
              "IMAGING_NO_TIMESTAMP", "PET_ID_UNVERIFIED", "ORIGINALS_REQUIRED")
TOTAL_WORDS = ("합계", "총액", "총진료비", "진료비계", "소계", "청구금액", "수납액", "결제금액", "total")
GENERIC_TOTAL_MIN = 50_000  # a single generic line ('진료비') above this is a total, not an itemized consult
_MIX_SPLIT = re.compile(r"\s*(?:[+＋/,&]|및|포함|외|\(|\))\s*")
CHRONIC_SOON_DAYS = 90  # a chronic diagnosis first claimed this soon after the start is an SIU signal
PRICE_OUTLIER_REPEAT = 2  # prior same-clinic claims with a regional outlier before the pattern is "repeated"

DOC_KO = {
    "RECEIPT_ITEMIZED": "항목별 진료비 영수증", "RECEIPT_TOTAL_ONLY": "합계 영수증", "DETAIL_STATEMENT": "진료비 세부내역서",
    "DX_CERT_STATUTORY": "진단서", "INSURER_TX_CONFIRMATION": "보험사 양식 진료확인서", "OPINION_WITH_RX": "소견서(처방 포함)",
    "MEDICAL_RECORD": "진료부(진료기록)", "LAB_RESULT": "검사 결과지", "IMAGING": "영상 자료", "PAYMENT_SLIP": "카드 매출전표",
    "CASH_RECEIPT": "현금영수증", "PET_PHOTO_FRONT": "정면 사진", "PET_PHOTO_SIDE": "측면 전신 사진", "PET_PHOTO_FACE": "얼굴 정면 사진",
    "REGISTRATION_CERT": "동물등록증", "SURGERY_CONSENT": "수술 동의서", "PRESCRIPTION": "처방전", "CLAIM_FORM": "보험금 청구서",
    "CONSENT_FORM": "개인정보 동의서", "ID_COPY": "신분증 사본", "BANK_PROOF": "통장 사본",
}
NONCOVERED_KO = {
    "shampoo_cleanser": "샴푸·세정제", "wipes": "티슈·와이프", "deodorant": "탈취제", "oral_care": "구강 관리",
    "ear_eye_care": "귀·눈 세정", "skin_care": "피부 관리 외품", "insect_repellent": "해충 기피제", "supplement": "영양 보조",
    "quasi_drug_other": "동물용의약외품", "vaccine": "백신", "heartworm_preventive": "심장사상충 예방약", "parasite_preventive": "외부기생충 예방약",
}
LINE_REASON_KO = {
    "non_medical": "비의료 항목(미용·호텔·사료·용품·영양제·장례)",
    "document_fee": "서류 발급 수수료 — 보장 대상 아님",
    "admin": "행정 항목(의료폐기물·부가세) — 보장 대상 아님",
    "euthanasia": "안락사 — 상품별 보장 여부 확인 필요",
    "preventive": "예방 목적 항목(백신·중성화·예방약·검진)",
    "dental_not_covered": "치과 항목 미보장",
    "patella_not_covered": "슬개골 수술 — 해당 진단이 보장 대상이 아님",
    "no_covered_diagnosis": "청구된 진단이 모두 보장 제외",
    "diagnosis_excluded": "연결된 진단이 보장 제외",
    "before_policy_start": "보험 개시 전 진료",
    "mixed_unsplit": "진료비와 비의료 항목이 한 줄로 합산 — 병원이 항목을 나누어 발급할 때까지 지급 보류",
}
GROUP_COVER_KO = {"dental": "치과", "patella_hip": "슬관절·고관절", "skin": "피부"}


def _per_day(frequency: Optional[str]) -> float:
    return FREQ_PER_DAY.get(compact(frequency or ""), 1)


def _f(rule, category, severity, title, detail, item_ref=None, amount=0, evidence=None) -> Finding:
    return Finding(
        rule=rule,
        category=category,
        severity=severity,
        title=title,
        detail=detail,
        item_ref=item_ref,
        amount_at_risk=int(amount),
        evidence=list(evidence or []),
    )


def _won(n) -> str:
    return f"₩{int(round(n)):,}"


# ── Insurer profiles ──────────────────────────────────────────────


@lru_cache(maxsize=1)
def insurer_profiles_book() -> dict:
    return json.loads((DATA_DIR / "insurer_profiles.json").read_text(encoding="utf-8"))


@lru_cache(maxsize=32)
def _profile(insurer_id: str) -> dict:
    profiles = insurer_profiles_book()["profiles"]
    base = dict(profiles["default"])
    if insurer_id == "default" or insurer_id not in profiles:
        return {**base, "id": "default"}
    out = dict(base)
    for key, value in profiles[insurer_id].items():
        if isinstance(value, dict) and isinstance(base.get(key), dict):
            out[key] = {**base[key], **value}
        else:
            out[key] = value
    return {**out, "id": insurer_id}


def insurer_profile(insurer_id: Optional[str]) -> dict:
    """The intake profile for an insurer id (merged over 'default'). Unknown ids fall back to 'default'."""
    return _profile((insurer_id or "default").lower())


def insurer_profiles() -> List[dict]:
    return [insurer_profile(k) for k in insurer_profiles_book()["profiles"]]


def _statutory() -> dict:
    return insurer_profiles_book()["_meta"]["statutory"]


def _over(amount: int, threshold: int, inclusive: bool) -> bool:
    return amount >= threshold if inclusive else amount > threshold


# ── Normalization ─────────────────────────────────────────────────


_DOC_WORDS = ("진단서", "소견서", "증명서", "진료확인서", "세부내역서", "서류")
_ISSUE_WORDS = ("발급", "발행", "수수료", "비용")


def is_document_fee(text: str, code: Optional[str] = None) -> bool:
    """Document issuance fees are never covered: ADM-001, or a '처방전 발급' / '소견서 발급비' line the codebook missed."""
    if code == "ADM-001":
        return True
    c = compact(text)
    return "처방전" in c or (any(w in c for w in _DOC_WORDS) and any(w in c for w in _ISSUE_WORDS))


def _normalize_lines(claim: Claim) -> List[NormalizedLine]:
    out = []
    mixed = _mixed_line_indexes(claim)
    for i, li in enumerate(claim.line_items):
        m = match_procedure_full(li.description, li.code, li.category_raw)
        if li.unit_price < 0 and m.method != "code" and m.code != DISCOUNT_CODE:
            # Validation lets a negative amount through only on an adjustment line ('포인트 사용', '단수 조정', 'D/C').
            m = Match(DISCOUNT_CODE, 0.9, None, m.category_hint, "negative_price", m.item_text)
        code = m.code
        proc = procedures_by_code().get(code or "")
        category = proc["category"] if proc else None
        coverage_category = proc.get("coverage_category") if proc else None
        if not code and is_document_fee(li.description):
            category, coverage_category = "admin", "admin"
            m = Match(None, 0.9, None, m.category_hint, "document_fee_text")
        drug = None
        if not code or category == "pharmacy":
            # Spec A5: unmapped (or pharmacy) lines that look like a drug ('Famotidine Inj.', '바이트릴 (정)').
            drug = resolve_drug_line(li.description)
            if drug and not code:
                category, coverage_category = "pharmacy", "medical"
        noncovered = None
        if not code or drug or category in ("pharmacy", "preventive", "non_medical"):
            noncovered = (noncovered_product(li.description) or {}).get("category")
        # Discounts reduce the bill. A positive amount is turned into a deduction only when the line is explicitly the
        # discount code or exactly a discount word ('할인 5,000'): a text match inside a longer line keeps its sign and
        # is flagged for a human (data.discount_amount_positive), so a mis-coded charge is never silently negated.
        explicit = m.method in ("code", "exact") or li.unit_price < 0
        unit_price = -abs(li.unit_price) if code == DISCOUNT_CODE and explicit else li.unit_price
        total = int(round(unit_price * li.quantity))
        # A mixed line's amount includes non-medical items: it has no regional price position.
        pos = price_position(code, unit_price, claim.clinic.region) if code and i not in mixed else None
        confidence = m.confidence if (code or m.method == "document_fee_text") else (drug.confidence if drug else 0.0)
        out.append(
            NormalizedLine(
                description=li.description,
                code=code,
                code_name=proc["name_ko"] if proc else None,
                category=category,
                match_confidence=confidence,
                quantity=li.quantity,
                unit_price=unit_price,
                total=total,
                benchmark_percentile=pos.percentile if pos else None,
                benchmark_median=pos.median if pos else None,
                category_raw=li.category_raw,
                coverage_category=coverage_category,
                match_method=m.method if (code or m.method == "document_fee_text") else ("drug_line" if drug else "none"),
                matched_term=m.matched_term if code else (drug.matched if drug else None),
                components=list(m.components),
                drug_id=drug.drug_id if drug else None,
                drug_ingredient=drug_label(drug.drug_id) if drug else None,
                noncovered_category=noncovered,
                tax_status=li.tax_status,
                service_date=li.service_date,
                benchmark_available=has_benchmark(code),
            )
        )
    return out


def _normalize_drugs(claim: Claim) -> List[NormalizedDrug]:
    out = []
    w = claim.patient.weight_kg
    for rx in claim.prescriptions:
        r = resolve_drug_full(rx.drug)
        dose = rx.dose_mg_per_kg
        if dose is None and rx.total_dose_mg is not None and w:
            dose = round(rx.total_dose_mg / w, 4)
        out.append(
            NormalizedDrug(
                input_name=rx.drug,
                drug_id=r.drug_id,
                ingredient=drug_label(r.drug_id) if r.drug_id else None,
                therapeutic_class=therapeutic_class(r.drug_id),
                dose_mg_per_kg=dose,
                total=int(round(rx.unit_price * rx.quantity)),
                ingredients=list(r.ingredients),
                resolution_source=r.source,
                licence_no=r.licence_no,
                noncovered_category=(noncovered_product(rx.drug) or {}).get("category"),
            )
        )
    return out


def _resolve_diagnoses(claim: Claim) -> List[dict]:
    out = []
    for obj in claim.diagnosis_objects():
        text = (obj.text_raw or "").strip()
        if not text and not obj.codes:
            continue
        nvd = obj.code_for("NVD")
        if nvd and nvd in diagnoses_by_code():
            m = Match(nvd, 1.0, None, None, "code")
        else:
            m = match_diagnosis_full(text) if text else NO_MATCH
        entry = diagnoses_by_code().get(m.code or "")
        out.append(
            {
                "input": text or ", ".join(f"{c.system}:{c.code}" for c in obj.codes),
                "code": m.code,
                "name_ko": entry["name_ko"] if entry else None,
                "confidence": m.confidence,
                "chronic": bool(entry and entry["chronic"]),
                "accident": obj.is_accident if obj.is_accident is not None else bool(entry and entry["accident"]),
                "specificity": entry.get("specificity") if entry else None,
                "condition_group": entry.get("condition_group") if entry else None,
                "body_system": entry.get("body_system") if entry else None,
                "certainty": obj.certainty,
                "onset_date": obj.onset_date,
                "diagnosis_date": obj.diagnosis_date,
                "codes": [c.model_dump() for c in obj.codes],
                "source_doc": obj.source_doc.value if obj.source_doc else None,
                "match_method": m.method,
            }
        )
    return out


def _clinical_items(claim: Claim, lines: List[NormalizedLine], drugs: List[NormalizedDrug]) -> List[Tuple[NormalizedDrug, Prescription]]:
    """Prescriptions plus drug-like receipt lines routed to a drug (dose unknown: dose rules skip them)."""
    items = list(zip(drugs, claim.prescriptions))
    for ln, li in zip(lines, claim.line_items):
        if not ln.drug_id:
            continue
        r = resolve_drug_full(li.description)
        nd = NormalizedDrug(input_name=li.description, drug_id=ln.drug_id, ingredient=ln.drug_ingredient,
                            therapeutic_class=therapeutic_class(ln.drug_id), dose_mg_per_kg=None, total=ln.total,
                            ingredients=list(r.ingredients) or [ln.drug_id], resolution_source=r.source,
                            noncovered_category=ln.noncovered_category)
        items.append((nd, Prescription(drug=li.description, unit_price=max(0, li.unit_price), quantity=li.quantity)))
    return items


# ── Coverage ──────────────────────────────────────────────────────


def _group_cover(policy: Policy, group: str, on: date) -> Optional[str]:
    """None when the policy covers the rider-able group on `on`, else the reason it does not."""
    base = {"dental": policy.covers_dental, "patella_hip": policy.covers_patella, "skin": policy.covers_skin}.get(group, True)
    rider = policy.rider(group)
    if base and not rider:
        return None
    if rider:
        if rider.start_date and on < rider.start_date:
            return f"{GROUP_COVER_KO[group]} 특약 개시({rider.start_date}) 전 진료"
        return None
    return {"dental": "치과 진료 미보장 상품", "patella_hip": "슬관절(슬개골) 미보장 상품",
            "skin": "피부 질환 미보장 상품 (피부 특약 없음)"}[group]


def _excluded_reason(d: dict, claim: Claim, policy: Policy) -> Optional[str]:
    code = d["code"]
    entry = diagnoses_by_code()[code]
    tags = set(entry["coverage_tags"])
    group = entry.get("condition_group")
    system = entry.get("body_system")
    visit = claim.visit_date
    if code in policy.pre_existing_codes:
        return "가입 전 기왕증으로 등록된 질환"
    if code in policy.excluded_diagnosis_codes:
        return "약관상 보장 제외 질환"
    if "preventive" in tags:
        return "예방·미용 목적 진료는 보장 대상이 아님"
    if "behavior" in tags:
        return "행동 교정은 보장 대상이 아님"
    if "dental" in tags or group == "dental":
        reason = _group_cover(policy, "dental", visit)
        if reason:
            return reason
    if "patella" in tags or group == "patella_hip":
        reason = _group_cover(policy, "patella_hip", visit)
        if reason:
            return reason
    if group == "skin":
        reason = _group_cover(policy, "skin", visit)
        if reason:
            return reason
    for er in policy.exclusion_riders:
        if (er.condition_group and er.condition_group == group) or (er.body_system and er.body_system == system):
            if er.until is None or visit <= er.until:
                target = er.condition_group or er.body_system
                return f"부담보 특약({target}{', ' + er.until.isoformat() + '까지' if er.until else ''})"
    onset = d.get("onset_date")
    if onset and onset < policy.start_date:
        return f"가입 전 발병 (발병일 {onset.isoformat()})"
    ref = onset or visit
    wp = policy.waiting_periods
    if d["accident"]:
        if wp.accident and ref < policy.start_date + timedelta(days=wp.accident):
            ends = policy.start_date + timedelta(days=wp.accident)
            return f"상해 면책기간({wp.accident}일, {ends.isoformat()}까지) 중 {'발병' if onset else '진료'}"
    else:
        ends = policy.start_date + timedelta(days=wp.illness)
        if ref < ends:
            return f"질병 면책기간({wp.illness}일, {ends.isoformat()}까지) 중 {'발병' if onset else '진료'}"
    days = wp.groups.get(group or "")
    if days:
        rider = policy.rider(group)
        start = rider.start_date if rider and rider.start_date else policy.start_date
        ends = start + timedelta(days=days)
        if ref < ends:
            label = diagnosis_book()["_meta"]["condition_groups"].get(group, group)
            return f"{label} 면책기간({days}일, {ends.isoformat()}까지) 중 {'발병' if onset else '진료'}"
    return None


def _benefit_type(ln_category: Optional[str], coverage_category: Optional[str], claim_has_surgery: bool,
                  claim_has_inpatient: bool) -> str:
    if coverage_category == "preventive":
        return "preventive"
    if coverage_category in ("non_medical", "euthanasia"):
        return "non_medical"
    if coverage_category in ("admin", "discount"):
        return "admin"
    if claim_has_surgery and ln_category in ("surgery", "anesthesia"):
        return "surgery"
    if ln_category == "hospitalization" or claim_has_inpatient:
        return "inpatient"
    return "outpatient"


def _antiparasitic_treatment(dx: List[dict], covered_idx: Set[int]) -> bool:
    """A covered, disease-level diagnosis that is treated with antiparasitics (heartworm disease, tick-borne disease,
    flea allergy): a heartworm/parasite 'preventive' product is then treatment, not prevention. A diagnosis the vet
    marked presumptive does not turn preventives into treatment (negative test results never map: codebook)."""
    for i in covered_idx:
        entry = diagnoses_by_code().get(dx[i]["code"] or "") or {}
        if (entry.get("specificity") == "diagnosis" and "antiparasitic" in entry.get("expected_drug_classes", [])
                and dx[i].get("certainty") != "presumptive"):
            return True
    return False


ANTIPARASITIC_PRODUCT_CODES = ("PRE-007", "PRE-013", "PRE-014")  # heartworm / ectoparasite preventives, deworming


def _mixed_line_indexes(claim: Claim) -> Set[int]:
    """Lines that fold non-medical items into a medical one ('재진료+위생미용', '진료비(사료 포함)')."""
    out = set()
    for i, li in enumerate(claim.line_items):
        cats = _pieces_categories(li.description)
        if {"medical", "non_medical"} <= cats or (li.is_bundle and "non_medical" in cats):
            out.add(i)
    return out


def _allocate_discounts(decisions: List[LineDecision], lines: List[NormalizedLine]) -> None:
    """Spread each discount over the positive items it applies to, pro rata: a discount on non-covered items
    ('미용 할인', or a member discount on a bill that is half grooming) must not cut the covered amount by its
    full value. The share that falls on ineligible items is ineligible too."""
    category = {}
    for d in decisions:
        if d.source == "line":
            category[(d.source, d.line_index)] = lines[d.line_index].coverage_category or "medical"
        else:
            category[(d.source, d.line_index)] = "medical"
    positives = [d for d in decisions if d.amount > 0]
    for d in decisions:
        if d.source != "line" or d.reason_code != "discount" or d.amount >= 0:
            continue
        target = discount_target(lines[d.line_index].description)
        pool = [p for p in positives if category[(p.source, p.line_index)] == target] if target else []
        pool = pool or positives
        base = sum(p.amount for p in pool)
        share = sum(p.eligible_amount for p in pool) / base if base > 0 else 0.0
        d.eligible_amount = int(round(d.amount * min(1.0, share)))
        d.eligible = d.eligible_amount != 0


def _coverage(claim, policy, dx, lines, drugs, findings) -> Tuple[Payable, List[LineDecision], Optional[str], bool]:
    """Line decisions and the payable amount. Also returns whether any diagnosis is covered or still open
    (unmapped / missing), i.e. whether more information could make an ineligible claim payable."""
    exclusions = {i: _excluded_reason(d, claim, policy) for i, d in enumerate(dx) if d["code"]}
    for i, reason in exclusions.items():
        if reason:
            d = dx[i]
            findings.append(_f("coverage.diagnosis_excluded", "coverage", Severity.warning,
                               f"보장 제외: {d['name_ko']}", reason, item_ref=d["code"]))
    covered_idx = {i for i, r in exclusions.items() if not r}
    unresolved_idx = {i for i, d in enumerate(dx) if not d["code"]}
    # Unknown or missing diagnoses go to a human (pend), not to denial.
    has_covered = bool(covered_idx) or bool(unresolved_idx) or not dx
    covered_codes = {dx[i]["code"] for i in covered_idx}
    before_start = claim.visit_date < policy.start_date
    treats_parasites = _antiparasitic_treatment(dx, covered_idx)

    surgery = any(l.category == "surgery" and l.coverage_category == "medical" for l in lines)
    inpatient = any(l.category == "hospitalization" for l in lines)
    claim_benefit = "surgery" if surgery else "inpatient" if inpatient else "outpatient"

    mixed = _mixed_line_indexes(claim)
    decisions: List[LineDecision] = []
    for i, (ln, li) in enumerate(zip(lines, claim.line_items)):
        cc = ln.coverage_category
        reason = None
        if before_start or (li.service_date and li.service_date < policy.start_date):
            reason = "before_policy_start"
        elif ln.noncovered_category and not (treats_parasites and ln.noncovered_category in ("heartworm_preventive", "parasite_preventive")):
            reason = f"noncovered_product:{ln.noncovered_category}"
        elif i in mixed and cc != "discount":
            # Held whatever the order of the pieces: '위생미용+귀세척' and '재진료+위생미용' alike (MIXED_BASKET_UNSPLIT).
            reason = "mixed_unsplit"
        elif cc == "discount":
            reason = None if has_covered else "no_covered_diagnosis"
        elif cc == "admin":
            reason = "document_fee" if is_document_fee(ln.description, ln.code) else "admin"
        elif cc == "euthanasia":
            reason = "euthanasia"
        elif cc == "non_medical":
            reason = "non_medical"
        elif cc == "preventive" and not (ln.code == "PRE-002" and "NVD-REP-001" in covered_codes) \
                and not (treats_parasites and ln.code in ANTIPARASITIC_PRODUCT_CODES):
            # A heartworm / parasite product billed as a line is treatment when a covered disease calls for it,
            # exactly as the same product prescribed (noncovered_product exemption above).
            reason = "preventive"
        elif ln.category == "dental" and _group_cover(policy, "dental", claim.visit_date):
            reason = "dental_not_covered"
        elif ln.code == "SUR-001" and "NVD-ORT-001" not in covered_codes:
            reason = "patella_not_covered"
        elif li.diagnosis_refs:
            refs = [r for r in li.diagnosis_refs if 0 <= r < len(dx)]
            if refs and not any(r in covered_idx or r in unresolved_idx for r in refs):
                reason = "diagnosis_excluded"
        elif not has_covered:
            reason = "no_covered_diagnosis"
        benefit = _benefit_type(ln.category, cc, surgery, inpatient)
        decisions.append(LineDecision(source="line", line_index=i, eligible=reason is None,
                                      reason_code=reason or ("discount" if cc == "discount" else "covered"),
                                      benefit_type=benefit, amount=ln.total, eligible_amount=0 if reason else ln.total))
        if reason and reason != "before_policy_start" and cc != "discount":
            text = LINE_REASON_KO.get(reason) or (
                f"비보장 제품({NONCOVERED_KO.get(ln.noncovered_category, ln.noncovered_category)}) — QIA 품목 등록 기준"
                if reason.startswith("noncovered_product") else reason)
            findings.append(_f("coverage.line_ineligible", "coverage", Severity.info,
                               f"지급 제외 항목: {ln.description}", text, item_ref=ln.code, amount=ln.total))

    for j, dr in enumerate(drugs):
        reason = None
        if before_start:
            reason = "before_policy_start"
        elif dr.noncovered_category and not (treats_parasites and dr.noncovered_category in ("heartworm_preventive", "parasite_preventive")):
            reason = f"noncovered_product:{dr.noncovered_category}"
            findings.append(_f("coverage.line_ineligible", "coverage", Severity.info, f"지급 제외 처방: {dr.input_name}",
                               f"비보장 제품({NONCOVERED_KO.get(dr.noncovered_category, dr.noncovered_category)}) — QIA 품목 등록 기준",
                               item_ref=dr.drug_id, amount=dr.total))
        elif not has_covered:
            reason = "no_covered_diagnosis"
        benefit = "inpatient" if claim_benefit != "outpatient" else "outpatient"
        decisions.append(LineDecision(source="prescription", line_index=j, eligible=reason is None,
                                      reason_code=reason or "covered", benefit_type=benefit,
                                      amount=dr.total, eligible_amount=0 if reason else dr.total))

    if before_start:
        findings.append(_f("coverage.before_policy_start", "coverage", Severity.critical,
                           "보험 개시 전 진료", f"진료일 {claim.visit_date} < 보험 개시일 {policy.start_date}",
                           amount=sum(l.total for l in lines) + sum(d.total for d in drugs)))

    # Lines dated before the start inside a claim whose visit is after it: excluded above, explained here — treatment
    # that began before cover is also a pre-existing-condition (기왕증) signal (SIU, see _siu).
    pre_start = [(ln, li) for ln, li in zip(lines, claim.line_items) if li.service_date and li.service_date < policy.start_date]
    if pre_start and not before_start:
        pre_dates = sorted({li.service_date for _, li in pre_start})
        pre_amount = sum(ln.total for ln, _ in pre_start)
        findings.append(_f("coverage.service_before_policy_start", "coverage", Severity.warning,
                           "보험 개시 전 진료일이 포함된 청구",
                           f"{len(pre_start)}개 항목({_won(pre_amount)})의 진료일({', '.join(d.isoformat() for d in pre_dates)})이 "
                           f"보험 개시일 {policy.start_date.isoformat()} 이전이라 지급에서 제외했습니다. 개시 전에 시작된 치료는 "
                           "가입 전 발병(기왕증)일 수 있습니다.",
                           amount=pre_amount,
                           evidence=[f"보험 개시 {policy.start_date.isoformat()}", f"청구 진료일 {claim.visit_date.isoformat()}"]
                           + [f"{ln.description} — {li.service_date.isoformat()}" for ln, li in pre_start[:5]]))

    _allocate_discounts(decisions, lines)
    billed = sum(d.amount for d in decisions)
    eligible = 0 if before_start else max(0, sum(d.eligible_amount for d in decisions))
    ineligible = billed - eligible

    # Days for per-day deductibles and limits: distinct service dates, or the hospitalization day count.
    eligible_lines = [(ln, li) for (ln, li), d in zip(zip(lines, claim.line_items), decisions) if d.eligible]
    dates = {li.service_date or claim.visit_date for _, li in eligible_lines}
    hosp_days = max([ln.quantity for ln, _ in eligible_lines if ln.category == "hospitalization"] or [0])
    days = int(max(1, len(dates), hosp_days))

    ded = policy.deductible
    ded_total = ded.amount * (days if ded.basis == "per_day" else 1)
    deductible = min(eligible, ded_total)
    if policy.copay_method == "max":
        owner_share = min(eligible, max(ded_total, eligible * policy.copay_ratio))
        reimbursed = int(eligible - owner_share)
        copay_amount = int(round(owner_share - deductible))
    else:
        reimbursed = int((eligible - deductible) * policy.coverage_ratio)
        copay_amount = max(0, eligible - deductible - reimbursed)
    before_caps = reimbursed

    capped_by = None
    lim = policy.limits
    surgery_eligible = sum(d.eligible_amount for d in decisions if d.benefit_type == "surgery" and d.eligible_amount > 0)
    positive_eligible = sum(d.eligible_amount for d in decisions if d.eligible_amount > 0)
    if lim.per_surgery is not None and surgery_eligible > 0 and positive_eligible > 0:
        # The surgery's share of the reimbursement; discounts are spread pro rata, so the share is taken over the
        # positive eligible items and can never exceed 1.
        surgery_part = reimbursed * min(1.0, surgery_eligible / positive_eligible)
        if surgery_part > lim.per_surgery:
            reimbursed, capped_by = int(reimbursed - (surgery_part - lim.per_surgery)), "per_surgery_limit"
    if lim.per_day is not None and reimbursed > lim.per_day * days:
        reimbursed, capped_by = lim.per_day * days, "per_day_limit"
    if lim.per_visit is not None and reimbursed > lim.per_visit:
        reimbursed, capped_by = lim.per_visit, "per_visit_limit"
    if lim.annual_visits is not None and policy.usage.visits_this_year >= lim.annual_visits and reimbursed > 0:
        reimbursed, capped_by = 0, "annual_visit_limit"
        findings.append(_f("coverage.annual_visit_limit", "coverage", Severity.warning, "연간 통원 횟수 한도 소진",
                           f"올해 {policy.usage.visits_this_year}회 이용 — 한도 {lim.annual_visits}회."))
    if lim.annual_amount is not None:
        remaining = max(0, lim.annual_amount - policy.usage.amount_this_year)
        if reimbursed > remaining:
            reimbursed, capped_by = remaining, "annual_limit"

    _policy_terms(policy, findings)
    payable = Payable(billed=billed, ineligible=ineligible, eligible=eligible, deductible=deductible,
                      reimbursed=max(0, reimbursed), capped_by=capped_by, coverage_ratio=policy.coverage_ratio,
                      copay_method=policy.copay_method, deductible_basis=ded.basis, days=days,
                      copay_amount=copay_amount, limit_reduction=max(0, before_caps - max(0, reimbursed)))
    return payable, decisions, claim_benefit, has_covered


def _policy_terms(policy: Policy, findings: List[Finding]) -> None:
    """Flag (info) a policy whose terms fall outside its regime. Coverage is never capped here."""
    outside_fss = policy.copay_ratio < 0.3 - 1e-9 or policy.deductible.amount < 30_000
    if not outside_fss:
        return
    terms = f"보장 {policy.coverage_ratio:.0%} · 자기부담금 {_won(policy.deductible.amount)}"
    if policy.regime_inferred:
        hint = ("2025.5 이전 개시 계약으로 보입니다 — 구 상품 조건인지 확인하세요."
                if policy.effective_regime == "legacy" else "2025.5 이전 계약인지 확인하세요.")
        findings.append(_f("coverage.policy_terms_check", "coverage", Severity.info, "상품 조건 확인",
                           f"2025.5 금감원 기준(보장비율 ≤70%, 자기부담금 ≥3만원)과 다른 조건의 계약입니다 ({terms}). {hint}"))
    elif policy.regime == "fss_2025_05":
        findings.append(_f("coverage.policy_terms_check", "coverage", Severity.info, "상품 조건이 계약 기준과 다름",
                           f"fss_2025_05 계약인데 {terms}입니다 (기준: 자기부담 ≥30%, ≥₩30,000). 계약 정보를 확인하세요.",
                           evidence=[_statutory()["fss_2025_05_ref"]]))


# ── Clinical ──────────────────────────────────────────────────────


def _plausible_classes(dx_codes: Iterable[str], line_categories: Set[str]) -> Set[str]:
    meta = diagnosis_book()["_meta"]
    allowed = set(meta["always_plausible_drug_classes"])
    for code in dx_codes:
        allowed |= set(diagnoses_by_code()[code]["expected_drug_classes"])
    for cat, classes in meta["procedure_justifies_drug_classes"].items():
        if cat in line_categories:
            allowed |= set(classes)
    return allowed


def _clinical(claim, policy, dx, lines, items, findings):
    species = claim.patient.species.value
    breed = compact(claim.patient.breed or "")
    dx_codes = [d["code"] for d in dx if d["code"]]
    line_categories = {l.category for l in lines if l.category}
    rules = clinical_rules()

    # Procedures that the diagnoses do not usually justify (e.g. MRI for dermatitis).
    if dx_codes:
        for ln in lines:
            if not ln.code:
                continue
            atypical_for = [c for c in dx_codes if ln.code in diagnoses_by_code()[c]["atypical_procedures"]]
            justified = [c for c in dx_codes if ln.code not in diagnoses_by_code()[c]["atypical_procedures"]
                         and ln.category in diagnoses_by_code()[c]["expected_procedure_categories"]]
            if atypical_for and not justified:
                names = ", ".join(diagnoses_by_code()[c]["name_ko"] for c in atypical_for)
                findings.append(_f("clinical.procedure_not_indicated", "clinical", Severity.warning,
                                   f"진단과 맞지 않는 검사·시술: {ln.code_name}",
                                   f"'{names}' 진단에서 {ln.code_name}은(는) 통상 1차 검사로 시행되지 않습니다. 시행 사유를 소견서로 확인하세요(진료부는 SIU 의뢰 시에만 요청).",
                                   item_ref=ln.code, amount=ln.total,
                                   evidence=[f"청구 진단: {names}", f"항목 금액 ₩{ln.total:,}"]))

    # Drugs that no claimed diagnosis explains; chronic-marker drugs hint at undisclosed conditions.
    allowed = _plausible_classes(dx_codes, line_categories)
    recent_policy = (claim.visit_date - policy.start_date).days < 365
    for dr, _ in items:
        if not dr.drug_id:
            continue
        markers = chronic_marker_diagnoses(dr.drug_id)
        if markers and dx_codes and not set(markers) & set(dx_codes):
            implied = ", ".join(diagnoses_by_code()[m]["name_ko"] for m in markers if m in diagnoses_by_code())
            detail = f"{dr.ingredient}은(는) 주로 [{implied}] 치료에 쓰이는 약물이나 청구 진단에 해당 질환이 없습니다."
            if recent_policy:
                detail += " 가입 1년 이내 청구로, 가입 전 진단 이력(기왕증) 확인이 필요합니다(SIU 의뢰 — 진료기록 요청)."
            findings.append(_f("clinical.undisclosed_chronic_condition", "clinical", Severity.warning,
                               f"미신고 만성질환 신호: {dr.ingredient}", detail, item_ref=dr.drug_id, amount=dr.total,
                               evidence=[f"약물 분류: {class_label(dr.therapeutic_class)}", f"추정 질환: {implied}",
                                         f"보험 개시 후 {(claim.visit_date - policy.start_date).days}일"]))
            continue
        # A preventive / quasi-drug product is excluded from payment anyway (coverage); no mismatch noise.
        if dx_codes and dr.therapeutic_class and dr.therapeutic_class not in allowed and not dr.noncovered_category:
            findings.append(_f("clinical.drug_diagnosis_mismatch", "clinical", Severity.warning,
                               f"진단과 무관한 처방: {dr.ingredient}",
                               f"{class_label(dr.therapeutic_class)} 계열인 {dr.ingredient}은(는) 청구된 진단으로 설명되지 않습니다. 별도 질환 치료가 함께 청구되었을 수 있습니다.",
                               item_ref=dr.drug_id, amount=dr.total,
                               evidence=[f"청구 진단: {', '.join(d['name_ko'] for d in dx if d['code'])}"]))

    # Species-specific safety rules (curated, referenced). Any ingredient of a combination counts for
    # dose-independent rules; dose rules apply to the primary ingredient only (the dose belongs to it).
    for rule in rules["species_rules"]:
        if rule["species"] != species:
            continue
        dose_rule = any(k in rule for k in ("max_mg_per_kg_per_day", "max_mg_per_kg_per_day_after_day1", "breeds"))
        for dr, rx in items:
            ids = {dr.drug_id} if dose_rule else ({dr.drug_id} | set(dr.ingredients))
            if not ids & set(rule["drugs"]):
                continue
            dose = dr.dose_mg_per_kg
            fire = True
            if "max_mg_per_kg_per_day" in rule:
                fire = dose is not None and dose * _per_day(rx.frequency) > rule["max_mg_per_kg_per_day"]
            elif "max_mg_per_kg_per_day_after_day1" in rule:
                fire = (rx.days or 1) > 1 and dose is not None and dose * _per_day(rx.frequency) > rule["max_mg_per_kg_per_day_after_day1"]
            elif "breeds" in rule:
                fire = any(compact(b) in breed for b in rule["breeds"]) and dose is not None and dose >= rule["min_mg_per_kg"]
            if fire:
                findings.append(_f(f"clinical.species.{rule['id']}", "clinical", Severity(rule["severity"]),
                                   rule["title"], rule["detail"], item_ref=dr.drug_id, amount=dr.total,
                                   evidence=rule["refs"] + ([f"청구 용량 {dose} mg/kg"] if dose is not None else [])))

    # Combination rules.
    classes = [dr.therapeutic_class for dr, _ in items if dr.therapeutic_class]
    for rule in rules["combination_rules"]:
        pool = list(classes)
        ok = True
        for c in rule["classes"]:
            if c in pool:
                pool.remove(c)
            else:
                ok = False
        if ok:
            findings.append(_f(f"clinical.combo.{rule['id']}", "clinical", Severity(rule["severity"]),
                               rule["title"], rule["detail"], evidence=rule["refs"]))

    # Dose far above the species reference: >2× the highest listed dose, or ≥5× the typical
    # dose (catches decimal-shift errors on drugs that also have a high-dose indication).
    for dr, rx in items:
        if not dr.drug_id or dr.dose_mg_per_kg is None:
            continue
        ref = dose_reference(dr.drug_id, species, rx.route)
        if not ref or ref.max_mg_per_kg <= 0:
            continue
        over_max = dr.dose_mg_per_kg / ref.max_mg_per_kg
        over_typ = dr.dose_mg_per_kg / ref.typical_mg_per_kg if ref.typical_mg_per_kg > 0 else 0
        if over_max > 2 or over_typ >= 5:
            severe = over_max >= 4 or over_typ >= 10
            findings.append(_f("clinical.dose_above_reference", "clinical",
                               Severity.critical if severe else Severity.warning,
                               f"참고 용량 초과: {dr.ingredient} (통상 용량의 {over_typ:.1f}배)",
                               f"청구 용량 {dr.dose_mg_per_kg} mg/kg — {species} 통상 {ref.typical_mg_per_kg}, 최대 {ref.max_mg_per_kg} mg/kg/회. 단위 오기(소수점·mg↔mL) 또는 수량 과다 청구 여부를 확인하세요.",
                               item_ref=dr.drug_id, amount=dr.total,
                               evidence=[f"근거: {ref.provenance}"] + ref.contexts))


# ── Pricing ───────────────────────────────────────────────────────


def _pricing(claim, lines, findings):
    posted = claim.clinic.posted_prices or {}
    mixed = _mixed_line_indexes(claim)
    for i, ln in enumerate(lines):
        if not ln.code or i in mixed:
            continue  # a mixed line's amount includes non-medical items: not a procedure price (held, MIXED_BASKET_UNSPLIT)
        if ln.code in posted and ln.unit_price > posted[ln.code]:
            over = (ln.unit_price - posted[ln.code]) * ln.quantity
            findings.append(_f("pricing.above_posted_fee", "pricing", Severity.warning,
                               f"게시 진료비 초과: {ln.code_name}",
                               f"이 병원이 게시한 진료비 ₩{posted[ln.code]:,}보다 ₩{ln.unit_price - posted[ln.code]:,} 높게 청구되었습니다(수의사법 진료비 게시 의무).",
                               item_ref=ln.code, amount=over,
                               evidence=[f"게시가 ₩{posted[ln.code]:,}", f"청구 단가 ₩{ln.unit_price:,}"]))
        if ln.benchmark_percentile is not None and ln.benchmark_percentile >= 97 and ln.total >= 30_000:
            pos = price_position(ln.code, ln.unit_price, claim.clinic.region)
            excess = max(0, (ln.unit_price - pos.p90) * ln.quantity)
            findings.append(_f("pricing.regional_outlier", "pricing",
                               Severity.warning if ln.benchmark_percentile < 99.5 else Severity.critical,
                               f"지역 대비 고가: {ln.code_name} (P{ln.benchmark_percentile:.0f})",
                               f"단가 ₩{ln.unit_price:,} — {claim.clinic.region or '전국'} 중앙값 ₩{pos.median:,}, P90 ₩{pos.p90:,}.",
                               item_ref=ln.code, amount=excess,
                               evidence=[f"벤치마크: {pos.source}" + (" (추정치)" if pos.is_estimate else "")]))
        proc = procedures_by_code()[ln.code]
        max_qty = proc.get("max_qty_per_visit")
        if max_qty and ln.quantity > max_qty:
            findings.append(_f("pricing.quantity_implausible", "pricing", Severity.warning,
                               f"비정상 수량: {ln.code_name} × {ln.quantity:g}",
                               f"1회 내원 기준 통상 최대 {max_qty}{proc['unit']}입니다.",
                               item_ref=ln.code, amount=max(0, ln.unit_price) * (ln.quantity - max_qty)))


@lru_cache(maxsize=16384)
def _line_is_outlier(description: str, code: Optional[str], unit_price: int, quantity: float, region: Optional[str]) -> bool:
    c = match_procedure(description, code)[0]
    pos = price_position(c, unit_price, region) if c else None
    return bool(pos and pos.percentile >= 97 and unit_price * quantity >= 30_000)


def _claim_has_outlier(c: Claim) -> bool:
    return any(_line_is_outlier(li.description, li.code, li.unit_price, li.quantity, c.clinic.region) for li in c.line_items)


# ── Integrity ─────────────────────────────────────────────────────


def _integrity(claim, dx, lines, history, findings):
    p = claim.patient
    species = p.species.value
    breed = compact(p.breed or "")
    for ln in lines:
        need = SPECIES_ONLY_CODES.get(ln.code or "")
        if need and need != species:
            findings.append(_f("integrity.species_mismatch_item", "integrity", Severity.critical,
                               f"종 불일치 항목: {ln.code_name}",
                               f"{'개' if need == 'dog' else '고양이'} 전용 항목이 {'개' if species == 'dog' else '고양이'} 청구에 포함되어 있습니다. 다른 동물의 진료비가 합산되었을 가능성이 있습니다.",
                               item_ref=ln.code, amount=ln.total))
    for d in dx:
        entry = diagnoses_by_code().get(d["code"] or "")
        if entry and entry["species"] and entry["species"] != species:
            findings.append(_f("integrity.species_mismatch_diagnosis", "integrity", Severity.warning,
                               f"종 불일치 진단: {entry['name_ko']}",
                               f"주로 {'개' if entry['species'] == 'dog' else '고양이'}에서 진단되는 질환입니다. 환자 정보를 확인하세요.",
                               item_ref=entry["code"]))
    hints = CAT_BREED_HINTS if species == "dog" else DOG_BREED_HINTS
    if breed and any(compact(h) in breed for h in hints):
        findings.append(_f("integrity.breed_species_mismatch", "integrity", Severity.warning,
                           "품종-종 불일치", f"품종 '{p.breed}'이(가) 청구된 종({species})과 맞지 않습니다. 피보험 동물 동일성 확인이 필요합니다."))
    if p.weight_kg:
        if species == "cat" and p.weight_kg > 12:
            findings.append(_f("integrity.weight_implausible", "integrity", Severity.warning,
                               "체중 이상", f"고양이 체중 {p.weight_kg}kg은 통상 범위를 벗어납니다. 동물 동일성 또는 입력 오류를 확인하세요."))
        if species == "dog" and any(compact(b) in breed for b in SMALL_BREEDS) and p.weight_kg > 10:
            findings.append(_f("integrity.weight_implausible", "integrity", Severity.warning,
                               "체중-품종 불일치", f"소형견 품종({p.breed})에 체중 {p.weight_kg}kg은 비정상적입니다. 동물 동일성 확인이 필요합니다."))

    if claim.submitted_date and (claim.submitted_date - claim.visit_date).days > CLAIM_LIMITATION_DAYS:
        findings.append(_f("integrity.claim_time_barred", "integrity", Severity.critical,
                           "청구권 소멸시효 경과", "진료일로부터 3년이 지난 청구입니다(상법 제662조)."))

    mine = {l.code: l.total for l in lines if l.code}
    total = sum(v for v in mine.values() if v > 0) or 1
    identity_seen = False
    for prev in history or []:
        if prev.claim_id == claim.claim_id or prev.patient.patient_id != p.patient_id:
            continue
        if not identity_seen:
            pp = prev.patient
            reg_conflict = bool(p.registration_no and pp.registration_no and compact(p.registration_no) != compact(pp.registration_no))
            if pp.species != p.species or reg_conflict:
                identity_seen = True
                what = "종" if pp.species != p.species else "동물등록번호"
                findings.append(_f("integrity.identity_mismatch_history", "integrity", Severity.warning,
                                   f"동일 환자 ID의 {what} 불일치",
                                   f"기존 청구 {prev.claim_id}와 같은 환자 ID인데 {what}이(가) 다릅니다. 피보험 동물 동일성 확인이 필요합니다.",
                                   evidence=[f"기존 청구 {prev.claim_id} ({prev.visit_date})"]))
        prev_codes = {match_procedure(li.description, li.code)[0] for li in prev.line_items}
        overlap = sum(v for c, v in mine.items() if c in prev_codes and v > 0)
        same_day = prev.visit_date == claim.visit_date
        if same_day and overlap / total >= 0.5:
            findings.append(_f("integrity.duplicate_claim", "integrity", Severity.critical,
                               "중복 청구 의심", f"동일 환자·동일 진료일의 기존 청구 {prev.claim_id}와 항목 {overlap / total:.0%}가 겹칩니다.",
                               amount=overlap, evidence=[f"기존 청구 {prev.claim_id} ({prev.clinic.clinic_id})"]))


# ── SIU (referral grade, never denial) ────────────────────────────


def _siu(claim, policy, dx, findings, history) -> List[SiuFlag]:
    flags: List[SiuFlag] = []
    rules = {f.rule: f for f in findings}
    days_in = (claim.visit_date - policy.start_date).days

    chronic = [f for f in findings if f.rule == "clinical.undisclosed_chronic_condition"]
    soon = [d for d in dx if d["code"] and d["chronic"] and 0 <= days_in < CHRONIC_SOON_DAYS
            and not (diagnoses_by_code()[d["code"]].get("congenital"))]
    if chronic and 0 <= days_in < 365:
        f = chronic[0]
        flags.append(SiuFlag(code="UNDISCLOSED_CHRONIC", title_ko="미신고 만성질환 의심 (가입 1년 이내)",
                             detail_ko=f"{f.title} — 보험 개시 후 {days_in}일. 가입 전 진료 이력 확인을 위해 진료기록을 요청합니다.",
                             evidence=f.evidence, finding_rule=f.rule, requests_record=True))
    elif soon:
        names = ", ".join(d["name_ko"] for d in soon)
        flags.append(SiuFlag(code="UNDISCLOSED_CHRONIC", title_ko="가입 직후 만성질환 청구",
                             detail_ko=f"만성 질환({names})이 보험 개시 후 {days_in}일 만에 청구되었습니다. 가입 전 발병 여부 확인을 위해 진료기록을 요청합니다.",
                             evidence=[f"보험 개시 {policy.start_date}", f"진료일 {claim.visit_date}"], requests_record=True))
    pre = rules.get("coverage.service_before_policy_start")
    if pre:
        # Treatment that began before cover: the same question (pre-existing condition), settled by the 진료부.
        prior = next((f for f in flags if f.code == "UNDISCLOSED_CHRONIC"), None)
        if prior:
            prior.evidence = [*prior.evidence, *pre.evidence[:2]]
        else:
            flags.append(SiuFlag(code="UNDISCLOSED_CHRONIC", title_ko="보험 개시 전 시작된 진료 (기왕증 의심)",
                                 detail_ko=f"{pre.detail} 발병 시점 확인을 위해 진료기록을 요청합니다.",
                                 evidence=pre.evidence, finding_rule=pre.rule, requests_record=True))

    ident = next((rules[r] for r in ("integrity.species_mismatch_item", "integrity.breed_species_mismatch",
                                     "integrity.identity_mismatch_history") if r in rules), None)
    if ident:
        # The 진료부 records 품종·성별·특징·연령 and the registration number (시행규칙 §13): it can settle identity.
        flags.append(SiuFlag(code="IDENTITY_MISMATCH", title_ko="피보험 동물 동일성 불일치", detail_ko=ident.detail,
                             evidence=ident.evidence, finding_rule=ident.rule, requests_record=True))

    if "integrity.duplicate_claim" in rules:
        f = rules["integrity.duplicate_claim"]
        flags.append(SiuFlag(code="DUPLICATE_ACROSS_CLAIMS", title_ko="청구 간 중복", detail_ko=f.detail,
                             evidence=f.evidence, finding_rule=f.rule))

    if "pricing.regional_outlier" in rules and history:
        prior = [c for c in history if c.clinic.clinic_id == claim.clinic.clinic_id and c.claim_id != claim.claim_id
                 and _claim_has_outlier(c)]
        if len(prior) >= PRICE_OUTLIER_REPEAT:
            flags.append(SiuFlag(code="REPEATED_PRICE_OUTLIER", title_ko="반복적 지역 대비 고가 청구",
                                 detail_ko=f"이 병원의 기존 청구 {len(prior)}건에서도 지역 P97 이상 단가가 확인되었습니다. 병원 단위 가격 패턴 검토 대상입니다.",
                                 evidence=[f"{c.claim_id} ({c.visit_date})" for c in prior[-5:]],
                                 finding_rule="pricing.regional_outlier"))
    return flags


# ── Documents and pend reasons ────────────────────────────────────


@lru_cache(maxsize=16384)
def _pieces_categories(text: str) -> FrozenSet[str]:
    cats = set()
    for piece in _MIX_SPLIT.split(text or ""):
        if len(compact(piece)) < 2:
            continue
        code = match_procedure(piece)[0]
        if code:
            cats.add(procedures_by_code()[code].get("coverage_category") or "medical")
        elif resolve_drug_line(piece):
            cats.add("medical")  # 'Buprenorphine inj+위생미용': a drug line bundled with grooming
    return frozenset(cats)


def _itemization_problem(claim: Claim, lines: List[NormalizedLine], drugs: List[NormalizedDrug],
                         present: Set[DocType]) -> Optional[str]:
    if DocType.RECEIPT_TOTAL_ONLY in present and not present & set(ITEMIZATION_DOCS):
        return "합계만 표시된 영수증입니다. 항목별 영수증 또는 진료비 세부내역서가 필요합니다."
    billed = sum(l.total for l in lines) + sum(d.total for d in drugs)
    if not lines and not drugs:
        if (claim.invoice_total or 0) > 0:
            return f"영수증 합계 {_won(claim.invoice_total)}에 대한 진료 항목이 없습니다."
        return None
    if len(lines) == 1 and not drugs:
        ln = lines[0]
        generic = set(procedure_book()["_meta"].get("generic_codes", []))
        totalish = any(w in compact(ln.description) for w in TOTAL_WORDS)
        if not ln.code and not ln.drug_id or totalish or (ln.code in generic and ln.total >= GENERIC_TOTAL_MIN):
            return f"'{ln.description}' 한 줄({_won(ln.total)})만 청구되어 항목별 내역을 알 수 없습니다."
    if claim.invoice_total is not None and abs(billed - claim.invoice_total) > 10:
        return (f"항목 합계 {_won(billed)}가 영수증 합계 {_won(claim.invoice_total)}와 {_won(abs(billed - claim.invoice_total))} "
                "차이가 납니다. 누락된 항목이 있는지 세부내역서로 확인이 필요합니다.")
    return None


def _condition_amounts(claim, policy, dx, decisions, history, cumulative: bool) -> Dict[int, int]:
    """Medical amount per diagnosis (index into dx) for per-condition 진단서 thresholds. When lines carry
    diagnosis_refs, a diagnosis counts the lines that reference it plus the unreferenced lines and prescriptions;
    otherwise every diagnosis counts the whole medical amount."""
    medical_decisions = [d for d in decisions if d.benefit_type not in ("non_medical", "admin", "preventive")
                         and not d.reason_code.startswith("noncovered_product")]
    medical = sum(d.amount for d in medical_decisions)

    def refs_of(d: LineDecision) -> List[int]:
        if d.source != "line":
            return []
        return [r for r in claim.line_items[d.line_index].diagnosis_refs or [] if 0 <= r < len(dx)]

    referenced = any(refs_of(d) for d in decisions)
    out = {}
    for i, d in enumerate(dx):
        amount = sum(x.amount for x in medical_decisions if not refs_of(x) or i in refs_of(x)) if referenced else medical
        if cumulative and d["code"]:
            totals = policy.usage.condition_totals
            amount += totals.get(d["code"], totals.get(d["condition_group"] or "", 0))
            for prev in history or []:
                if (prev.claim_id == claim.claim_id or prev.patient.patient_id != claim.patient.patient_id
                        or not (claim.visit_date - timedelta(days=365) <= prev.visit_date <= claim.visit_date)):
                    continue
                if any(match_diagnosis_full(t).code == d["code"] for t in prev.diagnosis_texts()):
                    amount += sum(li.total for li in prev.line_items if li.unit_price > 0) + \
                        sum(int(round(rx.unit_price * rx.quantity)) for rx in prev.prescriptions)
        out[i] = amount
    return out


def _documents(claim, policy, profile, dx, lines, drugs, decisions, payable, findings, siu, history, mode):
    docs: Optional[List[Document]] = claim.documents
    if docs is None and mode == "precheck":
        docs = []
    known = docs is not None
    present: Set[DocType] = {d.doc_type for d in docs or []}
    channel = claim.intake_channel
    live = channel == IntakeChannel.emr_autoclaim or (channel == IntakeChannel.live_counter and profile.get("live_counter"))
    reqs: List[RequiredDocument] = []
    pends: List[PendReason] = []
    name = profile.get("name_ko", "기본 프로필")

    def status(sat: bool) -> str:
        return "satisfied" if sat else ("missing" if known else "unknown")

    # 1. Itemized receipt — evaluable from the claim data itself.
    problem = _itemization_problem(claim, lines, drugs, present)
    sat = problem is None or bool(live and not problem)
    reqs.append(RequiredDocument(doc_type=DocType.RECEIPT_ITEMIZED, alternatives=[DocType.DETAIL_STATEMENT], actor="clinic",
                                 why_ko="항목별 진료비 영수증 또는 진료비 세부내역서 (합계만 있는 영수증은 심사 불가)",
                                 satisfied=sat, status="satisfied" if sat else "missing", pend_code="RECEIPT_NOT_ITEMIZED"))
    if problem:
        pends.append(PendReason(code="RECEIPT_NOT_ITEMIZED", actor="clinic", detail_ko=problem,
                                requests=[DocType.RECEIPT_ITEMIZED, DocType.DETAIL_STATEMENT]))
    if profile.get("detail_statement_listed"):
        sat = DocType.DETAIL_STATEMENT in present or bool(live)
        reqs.append(RequiredDocument(doc_type=DocType.DETAIL_STATEMENT, actor="clinic", required=False,
                                     why_ko=f"{name}: 영수증과 함께 진료비 세부내역서를 요청합니다.",
                                     satisfied=sat, status=status(sat)))

    # 2. Mixed basket: non-medical items folded into a medical line.
    mixed_idx = _mixed_line_indexes(claim)
    mixed = [ln for i, ln in enumerate(lines) if i in mixed_idx]
    if mixed:
        pends.append(PendReason(code="MIXED_BASKET_UNSPLIT", actor="clinic", requests=[DocType.DETAIL_STATEMENT],
                                detail_ko=f"진료비와 비의료 항목(사료·미용·호텔·용품)이 한 줄로 합산되어 있습니다: "
                                          f"{', '.join(repr(l.description) for l in mixed[:3])}. 항목별로 나누어 발급이 필요합니다."))

    # 3. Diagnosis present / mapped / certified.
    if not dx:
        pends.append(PendReason(code="MISSING_DX", actor="clinic", requests=[DocType.DX_CERT_STATUTORY],
                                detail_ko="진단명이 없습니다. 진단명이 기재된 영수증·소견서 또는 진단서가 필요합니다."))
    for d in dx:
        if not d["code"]:
            pends.append(PendReason(code="DX_UNMAPPED", actor="clinic", requests=[DocType.DX_CERT_STATUTORY],
                                    detail_ko=f"진단명 '{d['input']}'을(를) 표준 질병코드로 확인할 수 없습니다. 표준 진단명 또는 진단서가 필요합니다."))

    dxc = profile.get("dx_certificate") or {}
    accepts = [DocType(t) for t in dxc.get("accepts", [t.value for t in DX_DOCS])]
    has_dx_doc = bool(present & set(accepts))
    code_system = dxc.get("insurer_code_system")
    has_insurer_code = not code_system or any(c["system"] == code_system for d in dx for c in d["codes"])
    threshold = dxc.get("threshold")
    amounts = _condition_amounts(claim, policy, dx, decisions, history, dxc.get("basis") == "per_condition_cumulative")
    over = [(dx[i], a) for i, a in amounts.items() if threshold is not None and _over(a, threshold, dxc.get("inclusive", False))]
    symptom_only = bool(dx) and all(d["code"] and d["specificity"] == "symptom" for d in dx)
    needs_code = bool(code_system and has_dx_doc)
    if over or needs_code:
        sat = (has_dx_doc and has_insurer_code) or bool(live)
        st = "satisfied" if sat else ("missing" if (known or live) else "unknown")
        if over:
            op = "이상" if dxc.get("inclusive") else "초과"
            basis = " (질병별 누적)" if dxc.get("basis") == "per_condition_cumulative" else ""
            why = f"진단서가 필요합니다 ({_won(threshold)} {op}{basis}) — {name}"
            detail = f"질병당 진료비 {_won(over[0][1])}{basis}로 {name} 기준 {_won(threshold)} {op}입니다. 진단서 또는 보험사 양식 진료확인서가 필요합니다."
            if dxc.get("basis_is_inference"):
                detail += " (방문 합산 기준은 추론 — 보험사 확인 필요)"
            if symptom_only:
                detail += " 진단명이 증상명뿐이므로 확정 또는 추정 진단명이 기재되어야 합니다."
        else:
            why = f"{name}: 제출하는 진단서에 보험사 상병코드 필요"
            detail = ""
        if code_system and not has_insurer_code:
            extra = f"{name}는 진단서·진료확인서에 자사 반려동물 상병코드({code_system})를 요구합니다."
            detail = f"{detail} {extra}".strip()
        reqs.append(RequiredDocument(doc_type=DocType.DX_CERT_STATUTORY, alternatives=[t for t in accepts if t != DocType.DX_CERT_STATUTORY],
                                     actor="clinic", why_ko=why, satisfied=sat, status=st, pend_code="NEED_DX_CERT"))
        if st == "missing":
            pends.append(PendReason(code="NEED_DX_CERT", actor="clinic", detail_ko=detail, requests=accepts))
    elif symptom_only:
        # Below the threshold a symptom-only diagnosis (구토, 설사) is not a pend reason (spec §C defines none, and a
        # v1 body must not pend on it): list the certificate as optional and say why.
        sat = has_dx_doc or bool(live)
        reqs.append(RequiredDocument(doc_type=DocType.DX_CERT_STATUTORY, alternatives=[t for t in accepts if t != DocType.DX_CERT_STATUTORY],
                                     actor="clinic", required=False, satisfied=sat, status=status(sat),
                                     why_ko="증상명만 기재 — 확정·추정 진단명이 적힌 진단서나 소견서가 있으면 함께 제출"))
        names = ", ".join(d["name_ko"] for d in dx)
        findings.append(_f("documents.symptom_only_diagnosis", "documents", Severity.info, "증상명만 기재된 진단",
                           f"진단명이 증상({names})뿐입니다. 진단서 기준 금액 이하라 서류를 요청하지 않지만, 같은 증상으로 "
                           "청구가 반복되거나 금액이 기준을 넘으면 질병을 특정한 진단서가 필요합니다."))

    # 4. Imaging must show date and time.
    imaging_lines = [l for l in lines if l.category == "imaging"]
    imaging_docs = [d for d in docs or [] if d.doc_type == DocType.IMAGING]
    if imaging_lines and profile.get("imaging_timestamp_required"):
        if imaging_docs:
            sat = all(d.captured_at for d in imaging_docs)
            reqs.append(RequiredDocument(doc_type=DocType.IMAGING, actor="clinic", why_ko="영상 자료에 촬영 일시가 보여야 합니다",
                                         satisfied=sat, status="satisfied" if sat else "missing", pend_code="IMAGING_NO_TIMESTAMP"))
            if not sat:
                n = sum(1 for d in imaging_docs if not d.captured_at)
                pends.append(PendReason(code="IMAGING_NO_TIMESTAMP", actor="clinic", requests=[DocType.IMAGING],
                                        detail_ko=f"영상 자료 {n}건에 촬영 일시가 없습니다. 촬영 일시가 표시된 사본이 필요합니다."))
        else:
            reqs.append(RequiredDocument(doc_type=DocType.IMAGING, actor="clinic", required=False,
                                         why_ko="영상 자료를 제출할 때는 촬영 일시가 보이도록 발급하세요",
                                         satisfied=False, status="unknown"))

    # 5. Pet identity: registration number, or the profile's photo set.
    pid = profile.get("pet_id") or {}
    photos = pid.get("photos", "when_unregistered")
    photo_set = [DocType(t) for t in pid.get("photo_set", [])]
    registered = bool(claim.patient.registration_no) or DocType.REGISTRATION_CERT in present
    if photo_set and (photos == "always" or (photos == "when_unregistered" and not registered)):
        sat = all(t in present for t in photo_set) or bool(live)
        why = (f"{name}: 모든 청구에 사진({', '.join(DOC_KO[t.value] for t in photo_set)})" if photos == "always"
               else f"동물등록번호가 없으면 사진({', '.join(DOC_KO[t.value] for t in photo_set)})으로 동일성 확인")
        for t in photo_set:
            reqs.append(RequiredDocument(doc_type=t, actor="owner", why_ko=why,
                                         alternatives=[DocType.REGISTRATION_CERT] if photos != "always" else [],
                                         satisfied=t in present or bool(live), status=status(t in present or bool(live)),
                                         pend_code="PET_ID_UNVERIFIED"))
        if status(sat) == "missing":
            missing = [DOC_KO[t.value] for t in photo_set if t not in present]
            pends.append(PendReason(code="PET_ID_UNVERIFIED", actor="owner", requests=photo_set,
                                    detail_ko=("동물등록번호가 없어 " if photos != "always" else f"{name}는 ")
                                    + f"사진({', '.join(missing)})으로 피보험 동물을 확인해야 합니다."))

    # 6. Originals above the insurer threshold (not for EMR / live-counter claims).
    originals_received = any(d.original_received_at for d in docs or [] if d.doc_type in ITEMIZATION_DOCS + DX_DOCS)
    orig = profile.get("originals")
    if orig and _over(payable.billed, orig["threshold"], orig.get("inclusive", False)) and not live:
        sat = originals_received
        op = "이상" if orig.get("inclusive") else "초과"
        reqs.append(RequiredDocument(doc_type=DocType.RECEIPT_ITEMIZED, alternatives=[DocType.DETAIL_STATEMENT], actor="owner",
                                     why_ko=f"원본 서류 우편·방문 제출 ({name} {_won(orig['threshold'])} {op})",
                                     satisfied=sat, status=status(sat), pend_code="ORIGINALS_REQUIRED"))
        if status(sat) == "missing":
            pends.append(PendReason(code="ORIGINALS_REQUIRED", actor="owner", requests=[DocType.RECEIPT_ITEMIZED],
                                    detail_ko=f"청구액 {_won(payable.billed)} — {name}는 {_won(orig['threshold'])} {op} 청구에 원본 서류를 요구합니다."))
    app_max = profile.get("app_claim_max")
    if app_max and channel == IntakeChannel.insurer_app and payable.billed > app_max and not originals_received:
        reqs.append(RequiredDocument(doc_type=DocType.RECEIPT_ITEMIZED, actor="owner", satisfied=False, status="missing",
                                     why_ko=f"{name} 앱 청구 한도 {_won(app_max)} 초과 — 우편 접수", pend_code="ORIGINALS_REQUIRED"))
        pends.append(PendReason(code="ORIGINALS_REQUIRED", actor="owner", requests=[DocType.RECEIPT_ITEMIZED],
                                detail_ko=f"청구액 {_won(payable.billed)}가 {name} 앱 청구 한도 {_won(app_max)}를 넘습니다. 우편으로 접수해야 합니다."))

    # 7. Supplementary documents the insurer lists (never pend here).
    below = threshold is not None and not over
    for s in profile.get("supplementary") or []:
        if s.get("when") == "below_dx_threshold" and not below:
            continue
        doc_type = DocType(s["doc_type"])
        alts = [DocType(a) for a in s.get("alternatives", [])]
        sat = bool(present & {doc_type, *alts}) or bool(live)
        reqs.append(RequiredDocument(doc_type=doc_type, alternatives=alts, actor=s.get("actor", "clinic"), required=False,
                                     why_ko=s["why_ko"], satisfied=sat, status=status(sat)))

    # 8. The full medical record: requested only when an SIU flag that the record can settle fires.
    record_flags = [f for f in siu if f.requests_record]
    if record_flags:
        sat = DocType.MEDICAL_RECORD in present
        reqs.append(RequiredDocument(doc_type=DocType.MEDICAL_RECORD, actor="clinic", satisfied=sat,
                                     status="satisfied" if sat else "requested",
                                     why_ko=f"SIU 의뢰({record_flags[0].title_ko}) — 진료부는 SIU 의뢰 시에만 요청합니다. "
                                            "수의사의 진료부 발급 의무는 없어(수의사법 §12③) 병원 협조가 필요합니다."))

    _document_info(claim, profile, lines, docs, findings)
    return reqs, _dedupe(pends)


def _document_info(claim, profile, lines, docs, findings):
    st = _statutory()
    as_of = claim.submitted_date or date.today()
    first = min([li.service_date for li in claim.line_items if li.service_date] + [claim.visit_date])
    if (as_of - first).days > st["medical_record_retention_days"]:
        findings.append(_f("documents.medical_record_may_be_unavailable", "documents", Severity.info,
                           "진료부가 폐기되었을 수 있음",
                           f"진료일로부터 {(as_of - first).days}일 지난 청구입니다. 진료부 보존기간은 1년(수의사법 시행규칙 §13)이고 "
                           "청구권은 3년(상법 §662)이므로, 진료기록 대신 진단서(부본 3년 보존)로 확인해야 할 수 있습니다.",
                           evidence=[st["medical_record_retention_ref"]]))
    cap = st["prescription_fee_cap"]
    for ln in lines:
        if is_document_fee(ln.description, ln.code) and "처방전" in compact(ln.description) and ln.unit_price > cap:
            findings.append(_f("documents.prescription_fee_above_cap", "documents", Severity.info,
                               "처방전 발급 수수료 상한 초과",
                               f"처방전 수수료 {_won(ln.unit_price)} — 시행규칙 §19①의 상한은 {_won(cap)}입니다.",
                               item_ref=ln.code, amount=ln.unit_price - cap, evidence=[st["document_fee_ref"]]))
    if not docs:
        return
    max_files = profile.get("max_files")
    n_files = sum(d.pages or 1 for d in docs)
    if max_files and n_files > max_files and claim.intake_channel in ONLINE_CHANNELS:
        findings.append(_f("documents.too_many_files", "documents", Severity.info, "온라인 첨부 파일 수 초과",
                           f"첨부 {n_files}개 — {profile.get('name_ko')} 온라인 청구는 최대 {max_files}개입니다."))
    types = profile.get("accepted_file_types")
    if types and "pdf" not in types and claim.intake_channel in ONLINE_CHANNELS and any(d.source == "pdf" for d in docs):
        findings.append(_f("documents.file_type_not_accepted", "documents", Severity.info, "온라인 청구 파일 형식",
                           f"{profile.get('name_ko')} 온라인 청구는 {'/'.join(t.upper() for t in types)}만 받습니다. PDF는 이미지로 변환이 필요합니다."))
    if profile.get("payment_slip_requires_brn"):
        for d in docs:
            if d.doc_type in (DocType.PAYMENT_SLIP, DocType.CASH_RECEIPT) and not d.issuer_brn:
                findings.append(_f("documents.payment_slip_without_brn", "documents", Severity.info,
                                   "사업자등록번호 없는 결제 증빙",
                                   f"{profile.get('name_ko')}는 사업자등록번호가 보이는 카드전표·현금영수증만 인정합니다. 카드 문자·전표만으로는 영수증을 대신할 수 없습니다."))
                break


def _dedupe(pends: List[PendReason]) -> List[PendReason]:
    merged: Dict[str, PendReason] = {}
    for p in pends:
        if p.code in merged:
            m = merged[p.code]
            if p.detail_ko not in m.detail_ko:
                m.detail_ko = f"{m.detail_ko} / {p.detail_ko}"
            m.requests = list(dict.fromkeys([*m.requests, *p.requests]))
        else:
            merged[p.code] = p.model_copy(deep=True)
    order = {c: i for i, c in enumerate(PEND_ORDER)}
    return sorted(merged.values(), key=lambda p: order.get(p.code, 99))


# ── Data quality ──────────────────────────────────────────────────


def _data_quality(dx, lines, drugs, findings):
    for d in dx:
        if not d["code"]:
            findings.append(_f("data.unmapped_diagnosis", "data", Severity.info,
                               f"진단 코드 미매핑: {d['input']}", "표준 질병코드에 매핑되지 않아 담당자 확인이 필요합니다."))
    for ln in lines:
        if ln.code == DISCOUNT_CODE and ln.unit_price > 0:
            findings.append(_f("data.discount_amount_positive", "data", Severity.warning,
                               f"할인 항목의 금액 부호 확인: {ln.description}",
                               f"할인·조정 항목으로 인식했지만 금액이 +{_won(ln.unit_price)}입니다. 차감액인지, 할인과 무관한 청구 "
                               "항목인지 확인하세요. 금액은 그대로(청구액으로) 두었습니다.",
                               item_ref=ln.code, amount=ln.total, evidence=[f"인식 근거: '{ln.matched_term}'"]))
        if not ln.code and not ln.drug_id and ln.match_method != "document_fee_text":
            findings.append(_f("data.unmapped_line", "data", Severity.info,
                               f"항목 코드 미매핑: {ln.description}", "표준 진료항목 코드에 매핑되지 않았습니다.", amount=ln.total))
        elif ln.drug_id and not ln.code:
            findings.append(_f("data.line_routed_to_drug", "data", Severity.info,
                               f"약품 항목으로 인식: {ln.description}",
                               f"진료항목 코드 대신 약물({ln.drug_ingredient})로 정형화했습니다. 용량 정보가 없어 용량 규칙은 적용하지 않습니다.",
                               item_ref=ln.drug_id))
    for dr in drugs:
        if not dr.drug_id:
            findings.append(_f("data.unresolved_drug", "data", Severity.info,
                               f"약물 미확인: {dr.input_name}", "약물 DB에서 성분을 확인하지 못했습니다.", amount=dr.total))


# ── Decision ──────────────────────────────────────────────────────


def _confidence(dx, lines, drugs) -> float:
    total = sum(abs(l.total) for l in lines) or 1
    mapped = sum(abs(l.total) * l.match_confidence for l in lines
                 if l.code or l.drug_id or l.match_method == "document_fee_text") / total if lines else 1.0
    dx_rate = sum(d["confidence"] for d in dx) / len(dx) if dx else 0.0
    drug_rate = sum(1 for d in drugs if d.drug_id) / len(drugs) if drugs else 1.0
    return round(min(1.0, 0.55 * mapped + 0.3 * dx_rate + 0.15 * drug_rate), 3)


HARD_RULES = {"coverage.before_policy_start", "integrity.duplicate_claim", "integrity.claim_time_barred"}
REVIEW_EXEMPT_CATEGORIES = ("coverage", "documents")


# Pend reasons whose answer can make an all-ineligible claim payable: an itemized receipt or a split line can reveal
# covered items. (A missing or unmapped diagnosis cannot: with one, lines are never ineligible for lack of a diagnosis.)
ELIGIBILITY_PENDS = ("RECEIPT_NOT_ITEMIZED", "MIXED_BASKET_UNSPLIT")


def _decide(findings: List[Finding], confidence: float, payable: Payable, pends: List[PendReason],
            dx_open: bool = True) -> Decision:
    if any(f.rule in HARD_RULES for f in findings):
        return Decision.deny_recommended
    # Nothing payable is a denial only when no pending document could change that (spec §C: missing information pends).
    if payable.billed > 0 and payable.eligible == 0 and not (dx_open and any(p.code in ELIGIBILITY_PENDS for p in pends)):
        return Decision.deny_recommended
    if any(f.severity in (Severity.critical, Severity.warning) and f.category not in REVIEW_EXEMPT_CATEGORIES for f in findings):
        return Decision.review
    if pends:
        return Decision.pend
    if confidence < 0.8:
        return Decision.review
    return Decision.auto_approve


SEVERITY_ORDER = {Severity.critical: 0, Severity.warning: 1, Severity.info: 2}


def adjudicate(claim: Claim, policy: Policy, history: Optional[List[Claim]] = None, mode: str = "insurer") -> Adjudication:
    """Adjudicate one claim. `mode='precheck'` (clinic side) treats absent documents as none issued yet."""
    profile = insurer_profile(policy.insurer_id)
    dx = _resolve_diagnoses(claim)
    lines = _normalize_lines(claim)
    drugs = _normalize_drugs(claim)
    items = _clinical_items(claim, lines, drugs)
    findings: List[Finding] = []

    payable, decisions, benefit, dx_open = _coverage(claim, policy, dx, lines, drugs, findings)
    _clinical(claim, policy, dx, lines, items, findings)
    _pricing(claim, lines, findings)
    _integrity(claim, dx, lines, history, findings)
    _data_quality(dx, lines, drugs, findings)
    siu = _siu(claim, policy, dx, findings, history)
    required, pends = _documents(claim, policy, profile, dx, lines, drugs, decisions, payable, findings, siu, history, mode)

    findings.sort(key=lambda f: (SEVERITY_ORDER[f.severity], -f.amount_at_risk))
    confidence = _confidence(dx, lines, drugs)
    return Adjudication(
        claim_id=claim.claim_id,
        decision=_decide(findings, confidence, payable, pends, dx_open),
        confidence=confidence,
        diagnoses=dx,
        lines=lines,
        drugs=drugs,
        findings=findings,
        payable=payable,
        engine_version=ENGINE_VERSION,
        pend_reasons=pends,
        siu_flags=siu,
        record_request_rule_id=next((f"siu.{f.code.lower()}" for f in siu if f.requests_record), None),
        line_decisions=decisions,
        required_documents=required,
        insurer_profile=InsurerProfileRef(id=profile["id"], name_ko=profile["name_ko"], as_of=profile["as_of"],
                                          verified=bool(profile.get("verified")), source_urls=profile.get("source_urls", [])),
        benefit_type=benefit,
    )

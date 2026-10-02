"""
Claim adjudication.

adjudicate(claim, policy, history) normalizes the claim, runs four rule
families and returns a Decision with every Finding that drove it:

  coverage   what the policy pays for (waiting period, exclusions, non-medical items)
  clinical   does the care make sense (drug ↔ diagnosis, dose, species safety)
  pricing    is the price in line with the region and the clinic's own posted fee
  integrity  duplicates, identity/species mismatches, implausible quantities

The engine never auto-denies: the strongest outcome is `deny_recommended`,
which still routes to a human adjuster.
"""

from __future__ import annotations

from datetime import timedelta
from typing import Dict, Iterable, List, Optional, Set

from . import ENGINE_VERSION
from .benchmarks import price_position
from .codebook import compact, diagnoses_by_code, diagnosis_book, match_diagnosis, match_procedure, procedures_by_code
from .knowledge import (
    chronic_marker_diagnoses,
    class_label,
    clinical_rules,
    dose_reference,
    drug_label,
    resolve_drug,
    therapeutic_class,
)
from .models import (
    Adjudication,
    Claim,
    Decision,
    Finding,
    NormalizedDrug,
    NormalizedLine,
    Payable,
    Policy,
    Severity,
)

CLAIM_LIMITATION_DAYS = 3 * 365  # 상법 §662: insurance claims prescribe after 3 years
SMALL_BREEDS = ("말티즈", "maltese", "포메라니안", "pomeranian", "치와와", "chihuahua", "요크셔", "yorkshire", "토이푸들", "toy poodle")
DOG_BREED_HINTS = SMALL_BREEDS + ("푸들", "poodle", "비숑", "bichon", "시츄", "shih", "진돗개", "리트리버", "retriever", "웰시코기", "corgi", "닥스훈트", "dachshund", "슈나우저", "schnauzer")
CAT_BREED_HINTS = ("코리안숏헤어", "코숏", "페르시안", "persian", "샴", "siamese", "러시안블루", "russian blue", "브리티시", "british", "스코티시", "scottish", "먼치킨", "munchkin", "랙돌", "ragdoll", "벵갈", "bengal")
SPECIES_ONLY_CODES = {"PRE-003": "dog", "PRE-006": "dog", "PRE-004": "cat"}
FREQ_PER_DAY = {"sid": 1, "q24h": 1, "once": 1, "1일1회": 1, "bid": 2, "q12h": 2, "1일2회": 2, "tid": 3, "q8h": 3, "1일3회": 3, "qid": 4, "q6h": 4, "1일4회": 4, "eod": 0.5, "q48h": 0.5}


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


# ── Normalization ─────────────────────────────────────────────────


def _normalize_lines(claim: Claim) -> List[NormalizedLine]:
    out = []
    for li in claim.line_items:
        code, conf = match_procedure(li.description, li.code)
        proc = procedures_by_code().get(code or "")
        pos = price_position(code, li.unit_price, claim.clinic.region) if code else None
        out.append(
            NormalizedLine(
                description=li.description,
                code=code,
                code_name=proc["name_ko"] if proc else None,
                category=proc["category"] if proc else None,
                match_confidence=conf,
                quantity=li.quantity,
                unit_price=li.unit_price,
                total=li.total,
                benchmark_percentile=pos.percentile if pos else None,
                benchmark_median=pos.median if pos else None,
            )
        )
    return out


def _normalize_drugs(claim: Claim) -> List[NormalizedDrug]:
    out = []
    w = claim.patient.weight_kg
    for rx in claim.prescriptions:
        drug_id, _ = resolve_drug(rx.drug)
        dose = rx.dose_mg_per_kg
        if dose is None and rx.total_dose_mg is not None and w:
            dose = round(rx.total_dose_mg / w, 4)
        out.append(
            NormalizedDrug(
                input_name=rx.drug,
                drug_id=drug_id,
                ingredient=drug_label(drug_id) if drug_id else None,
                therapeutic_class=therapeutic_class(drug_id),
                dose_mg_per_kg=dose,
                total=int(round(rx.unit_price * rx.quantity)),
            )
        )
    return out


def _resolve_diagnoses(claim: Claim) -> List[dict]:
    out = []
    for text in claim.diagnoses:
        code, conf = match_diagnosis(text)
        entry = diagnoses_by_code().get(code or "")
        out.append(
            {
                "input": text,
                "code": code,
                "name_ko": entry["name_ko"] if entry else None,
                "confidence": conf,
                "chronic": bool(entry and entry["chronic"]),
                "accident": bool(entry and entry["accident"]),
            }
        )
    return out


# ── Coverage ──────────────────────────────────────────────────────


def _excluded_reason(dx_code: str, claim: Claim, policy: Policy) -> Optional[str]:
    entry = diagnoses_by_code()[dx_code]
    tags = set(entry["coverage_tags"])
    if dx_code in policy.pre_existing_codes:
        return "가입 전 기왕증으로 등록된 질환"
    if dx_code in policy.excluded_diagnosis_codes:
        return "약관상 보장 제외 질환"
    if "preventive" in tags:
        return "예방·미용 목적 진료는 보장 대상이 아님"
    if "behavior" in tags:
        return "행동 교정은 보장 대상이 아님"
    if "dental" in tags and not policy.covers_dental:
        return "치과 진료 미보장 상품"
    if "patella" in tags and not policy.covers_patella:
        return "슬관절(슬개골) 미보장 상품"
    waiting_ends = policy.start_date + timedelta(days=policy.illness_waiting_days)
    if not entry["accident"] and claim.visit_date < waiting_ends:
        return f"질병 면책기간({policy.illness_waiting_days}일, {waiting_ends.isoformat()}까지) 중 진료"
    return None


def _coverage(claim, policy, dx, lines, drugs, findings) -> Payable:
    covered = [d for d in dx if d["code"] and not _excluded_reason(d["code"], claim, policy)]
    unresolved_dx = [d for d in dx if not d["code"]]
    for d in dx:
        if d["code"]:
            reason = _excluded_reason(d["code"], claim, policy)
            if reason:
                findings.append(_f("coverage.diagnosis_excluded", "coverage", Severity.warning,
                                   f"보장 제외: {d['name_ko']}", reason, item_ref=d["code"]))

    has_covered = bool(covered) or bool(unresolved_dx)  # unknown diagnoses go to a human, not to denial
    covered_codes = {d["code"] for d in covered}
    ineligible = 0

    for ln in lines:
        reason = None
        if ln.category in ("non_medical", "admin"):
            reason = "비의료 항목(미용·호텔·사료·용품·서류)"
        elif ln.category == "preventive" and not (ln.code == "PRE-002" and "NVD-REP-001" in covered_codes):
            reason = "예방 목적 항목(백신·중성화·예방약·검진)"
        elif ln.category == "dental" and not policy.covers_dental:
            reason = "치과 항목 미보장"
        elif ln.code == "SUR-001" and ("NVD-ORT-001" not in covered_codes):
            reason = "슬개골 수술 — 해당 진단이 보장 대상이 아님"
        elif not has_covered:
            reason = "청구된 진단이 모두 보장 제외"
        if reason:
            ineligible += ln.total
            findings.append(_f("coverage.line_ineligible", "coverage", Severity.info,
                               f"지급 제외 항목: {ln.description}", reason, item_ref=ln.code, amount=ln.total))
    if not has_covered:
        for dr in drugs:
            ineligible += dr.total

    if claim.visit_date < policy.start_date:
        findings.append(_f("coverage.before_policy_start", "coverage", Severity.critical,
                           "보험 개시 전 진료", f"진료일 {claim.visit_date} < 보험 개시일 {policy.start_date}",
                           amount=sum(l.total for l in lines) + sum(d.total for d in drugs)))

    billed = sum(l.total for l in lines) + sum(d.total for d in drugs)
    if claim.visit_date < policy.start_date:
        ineligible = billed
    eligible = max(0, billed - ineligible)
    deductible = min(eligible, policy.deductible_per_visit)
    reimbursed = int((eligible - deductible) * policy.coverage_ratio)
    capped_by = None
    if policy.per_visit_limit is not None and reimbursed > policy.per_visit_limit:
        reimbursed, capped_by = policy.per_visit_limit, "per_visit_limit"
    if policy.annual_limit is not None:
        remaining = max(0, policy.annual_limit - policy.used_this_year)
        if reimbursed > remaining:
            reimbursed, capped_by = remaining, "annual_limit"
    if policy.coverage_ratio > 0.7 or policy.deductible_per_visit < 30_000:
        findings.append(_f("coverage.policy_terms_check", "coverage", Severity.info,
                           "상품 조건 확인", "2025.5 금감원 기준(보장비율 ≤70%, 자기부담금 ≥3만원)과 다른 조건의 계약입니다. 2025.5 이전 계약인지 확인하세요."))
    return Payable(billed=billed, ineligible=ineligible, eligible=eligible, deductible=deductible,
                   reimbursed=max(0, reimbursed), capped_by=capped_by)


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


def _clinical(claim, policy, dx, lines, drugs, findings):
    species = claim.patient.species.value
    breed = compact(claim.patient.breed or "")
    dx_codes = [d["code"] for d in dx if d["code"]]
    line_categories = {l.category for l in lines if l.category}
    line_codes = {l.code for l in lines if l.code}
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
                                   f"'{names}' 진단에서 {ln.code_name}은(는) 통상 1차 검사로 시행되지 않습니다. 의무기록(진료부)으로 시행 사유를 확인하세요.",
                                   item_ref=ln.code, amount=ln.total,
                                   evidence=[f"청구 진단: {names}", f"항목 금액 ₩{ln.total:,}"]))

    # Drugs that no claimed diagnosis explains; chronic-marker drugs hint at undisclosed conditions.
    allowed = _plausible_classes(dx_codes, line_categories)
    recent_policy = (claim.visit_date - policy.start_date).days < 365
    for dr in drugs:
        if not dr.drug_id:
            continue
        markers = chronic_marker_diagnoses(dr.drug_id)
        if markers and dx_codes and not set(markers) & set(dx_codes):
            implied = ", ".join(diagnoses_by_code()[m]["name_ko"] for m in markers if m in diagnoses_by_code())
            sev = Severity.warning
            detail = f"{dr.ingredient}은(는) 주로 [{implied}] 치료에 쓰이는 약물이나 청구 진단에 해당 질환이 없습니다."
            if recent_policy:
                detail += " 가입 1년 이내 청구로, 가입 전 진단 이력(기왕증) 확인을 위해 과거 진료기록 요청을 권장합니다."
            findings.append(_f("clinical.undisclosed_chronic_condition", "clinical", sev,
                               f"미신고 만성질환 신호: {dr.ingredient}", detail, item_ref=dr.drug_id, amount=dr.total,
                               evidence=[f"약물 분류: {class_label(dr.therapeutic_class)}", f"추정 질환: {implied}",
                                         f"보험 개시 후 {(claim.visit_date - policy.start_date).days}일"]))
            continue
        if dx_codes and dr.therapeutic_class and dr.therapeutic_class not in allowed:
            findings.append(_f("clinical.drug_diagnosis_mismatch", "clinical", Severity.warning,
                               f"진단과 무관한 처방: {dr.ingredient}",
                               f"{class_label(dr.therapeutic_class)} 계열인 {dr.ingredient}은(는) 청구된 진단으로 설명되지 않습니다. 별도 질환 치료가 함께 청구되었을 수 있습니다.",
                               item_ref=dr.drug_id, amount=dr.total,
                               evidence=[f"청구 진단: {', '.join(d['name_ko'] for d in dx if d['code'])}"]))

    # Species-specific safety rules (curated, referenced).
    for rule in rules["species_rules"]:
        if rule["species"] != species:
            continue
        for dr, rx in zip(drugs, claim.prescriptions):
            if dr.drug_id not in rule["drugs"]:
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
    classes = [dr.therapeutic_class for dr in drugs if dr.therapeutic_class]
    for rule in rules["combination_rules"]:
        need = list(rule["classes"])
        pool = list(classes)
        ok = True
        for c in need:
            if c in pool:
                pool.remove(c)
            else:
                ok = False
        if ok:
            findings.append(_f(f"clinical.combo.{rule['id']}", "clinical", Severity(rule["severity"]),
                               rule["title"], rule["detail"], evidence=rule["refs"]))

    # Dose far above the species reference: >2× the highest listed dose, or ≥5× the typical
    # dose (catches decimal-shift errors on drugs that also have a high-dose indication).
    for i, dr in enumerate(drugs):
        if not dr.drug_id or dr.dose_mg_per_kg is None:
            continue
        ref = dose_reference(dr.drug_id, species, claim.prescriptions[i].route)
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
    for ln in lines:
        if not ln.code:
            continue
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
        if ln.quantity > proc["max_qty_per_visit"]:
            findings.append(_f("pricing.quantity_implausible", "pricing", Severity.warning,
                               f"비정상 수량: {ln.code_name} × {ln.quantity:g}",
                               f"1회 내원 기준 통상 최대 {proc['max_qty_per_visit']}{proc['unit']}입니다.",
                               item_ref=ln.code, amount=ln.unit_price * (ln.quantity - proc["max_qty_per_visit"])))


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
    total = sum(mine.values()) or 1
    for prev in history or []:
        if prev.claim_id == claim.claim_id or prev.patient.patient_id != p.patient_id:
            continue
        prev_codes = {match_procedure(li.description, li.code)[0] for li in prev.line_items}
        overlap = sum(v for c, v in mine.items() if c in prev_codes)
        same_day = prev.visit_date == claim.visit_date
        if same_day and overlap / total >= 0.5:
            findings.append(_f("integrity.duplicate_claim", "integrity", Severity.critical,
                               "중복 청구 의심", f"동일 환자·동일 진료일의 기존 청구 {prev.claim_id}와 항목 {overlap / total:.0%}가 겹칩니다.",
                               amount=overlap, evidence=[f"기존 청구 {prev.claim_id} ({prev.clinic.clinic_id})"]))


# ── Data quality ──────────────────────────────────────────────────


def _data_quality(dx, lines, drugs, findings):
    for d in dx:
        if not d["code"]:
            findings.append(_f("data.unmapped_diagnosis", "data", Severity.info,
                               f"진단 코드 미매핑: {d['input']}", "표준 질병코드에 매핑되지 않아 담당자 확인이 필요합니다."))
    for ln in lines:
        if not ln.code:
            findings.append(_f("data.unmapped_line", "data", Severity.info,
                               f"항목 코드 미매핑: {ln.description}", "표준 진료항목 코드에 매핑되지 않았습니다.", amount=ln.total))
    for dr in drugs:
        if not dr.drug_id:
            findings.append(_f("data.unresolved_drug", "data", Severity.info,
                               f"약물 미확인: {dr.input_name}", "약물 DB에서 성분을 확인하지 못했습니다.", amount=dr.total))


# ── Decision ──────────────────────────────────────────────────────


def _confidence(dx, lines, drugs) -> float:
    total = sum(l.total for l in lines) or 1
    mapped = sum(l.total * l.match_confidence for l in lines if l.code) / total if lines else 1.0
    dx_rate = sum(d["confidence"] for d in dx) / len(dx) if dx else 0.0
    drug_rate = sum(1 for d in drugs if d.drug_id) / len(drugs) if drugs else 1.0
    return round(0.55 * mapped + 0.3 * dx_rate + 0.15 * drug_rate, 3)


def _decide(findings: List[Finding], confidence: float, payable: Payable) -> Decision:
    hard = {"coverage.before_policy_start", "integrity.duplicate_claim", "integrity.claim_time_barred"}
    if any(f.rule in hard for f in findings):
        return Decision.deny_recommended
    if payable.billed > 0 and payable.eligible == 0:
        return Decision.deny_recommended
    if any(f.severity in (Severity.critical, Severity.warning) and f.category != "coverage" for f in findings):
        return Decision.review
    if confidence < 0.8:
        return Decision.review
    return Decision.auto_approve


SEVERITY_ORDER = {Severity.critical: 0, Severity.warning: 1, Severity.info: 2}


def adjudicate(claim: Claim, policy: Policy, history: Optional[List[Claim]] = None) -> Adjudication:
    dx = _resolve_diagnoses(claim)
    lines = _normalize_lines(claim)
    drugs = _normalize_drugs(claim)
    findings: List[Finding] = []

    payable = _coverage(claim, policy, dx, lines, drugs, findings)
    _clinical(claim, policy, dx, lines, drugs, findings)
    _pricing(claim, lines, findings)
    _integrity(claim, dx, lines, history, findings)
    _data_quality(dx, lines, drugs, findings)

    findings.sort(key=lambda f: (SEVERITY_ORDER[f.severity], -f.amount_at_risk))
    confidence = _confidence(dx, lines, drugs)
    return Adjudication(
        claim_id=claim.claim_id,
        decision=_decide(findings, confidence, payable),
        confidence=confidence,
        diagnoses=dx,
        lines=lines,
        drugs=drugs,
        findings=findings,
        payable=payable,
        engine_version=ENGINE_VERSION,
    )

"""
Claim domain model (schema v2, additive over v1).

A Claim is the standardized record a clinic submits (or an insurer receives) for
one visit: who the patient is, what was diagnosed, what was done, what was
dispensed, what it cost, and which documents back it up. Everything the engine
produces is an explainable Finding (or a pend reason / SIU flag) attached to the
claim, never an opaque score alone.

Backward compatibility: every v1 request body still validates.
  - `diagnoses: ["외이염"]` (plain strings) still works; v2 also accepts Diagnosis objects.
  - `documents` absent (None) means "not provided" — document-based pend reasons are not
    raised for such claims (the engine cannot know what was attached); `[]` means "none attached".
  - v1 policy fields (`coverage_ratio`, `deductible_per_visit`, `illness_waiting_days`,
    `per_visit_limit`, `annual_limit`, `used_this_year`, `covers_dental`, `covers_patella`)
    map onto the v2 structures (see Policy). A policy body that uses none of the v2 product
    fields (V2_REGIME_FIELDS; `insurer_id` and `usage` alone do not count) keeps v1 semantics
    (no condition-group waiting periods); only the deductible default changes (₩10,000 → ₩30,000,
    the post-2025.5 FSS minimum). A v1 field given next to the v2 sub-object that replaces it is
    merged into it; contradicting values are rejected.
  - Negative amounts: only on a discount / adjustment line (unit_price < 0); quantities and
    prescription prices are never negative.
  - Bounds: numbers must be finite (no NaN / Infinity) and within the MAX_* limits below; free-text fields and
    lists are length-capped. A body outside them is rejected with 422 instead of reaching the engine.
"""

from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Annotated, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, Field, field_serializer, model_validator

FSS_REGIME_START = date(2025, 5, 1)  # FSS product-structure guidance for products sold from 2025-05-01

# Input bounds. Generous for any real receipt; they keep a single request from overflowing the arithmetic
# (quantity = Infinity), silently skipping checks (weight = NaN) or tying up a worker (20,000 line items).
MAX_AMOUNT_KRW = 100_000_000  # per unit price / receipt total
MAX_QUANTITY = 10_000
MAX_WEIGHT_KG = 150
MAX_TEXT = 500  # one printed line, diagnosis or drug name
MAX_LINE_ITEMS = 500
MAX_PRESCRIPTIONS = 200
MAX_DIAGNOSES = 50
MAX_DOCUMENTS = 100
MAX_PERIOD_DAYS = 3_650  # waiting periods: beyond ten years the date arithmetic overflows, and no product has one
PeriodDays = Annotated[int, Field(ge=0, le=MAX_PERIOD_DAYS)]
# Calendar dates on a claim or policy. Outside this range the waiting-period and history arithmetic overflows
# (start_date 9999-12-31 + 30 days), and no real claim falls there.
ClaimDate = Annotated[date, Field(ge=date(1990, 1, 1), le=date(2100, 12, 31))]
ShortText = Annotated[str, Field(max_length=MAX_TEXT)]


class Species(str, Enum):
    dog = "dog"
    cat = "cat"


# ── Documents ─────────────────────────────────────────────────────


class DocType(str, Enum):
    RECEIPT_ITEMIZED = "RECEIPT_ITEMIZED"  # 진료비 영수증 (항목별)
    RECEIPT_TOTAL_ONLY = "RECEIPT_TOTAL_ONLY"  # 합계만 있는 영수증
    DETAIL_STATEMENT = "DETAIL_STATEMENT"  # 진료비 세부내역서
    DX_CERT_STATUTORY = "DX_CERT_STATUTORY"  # 진단서 (수의사법 시행규칙 별지 제4호의2)
    INSURER_TX_CONFIRMATION = "INSURER_TX_CONFIRMATION"  # 보험사 양식 진료확인서
    OPINION_WITH_RX = "OPINION_WITH_RX"  # 소견서 (처방 내역 포함)
    MEDICAL_RECORD = "MEDICAL_RECORD"  # 진료부 (SIU 의뢰 시에만 요청)
    LAB_RESULT = "LAB_RESULT"
    IMAGING = "IMAGING"
    PAYMENT_SLIP = "PAYMENT_SLIP"  # 카드 매출전표
    CASH_RECEIPT = "CASH_RECEIPT"
    PET_PHOTO_FRONT = "PET_PHOTO_FRONT"
    PET_PHOTO_SIDE = "PET_PHOTO_SIDE"
    PET_PHOTO_FACE = "PET_PHOTO_FACE"
    REGISTRATION_CERT = "REGISTRATION_CERT"  # 동물등록증
    SURGERY_CONSENT = "SURGERY_CONSENT"  # 중대진료 동의서 (별지 제11호)
    PRESCRIPTION = "PRESCRIPTION"  # 처방전 (별지 제10호)
    CLAIM_FORM = "CLAIM_FORM"
    CONSENT_FORM = "CONSENT_FORM"
    ID_COPY = "ID_COPY"
    BANK_PROOF = "BANK_PROOF"


class IntakeChannel(str, Enum):
    owner_upload = "owner_upload"
    insurer_app = "insurer_app"
    fax_email = "fax_email"
    emr_autoclaim = "emr_autoclaim"
    live_counter = "live_counter"
    nuvovet_precheck = "nuvovet_precheck"


class Document(BaseModel):
    doc_type: DocType
    source: Literal["photo", "pdf", "emr", "manual"] = "photo"
    issued_at: Optional[ClaimDate] = None
    issuer_brn: Optional[str] = Field(None, description="사업자등록번호 printed on the document (KB: card slip must show it)")
    vet_license_no: Optional[str] = None
    serial_no: Optional[str] = Field(None, description="진단서 연도별 일련번호 (시행규칙 §9③)")
    has_seal: Optional[bool] = None
    captured_at: Optional[datetime] = Field(None, description="Imaging: acquisition date/time visible on the image")
    pages: Optional[int] = Field(None, ge=1)
    insurer_form_code: Optional[str] = None
    original_received_at: Optional[datetime] = Field(
        None, description="When the insurer received the paper original (for ORIGINALS_REQUIRED thresholds)")


# ── Parties ───────────────────────────────────────────────────────


def mask_registration_no(value: Optional[str]) -> Optional[str]:
    """Keep only the last 4 characters of an animal registration number: '410123456789012' → '***********9012'."""
    if value is None:
        return None
    s = str(value).strip()
    if len(s) <= 4:
        return "*" * len(s)
    return "*" * (len(s) - 4) + s[-4:]


class Patient(BaseModel):
    patient_id: str = Field(..., description="Insurer- or clinic-scoped pseudonymous ID")
    species: Species
    breed: Optional[str] = None
    age_years: Optional[float] = Field(None, ge=0, le=40, allow_inf_nan=False)
    weight_kg: Optional[float] = Field(None, gt=0, le=MAX_WEIGHT_KG, allow_inf_nan=False)
    sex: Optional[str] = None
    neutered: Optional[bool] = None
    registration_no: Optional[str] = Field(None, description="동물등록번호; masked to the last 4 digits in every response")
    coat_color: Optional[str] = None
    birth_date: Optional[ClaimDate] = None

    @field_serializer("registration_no")
    def _mask_registration(self, value: Optional[str]) -> Optional[str]:
        return mask_registration_no(value)


class Clinic(BaseModel):
    clinic_id: str
    name: Optional[str] = None
    region: Optional[str] = Field(None, description="시/도, e.g. '서울', '경기'")
    posted_prices: Dict[str, int] = Field(
        default_factory=dict,
        description="Procedure code → the clinic's own publicly posted fee (수의사법 진료비 게시 / MAFRA disclosure)",
    )
    brn: Optional[str] = Field(None, description="사업자등록번호")
    emr_vendor: Optional[str] = None
    participation_status: Literal["none", "precheck", "direct"] = "none"


# ── Claim ─────────────────────────────────────────────────────────


class DiagnosisCode(BaseModel):
    system: Literal["NVD", "MAFRA", "KB_PET", "SAMSUNG_PET"]
    code: str
    version: Optional[str] = None


class Diagnosis(BaseModel):
    text_raw: str = Field("", max_length=MAX_TEXT, description="Diagnosis exactly as written by the vet")
    codes: List[DiagnosisCode] = Field(default_factory=list)
    certainty: Optional[Literal["presumptive", "final"]] = None
    onset_date: Optional[ClaimDate] = Field(None, description="발병일; waiting periods key on it when present")
    diagnosis_date: Optional[ClaimDate] = None
    is_accident: Optional[bool] = None
    source_doc: Optional[DocType] = None

    def code_for(self, system: str) -> Optional[str]:
        return next((c.code for c in self.codes if c.system == system), None)


def _is_discount_line(description: str, code: Optional[str], category_raw: Optional[str]) -> bool:
    """A receipt adjustment: the discount code, or text such as '미용 할인', '원단위 절사', '쿠폰', '포인트 사용', 'D/C'."""
    from .codebook import ADJUSTMENT_RE, match_procedure  # local import: codebook never imports models

    if ADJUSTMENT_RE.search(description or ""):
        return True
    return match_procedure(description, code, category_raw)[0] == "ADM-004"


class LineItem(BaseModel):
    description: str = Field(..., max_length=MAX_TEXT, description="Item text exactly as printed on the clinic invoice")
    code: Optional[str] = Field(None, max_length=50, description="Standard procedure code; filled by normalization if absent")
    quantity: float = Field(1, ge=0, le=MAX_QUANTITY, allow_inf_nan=False,
                            description="A discount is a negative unit_price, never a negative quantity")
    unit_price: int = Field(..., ge=-MAX_AMOUNT_KRW, le=MAX_AMOUNT_KRW,
                            description="KRW. Negative only on discount / adjustment lines (ADM-004)")
    category_raw: Optional[str] = Field(None, description="Printed heading or EMR prefix ('검사료', '처치')")
    tax_status: Literal["exempt", "taxable", "unknown"] = "unknown"
    service_date: Optional[ClaimDate] = None
    diagnosis_refs: Optional[List[int]] = Field(None, description="Indexes into Claim.diagnoses")
    is_bundle: Optional[bool] = None

    @model_validator(mode="after")
    def _negative_price_only_on_discounts(self):
        if self.unit_price < 0 and not _is_discount_line(self.description, self.code, self.category_raw):
            raise ValueError("unit_price may be negative only on a discount line (ADM-004 할인·조정: 할인, 절사, 쿠폰, 포인트 등)")
        return self

    @property
    def total(self) -> int:
        return int(round(self.unit_price * self.quantity))


class Prescription(BaseModel):
    drug: str = Field(..., max_length=MAX_TEXT, description="Product or ingredient name, Korean or English")
    dose_mg_per_kg: Optional[float] = Field(None, gt=0, allow_inf_nan=False)
    total_dose_mg: Optional[float] = Field(None, gt=0, allow_inf_nan=False,
                                           description="Per administration; converted with patient weight")
    route: Optional[str] = Field(None, max_length=50)
    frequency: Optional[str] = Field(None, max_length=100)
    days: Optional[int] = Field(None, ge=0, le=365)
    unit_price: int = Field(0, ge=0, le=MAX_AMOUNT_KRW, description="KRW; discounts go on a line item, never on a prescription")
    quantity: float = Field(1, ge=0, le=MAX_QUANTITY, allow_inf_nan=False)


class Claim(BaseModel):
    claim_id: str
    visit_date: ClaimDate
    submitted_date: Optional[ClaimDate] = None
    clinic: Clinic
    patient: Patient
    diagnoses: List[Union[ShortText, Diagnosis]] = Field(
        default_factory=list, max_length=MAX_DIAGNOSES,
        description="Diagnosis text (v1) or Diagnosis objects (v2). Empty → pend MISSING_DX")
    line_items: List[LineItem] = Field(default_factory=list, max_length=MAX_LINE_ITEMS)
    prescriptions: List[Prescription] = Field(default_factory=list, max_length=MAX_PRESCRIPTIONS)
    notes: Optional[str] = Field(None, max_length=5_000)
    documents: Optional[List[Document]] = Field(
        None, max_length=MAX_DOCUMENTS, description="Attached documents. None = not provided (v1 body); [] = none attached")
    intake_channel: Optional[IntakeChannel] = None
    invoice_total: Optional[int] = Field(None, ge=-MAX_AMOUNT_KRW, le=MAX_AMOUNT_KRW,
                                         description="Total printed on the receipt, for reconciliation")

    def diagnosis_objects(self) -> List[Diagnosis]:
        return [d if isinstance(d, Diagnosis) else Diagnosis(text_raw=d) for d in self.diagnoses]

    def diagnosis_texts(self) -> List[str]:
        return [d.text_raw for d in self.diagnosis_objects()]


# ── Policy ────────────────────────────────────────────────────────


class Deductible(BaseModel):
    amount: int = Field(30_000, ge=0)
    basis: Literal["per_visit", "per_day", "per_claim"] = "per_visit"


class WaitingPeriods(BaseModel):
    illness: int = Field(30, ge=0, le=MAX_PERIOD_DAYS)
    accident: int = Field(0, ge=0, le=MAX_PERIOD_DAYS)
    groups: Dict[str, PeriodDays] = Field(default_factory=lambda: {"patella_hip": 365},
                                   description="condition_group → days (e.g. patella_hip: 365)")


class Rider(BaseModel):
    id: Literal["skin", "patella_hip", "dental", "liability", "funeral"]
    start_date: Optional[ClaimDate] = None


class Limits(BaseModel):
    per_day: Optional[int] = None
    per_visit: Optional[int] = None
    per_surgery: Optional[int] = None
    annual_amount: Optional[int] = None
    annual_visits: Optional[int] = None


class ExclusionRider(BaseModel):
    """부담보: a condition group or body system excluded (optionally until a date)."""

    condition_group: Optional[str] = None
    body_system: Optional[str] = None
    until: Optional[ClaimDate] = None

    @model_validator(mode="after")
    def _one_target(self):
        if not (self.condition_group or self.body_system):
            raise ValueError("exclusion rider needs condition_group or body_system")
        return self


class Usage(BaseModel):
    amount_this_year: int = 0
    visits_this_year: int = 0
    condition_totals: Dict[str, int] = Field(
        default_factory=dict,
        description="NVD code or condition_group → amount already billed for it (per-condition 진단서 thresholds)")


V2_POLICY_FIELDS = frozenset({"regime", "insurer_id", "copay_ratio", "copay_method", "deductible", "waiting_periods",
                              "riders", "limits", "exclusion_riders", "usage", "covers_skin"})
# Fields that describe a v2 *product* (and so bring the v2 default condition-group waiting periods). insurer_id
# (an intake-profile selector), usage counters, copay_method and covers_skin do not: adding one of them to a v1
# policy body must not change its waiting periods.
V2_REGIME_FIELDS = frozenset({"regime", "copay_ratio", "deductible", "waiting_periods", "riders", "limits",
                              "exclusion_riders"})


def _merge_v1(given: set, v1_name: str, v1_value, sub: BaseModel, sub_name: str, field: str) -> BaseModel:
    """Honour a v1 field inside the v2 sub-object that replaces it: copy it in when the sub-object leaves that field
    unset; reject the body when both are set to different values. A v1 null never overrides."""
    if v1_name not in given or v1_value is None:
        return sub
    if field in sub.model_fields_set:
        if getattr(sub, field) != v1_value:
            raise ValueError(f"{v1_name} ({v1_value}) conflicts with {sub_name}.{field} ({getattr(sub, field)})")
        return sub
    return type(sub).model_validate({**sub.model_dump(exclude_unset=True), field: v1_value})


class Policy(BaseModel):
    """Policy terms. v1 fields are kept and mirrored onto the v2 structures (and back).

    coverage_ratio = 1 − copay_ratio. Coverage is NOT capped at 0.7: legacy in-force policies (80–90%)
    exist; a policy that violates its regime is flagged as info by the engine.
    """

    policy_id: str
    start_date: ClaimDate
    # v2
    regime: Optional[Literal["legacy", "fss_2025_05"]] = Field(
        None, description="None → inferred from start_date (fss_2025_05 from 2025-05-01)")
    insurer_id: Optional[str] = Field(None, description="Selects an insurer intake profile (insurer_profiles.json)")
    copay_ratio: Optional[float] = Field(None, ge=0, le=1, description="자기부담 비율 (fss ≥ 0.30)")
    copay_method: Literal["sequential", "max"] = Field(
        "sequential", description="sequential: (eligible − deductible) × coverage; max: eligible − max(deductible, eligible × copay)")
    deductible: Optional[Deductible] = None
    waiting_periods: Optional[WaitingPeriods] = None
    riders: List[Rider] = Field(default_factory=list)
    limits: Optional[Limits] = None
    exclusion_riders: List[ExclusionRider] = Field(default_factory=list)
    usage: Optional[Usage] = None
    covers_skin: bool = True
    # v1
    coverage_ratio: float = Field(0.7, ge=0, le=1, description="Share of eligible cost reimbursed (= 1 − copay_ratio)")
    deductible_per_visit: int = 30_000
    per_visit_limit: Optional[int] = 150_000
    annual_limit: Optional[int] = 5_000_000
    used_this_year: int = 0
    illness_waiting_days: int = Field(30, ge=0, le=MAX_PERIOD_DAYS)
    excluded_diagnosis_codes: List[str] = Field(default_factory=list)
    pre_existing_codes: List[str] = Field(default_factory=list)
    covers_dental: bool = False
    covers_patella: bool = True

    @model_validator(mode="after")
    def _map_v1_v2(self):
        given = set(self.model_fields_set)
        is_v2 = bool(given & V2_REGIME_FIELDS)
        put = lambda k, v: object.__setattr__(self, k, v)  # noqa: E731 — no re-validation, fields_set untouched

        def merge(v1_name: str, sub_name: str, field: str) -> None:
            put(sub_name, _merge_v1(given, v1_name, getattr(self, v1_name), getattr(self, sub_name), sub_name, field))

        if "copay_ratio" in given and "coverage_ratio" in given:
            if abs(self.coverage_ratio + self.copay_ratio - 1) > 1e-6:
                raise ValueError("coverage_ratio must equal 1 − copay_ratio")
        elif self.copay_ratio is not None:
            put("coverage_ratio", round(1 - self.copay_ratio, 6))
        else:
            put("copay_ratio", round(1 - self.coverage_ratio, 6))

        # A v1 field given next to the v2 sub-object that replaces it is merged into it, not dropped
        # (spec §B: "If a v1 deductible_per_visit is given, honour it").
        if self.deductible is None:
            put("deductible", Deductible(amount=self.deductible_per_visit, basis="per_visit"))
        else:
            merge("deductible_per_visit", "deductible", "amount")
            put("deductible_per_visit", self.deductible.amount)

        if self.waiting_periods is None:
            groups = {"patella_hip": 365} if is_v2 else {}
            put("waiting_periods", WaitingPeriods(illness=self.illness_waiting_days, accident=0, groups=groups))
        else:
            merge("illness_waiting_days", "waiting_periods", "illness")
            put("illness_waiting_days", self.waiting_periods.illness)

        if self.limits is None:
            put("limits", Limits(per_visit=self.per_visit_limit, annual_amount=self.annual_limit))
        else:
            merge("per_visit_limit", "limits", "per_visit")
            merge("annual_limit", "limits", "annual_amount")
            put("per_visit_limit", self.limits.per_visit)
            put("annual_limit", self.limits.annual_amount)

        if self.usage is None:
            put("usage", Usage(amount_this_year=self.used_this_year))
        else:
            merge("used_this_year", "usage", "amount_this_year")
            put("used_this_year", self.usage.amount_this_year)
        return self

    @property
    def regime_inferred(self) -> bool:
        return self.regime is None

    @property
    def effective_regime(self) -> str:
        if self.regime:
            return self.regime
        return "fss_2025_05" if self.start_date >= FSS_REGIME_START else "legacy"

    def rider(self, rider_id: str) -> Optional[Rider]:
        return next((r for r in self.riders if r.id == rider_id), None)


# ── Engine output ─────────────────────────────────────────────────


class Severity(str, Enum):
    info = "info"
    warning = "warning"
    critical = "critical"


class Finding(BaseModel):
    rule: str = Field(..., description="Stable rule identifier, e.g. 'clinical.dose_above_range'")
    category: str = Field(..., description="coverage | clinical | pricing | integrity | data | documents")
    severity: Severity
    title: str
    detail: str
    item_ref: Optional[str] = Field(None, description="Line item code / drug the finding is attached to")
    amount_at_risk: int = 0
    evidence: List[str] = Field(default_factory=list, description="Data points and sources behind the finding")


class NormalizedLine(BaseModel):
    description: str
    code: Optional[str]
    code_name: Optional[str]
    category: Optional[str]
    match_confidence: float
    quantity: float
    unit_price: int
    total: int
    benchmark_percentile: Optional[float] = None
    benchmark_median: Optional[int] = None
    # v2
    category_raw: Optional[str] = None
    coverage_category: Optional[str] = None
    match_method: Optional[str] = None
    matched_term: Optional[str] = None
    components: List[str] = Field(default_factory=list, description="Every code of a bundled line ('CBC+Chem')")
    drug_id: Optional[str] = Field(None, description="Set when an unmapped drug-like line was resolved as a drug")
    drug_ingredient: Optional[str] = None
    noncovered_category: Optional[str] = None
    tax_status: str = "unknown"
    service_date: Optional[date] = None
    benchmark_available: bool = False


class NormalizedDrug(BaseModel):
    input_name: str
    drug_id: Optional[str]
    ingredient: Optional[str]
    therapeutic_class: Optional[str]
    dose_mg_per_kg: Optional[float]
    total: int
    # v2
    ingredients: List[str] = Field(default_factory=list, description="Every active ingredient of a combination product")
    resolution_source: Optional[str] = None
    licence_no: Optional[str] = None
    noncovered_category: Optional[str] = None


class Decision(str, Enum):
    auto_approve = "auto_approve"
    pend = "pend"  # request information (서류 요청) — the commonest real outcome
    review = "review"
    deny_recommended = "deny_recommended"


Actor = Literal["owner", "clinic", "insurer"]
BenefitType = Literal["outpatient", "inpatient", "surgery", "preventive", "non_medical", "admin"]


class PendReason(BaseModel):
    code: str = Field(..., description="RECEIPT_NOT_ITEMIZED | MIXED_BASKET_UNSPLIT | MISSING_DX | DX_UNMAPPED | "
                                       "NEED_DX_CERT | IMAGING_NO_TIMESTAMP | PET_ID_UNVERIFIED | ORIGINALS_REQUIRED")
    actor: Actor
    detail_ko: str
    requests: List[DocType] = Field(default_factory=list, description="Documents that would resolve it")


class SiuFlag(BaseModel):
    """Referral to the special investigation unit — never a denial."""

    code: str = Field(..., description="UNDISCLOSED_CHRONIC | IDENTITY_MISMATCH | DUPLICATE_ACROSS_CLAIMS | REPEATED_PRICE_OUTLIER")
    title_ko: str
    detail_ko: str
    evidence: List[str] = Field(default_factory=list)
    finding_rule: Optional[str] = None
    requests_record: bool = Field(False, description="Whether this flag justifies requesting the full 진료부")


class LineDecision(BaseModel):
    source: Literal["line", "prescription"] = "line"
    line_index: int
    eligible: bool
    reason_code: str
    benefit_type: BenefitType
    amount: int
    eligible_amount: int


class RequiredDocument(BaseModel):
    doc_type: DocType
    alternatives: List[DocType] = Field(default_factory=list)
    why_ko: str
    actor: Actor
    required: bool = True
    satisfied: bool
    status: Literal["satisfied", "missing", "unknown", "requested"]
    pend_code: Optional[str] = None


class InsurerProfileRef(BaseModel):
    id: str
    name_ko: str
    as_of: str
    verified: bool
    source_urls: List[str] = Field(default_factory=list)


class Payable(BaseModel):
    billed: int
    ineligible: int
    eligible: int
    deductible: int
    reimbursed: int
    capped_by: Optional[str] = None
    # v2
    coverage_ratio: Optional[float] = None
    copay_method: Optional[str] = None
    deductible_basis: Optional[str] = None
    days: int = 1
    copay_amount: int = Field(0, description="Owner's ratio share (자기부담 비율) after the fixed deductible")
    limit_reduction: int = Field(0, description="Amount removed by per-surgery/day/visit/annual limits")


class Adjudication(BaseModel):
    claim_id: str
    decision: Decision
    confidence: float = Field(..., ge=0, le=1)
    diagnoses: List[dict]
    lines: List[NormalizedLine]
    drugs: List[NormalizedDrug]
    findings: List[Finding]
    payable: Optional[Payable] = None
    engine_version: str
    # v2
    pend_reasons: List[PendReason] = Field(default_factory=list)
    siu_flags: List[SiuFlag] = Field(default_factory=list)
    record_request_rule_id: Optional[str] = Field(
        None, description="Set only when an SIU flag fires: the full 진료부 is requested only then")
    line_decisions: List[LineDecision] = Field(default_factory=list)
    required_documents: List[RequiredDocument] = Field(default_factory=list)
    insurer_profile: Optional[InsurerProfileRef] = None
    benefit_type: Optional[BenefitType] = None
    schema_version: str = "2"

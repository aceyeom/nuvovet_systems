"""
Claim domain model.

A Claim is the standardized record a clinic submits (or an insurer receives) for
one visit: who the patient is, what was diagnosed, what was done, what was
dispensed, and what it cost. Everything the engine produces is an explainable
Finding attached to the claim, never an opaque score alone.
"""

from __future__ import annotations

from datetime import date
from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class Species(str, Enum):
    dog = "dog"
    cat = "cat"


class Patient(BaseModel):
    patient_id: str = Field(..., description="Insurer- or clinic-scoped pseudonymous ID")
    species: Species
    breed: Optional[str] = None
    age_years: Optional[float] = None
    weight_kg: Optional[float] = None
    sex: Optional[str] = None
    neutered: Optional[bool] = None


class Clinic(BaseModel):
    clinic_id: str
    name: Optional[str] = None
    region: Optional[str] = Field(None, description="시/도, e.g. '서울', '경기'")
    posted_prices: Dict[str, int] = Field(
        default_factory=dict,
        description="Procedure code → the clinic's own publicly posted fee (수의사법 진료비 게시 / MAFRA disclosure)",
    )


class LineItem(BaseModel):
    description: str = Field(..., description="Item text exactly as printed on the clinic invoice")
    code: Optional[str] = Field(None, description="Standard procedure code; filled by normalization if absent")
    quantity: float = 1
    unit_price: int = Field(..., ge=0, description="KRW")

    @property
    def total(self) -> int:
        return int(round(self.unit_price * self.quantity))


class Prescription(BaseModel):
    drug: str = Field(..., description="Product or ingredient name, Korean or English")
    dose_mg_per_kg: Optional[float] = None
    total_dose_mg: Optional[float] = Field(None, description="Per administration; converted with patient weight")
    route: Optional[str] = None
    frequency: Optional[str] = None
    days: Optional[int] = None
    unit_price: int = 0
    quantity: float = 1


class Claim(BaseModel):
    claim_id: str
    visit_date: date
    submitted_date: Optional[date] = None
    clinic: Clinic
    patient: Patient
    diagnoses: List[str] = Field(..., min_length=1, description="Diagnosis text or standard codes")
    line_items: List[LineItem] = Field(default_factory=list)
    prescriptions: List[Prescription] = Field(default_factory=list)
    notes: Optional[str] = None


class Policy(BaseModel):
    policy_id: str
    start_date: date
    coverage_ratio: float = Field(0.7, ge=0, le=1, description="Share of eligible cost reimbursed")
    deductible_per_visit: int = 10_000
    per_visit_limit: Optional[int] = 150_000
    annual_limit: Optional[int] = 5_000_000
    used_this_year: int = 0
    illness_waiting_days: int = 30
    excluded_diagnosis_codes: List[str] = Field(default_factory=list)
    pre_existing_codes: List[str] = Field(default_factory=list)
    covers_dental: bool = False
    covers_patella: bool = True


class Severity(str, Enum):
    info = "info"
    warning = "warning"
    critical = "critical"


class Finding(BaseModel):
    rule: str = Field(..., description="Stable rule identifier, e.g. 'clinical.dose_above_range'")
    category: str = Field(..., description="coverage | clinical | pricing | integrity | data")
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


class NormalizedDrug(BaseModel):
    input_name: str
    drug_id: Optional[str]
    ingredient: Optional[str]
    therapeutic_class: Optional[str]
    dose_mg_per_kg: Optional[float]
    total: int


class Decision(str, Enum):
    auto_approve = "auto_approve"
    review = "review"
    deny_recommended = "deny_recommended"


class Payable(BaseModel):
    billed: int
    ineligible: int
    eligible: int
    deductible: int
    reimbursed: int
    capped_by: Optional[str] = None


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

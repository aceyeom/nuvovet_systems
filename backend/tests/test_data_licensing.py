"""Guards on compendium-derived data: the drug records hold facts only, and no record prose reaches a finding."""

import json
from datetime import date
from pathlib import Path

from claims.engine import adjudicate
from claims.knowledge import dose_reference
from claims.models import Claim, Clinic, Patient, Policy, Prescription
from services.drug_loader import get_drug_db

BACKEND = Path(__file__).resolve().parents[1]
CONVERTED = BACKEND / "data" / "converted"
SNAPSHOT = BACKEND.parent / "frontend" / "src" / "data" / "claimsDemoSnapshot.json"

ALLOWED_TOP = {"id", "drug_identity", "dosage_and_kinetics", "_data_quality"}
ALLOWED_IDENTITY = {"name_ko", "name_en", "active_ingredient", "brand_names", "class", "product_names_ko", "product_names_en"}
ALLOWED_DOSE = {"value", "unit", "route", "max_dose_mg_kg"}
POLICY = Policy(policy_id="P", start_date=date(2025, 1, 1))


def _overdose_claim() -> Claim:
    return Claim(
        claim_id="C-1", visit_date=date(2026, 6, 1), clinic=Clinic(clinic_id="H-1", region="경기"),
        patient=Patient(patient_id="A-1", species="dog", breed="말티즈", weight_kg=4.0), diagnoses=["췌장염"],
        prescriptions=[Prescription(drug="부프레노르핀", dose_mg_per_kg=0.2)],  # typical ~0.02: decimal shift
    )


def test_drug_records_are_a_facts_only_extract():
    files = sorted(CONVERTED.rglob("*.jsonl"))
    assert len(files) > 800
    for path in files:
        record = json.loads(path.read_text(encoding="utf-8"))
        assert set(record) <= ALLOWED_TOP, path.name
        assert set(record["drug_identity"]) <= ALLOWED_IDENTITY, path.name
        assert set(record["_data_quality"]) <= {"ddi_source"}, path.name
        for species, block in record["dosage_and_kinetics"].items():
            assert set(block) <= {"dosage_list"}, path.name
            for entry in block["dosage_list"]:
                assert set(entry) <= ALLOWED_DOSE, path.name


def test_dose_reference_carries_numbers_and_provenance_but_no_record_prose():
    refs = [dose_reference(d, s) for d in get_drug_db() for s in ("dog", "cat")]
    refs = [r for r in refs if r]
    assert len(refs) > 500
    assert all(r.contexts == [] for r in refs)


def test_dose_finding_evidence_is_provenance_only():
    result = adjudicate(_overdose_claim(), POLICY)
    finding = next(f for f in result.findings if f.rule == "clinical.dose_above_reference")
    assert finding.evidence == ["근거: legacy compendium-derived record (pending clean-room rebuild)"]


def test_legacy_doses_can_be_switched_off(monkeypatch):
    monkeypatch.setenv("NUVOVET_DISABLE_LEGACY_DOSES", "1")
    assert dose_reference("buprenorphine", "dog") is None
    result = adjudicate(_overdose_claim(), POLICY)
    assert "clinical.dose_above_reference" not in {f.rule for f in result.findings}


def test_demo_snapshot_has_no_record_prose_in_dose_findings():
    snapshot = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
    dose_findings = [f for d in snapshot["details"].values() for f in d["adjudication"].get("findings", [])
                     if f["rule"] == "clinical.dose_above_reference"]
    assert dose_findings, "the seed-7 demo batch should contain dose findings"
    for f in dose_findings:
        assert len(f["evidence"]) == 1 and f["evidence"][0].startswith("근거: "), (
            "stale snapshot: run python scripts/export_claims_demo.py from backend/")

"""
Drug mapper — converts raw JSONL drug records into the frontend Drug
contract consumed by durEngine.js.  All mapping helpers live here.
"""

import re
from typing import Optional, List, Any


def _organ_detail(species_organ: dict, key: str) -> dict:
    entry = species_organ.get(key) or {}
    return {
        "score": entry.get("calculated_score", 0) or 0,
        "keywords": entry.get("triggered_keywords") or [],
        "evidence": entry.get("evidence") or "",
    }


def _risk_score_to_level(score: Any) -> str:
    try:
        s = int(score or 0)
    except (ValueError, TypeError):
        return "none"
    if s >= 60:
        return "high"
    elif s >= 35:
        return "moderate"
    elif s > 5:
        return "low"
    return "none"


def _map_source(source_str: Optional[str]) -> str:
    mapping = {
        "kr_vet": "kr_vet",
        "human_offlabel": "human_offlabel",
        "foreign": "foreign",
    }
    return mapping.get(source_str or "", "unknown")


def _map_primary_elimination(organ: Optional[str]) -> str:
    organ = (organ or "").lower()
    if "liver" in organ or "hepat" in organ:
        return "hepatic"
    elif "kidney" in organ or "renal" in organ:
        return "renal"
    elif "mixed" in organ:
        return "mixed"
    return "hepatic"


def _extract_half_life(raw_hl: Any) -> Optional[float]:
    if raw_hl is None:
        return None
    if isinstance(raw_hl, (int, float)):
        return float(raw_hl)
    if isinstance(raw_hl, dict):
        if raw_hl.get("mean") is not None:
            return float(raw_hl["mean"])
        lo = raw_hl.get("min")
        hi = raw_hl.get("max")
        if lo is not None and hi is not None:
            return (float(lo) + float(hi)) / 2
        v = lo or hi
        return float(v) if v is not None else None
    return None


def _parse_dose_value(val: Any) -> Optional[float]:
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        val_str = str(val).strip()
        parts = re.split(r"\s*[-–]\s*", val_str)
        if len(parts) == 2:
            try:
                return (float(parts[0]) + float(parts[1])) / 2
            except ValueError:
                pass
        return None


def _get_default_dose(dosage_kinetics: Optional[dict], species: str) -> Optional[float]:
    if not dosage_kinetics:
        return None
    sp = dosage_kinetics.get(species) or {}
    dl = sp.get("dosage_list") or []
    if not dl:
        return None
    return _parse_dose_value(dl[0].get("value"))


def _get_species_dose_ceil(dosage_kinetics: Optional[dict], species: str) -> Optional[float]:
    """Return the minimum max_dose_mg_kg across dosage_list entries for a species."""
    if not dosage_kinetics:
        return None
    sp = dosage_kinetics.get(species) or {}
    dl = sp.get("dosage_list") or []
    maxes = [e["max_dose_mg_kg"] for e in dl if isinstance(e, dict) and e.get("max_dose_mg_kg") is not None]
    return min(maxes) if maxes else None


def _get_dose_range(dosage_kinetics: Optional[dict], species: str) -> Optional[List[float]]:
    if not dosage_kinetics:
        return None
    sp = dosage_kinetics.get(species) or {}
    dl = sp.get("dosage_list") or []
    if not dl:
        return None
    val_str = str(dl[0].get("value", "")).strip()
    parts = re.split(r"\s*[-–]\s*", val_str)
    if len(parts) == 2:
        try:
            return [float(parts[0]), float(parts[1])]
        except ValueError:
            pass
    v = _parse_dose_value(val_str)
    return [v, v] if v is not None else None


def map_drug(raw: dict) -> dict:
    """Map a JSONL drug record → frontend Drug contract."""
    identity = raw.get("drug_identity") or {}
    meta = raw.get("metabolism_and_clearance") or {}
    cyp = meta.get("cyp_profile") or {}
    organ = raw.get("organ_burden_logic") or {}
    timing = raw.get("timing_profile") or {}
    sp_flags = raw.get("species_flags") or {}
    dosage = raw.get("dosage_and_kinetics") or {}
    additive = raw.get("additive_risks") or {}
    species_notes_raw = raw.get("species_notes") or {}
    renal_adj = raw.get("renal_dose_adjustment") or {}
    hepatic_adj = raw.get("hepatic_dose_adjustment") or {}
    section = raw.get("section_1_2_10") or {}
    data_quality = raw.get("_data_quality") or {}
    genetic = raw.get("genetic_sensitivity") or {}
    effects = raw.get("effects_and_mechanisms") or {}

    # Organ burden scores
    dog_organ = organ.get("dog") or {}
    cat_organ = organ.get("cat") or {}
    dog_kidney = (dog_organ.get("kidney") or {}).get("calculated_score", 0) or 0
    dog_liver  = (dog_organ.get("liver")  or {}).get("calculated_score", 0) or 0
    dog_blood  = (dog_organ.get("blood")  or {}).get("calculated_score", 0) or 0

    # Risk flags
    nephrotoxic_level = _risk_score_to_level(dog_kidney) if additive.get("nephrotoxic") else (
        _risk_score_to_level(dog_kidney // 2)
    )
    hepatotoxic_level = _risk_score_to_level(dog_liver) if additive.get("hepatotoxic") else (
        _risk_score_to_level(dog_liver // 2)
    )
    bleeding_level = "high" if additive.get("bleeding") else (
        "low" if dog_blood > 20 else "none"
    )
    gi_ulcer_level  = "high" if additive.get("gi_ulcer") else "low"
    qt_level        = "high" if additive.get("qt_prolongation") else "none"
    sedation_flag   = bool(additive.get("sedation"))

    # PK
    f_pct = timing.get("f_percent")
    bioavail = (f_pct / 100.0) if f_pct is not None else None
    pb_pct = timing.get("protein_binding_percent")
    protein_binding = (pb_pct / 100.0) if pb_pct is not None else None

    # Default doses
    dog_dose = _get_default_dose(dosage, "dog")
    cat_dose = _get_default_dose(dosage, "cat")

    # First dog dosage row for unit/freq/route defaults
    dog_dl = (dosage.get("dog") or {}).get("dosage_list") or []
    first_dog = dog_dl[0] if dog_dl else {}

    # Contraindications
    contras = raw.get("contraindications") or []
    contra_conditions = [c.get("condition", "") for c in contras if isinstance(c, dict) and c.get("condition")]

    # Species notes
    def _species_note(sp: str) -> Optional[str]:
        val = species_notes_raw.get(sp)
        if isinstance(val, str):
            return val
        if isinstance(val, dict):
            return val.get("note") or val.get("text")
        return None

    # Affected breeds
    affected_breeds = genetic.get("affected_breeds") or []

    return {
        # Identity
        "id": raw.get("id", ""),
        "name": identity.get("name_en") or "",
        "nameKr": identity.get("name_ko"),
        "activeSubstance": identity.get("active_ingredient") or identity.get("name_en") or "",
        "class": identity.get("class") or "Unknown",
        "source": _map_source(identity.get("source")),
        "allergyClass": identity.get("allergy_class"),
        "offLabelNote": identity.get("off_label_note"),
        "hasReversal": bool(identity.get("has_reversal")),
        "reversalAgent": identity.get("reversal_agent"),
        "formularyStatus": identity.get("formulary_status", "active"),
        "brandNames": identity.get("brand_names") or [],
        "dosageForms": identity.get("dosage_form") or [],
        "availableStrengths": identity.get("available_strengths") or [],

        # Engine input fields
        "renalElimination": meta.get("renal_elimination_fraction") or 0.0,
        "cypProfile": {
            "substrate": cyp.get("substrates") or [],
            "inhibitor": cyp.get("inhibitors") or [],
            "inducer": cyp.get("inducers") or [],
        },
        "riskFlags": {
            "nephrotoxic": nephrotoxic_level,
            "hepatotoxic": hepatotoxic_level,
            "bleedingRisk": bleeding_level,
            "giUlcer": gi_ulcer_level,
            "qtProlongation": qt_level,
        },
        "additiveRisks": {
            "nephrotoxic": bool(additive.get("nephrotoxic")),
            "hepatotoxic": bool(additive.get("hepatotoxic")),
            "giUlcer": bool(additive.get("gi_ulcer")),
            "bleeding": bool(additive.get("bleeding")),
            "sedation": sedation_flag,
            "qtProlongation": bool(additive.get("qt_prolongation")),
        },
        "mdr1Sensitive": bool(sp_flags.get("mdr1_sensitive")),
        "serotoninSyndromeRisk": bool(sp_flags.get("serotonin_syndrome_risk")),
        "narrowTherapeuticIndex": bool(sp_flags.get("narrow_therapeutic_index")),
        "electrolyteEffect": sp_flags.get("electrolyte_effect"),
        "washoutPeriodDays": sp_flags.get("washout_period_days"),
        "speciesContraindicated": sp_flags.get("species_contraindicated") or [],

        # PK
        "pk": {
            "halfLife": _extract_half_life(timing.get("half_life_hr")),
            "timeToPeak": timing.get("t_max_hr"),
            "bioavailability": bioavail,
            "proteinBinding": protein_binding,
            "primaryElimination": _map_primary_elimination(meta.get("primary_metabolic_organ")),
        },

        # Dosing
        "defaultDose": {
            "dog": dog_dose,
            "cat": cat_dose,
        },
        "doseRange": {
            "dog": _get_dose_range(dosage, "dog"),
            "cat": _get_dose_range(dosage, "cat"),
        },
        "unit": first_dog.get("unit", "mg/kg"),
        "freq": first_dog.get("frequency", "SID"),
        "route": first_dog.get("route", "PO"),
        "isApproved": {
            "dog": bool((dosage.get("dog") or {}).get("is_approved")),
            "cat": bool((dosage.get("cat") or {}).get("is_approved")),
        },

        # Clinical
        "speciesNotes": {
            "dog": _species_note("dog"),
            "cat": _species_note("cat"),
        },
        "contraindications": contra_conditions,
        "highlights": section.get("highlights"),
        "indications": section.get("indications"),
        "clientInfo": section.get("client_info"),
        "commonMechanism": effects.get("common_mechanism"),
        "commonAdverseEffects": effects.get("common_extra_effects") or [],

        # Organ burden (enriched)
        "organBurden": {
            "dog": {
                "brain":  _organ_detail(dog_organ, "brain"),
                "blood":  _organ_detail(dog_organ, "blood"),
                "kidney": _organ_detail(dog_organ, "kidney"),
                "liver":  _organ_detail(dog_organ, "liver"),
                "heart":  _organ_detail(dog_organ, "heart"),
            },
            "cat": {
                "brain":  _organ_detail(cat_organ, "brain"),
                "blood":  _organ_detail(cat_organ, "blood"),
                "kidney": _organ_detail(cat_organ, "kidney"),
                "liver":  _organ_detail(cat_organ, "liver"),
                "heart":  _organ_detail(cat_organ, "heart"),
            },
        },

        # Dose adjustments
        "renalDoseAdjustment": {
            "creatinineThresholdDog": renal_adj.get("creatinine_threshold_dog_mg_dL"),
            "creatinineThresholdCat": renal_adj.get("creatinine_threshold_cat_mg_dL"),
            "adjustmentType": renal_adj.get("adjustment_type", "none"),
            "adjustmentFactor": renal_adj.get("adjustment_factor"),
            "note": renal_adj.get("note"),
        },
        "hepaticDoseAdjustment": {
            "applies": bool(hepatic_adj.get("applies")),
            "altThresholdMultiplier": hepatic_adj.get("alt_threshold_multiplier"),
            "adjustmentType": hepatic_adj.get("adjustment_type", "none"),
            "note": hepatic_adj.get("note"),
        },

        # Genetic sensitivity
        "geneticSensitivity": {
            "hasGeneticRisk": bool(genetic.get("has_genetic_risk")),
            "affectedBreeds": affected_breeds,
            "evidence": genetic.get("evidence"),
        },

        # Raw interactions
        "rawInteractions": raw.get("drug_interactions") or [],

        # Full contraindication objects (with match_terms) for patient condition matching
        "rawContraindications": [
            {
                "condition": c.get("condition", ""),
                "matchTerms": c.get("match_terms") or [],
                "severity": c.get("severity", ""),
                "action": c.get("action", ""),
            }
            for c in (raw.get("contraindications") or [])
            if isinstance(c, dict)
        ],

        # Per-species dose ceilings (minimum max_dose_mg_kg in dosage_list)
        "speciesDoseCeil": {
            "dog": _get_species_dose_ceil(dosage, "dog"),
            "cat": _get_species_dose_ceil(dosage, "cat"),
        },

        # True if this is a macrocyclic lactone (mdr1-sensitive antiparasitic)
        "macrocyclicLactone": bool(sp_flags.get("mdr1_sensitive") and identity.get("class") == "Antiparasitic"),

        # Highlights and section text for dose-ceiling parsing
        "sectionHighlights": (raw.get("section_1_2_10") or {}).get("highlights") or "",

        # Data quality
        "dataQuality": {
            "overallConfidence": data_quality.get("overall_confidence") or 75,
            "renalConfidence": data_quality.get("renal_adjustment_confidence", "medium"),
            "hepaticConfidence": data_quality.get("hepatic_adjustment_confidence", "medium"),
            "organBurdenConfidence": data_quality.get("organ_burden_confidence", "medium"),
            "ddiSource": data_quality.get("ddi_source", "unknown"),
        },
    }

"""
Clinical reference endpoints — breeds, conditions, allergies.
"""

import logging
from typing import Optional, Dict, Any

from fastapi import APIRouter, HTTPException, Query

from services.drug_loader import get_drug_db

logger = logging.getLogger("nuvovet")

router = APIRouter(prefix="/api", tags=["clinical"])


@router.get("/breeds")
def list_breeds(
    species: Optional[str] = Query(default=None, description="Filter by species: dog | cat"),
):
    """
    Return all breeds found in genetic_sensitivity.affected_breeds across the drug database,
    deduplicated and sorted alphabetically.
    """
    db = get_drug_db()
    breed_mdr1: Dict[str, bool] = {}
    if species:
        species = species.strip().lower()
        if species not in {"dog", "cat"}:
            raise HTTPException(status_code=400, detail="species must be 'dog' or 'cat'")

    def _has_species_profile(raw: Dict[str, Any], sp: str) -> bool:
        dosage = raw.get("dosage_and_kinetics") or {}
        d = dosage.get(sp) or {}
        has_dose = bool(d.get("is_approved")) or bool(d.get("dosage_list"))

        notes = raw.get("species_notes") or {}
        note_val = notes.get(sp)
        has_note = isinstance(note_val, str) and bool(note_val.strip())

        precautions = raw.get("precautions") or {}
        p = precautions.get(sp) or {}
        has_precaution = isinstance(p, dict) and any(v not in (None, "", False, [], {}) for v in p.values())

        return has_dose or has_note or has_precaution

    species_keywords = {
        "dog": ["dog", "canine", "개", "견"],
        "cat": ["cat", "feline", "고양이", "묘"],
    }

    for raw in db.values():
        genetic = raw.get("genetic_sensitivity") or {}
        sp_flags = raw.get("species_flags") or {}
        is_mdr1 = bool(sp_flags.get("mdr1_sensitive"))
        affected = genetic.get("affected_breeds") or []

        if species:
            contraindicated = set(sp_flags.get("species_contraindicated") or [])
            if f"{species}_all" in contraindicated:
                continue

            if not _has_species_profile(raw, species):
                continue

            evidence = str(genetic.get("evidence") or "").lower()
            if evidence:
                other = "cat" if species == "dog" else "dog"
                has_species_kw = any(k in evidence for k in species_keywords[species])
                has_other_kw = any(k in evidence for k in species_keywords[other])
                if has_other_kw and not has_species_kw:
                    continue

        for breed in affected:
            if not isinstance(breed, str) or not breed.strip():
                continue
            breed = breed.strip()
            if breed not in breed_mdr1:
                breed_mdr1[breed] = False
            if is_mdr1:
                breed_mdr1[breed] = True

    results = sorted(
        [{"breed": b, "mdr1": m} for b, m in breed_mdr1.items()],
        key=lambda x: x["breed"].lower(),
    )
    return {"breeds": results, "total": len(results)}


@router.get("/conditions")
def list_conditions():
    """
    Return all unique match_terms from contraindications[] across the drug database.
    """
    db = get_drug_db()
    terms: set[str] = set()

    for raw in db.values():
        contras = raw.get("contraindications") or []
        for c in contras:
            if not isinstance(c, dict):
                continue
            for term in (c.get("match_terms") or []):
                if isinstance(term, str) and term.strip():
                    terms.add(term.strip())

    sorted_terms = sorted(terms, key=str.lower)
    return {"conditions": sorted_terms, "total": len(sorted_terms)}


@router.get("/allergies")
def list_allergies():
    """
    Return all unique allergy_class values from drug_identity across the drug database.
    """
    db = get_drug_db()
    classes: set[str] = set()

    for raw in db.values():
        identity = raw.get("drug_identity") or {}
        allergy_class = identity.get("allergy_class")
        if isinstance(allergy_class, str) and allergy_class.strip():
            classes.add(allergy_class.strip())

    sorted_classes = sorted(classes, key=str.lower)
    return {"allergies": sorted_classes, "total": len(sorted_classes)}

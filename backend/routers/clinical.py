"""
Clinical reference endpoints — breeds, conditions, allergies.
"""

import logging
from typing import Optional, Dict, Any

from fastapi import APIRouter, HTTPException, Query

from services.drug_loader import get_drug_db

logger = logging.getLogger("nuvovet")

router = APIRouter(prefix="/api", tags=["clinical"])

# ── Static breed registries ────────────────────────────────────────
# The drug database's genetic_sensitivity.affected_breeds is almost
# exclusively canine (MDR1 / sighthound PK).  To give the breed-input
# autocomplete a useful list regardless of species we maintain baseline
# breed lists here and merge any DB-derived entries on top.

_DOG_BREEDS = [
    "Afghan Hound", "Airedale Terrier", "Akita", "Alaskan Malamute",
    "American Bulldog", "American Pit Bull Terrier", "American Staffordshire Terrier",
    "Australian Cattle Dog", "Australian Shepherd", "Basenji", "Basset Hound",
    "Beagle", "Belgian Malinois", "Bernese Mountain Dog", "Bichon Frise",
    "Bloodhound", "Border Collie", "Borzoi", "Boston Terrier", "Boxer",
    "Brittany", "Brussels Griffon", "Bull Terrier", "Bullmastiff",
    "Cairn Terrier", "Cavalier King Charles Spaniel", "Chesapeake Bay Retriever",
    "Chihuahua", "Chinese Crested", "Chinese Shar-Pei", "Chow Chow",
    "Cocker Spaniel", "Collie", "Corgi (Cardigan Welsh)", "Corgi (Pembroke Welsh)",
    "Dachshund", "Dalmatian", "Doberman Pinscher", "English Bulldog",
    "English Setter", "English Springer Spaniel", "French Bulldog",
    "German Shepherd", "German Shorthaired Pointer", "Giant Schnauzer",
    "Golden Retriever", "Great Dane", "Great Pyrenees", "Greyhound",
    "Havanese", "Irish Setter", "Irish Wolfhound", "Italian Greyhound",
    "Jack Russell Terrier", "Japanese Chin", "Keeshond",
    "Labrador Retriever", "Lhasa Apso", "Maltese", "Mastiff",
    "Miniature Pinscher", "Miniature Schnauzer", "Mixed Breed",
    "Newfoundland", "Norwegian Elkhound", "Old English Sheepdog",
    "Papillon", "Pekingese", "Pointer", "Pomeranian", "Poodle (Miniature)",
    "Poodle (Standard)", "Poodle (Toy)", "Pug", "Rhodesian Ridgeback",
    "Rottweiler", "Saint Bernard", "Saluki", "Samoyed",
    "Scottish Terrier", "Shetland Sheepdog", "Shiba Inu", "Shih Tzu",
    "Siberian Husky", "Silken Windhound", "Staffordshire Bull Terrier",
    "Tibetan Terrier", "Vizsla", "Weimaraner", "West Highland White Terrier",
    "Whippet", "Yorkshire Terrier",
]

_CAT_BREEDS = [
    "Abyssinian", "American Curl", "American Shorthair", "American Wirehair",
    "Balinese", "Bengal", "Birman", "Bombay", "British Longhair",
    "British Shorthair", "Burmese", "Burmilla", "Chartreux", "Cornish Rex",
    "Devon Rex", "Domestic Longhair", "Domestic Medium Hair",
    "Domestic Shorthair", "Egyptian Mau", "Exotic Shorthair", "Havana Brown",
    "Himalayan", "Japanese Bobtail", "Khao Manee", "Korat",
    "LaPerm", "Maine Coon", "Manx", "Mixed Breed", "Munchkin",
    "Norwegian Forest Cat", "Ocicat", "Oriental Longhair", "Oriental Shorthair",
    "Persian", "Peterbald", "Ragamuffin", "Ragdoll", "Russian Blue",
    "Savannah", "Scottish Fold", "Selkirk Rex", "Siamese", "Siberian",
    "Singapura", "Snowshoe", "Somali", "Sphynx", "Thai",
    "Tonkinese", "Turkish Angora", "Turkish Van",
]

_KNOWN_DOG_BREEDS = {b.lower() for b in _DOG_BREEDS}
_KNOWN_CAT_BREEDS = {b.lower() for b in _CAT_BREEDS}


@router.get("/breeds")
def list_breeds(
    species: Optional[str] = Query(default=None, description="Filter by species: dog | cat"),
):
    """
    Return breed suggestions for the given species.

    Combines a curated baseline breed list with any pharmacogenetically
    relevant breeds discovered in the drug database.  When ``species``
    is supplied only breeds belonging to that species are returned.
    """
    db = get_drug_db()
    breed_mdr1: Dict[str, bool] = {}
    if species:
        species = species.strip().lower()
        if species not in {"dog", "cat"}:
            raise HTTPException(status_code=400, detail="species must be 'dog' or 'cat'")

    # --- 1. Seed with the static breed list for the requested species ---
    if species == "cat":
        for b in _CAT_BREEDS:
            breed_mdr1[b] = False
    elif species == "dog":
        for b in _DOG_BREEDS:
            breed_mdr1[b] = False
    else:
        # No species filter → return both
        for b in _DOG_BREEDS:
            breed_mdr1[b] = False
        for b in _CAT_BREEDS:
            breed_mdr1[b] = False

    # --- 2. Merge pharmacogenetic breeds from the drug database ----------
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

    for raw in db.values():
        genetic = raw.get("genetic_sensitivity") or {}
        sp_flags = raw.get("species_flags") or {}
        is_mdr1 = bool(sp_flags.get("mdr1_sensitive"))
        affected = genetic.get("affected_breeds") or []
        if not affected:
            continue

        # Determine which species this drug covers
        has_dog_profile = _has_species_profile(raw, "dog")
        has_cat_profile = _has_species_profile(raw, "cat")

        for breed_name in affected:
            if not isinstance(breed_name, str) or not breed_name.strip():
                continue
            breed_name = breed_name.strip()
            breed_lower = breed_name.lower()

            # Classify the breed by checking against known breed lists.
            # Most affected_breeds entries are canine (MDR1, sighthound PK).
            is_dog_breed = breed_lower in _KNOWN_DOG_BREEDS
            is_cat_breed = breed_lower in _KNOWN_CAT_BREEDS

            # If the breed isn't in either static list, infer from the
            # drug's species profile + evidence text.
            if not is_dog_breed and not is_cat_breed:
                evidence = str(genetic.get("evidence") or "").lower()
                cat_kws = ("cat", "feline", "고양이", "묘")
                mentions_cat_breed = any(k in breed_lower for k in ("고양이", "cat", "feline"))
                mentions_cat_only = any(k in evidence for k in cat_kws)

                if mentions_cat_breed or (mentions_cat_only and not has_dog_profile):
                    is_cat_breed = True
                else:
                    # The vast majority of genetic_sensitivity entries
                    # are canine-specific; default unknown breeds to dog.
                    is_dog_breed = True

            # Apply species filter
            if species == "dog" and not is_dog_breed:
                continue
            if species == "cat" and not is_cat_breed:
                continue

            if breed_name not in breed_mdr1:
                breed_mdr1[breed_name] = False
            if is_mdr1:
                breed_mdr1[breed_name] = True

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

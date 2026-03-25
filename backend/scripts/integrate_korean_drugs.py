#!/usr/bin/env python3
"""
Korean Drug Integration — Substance Mapper + JSONL Writer

Reads parsed_korean_drugs.jsonl (from parse_korean_drugs.py) and integrates
Korean product data into existing drug JSONL files.

For matched substances: adds product_names_ko, product_names_en, cautionary_notices_ko
For unmatched substances: creates new JSONL records with source: kr_vet
"""

import json
import re
import sys
from pathlib import Path
from datetime import datetime, timezone

PARSED_FILE = Path(__file__).parent.parent / "data" / "parsed_korean_drugs.jsonl"
CONVERTED_DIR = Path(__file__).parent.parent / "data" / "converted"

# ── Salt form / suffix stripping for substance matching ─────────
SALT_SUFFIXES = [
    " hydrate", " hydrochloride", " hcl", " maleate", " sodium",
    " potassium", " sulfate", " acetate", " tartrate", " citrate",
    " fumarate", " besylate", " mesylate", " phosphate", " succinate",
    " gluconate", " lactate", " bromide", " nitrate", " oxide",
    " valerate", " propionate", " benzoate", " dihydrate",
    " trihydrate", " monohydrate", " anhydrous", " injection",
    " salt", " base",
]


def normalize_ingredient_name(name):
    """Normalize an ingredient English name for matching."""
    if not name:
        return ""
    n = name.lower().strip()
    # Remove specification codes
    for code in ("kvp", "usp", "bp", "kp", "jp", "ep", "별규"):
        n = re.sub(rf"\b{re.escape(code)}\b", "", n)
    # Remove parenthetical content
    n = re.sub(r"\([^)]*\)", "", n)
    # Strip salt suffixes
    for suffix in SALT_SUFFIXES:
        if n.endswith(suffix):
            n = n[: -len(suffix)]
    # Clean up
    n = re.sub(r"[^a-z0-9\s]", " ", n)
    n = re.sub(r"\s+", " ", n).strip()
    return n


def load_parsed_drugs():
    """Load parsed Korean drug data."""
    records = []
    with open(PARSED_FILE, encoding="utf-8") as f:
        for line in f:
            if line.strip():
                records.append(json.loads(line))
    return records


def load_existing_drugs():
    """Load all existing JSONL drug records with their file paths."""
    drugs = {}
    for jsonl_file in sorted(CONVERTED_DIR.rglob("*.jsonl")):
        try:
            raw = jsonl_file.read_text(encoding="utf-8").strip()
            if not raw:
                continue
            rec = json.loads(raw)
            drug_id = rec.get("id") or jsonl_file.stem
            rec.setdefault("id", drug_id)
            drugs[drug_id] = {"record": rec, "path": jsonl_file}
        except Exception:
            pass
    return drugs


def build_match_index(existing_drugs):
    """Build multiple indexes for substance matching."""
    indexes = {
        "by_name_en": {},      # lowercase english name → drug_id
        "by_active": {},       # lowercase active ingredient → drug_id
        "by_normalized": {},   # normalized (salt-stripped) name → drug_id
        "by_drug_id": {},      # drug_id itself → drug_id
    }

    for drug_id, info in existing_drugs.items():
        identity = info["record"].get("drug_identity", {})
        name_en = (identity.get("name_en") or "").lower().strip()
        active = (identity.get("active_ingredient") or "").lower().strip()

        indexes["by_name_en"][name_en] = drug_id
        indexes["by_active"][active] = drug_id
        indexes["by_drug_id"][drug_id] = drug_id

        # Normalized versions
        for n in (name_en, active):
            norm = normalize_ingredient_name(n)
            if norm:
                indexes["by_normalized"][norm] = drug_id

    return indexes


def match_substance(ingredient, indexes):
    """Try to match a parsed ingredient to an existing drug. Returns drug_id or None."""
    en_name = (ingredient.get("name_en") or "").lower().strip()
    ko_name = (ingredient.get("name_ko") or "").lower().strip()

    if not en_name and not ko_name:
        return None

    # Skip garbage entries
    if en_name and (len(en_name) < 3 or en_name.startswith(";") or en_name.startswith("5→")):
        return None

    # Direct English name match
    if en_name in indexes["by_name_en"]:
        return indexes["by_name_en"][en_name]
    if en_name in indexes["by_active"]:
        return indexes["by_active"][en_name]

    # Normalized match (strips salt forms)
    norm = normalize_ingredient_name(en_name)
    if norm and norm in indexes["by_normalized"]:
        return indexes["by_normalized"][norm]

    # Try drug_id form (snake_case)
    id_form = re.sub(r"[^a-z0-9]", "_", en_name)
    id_form = re.sub(r"_+", "_", id_form).strip("_")
    if id_form in indexes["by_drug_id"]:
        return indexes["by_drug_id"][id_form]

    # Try common alternative spellings
    alternatives = {
        "amoxycillin": "amoxicillin",
        "gentamycin": "gentamicin",
        "sulfamethoxazol": "sulfamethoxazole",
        "cephalexine": "cephalexin",
        "enrofloxacine": "enrofloxacin",
        "butaphosphan": "butafosfan",
        "butafosfan": "butaphosphan",
        "dexapanthenol": "dexpanthenol",
    }
    if norm in alternatives:
        alt_norm = alternatives[norm]
        if alt_norm in indexes["by_normalized"]:
            return indexes["by_normalized"][alt_norm]

    return None


def build_cautionary_notices(parsed):
    """Build cautionary_notices_ko from parsed Korean warnings."""
    notices = []

    for c in (parsed.get("contraindications_ko") or []):
        if c and len(c) > 10:
            notices.append({"type": "contraindication", "text_ko": c})

    for a in (parsed.get("adverse_effects_ko") or []):
        if a and len(a) > 10:
            notices.append({"type": "adverse_effect", "text_ko": a})

    for i in (parsed.get("interactions_ko") or []):
        if i and len(i) > 10:
            notices.append({"type": "interaction", "text_ko": i})

    return notices


def create_new_drug_record(parsed, primary_ingredient):
    """Create a full drug record for a new Korean-only substance."""
    en_name = primary_ingredient.get("name_en", "")
    ko_name = primary_ingredient.get("name_ko", "")

    # Generate drug_id from English name or Korean name
    if en_name:
        drug_id = re.sub(r"[^a-z0-9]", "_", en_name.lower())
    else:
        drug_id = re.sub(r"[^가-힣a-z0-9]", "_", ko_name.lower())
    drug_id = re.sub(r"_+", "_", drug_id).strip("_")

    if not drug_id:
        return None, None

    # Dosing
    dog_dosing = []
    for d in (parsed.get("dog_dosing") or []):
        dog_dosing.append({
            "logic_type": "linear",
            "context": parsed.get("indication_text_ko", "")[:100] or "일반적 사용",
            "value": d.get("value", ""),
            "unit": d.get("unit", "mg/kg"),
            "route": d.get("route", "PO"),
            "frequency": d.get("frequency", "SID"),
            "max_dose_mg_kg": None,
            "duration_note": d.get("duration_note"),
            "evidence": "한국 수의약품 허가사항",
        })

    cat_dosing = []
    for d in (parsed.get("cat_dosing") or []):
        cat_dosing.append({
            "logic_type": "linear",
            "context": parsed.get("indication_text_ko", "")[:100] or "일반적 사용",
            "value": d.get("value", ""),
            "unit": d.get("unit", "mg/kg"),
            "route": d.get("route", "PO"),
            "frequency": d.get("frequency", "SID"),
            "max_dose_mg_kg": None,
            "duration_note": d.get("duration_note"),
            "evidence": "한국 수의약품 허가사항",
        })

    # Build strengths
    strengths = []
    for s in (parsed.get("strengths") or []):
        strengths.append({
            "value": s.get("value"),
            "unit": s.get("unit", "mg"),
            "form": s.get("form", "oral"),
            "is_splittable": None,
        })

    organ_template = {
        "calculated_score": 0,
        "triggered_keywords": [],
        "index": -1,
        "evidence": "한국 허가자료에서 직접적인 장기 부담 데이터 없음",
    }

    record = {
        "id": drug_id,
        "drug_identity": {
            "name_ko": ko_name or en_name,
            "name_en": en_name.title() if en_name else ko_name,
            "active_ingredient": en_name.title() if en_name else ko_name,
            "brand_names": [],
            "allergy_class": None,
            "class": parsed.get("drug_class", "Unknown"),
            "source": "kr_vet",
            "formulary_status": "active",
            "has_reversal": False,
            "reversal_agent": None,
            "reversal_evidence": None,
            "off_label_note": None,
            "dosage_form": parsed.get("dosage_forms", []),
            "available_strengths": strengths,
            "product_names_ko": [parsed["product_name_ko"]],
            "product_names_en": [parsed["product_name_en"]] if parsed.get("product_name_en") else [],
        },
        "metabolism_and_clearance": {
            "primary_metabolic_organ": "Unknown",
            "clearance_organ": "Unknown",
            "renal_elimination_fraction": None,
            "cyp_profile": {
                "substrates": [],
                "inhibitors": [],
                "inducers": [],
                "pathway_evidence": None,
            },
            "extra_information": None,
        },
        "organ_burden_logic": {
            "note": "한국 허가자료 기반 — 장기 부담 데이터 미제공",
            "dog": {k: dict(organ_template) for k in ("brain", "blood", "kidney", "liver", "heart")},
            "cat": {k: dict(organ_template) for k in ("brain", "blood", "kidney", "liver", "heart")},
        },
        "timing_profile": {
            "onset_min": None,
            "t_max_hr": None,
            "half_life_hr": {"min": None, "max": None, "mean": None, "species": "unknown"},
            "f_percent": None,
            "protein_binding_percent": None,
            "evidence": None,
        },
        "_ddi_note": None,
        "drug_interactions": [],
        "additive_risks": {
            "nephrotoxic": False, "hepatotoxic": False,
            "gi_ulcer": False, "bleeding": False,
            "sedation": False, "qt_prolongation": False,
        },
        "risk_flags": {
            "nephrotoxic": "none", "hepatotoxic": "none",
            "gi_ulcer": "none", "bleeding": "none",
            "qt_prolongation": "none",
        },
        "species_flags": {
            "species_contraindicated": [],
            "mdr1_sensitive": False,
            "serotonin_syndrome_risk": False,
            "electrolyte_effect": None,
            "narrow_therapeutic_index": False,
            "washout_period_days": None,
        },
        "dosage_and_kinetics": {
            "dog": {
                "is_approved": bool(dog_dosing),
                "dosage_list": dog_dosing,
            },
            "cat": {
                "is_approved": bool(cat_dosing),
                "dosage_list": cat_dosing,
            },
        },
        "renal_dose_adjustment": {
            "creatinine_threshold_dog_mg_dL": None,
            "creatinine_threshold_cat_mg_dL": None,
            "adjustment_type": "unknown",
            "adjustment_factor": None,
            "note": None,
        },
        "hepatic_dose_adjustment": {
            "applies": False,
            "alt_threshold_multiplier": None,
            "adjustment_type": "unknown",
            "note": None,
        },
        "contraindications": [],
        "genetic_sensitivity": {
            "has_genetic_risk": False,
            "affected_breeds": [],
            "gene": None,
            "evidence": None,
        },
        "effects_and_mechanisms": {
            "common_mechanism": None,
            "common_extra_effects": [],
            "dog_mechanism": None,
            "dog_extra_effects": [],
            "cat_mechanism": None,
            "cat_extra_effects": [],
        },
        "species_notes": {"dog": "", "cat": ""},
        "precautions": {
            "dog": {"status": 0, "evidence": ""},
            "cat": {"status": 0, "evidence": ""},
        },
        "storage_and_forms": {"storage": None, "forms": parsed.get("dosage_forms", [])},
        "section_1_2_10": {
            "highlights": parsed.get("indication_text_ko", "") or "",
            "indications": parsed.get("indication_text_ko", "") or "",
            "client_info": "",
        },
        "brief_description": parsed.get("indication_text_ko", ""),
        "primary_indications": [],
        "mechanism_short": None,
        "cautionary_notices_ko": build_cautionary_notices(parsed),
        "_data_quality": {
            "overall_confidence": 25,
            "renal_adjustment_confidence": "none",
            "hepatic_adjustment_confidence": "none",
            "organ_burden_confidence": "none",
            "ddi_source": "unknown",
            "plumbs_sections_found": [],
            "missing_sections": [
                "Pharmacology", "Pharmacokinetics", "Contraindications",
                "Drug Interactions", "Doses", "Adverse Effects",
            ],
            "requires_pmc_rag": True,
            "pmc_rag_fields": [
                "timing_profile", "drug_interactions",
                "organ_burden_logic", "cyp_profile",
            ],
        },
        "_extraction_metadata": {
            "model_used": "regex_parser_v1",
            "extraction_pass": 1,
            "source_file": "AZ트/dog_drugs_cleaned.jsonl",
            "extracted_at": datetime.now(timezone.utc).isoformat(),
            "reviewer": None,
        },
    }

    return drug_id, record


def main():
    print("Loading parsed Korean drugs...")
    parsed_drugs = load_parsed_drugs()
    print(f"  Parsed records: {len(parsed_drugs)}")

    print("Loading existing drug database...")
    existing = load_existing_drugs()
    print(f"  Existing drugs: {len(existing)}")

    indexes = build_match_index(existing)

    # Track results
    matched_count = 0
    new_count = 0
    skipped_count = 0
    updated_files = set()
    new_files = []
    matched_drug_products = {}  # drug_id → list of product names

    for parsed in parsed_drugs:
        active_ingredients = parsed.get("active_ingredients", [])
        if not active_ingredients:
            skipped_count += 1
            continue

        # Try to match each active ingredient
        matched_drug_id = None
        for ing in active_ingredients:
            if ing.get("role") != "active":
                continue
            matched_drug_id = match_substance(ing, indexes)
            if matched_drug_id:
                break

        if matched_drug_id:
            # ── MATCHED: update existing record ──
            info = existing[matched_drug_id]
            rec = info["record"]
            identity = rec.setdefault("drug_identity", {})

            # Add product names (deduplicate)
            prod_ko = identity.setdefault("product_names_ko", [])
            if parsed["product_name_ko"] and parsed["product_name_ko"] not in prod_ko:
                prod_ko.append(parsed["product_name_ko"])

            prod_en = identity.setdefault("product_names_en", [])
            if parsed.get("product_name_en") and parsed["product_name_en"] not in prod_en:
                prod_en.append(parsed["product_name_en"])

            # Add cautionary notices (separate Korean warnings section)
            notices = build_cautionary_notices(parsed)
            existing_notices = rec.setdefault("cautionary_notices_ko", [])
            for notice in notices:
                if notice not in existing_notices:
                    existing_notices.append(notice)

            updated_files.add(info["path"])
            matched_count += 1
            matched_drug_products.setdefault(matched_drug_id, []).append(
                parsed["product_name_ko"]
            )
        else:
            # ── UNMATCHED: create new drug record ──
            primary = active_ingredients[0]
            drug_id, new_rec = create_new_drug_record(parsed, primary)
            if not drug_id or not new_rec:
                skipped_count += 1
                continue

            # Check if we already created this drug_id
            if drug_id in existing:
                # Append product name to already-created record
                info = existing[drug_id]
                rec = info["record"]
                identity = rec.get("drug_identity", {})
                prod_ko = identity.setdefault("product_names_ko", [])
                if parsed["product_name_ko"] not in prod_ko:
                    prod_ko.append(parsed["product_name_ko"])
                updated_files.add(info["path"])
                matched_count += 1
                continue

            # Determine output directory
            first_char = drug_id[0].upper()
            if not first_char.isalpha():
                first_char = "_"
            out_dir = CONVERTED_DIR / first_char
            out_dir.mkdir(parents=True, exist_ok=True)
            out_path = out_dir / f"{drug_id}.jsonl"

            # Write new file
            out_path.write_text(
                json.dumps(new_rec, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            new_files.append(out_path)
            new_count += 1

            # Add to existing index so future products can match
            existing[drug_id] = {"record": new_rec, "path": out_path}
            indexes["by_drug_id"][drug_id] = drug_id
            en_lower = (primary.get("name_en") or "").lower().strip()
            if en_lower:
                indexes["by_name_en"][en_lower] = drug_id
                indexes["by_active"][en_lower] = drug_id
                norm = normalize_ingredient_name(en_lower)
                if norm:
                    indexes["by_normalized"][norm] = drug_id

    # Write updated existing records back to their files
    for file_path in updated_files:
        # Find the drug_id for this path
        for drug_id, info in existing.items():
            if info["path"] == file_path:
                file_path.write_text(
                    json.dumps(info["record"], ensure_ascii=False, indent=2),
                    encoding="utf-8",
                )
                break

    print(f"\n=== Integration Results ===")
    print(f"  Matched to existing drugs: {matched_count} products → {len(matched_drug_products)} drugs")
    print(f"  New drug records created: {new_count}")
    print(f"  Skipped (no usable data): {skipped_count}")
    print(f"  Existing JSONL files updated: {len(updated_files)}")

    if matched_drug_products:
        print(f"\n  Top matched drugs:")
        for did, prods in sorted(
            matched_drug_products.items(), key=lambda x: -len(x[1])
        )[:15]:
            print(f"    {did}: {len(prods)} products → {prods[:3]}")

    if new_files:
        print(f"\n  New drug files created:")
        for f in new_files[:20]:
            print(f"    {f.relative_to(CONVERTED_DIR)}")
        if len(new_files) > 20:
            print(f"    ... and {len(new_files) - 20} more")

    # Summary stats
    total_with_products = sum(
        1 for d in existing.values()
        if d["record"].get("drug_identity", {}).get("product_names_ko")
    )
    total_with_notices = sum(
        1 for d in existing.values()
        if d["record"].get("cautionary_notices_ko")
    )
    print(f"\n  Total drugs with Korean product names: {total_with_products}")
    print(f"  Total drugs with Korean cautionary notices: {total_with_notices}")


if __name__ == "__main__":
    main()

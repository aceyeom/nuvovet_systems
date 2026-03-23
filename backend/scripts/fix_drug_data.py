"""
Auto-fix mg/m² vs mg/kg unit mismatches in drug JSONL files.
Scans evidence/duration_note for mg/m² mentions and corrects the unit field.
"""
import json
import os
import re
import sys
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "converted"


def fix_drug_units(drug_data):
    """Fix mg/m² mismatches. Returns (modified_data, fixes_applied)."""
    fixes = []
    dosage = drug_data.get("dosage_and_kinetics") or {}

    for species in ["dog", "cat"]:
        sp = dosage.get(species) or {}
        dl = sp.get("dosage_list") or []
        for i, entry in enumerate(dl):
            if not isinstance(entry, dict):
                continue
            unit = entry.get("unit", "")
            evidence = entry.get("evidence", "") or ""
            duration_note = entry.get("duration_note", "") or ""
            combined = f"{evidence} {duration_note}"

            if unit == "mg/kg" and re.search(r"mg/m[²2]", combined, re.IGNORECASE):
                entry["unit"] = "mg/m²"
                # Clean up duration_note that says "mg/m2 단위임" or similar
                if duration_note:
                    entry["duration_note"] = re.sub(
                        r"\s*(?:mg/m[²2]\s*단위(?:임)?[.\s]*(?:—\s*)?(?:mg/kg와?\s*혼동\s*금지[.\s]*)?)",
                        "",
                        duration_note,
                    ).strip()
                    entry["duration_note"] = re.sub(
                        r"\s*단위는\s*mg/m[²2]임에\s*주의[.\s]*",
                        "",
                        entry["duration_note"],
                    ).strip()
                # Clean up evidence: normalize mg/m2 → mg/m²
                if evidence:
                    entry["evidence"] = re.sub(r"mg/m2", "mg/m²", evidence)
                fixes.append({
                    "species": species,
                    "index": i,
                    "context": entry.get("context", "")[:50],
                })
    return drug_data, fixes


def tag_strength_forms(drug_data):
    """Add form field to available_strengths based on unit and dosage_form."""
    identity = drug_data.get("drug_identity") or {}
    strengths = identity.get("available_strengths") or []
    dosage_forms = set(f.lower() for f in (identity.get("dosage_form") or []))
    changes = 0

    for s in strengths:
        if not isinstance(s, dict):
            continue
        # Skip if already tagged
        if s.get("form"):
            continue

        unit = (s.get("unit") or "").strip().lower()

        # Injectable
        if unit in ("mg/ml", "mg/ml", "iu/ml", "mcg/ml", "µg/ml", "u/ml") or "/ml" in unit:
            s["form"] = "injectable"
            changes += 1
        # Percentage — disambiguate
        elif unit == "%":
            if "ophthalmic" in dosage_forms or "drop" in dosage_forms:
                # If drug also has topical forms, check name
                if "topical" in dosage_forms or "oint" in dosage_forms:
                    # Has both — look at drug name for hint
                    name = (identity.get("name_en") or "").lower()
                    if "ophthalmic" in name or "eye" in name:
                        s["form"] = "ophthalmic"
                    else:
                        s["form"] = "topical"
                else:
                    s["form"] = "ophthalmic"
            elif "topical" in dosage_forms or "oint" in dosage_forms:
                s["form"] = "topical"
            elif "inh" in dosage_forms or "inhalation" in dosage_forms:
                s["form"] = "inhalation"
            elif "inj" in dosage_forms:
                # % for injectable solutions (e.g., thiopental 2.5%)
                s["form"] = "injectable"
            elif "oral liquid" in dosage_forms or "susp" in dosage_forms:
                s["form"] = "oral"
            else:
                # Default: check the full drug dosage_form list
                s["form"] = "oral"
            changes += 1
        # Oral solid units
        elif unit in ("mg", "g", "mcg", "µg", "iu", "meq"):
            s["form"] = "oral"
            changes += 1
        else:
            s["form"] = "oral"
            changes += 1

        # Add is_splittable as null if not present
        if "is_splittable" not in s:
            s["is_splittable"] = None

    return drug_data, changes


def main():
    print("=" * 60)
    print("Auto-Fix: mg/m² Units + Strength Form Tagging")
    print("=" * 60)

    total_unit_fixes = 0
    total_form_tags = 0
    files_modified = 0

    for root, _dirs, files in os.walk(DATA_DIR):
        for fname in sorted(files):
            if not fname.endswith(".jsonl"):
                continue
            fpath = os.path.join(root, fname)
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except (json.JSONDecodeError, IOError) as e:
                print(f"  WARN: skip {fpath}: {e}")
                continue

            data, unit_fixes = fix_drug_units(data)
            data, form_changes = tag_strength_forms(data)

            if unit_fixes or form_changes:
                with open(fpath, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                    f.write("\n")
                files_modified += 1
                total_unit_fixes += len(unit_fixes)
                total_form_tags += form_changes
                if unit_fixes:
                    drug_id = data.get("id", fname)
                    print(f"  [UNIT FIX] {drug_id}: {len(unit_fixes)} entries → mg/m²")

    print(f"\n{'=' * 60}")
    print(f"Files modified: {files_modified}")
    print(f"Unit fixes (mg/kg → mg/m²): {total_unit_fixes}")
    print(f"Strength form tags added: {total_form_tags}")
    print("=" * 60)


if __name__ == "__main__":
    main()

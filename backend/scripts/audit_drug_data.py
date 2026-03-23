"""
Drug Data Audit Script
Checks all JSONL drug files for data integrity issues:
1. mg/m² vs mg/kg unit mismatches (evidence says mg/m² but unit says mg/kg)
2. Form-dosage mismatches (dosage_form includes Topical/Oint/Drop/Ophthalmic but no matching dosage_list)
3. Strength-form mismatches (available_strengths has % but dosage_form lacks Topical/Ophthalmic)
4. Field completeness audit (null/empty counts across all drugs)

Usage: python backend/scripts/audit_drug_data.py
"""

import json
import os
import re
import sys
from pathlib import Path
from collections import defaultdict

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "converted"


def load_all_drugs():
    """Load all drug JSONL files."""
    drugs = []
    for root, _dirs, files in os.walk(DATA_DIR):
        for fname in files:
            if fname.endswith(".jsonl"):
                fpath = os.path.join(root, fname)
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    data["_source_file"] = fpath
                    drugs.append(data)
                except (json.JSONDecodeError, IOError) as e:
                    print(f"  WARN: Could not load {fpath}: {e}")
    return drugs


def check_unit_mismatch(drug):
    """Check if evidence mentions mg/m² but unit says mg/kg."""
    issues = []
    drug_id = drug.get("id", "unknown")
    dosage = drug.get("dosage_and_kinetics") or {}

    for species in ["dog", "cat"]:
        sp_data = dosage.get(species) or {}
        dl = sp_data.get("dosage_list") or []
        for i, entry in enumerate(dl):
            if not isinstance(entry, dict):
                continue
            unit = entry.get("unit", "")
            evidence = entry.get("evidence", "")
            duration_note = entry.get("duration_note", "")
            combined = f"{evidence} {duration_note}"

            # Check if evidence mentions mg/m2 or mg/m² but unit is mg/kg
            if unit == "mg/kg" and re.search(r"mg/m[²2]", combined, re.IGNORECASE):
                issues.append({
                    "drug_id": drug_id,
                    "species": species,
                    "entry_index": i,
                    "current_unit": unit,
                    "evidence": evidence.strip(),
                    "context": entry.get("context", ""),
                    "severity": "CRITICAL",
                })
    return issues


def check_form_dosage_mismatch(drug):
    """Check if dosage_form has forms with no matching dosage_list entries."""
    issues = []
    drug_id = drug.get("id", "unknown")
    identity = drug.get("drug_identity") or {}
    dosage_forms = identity.get("dosage_form") or []
    dosage = drug.get("dosage_and_kinetics") or {}

    topical_forms = {"Topical", "Oint"}
    ophthalmic_forms = {"Ophthalmic", "Drop"}
    topical_routes = {"Topical"}
    ophthalmic_routes = {"Ophthalmic", "Otic"}

    for species in ["dog", "cat"]:
        sp_data = dosage.get(species) or {}
        dl = sp_data.get("dosage_list") or []
        dl_routes = {e.get("route") for e in dl if isinstance(e, dict) and e.get("route")}

        has_topical_form = bool(topical_forms & set(dosage_forms))
        has_topical_route = bool(topical_routes & dl_routes)
        if has_topical_form and not has_topical_route and dl:
            issues.append({
                "drug_id": drug_id,
                "species": species,
                "type": "form_without_dosage",
                "forms": list(topical_forms & set(dosage_forms)),
                "missing_routes": list(topical_routes),
            })

        has_oph_form = bool(ophthalmic_forms & set(dosage_forms))
        has_oph_route = bool(ophthalmic_routes & dl_routes)
        if has_oph_form and not has_oph_route and dl:
            issues.append({
                "drug_id": drug_id,
                "species": species,
                "type": "form_without_dosage",
                "forms": list(ophthalmic_forms & set(dosage_forms)),
                "missing_routes": list(ophthalmic_routes),
            })

    return issues


def check_strength_form_mismatch(drug):
    """Check if available_strengths has % but dosage_form lacks Topical/Ophthalmic."""
    issues = []
    drug_id = drug.get("id", "unknown")
    identity = drug.get("drug_identity") or {}
    strengths = identity.get("available_strengths") or []
    dosage_forms = set(identity.get("dosage_form") or [])

    has_percent = any(s.get("unit") == "%" for s in strengths if isinstance(s, dict))
    has_topical_form = bool({"Topical", "Oint", "Ophthalmic", "Drop"} & dosage_forms)

    if has_percent and not has_topical_form:
        issues.append({
            "drug_id": drug_id,
            "type": "percent_strength_no_topical_form",
            "strengths": [s for s in strengths if isinstance(s, dict) and s.get("unit") == "%"],
            "dosage_forms": list(dosage_forms),
        })

    return issues


def field_completeness(drugs):
    """Count null/empty fields across all drugs."""
    fields_to_check = {
        "drug_identity.name_en": lambda d: (d.get("drug_identity") or {}).get("name_en"),
        "drug_identity.name_ko": lambda d: (d.get("drug_identity") or {}).get("name_ko"),
        "drug_identity.active_ingredient": lambda d: (d.get("drug_identity") or {}).get("active_ingredient"),
        "drug_identity.class": lambda d: (d.get("drug_identity") or {}).get("class"),
        "drug_identity.source": lambda d: (d.get("drug_identity") or {}).get("source"),
        "drug_identity.dosage_form": lambda d: (d.get("drug_identity") or {}).get("dosage_form"),
        "drug_identity.available_strengths": lambda d: (d.get("drug_identity") or {}).get("available_strengths"),
        "brief_description": lambda d: d.get("brief_description"),
        "primary_indications": lambda d: d.get("primary_indications"),
        "mechanism_short": lambda d: d.get("mechanism_short"),
        "metabolism_and_clearance.primary_metabolic_organ": lambda d: (d.get("metabolism_and_clearance") or {}).get("primary_metabolic_organ"),
        "timing_profile.half_life_hr": lambda d: (d.get("timing_profile") or {}).get("half_life_hr"),
        "contraindications": lambda d: d.get("contraindications"),
        "drug_interactions": lambda d: d.get("drug_interactions"),
        "_data_quality.overall_confidence": lambda d: (d.get("_data_quality") or {}).get("overall_confidence"),
    }

    stats = {}
    total = len(drugs)
    for field_name, extractor in fields_to_check.items():
        populated = 0
        for drug in drugs:
            val = extractor(drug)
            if val is not None and val != "" and val != []:
                populated += 1
        stats[field_name] = {
            "populated": populated,
            "missing": total - populated,
            "coverage_pct": round(100 * populated / total, 1) if total > 0 else 0,
        }
    return stats


def main():
    print("=" * 60)
    print("Drug Data Audit Report")
    print("=" * 60)

    drugs = load_all_drugs()
    print(f"\nLoaded {len(drugs)} drug files from {DATA_DIR}\n")

    # 1. mg/m² vs mg/kg mismatches
    print("-" * 40)
    print("1. mg/m² vs mg/kg Unit Mismatches (CRITICAL)")
    print("-" * 40)
    unit_issues = []
    for drug in drugs:
        unit_issues.extend(check_unit_mismatch(drug))
    if unit_issues:
        for issue in unit_issues:
            print(f"  [{issue['severity']}] {issue['drug_id']} ({issue['species']}) entry {issue['entry_index']}:")
            print(f"    Unit: {issue['current_unit']} | Evidence: {issue['evidence'][:80]}...")
            print(f"    Context: {issue['context'][:60]}")
        print(f"\n  Total: {len(unit_issues)} mismatches found")
    else:
        print("  No mismatches found.")

    # 2. Form-dosage mismatches
    print(f"\n{'-' * 40}")
    print("2. Form-Dosage Mismatches")
    print("-" * 40)
    form_issues = []
    for drug in drugs:
        form_issues.extend(check_form_dosage_mismatch(drug))
    if form_issues:
        for issue in form_issues:
            print(f"  {issue['drug_id']} ({issue['species']}): has forms {issue['forms']} but no routes {issue['missing_routes']}")
        print(f"\n  Total: {len(form_issues)} mismatches found")
    else:
        print("  No mismatches found.")

    # 3. Strength-form mismatches
    print(f"\n{'-' * 40}")
    print("3. Strength-Form Mismatches (% unit without Topical/Ophthalmic form)")
    print("-" * 40)
    strength_issues = []
    for drug in drugs:
        strength_issues.extend(check_strength_form_mismatch(drug))
    if strength_issues:
        for issue in strength_issues:
            pct_vals = [f"{s['value']}%" for s in issue['strengths']]
            print(f"  {issue['drug_id']}: has strengths {pct_vals} but dosage_forms = {issue['dosage_forms']}")
        print(f"\n  Total: {len(strength_issues)} mismatches found")
    else:
        print("  No mismatches found.")

    # 4. Field completeness
    print(f"\n{'-' * 40}")
    print("4. Field Completeness Audit")
    print("-" * 40)
    stats = field_completeness(drugs)
    for field, info in sorted(stats.items(), key=lambda x: x[1]["coverage_pct"]):
        bar = "#" * int(info["coverage_pct"] / 5)
        print(f"  {field:50s} {info['coverage_pct']:5.1f}% ({info['populated']}/{info['populated'] + info['missing']}) {bar}")

    # JSON report
    report = {
        "total_drugs": len(drugs),
        "unit_mismatches": unit_issues,
        "form_dosage_mismatches": form_issues,
        "strength_form_mismatches": strength_issues,
        "field_completeness": stats,
    }
    report_path = Path(__file__).resolve().parent / "audit_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(f"\nFull report saved to: {report_path}")

    total_issues = len(unit_issues) + len(form_issues) + len(strength_issues)
    print(f"\n{'=' * 60}")
    print(f"Total issues found: {total_issues}")
    if unit_issues:
        print(f"  CRITICAL: {len(unit_issues)} mg/m² vs mg/kg mismatches — these could cause fatal dosing errors!")
    print("=" * 60)
    return 1 if unit_issues else 0


if __name__ == "__main__":
    sys.exit(main())

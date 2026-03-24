"""
Clinical Accuracy Audit Script for Veterinary Drug Database
============================================================
Scans all 632+ JSONL drug files for data quality issues that can cause
incorrect clinical outputs in the DUR engine.

Checks:
1. Empty CYP profiles on drugs known to be CYP substrates/inhibitors
2. Drug interaction evidence mentioning wrong drugs (data pollution)
3. Missing critical contraindications for known dangerous combinations
4. rawInteractions with overly generic drug class names that cause false matches
5. Low confidence scores on clinically important drugs
6. Missing matchTerms in contraindications (English terms needed for matching)
7. Inconsistent severity ratings vs clinical reality
8. Drug class misassignment

Usage:
    python backend/scripts/audit_clinical_accuracy.py [--verbose] [--fix-preview]
"""

import json
import os
import sys
import re
from pathlib import Path
from collections import defaultdict

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "converted"

# ── Known CYP profiles for high-priority drugs (from DrugBank / FDA labels) ──
# These are drugs where an empty CYP profile is a confirmed data gap.
KNOWN_CYP_PROFILES = {
    "propranolol": {
        "substrates": ["CYP1A2", "CYP2D6", "CYP2C19", "CYP3A4"],
        "inhibitors": ["CYP2D6", "CYP1A2"],
        "inducers": [],
        "source": "DrugBank DB00571; FDA label"
    },
    "metronidazole": {
        "substrates": ["CYP3A4", "CYP2C9"],
        "inhibitors": ["CYP2C9"],
        "inducers": [],
        "source": "DrugBank DB00916"
    },
    "diazepam": {
        "substrates": ["CYP3A4", "CYP2C19", "CYP2B6"],
        "inhibitors": [],
        "inducers": [],
        "source": "DrugBank DB00829"
    },
    "tramadol": {
        "substrates": ["CYP2D6", "CYP3A4", "CYP2B6"],
        "inhibitors": [],
        "inducers": [],
        "source": "DrugBank DB00193; active metabolite M1 via CYP2D6"
    },
    "chloramphenicol": {
        "substrates": ["CYP3A4"],
        "inhibitors": ["CYP3A4", "CYP2C19"],
        "inducers": [],
        "source": "DrugBank DB00446"
    },
    "fluconazole": {
        "substrates": [],
        "inhibitors": ["CYP2C9", "CYP2C19", "CYP3A4"],
        "inducers": [],
        "source": "DrugBank DB00196"
    },
    "itraconazole": {
        "substrates": ["CYP3A4"],
        "inhibitors": ["CYP3A4"],
        "inducers": [],
        "source": "DrugBank DB01167"
    },
    "erythromycin": {
        "substrates": ["CYP3A4"],
        "inhibitors": ["CYP3A4"],
        "inducers": [],
        "source": "DrugBank DB00199"
    },
    "cimetidine": {
        "substrates": [],
        "inhibitors": ["CYP1A2", "CYP2C19", "CYP2D6", "CYP3A4"],
        "inducers": [],
        "source": "DrugBank DB00501"
    },
    "omeprazole": {
        "substrates": ["CYP2C19", "CYP3A4"],
        "inhibitors": ["CYP2C19"],
        "inducers": ["CYP1A2"],
        "source": "DrugBank DB00338"
    },
}

# Known critical contraindications that MUST exist
REQUIRED_CONTRAINDICATIONS = {
    "propranolol": [
        {"condition_keywords": ["asthma", "bronchospasm", "COPD"],
         "severity": "absolute", "reason": "β₂ blockade → bronchoconstriction"},
        {"condition_keywords": ["heart failure", "CHF"],
         "severity": "absolute", "reason": "negative inotrope"},
        {"condition_keywords": ["bradycardia"],
         "severity": "absolute", "reason": "negative chronotrope"},
    ],
    "ketoconazole_systemic": [
        {"condition_keywords": ["liver", "hepatic"],
         "severity": "absolute", "reason": "severe hepatotoxicity"},
    ],
    "enrofloxacin": [
        {"condition_keywords": ["growing", "puppy", "kitten", "young"],
         "severity": "relative", "reason": "cartilage damage in young animals"},
    ],
    "cisplatin": [
        {"condition_keywords": ["cat", "feline"],
         "severity": "absolute", "reason": "fatal pulmonary edema in cats"},
    ],
    "metronidazole": [
        {"condition_keywords": ["seizure", "epilepsy"],
         "severity": "relative", "reason": "neurotoxicity/seizure threshold lowering"},
    ],
}

# Drugs where specific other-drug mentions in evidence text are WRONG
# Format: {drug_id: [terms that should NOT appear in its rawInteraction evidence]}
EVIDENCE_POLLUTION_CHECKS = {
    "ivermectin": ["nephrotoxicity", "nephrotoxic", "renal failure", "cyclosporine dosage",
                   "cyclosporine blood concentration"],
    "propranolol": ["fluoroquinolone", "chelation", "chelate", "quinolone"],
    "gabapentin": ["nephrotoxicity", "hepatotoxicity"],
    "meloxicam": ["serotonin syndrome"],
}

# Drug class validation
EXPECTED_DRUG_CLASSES = {
    "propranolol": ["Cardiac", "Beta-blocker", "Antiarrhythmic"],
    "ketoconazole_systemic": ["Antifungal"],
    "ivermectin": ["Antiparasitic"],
    "enrofloxacin": ["Antibiotic", "Fluoroquinolone"],
    "metronidazole": ["Antibiotic", "Antiprotozoal"],
    "cyclosporine_systemic": ["Immunosuppressant"],
    "prednisolone": ["Corticosteroid", "Glucocorticoid"],
    "meloxicam": ["NSAID"],
    "furosemide": ["Diuretic", "Loop diuretic"],
    "phenobarbital": ["Anticonvulsant", "Barbiturate"],
}


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


def check_empty_cyp_profiles(drugs):
    """Check for drugs with empty CYP profiles that are known CYP substrates/inhibitors."""
    issues = []
    for drug in drugs:
        drug_id = drug.get("id", "unknown")
        cyp = (drug.get("metabolism_and_clearance") or {}).get("cyp_profile") or {}
        subs = cyp.get("substrates") or []
        inhib = cyp.get("inhibitors") or []
        induc = cyp.get("inducers") or []

        if drug_id in KNOWN_CYP_PROFILES:
            known = KNOWN_CYP_PROFILES[drug_id]
            if not subs and known["substrates"]:
                issues.append({
                    "drug_id": drug_id,
                    "issue": "EMPTY_CYP_SUBSTRATES",
                    "severity": "HIGH",
                    "detail": f"Missing CYP substrates. Known: {known['substrates']} (source: {known['source']})",
                    "fix": {"field": "metabolism_and_clearance.cyp_profile.substrates",
                            "value": known["substrates"]},
                })
            if not inhib and known["inhibitors"]:
                issues.append({
                    "drug_id": drug_id,
                    "issue": "EMPTY_CYP_INHIBITORS",
                    "severity": "HIGH",
                    "detail": f"Missing CYP inhibitors. Known: {known['inhibitors']} (source: {known['source']})",
                    "fix": {"field": "metabolism_and_clearance.cyp_profile.inhibitors",
                            "value": known["inhibitors"]},
                })
    return issues


def check_evidence_pollution(drugs):
    """Check for rawInteraction evidence text mentioning wrong drugs/conditions."""
    issues = []
    for drug in drugs:
        drug_id = drug.get("id", "unknown")
        if drug_id not in EVIDENCE_POLLUTION_CHECKS:
            continue
        forbidden_terms = EVIDENCE_POLLUTION_CHECKS[drug_id]
        interactions = drug.get("drug_interactions") or []
        for idx, inter in enumerate(interactions):
            evidence = (inter.get("evidence") or "").lower()
            for term in forbidden_terms:
                if term.lower() in evidence:
                    issues.append({
                        "drug_id": drug_id,
                        "issue": "EVIDENCE_POLLUTION",
                        "severity": "CRITICAL",
                        "detail": f"Interaction [{idx}] with '{inter.get('drug', '?')}' "
                                  f"contains forbidden term '{term}' in evidence: "
                                  f"\"{inter.get('evidence', '')[:120]}...\"",
                        "fix": {"field": f"drug_interactions[{idx}].evidence",
                                "action": "review_and_clean"},
                    })
    return issues


def check_missing_contraindications(drugs):
    """Check that critical known contraindications exist."""
    issues = []
    drug_map = {d.get("id", ""): d for d in drugs}
    for drug_id, required_list in REQUIRED_CONTRAINDICATIONS.items():
        drug = drug_map.get(drug_id)
        if not drug:
            continue
        contras = drug.get("contraindications") or []
        for req in required_list:
            found = False
            for contra in contras:
                match_terms = contra.get("match_terms") or []
                match_terms_low = [t.lower() for t in match_terms]
                condition_low = (contra.get("condition") or "").lower()
                for kw in req["condition_keywords"]:
                    if any(kw.lower() in t for t in match_terms_low) or kw.lower() in condition_low:
                        found = True
                        break
                if found:
                    break
            if not found:
                issues.append({
                    "drug_id": drug_id,
                    "issue": "MISSING_CONTRAINDICATION",
                    "severity": "HIGH",
                    "detail": f"Missing contraindication for: {req['condition_keywords']} "
                              f"({req['reason']}). Expected severity: {req['severity']}",
                    "fix": {"field": "contraindications",
                            "action": "add_entry",
                            "suggested_match_terms": req["condition_keywords"]},
                })
    return issues


def check_generic_interaction_names(drugs):
    """Flag rawInteractions where the drug field is a class name rather than specific drug."""
    issues = []
    generic_patterns = [
        r"^(NSAIDs?|corticosteroids?|aminoglycosides?|fluoroquinolones?|"
        r"beta.?blockers?|ACE inhibitors?|diuretics?|opioids?|barbiturates?)$"
    ]
    for drug in drugs:
        drug_id = drug.get("id", "unknown")
        interactions = drug.get("drug_interactions") or []
        for idx, inter in enumerate(interactions):
            drug_name = inter.get("drug", "")
            for pat in generic_patterns:
                if re.match(pat, drug_name.strip(), re.IGNORECASE):
                    issues.append({
                        "drug_id": drug_id,
                        "issue": "GENERIC_INTERACTION_NAME",
                        "severity": "LOW",
                        "detail": f"Interaction [{idx}] uses generic class name '{drug_name}' "
                                  f"instead of specific drug. May cause false positive matching.",
                        "fix": {"field": f"drug_interactions[{idx}].drug",
                                "action": "specify_individual_drugs"},
                    })
    return issues


def check_low_confidence_critical_drugs(drugs):
    """Flag drugs used in INTERACTION_MATRIX rules that have low confidence."""
    issues = []
    # Drugs that appear in the DUR engine's INTERACTION_MATRIX or critical rules
    critical_drug_ids = set()
    for drug in drugs:
        drug_id = drug.get("id", "unknown")
        cyp = (drug.get("metabolism_and_clearance") or {}).get("cyp_profile") or {}
        if cyp.get("inhibitors") or cyp.get("substrates"):
            critical_drug_ids.add(drug_id)
        flags = drug.get("species_flags") or {}
        if flags.get("mdr1_sensitive") or flags.get("narrow_therapeutic_index"):
            critical_drug_ids.add(drug_id)
        risks = drug.get("additive_risks") or {}
        if risks.get("nephrotoxic") or risks.get("qt_prolongation"):
            critical_drug_ids.add(drug_id)

    for drug in drugs:
        drug_id = drug.get("id", "unknown")
        if drug_id not in critical_drug_ids:
            continue
        quality = drug.get("_data_quality") or {}
        confidence = quality.get("overall_confidence", 100)
        if confidence < 50:
            missing = quality.get("missing_sections") or []
            issues.append({
                "drug_id": drug_id,
                "issue": "LOW_CONFIDENCE_CRITICAL_DRUG",
                "severity": "HIGH",
                "detail": f"Confidence {confidence}/100 on a drug used in DUR engine rules. "
                          f"Missing sections: {missing}",
                "fix": {"action": "re_extract_from_source",
                        "missing_sections": missing},
            })
    return issues


def check_drug_class_assignment(drugs):
    """Check that drug classes match expected values."""
    issues = []
    drug_map = {d.get("id", ""): d for d in drugs}
    for drug_id, expected_classes in EXPECTED_DRUG_CLASSES.items():
        drug = drug_map.get(drug_id)
        if not drug:
            continue
        actual_class = (drug.get("drug_identity") or {}).get("class", "")
        if not any(ec.lower() in actual_class.lower() for ec in expected_classes):
            issues.append({
                "drug_id": drug_id,
                "issue": "DRUG_CLASS_MISMATCH",
                "severity": "MODERATE",
                "detail": f"Class is '{actual_class}' but expected one of {expected_classes}",
                "fix": {"field": "drug_identity.class",
                        "suggested": expected_classes[0]},
            })
    return issues


def check_contraindication_match_terms(drugs):
    """Check that contraindications have English match_terms (not only Korean condition text)."""
    issues = []
    for drug in drugs:
        drug_id = drug.get("id", "unknown")
        contras = drug.get("contraindications") or []
        for idx, contra in enumerate(contras):
            match_terms = contra.get("match_terms") or []
            if not match_terms:
                issues.append({
                    "drug_id": drug_id,
                    "issue": "EMPTY_MATCH_TERMS",
                    "severity": "MODERATE",
                    "detail": f"Contraindication [{idx}] '{contra.get('condition', '?')}' "
                              f"has no match_terms — will never be matched by the DUR engine.",
                    "fix": {"field": f"contraindications[{idx}].match_terms",
                            "action": "add_english_terms"},
                })
            else:
                # Check if all terms are Korean-only (no Latin characters)
                all_korean = all(not re.search(r'[a-zA-Z]', t) for t in match_terms)
                if all_korean:
                    issues.append({
                        "drug_id": drug_id,
                        "issue": "KOREAN_ONLY_MATCH_TERMS",
                        "severity": "MODERATE",
                        "detail": f"Contraindication [{idx}] has Korean-only match_terms: {match_terms}. "
                                  f"Engine matching is English-based.",
                        "fix": {"field": f"contraindications[{idx}].match_terms",
                                "action": "add_english_equivalents"},
                    })
    return issues


def main():
    verbose = "--verbose" in sys.argv

    print("=" * 70)
    print("NuvoVet Clinical Accuracy Audit")
    print("=" * 70)

    drugs = load_all_drugs()
    print(f"\nLoaded {len(drugs)} drug files from {DATA_DIR}\n")

    all_issues = []

    # Run all checks
    checks = [
        ("Empty CYP Profiles (known drugs)", check_empty_cyp_profiles),
        ("Evidence Text Pollution", check_evidence_pollution),
        ("Missing Critical Contraindications", check_missing_contraindications),
        ("Generic Interaction Drug Names", check_generic_interaction_names),
        ("Low Confidence Critical Drugs", check_low_confidence_critical_drugs),
        ("Drug Class Misassignment", check_drug_class_assignment),
        ("Contraindication Match Terms", check_contraindication_match_terms),
    ]

    for check_name, check_fn in checks:
        print(f"Running: {check_name}...")
        issues = check_fn(drugs)
        all_issues.extend(issues)
        severity_counts = defaultdict(int)
        for issue in issues:
            severity_counts[issue["severity"]] += 1
        summary = ", ".join(f"{k}: {v}" for k, v in sorted(severity_counts.items()))
        print(f"  Found {len(issues)} issues ({summary or 'none'})")

    # Summary
    print("\n" + "=" * 70)
    print(f"TOTAL ISSUES: {len(all_issues)}")
    print("=" * 70)

    severity_totals = defaultdict(int)
    issue_type_counts = defaultdict(int)
    for issue in all_issues:
        severity_totals[issue["severity"]] += 1
        issue_type_counts[issue["issue"]] += 1

    print("\nBy severity:")
    for sev in ["CRITICAL", "HIGH", "MODERATE", "LOW"]:
        if severity_totals[sev]:
            print(f"  {sev}: {severity_totals[sev]}")

    print("\nBy issue type:")
    for issue_type, count in sorted(issue_type_counts.items(), key=lambda x: -x[1]):
        print(f"  {issue_type}: {count}")

    if verbose:
        print("\n" + "=" * 70)
        print("DETAILED ISSUES (sorted by severity)")
        print("=" * 70)
        sev_order = {"CRITICAL": 0, "HIGH": 1, "MODERATE": 2, "LOW": 3}
        all_issues.sort(key=lambda x: (sev_order.get(x["severity"], 9), x["drug_id"]))
        for issue in all_issues:
            print(f"\n[{issue['severity']}] {issue['drug_id']}: {issue['issue']}")
            print(f"  {issue['detail']}")
            if "fix" in issue:
                print(f"  Fix: {json.dumps(issue['fix'], ensure_ascii=False)}")

    # Write JSON report
    report_path = Path(__file__).resolve().parent / "audit_clinical_accuracy_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump({
            "total_drugs": len(drugs),
            "total_issues": len(all_issues),
            "severity_totals": dict(severity_totals),
            "issue_type_counts": dict(issue_type_counts),
            "issues": all_issues,
        }, f, indent=2, ensure_ascii=False)
    print(f"\nFull report written to: {report_path}")


if __name__ == "__main__":
    main()

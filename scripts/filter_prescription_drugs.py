#!/usr/bin/env python3
"""
Filter prescription dogs drugs from raw JSONL file.
GROUP A: Actual prescription drugs (동물용의약품) with robust validation.
Uses primary (품목정보) and secondary (효능효과, 원료약품) filtering.
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Tuple

# Secondary indicators for quasi-drugs to exclude
QUASI_DRUG_KEYWORDS = {
    "보충",  # supplement
    "영양",  # nutrition
    "비타민",  # vitamin
    "미네랄",  # mineral
    "프로바이오틱",  # probiotic
    "생균",  # live bacteria
    "영양강화",  # nutritional enhancement
    "건강유지",  # health maintenance
    "예방",  # prevention (generic)
}

QUASI_DRUG_INGREDIENTS = {
    "비타민",  # vitamin
    "칼슘",  # calcium
    "아연",  # zinc
    "철",  # iron
    "마그네슘",  # magnesium
    "망간",  # manganese
    "프로바이오틱",  # probiotic
    "락토바실러스",  # lactobacillus
    "비피도박테리움",  # bifidobacterium
    "효모",  # yeast
    "효모배양물",  # yeast culture
}

PRESCRIPTION_DRUG_KEYWORDS = {
    "항생제",  # antibiotic
    "항균",  # antibacterial
    "구충",  # deworming
    "항염증",  # anti-inflammatory
    "치료",  # treatment
    "감염",  # infection
    "질병",  # disease
    "증후군",  # syndrome
    "염증",  # inflammation
    "폐렴",  # pneumonia
    "장염",  # enteritis
    "유방염",  # mastitis
    "심장사상충",  # heartworm
    "기생충",  # parasite
    "진균",  # fungal
    "세균",  # bacteria
}


def is_prescription_drug(record: Dict) -> Tuple[bool, str]:
    """
    Determine if a product is a actual prescription drug using multi-level filtering.
    
    Returns:
        (is_prescription, reason_string)
    """
    
    # PRIMARY FILTER: 품목정보 (Product Category)
    # Extract from raw_content since it's embedded in the text
    raw_content = record.get("raw_content", "")
    
    # Check for non-drug (quasi-drug) classification first
    if "품목정보" in raw_content:
        # Find the product info line
        for line in raw_content.split("\n"):
            if "품목정보" in line:
                product_info = line
                break
        else:
            product_info = ""
    else:
        product_info = ""
    
    if "동물용의약외품" in product_info:
        return False, "PRIMARY: 동물용의약외품 (non-drug product)"
    
    if "동물용의약품" not in product_info:
        return False, f"PRIMARY: Unknown category - {product_info[:50] if product_info else 'not found'}"
    
    # SECONDARY FILTER 1: Check efficacy claims (효능효과)
    efficacy = record.get("효능효과", "").lower()
    
    # Strong quasi-drug indicators
    has_quasi_efficacy = any(keyword in efficacy for keyword in QUASI_DRUG_KEYWORDS)
    has_prescription_efficacy = any(
        keyword in efficacy for keyword in PRESCRIPTION_DRUG_KEYWORDS
    )
    
    # If it ONLY has quasi-drug keywords and no prescription keywords, reject it
    if has_quasi_efficacy and not has_prescription_efficacy:
        return False, "SECONDARY-1: Efficacy shows supplement/vitamin only"
    
    # SECONDARY FILTER 2: Check ingredients (원료약품 및 분량)
    raw_content = record.get("raw_content", "").lower()
    
    # Count quasi-drug vs prescription ingredients
    quasi_ingredient_count = sum(
        1 for keyword in QUASI_DRUG_INGREDIENTS if keyword.lower() in raw_content
    )
    
    # Check for actual pharmaceutical ingredients
    has_antibiotic = any(
        term in raw_content
        for term in [
            "페니실린",
            "세팔로스포린",
            "마크로라이드",
            "테트라사이클린",
            "플로르페니콜",
            "염화",
            "황산",
        ]
    )
    has_active_drug = any(
        term in raw_content
        for term in [
            "이버멕틴",
            "펜벤다졸",
            "플루벤다졸",
            "덱사메타손",
            "타일로신",
            "엔로플록사신",
        ]
    )
    
    # If primarily made of vitamins/minerals with minimal active drugs, reject
    supplement_indicator_ratio = quasi_ingredient_count > 5 and not has_active_drug
    if supplement_indicator_ratio:
        return False, "SECONDARY-2: Contains >5 supplement ingredients, no active drugs"
    
    # SECONDARY FILTER 3: Consistency check
    # If product has "처방대상" marker but marked as non-drug, something's wrong
    if "처방대상의약품여부 ○" in record.get("raw_content", ""):
        if "동물용의약품" not in product_info:
            return False, "SECONDARY-3: Inconsistent - prescription marker but non-drug category"
    
    # PASS: It's a prescription drug
    return True, "PASS: Prescription drug confirmed"


def filter_prescription_drugs(
    input_path: str, output_path: str, verbose: bool = True
) -> Dict[str, int]:
    """
    Filter prescription drugs from raw JSONL file.
    
    Args:
        input_path: Path to input JSONL file
        output_path: Path to output JSONL file
        verbose: Print detailed logging
    
    Returns:
        Statistics dictionary
    """
    
    input_file = Path(input_path)
    output_file = Path(output_path)
    
    if not input_file.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")
    
    stats = {
        "total_drugs": 0,
        "prescription_drugs": 0,
        "quasi_drugs": 0,
        "rejected": 0,
    }
    
    rejected_drugs = []
    
    with open(input_file, "r", encoding="utf-8") as infile, open(
        output_file, "w", encoding="utf-8"
    ) as outfile:
        for line_num, line in enumerate(infile, 1):
            try:
                record = json.loads(line.strip())
                stats["total_drugs"] += 1
                
                is_prescription, reason = is_prescription_drug(record)
                
                if is_prescription:
                    # Write to output
                    json.dump(record, outfile, ensure_ascii=False)
                    outfile.write("\n")
                    stats["prescription_drugs"] += 1
                    
                    if verbose and stats["prescription_drugs"] <= 5:
                        print(
                            f"✓ Line {line_num}: {record.get('product_name', 'Unknown')} - {reason}"
                        )
                else:
                    stats["quasi_drugs"] += 1
                    rejected_drugs.append(
                        {
                            "line": line_num,
                            "product": record.get("product_name", "Unknown"),
                            "reason": reason,
                        }
                    )
                    
                    if verbose and stats["quasi_drugs"] <= 5:
                        print(
                            f"✗ Line {line_num}: {record.get('product_name', 'Unknown')} - {reason}"
                        )
            
            except json.JSONDecodeError as e:
                print(f"ERROR at line {line_num}: Invalid JSON - {e}")
                stats["rejected"] += 1
    
    # Print summary
    print("\n" + "=" * 70)
    print("FILTERING COMPLETE")
    print("=" * 70)
    print(f"Total Products Processed:  {stats['total_drugs']}")
    print(f"Prescription Drugs (GROUP A): {stats['prescription_drugs']}")
    print(f"Quasi Drugs Filtered Out:  {stats['quasi_drugs']}")
    print(f"Rejected (Errors):         {stats['rejected']}")
    print("=" * 70)
    print(f"\nOutput saved to: {output_file}")
    
    # Print rejected examples if any
    if rejected_drugs and verbose:
        print("\nSample of Filtered Items (First 10):")
        print("-" * 70)
        for item in rejected_drugs[:10]:
            print(f"  • {item['product']}")
            print(f"    Reason: {item['reason']}\n")
    
    return stats


if __name__ == "__main__":
    import sys
    
    # File paths
    # input remains at root; output moved to backend/data
    input_file = "/workspaces/FullStackDemoPractice/dog_drugs_only_raw.jsonl"
    output_file = "/workspaces/FullStackDemoPractice/backend/data/dog_drugs_prescription_only.jsonl"
    
    try:
        stats = filter_prescription_drugs(input_file, output_file, verbose=True)
        print(f"\n✓ Successfully filtered {stats['prescription_drugs']} prescription drugs!")
    except Exception as e:
        print(f"\n✗ Error: {e}", file=sys.stderr)
        sys.exit(1)

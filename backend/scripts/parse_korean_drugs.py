#!/usr/bin/env python3
"""
AZT Korean Drug Label Parser

Reads dog_drugs_cleaned.jsonl and extracts structured data from Korean
regulatory drug labels using regex patterns. Filters to dog/cat pharma only.

Output: backend/data/parsed_korean_drugs.jsonl
"""

import json
import re
import sys
from pathlib import Path

INPUT_FILE = Path(__file__).parent.parent / "data" / "AZ트" / "dog_drugs_cleaned.jsonl"
OUTPUT_FILE = Path(__file__).parent.parent / "data" / "parsed_korean_drugs.jsonl"

# ── Korean dosage form mapping ──────────────────────────────────
FORM_MAP = {
    "정제": "Tab", "정": "Tab", "츄어블": "Chewable",
    "주사제": "Inj", "주사": "Inj", "주": "Inj",
    "산제": "Susp", "분말": "Susp",
    "캡슐": "Cap", "캅셀": "Cap",
    "연고": "Oint", "크림": "Oint",
    "점안": "Drop", "점이": "Drop",
    "액제": "Oral Liquid", "시럽": "Oral Liquid",
    "외용": "Topical", "스프레이": "Topical",
    "패치": "Patch",
}

# ── Korean route mapping ────────────────────────────────────────
ROUTE_MAP = {
    "경구": "PO", "경구투여": "PO",
    "피하주사": "SC", "피하": "SC",
    "근육주사": "IM", "근육": "IM", "근육내": "IM",
    "정맥주사": "IV", "정맥": "IV", "정맥내": "IV",
    "점안": "Eye", "점이": "Ear",
    "외용": "Top", "도포": "Top",
    "흡입": "Inh",
}

# ── Known excipients / vehicles / preservatives ─────────────────
# These should never be classified as active pharmaceutical ingredients
EXCIPIENT_KEYWORDS = {
    # Preservatives
    "benzyl alcohol", "chlorocresol", "chlorobutanol", "phenol",
    "methyl parahydroxybenzoate", "propyl parahydroxybenzoate",
    "methylparaben", "propylparaben", "thimerosal", "sorbic acid",
    # Vehicles / solvents
    "water for injection", "propylene glycol", "polyethylene glycol",
    "ethanol", "glycerol", "glycerin", "sesame oil", "peanut oil",
    "corn oil", "soybean oil", "castor oil", "cottonseed oil",
    "mineral oil", "paraffin", "isopropyl alcohol", "butanol",
    "dimethyl sulfoxide", "dimethylsulfoxide",
    # Stabilizers / buffers
    "disodium edetate", "edetate disodium", "edta",
    "sodium metabisulfite", "sodium pyrosulfite", "sodium bisulfite",
    "sodium chloride", "sodium hydroxide", "potassium hydroxide",
    "hydrochloric acid", "phosphoric acid", "citric acid",
    "sodium citrate", "sodium phosphate", "potassium phosphate",
    "sodium acetate", "sodium carbonate", "calcium carbonate",
    "sodium benzoate", "sodium sulfite",
    # Antioxidants
    "butylated hydroxyanisole", "butylated hydroxytoluene",
    "butylated hydroxy anisole", "alpha-tocopherol", "ascorbyl palmitate",
    # Emulsifiers / surfactants
    "polysorbate", "tween", "span", "lecithin", "sorbitan",
    "sodium lauryl sulfate",
    # Thickeners / binders
    "carbomer", "carboxymethylcellulose", "methylcellulose",
    "hydroxypropyl", "povidone", "crospovidone", "starch",
    "microcrystalline cellulose", "lactose", "sucrose", "mannitol",
    "sorbitol", "dextrose", "maltodextrin", "gelatin",
    "magnesium stearate", "stearic acid", "talc", "silicon dioxide",
    "colloidal silicon", "titanium dioxide",
    # Flavoring / coloring
    "flavor", "chicken flavor", "beef flavor", "liver flavor",
    "iron oxide", "sunset yellow", "tartrazine", "brilliant blue",
    "caramel", "artificial",
    # Vehicles specific to vet
    "aluminium stearate", "aluminium distearate", "aluminium dihydroxystearate",
    "benzyl benzoate", "diethanolamine", "triethanolamine",
    "dibasic sodium phosphate", "monobasic sodium phosphate",
    # Common non-drug components
    "yolk powder", "fructooligosaccharide", "yeast culture",
    "beta-glucan", "pullulan",
}

# ── Drug class mapping from 분류코드 ────────────────────────────
CLASS_MAP = {
    "Fluoroquinolones": "Antibiotic",
    "항생물질제제": "Antibiotic", "항생": "Antibiotic",
    "Penicillins": "Antibiotic", "Cephalosporins": "Antibiotic",
    "Tetracyclines": "Antibiotic", "Macrolides": "Antibiotic",
    "Aminoglycosides": "Antibiotic", "Sulfonamides": "Antibiotic",
    "소화기관용약": "GI Protectant",
    "순환기관용약": "Cardiac",
    "호흡기관용약": "Bronchodilator",
    "비뇨기관용약": "Diuretic",
    "외피용약": "Topical",
    "신경계용약": "Sedative",
    "기생충구제제": "Antiparasitic", "구충제": "Antiparasitic",
    "호르몬제": "Hormone",
    "소염진통제": "NSAID", "비스테로이드": "NSAID",
    "부신피질호르몬": "Corticosteroid", "스테로이드": "Corticosteroid",
    "항진균": "Antifungal",
    "마취제": "Sedative",
    "백신": "Unknown",
}


def load_records(path):
    """Load JSONL — each line is one JSON object (may contain escaped \\n)."""
    records = []
    with open(path, "rb") as f:
        for raw_line in f:
            raw_line = raw_line.strip()
            if not raw_line:
                continue
            try:
                # Replace literal control chars that break strict JSON
                text = raw_line.decode("utf-8")
                rec = json.loads(text)
                records.append(rec)
            except json.JSONDecodeError:
                # Try fixing unescaped control characters
                fixed = raw_line.replace(b"\r", b"\\r")
                # Replace literal tabs
                fixed = fixed.replace(b"\t", b"\\t")
                try:
                    rec = json.loads(fixed.decode("utf-8"))
                    records.append(rec)
                except json.JSONDecodeError:
                    pass
    return records


def extract_field(content, field_name):
    """Extract a single-line field value after field_name."""
    m = re.search(rf"{re.escape(field_name)}\s+(.+?)(?:\n|$)", content)
    return m.group(1).strip() if m else ""


def extract_section(content, start_header, end_headers):
    """Extract text between start_header and the next end_header."""
    pattern = rf"{re.escape(start_header)}.*?폴딩 버튼\n(.*?)(?={'|'.join(re.escape(h) for h in end_headers)}|$)"
    m = re.search(pattern, content, re.DOTALL)
    if m:
        return m.group(1).strip()
    # Fallback without 폴딩 버튼
    pattern2 = rf"{re.escape(start_header)}\s*\n(.*?)(?={'|'.join(re.escape(h) for h in end_headers)}|$)"
    m2 = re.search(pattern2, content, re.DOTALL)
    return m2.group(1).strip() if m2 else ""


def _classify_ingredient(name_ko, name_en, unit):
    """Classify an ingredient as active, excipient, vitamin, mineral, etc."""
    en_lower = name_en.lower().strip()
    ko_lower = name_ko.lower()
    combined = en_lower + " " + ko_lower

    # Check excipient list
    for exc in EXCIPIENT_KEYWORDS:
        if exc in en_lower or (en_lower and en_lower in exc):
            return "excipient"
    # Korean excipient patterns
    if any(k in ko_lower for k in (
        "주사용수", "증류수", "주사용 증류수", "첨가제",
    )):
        return "excipient"

    if unit == "CFU":
        return "probiotic"
    if unit == "IU" and any(v in combined for v in (
        "비타민", "vitamin", "retinol", "cholecalci", "tocopherol",
    )):
        return "vitamin"
    if any(v in combined for v in (
        "vitamin", "biotin", "thiamin", "riboflavin", "niacin",
        "pantothen", "pyridoxin", "folic", "cobalamin", "ascorbic",
        "tocopherol", "retinol", "cholecalci", "menadione", "비타민",
    )):
        return "vitamin"
    if any(v in en_lower for v in (
        "sulfate", "oxide", "carbonate",
    )) and any(m in combined for m in (
        "manganese", "zinc", "copper", "ferrous", "iron", "selenium",
        "cobalt", "iodine", "망간", "아연", "구리", "철",
    )):
        return "mineral"
    if "l-" in en_lower and any(v in en_lower for v in (
        "lysine", "methionine", "threonine", "tryptophan", "valine",
        "leucine", "isoleucine", "arginine", "histidine", "phenylalanine",
        "cysteine", "alanine", "glycine", "proline", "serine",
    )):
        return "amino_acid"

    return "active"


def parse_ingredients(content):
    """Extract active ingredients from 원료약품 및 분량 section."""
    section = re.search(
        r"원료약품 및 분량.*?\n(.*?)(?=효능효과|$)", content, re.DOTALL
    )
    if not section:
        return []

    text = section.group(1)
    ingredients = []

    for line in text.split("\n"):
        line = line.strip()
        if not line or line.startswith("순번") or line.startswith("첨가제"):
            continue
        # Skip per-unit header lines like "1정(450 밀리그램) 중" or "1밀리리터 중"
        if re.match(r"^\d+\s*(정|밀리|캡슐|포)", line):
            continue
        # Skip excipients (적량 = "as needed" quantity)
        if "적량" in line:
            continue

        # Pattern 1: "번호 한글명(English, spec) 량 UNIT spec note"
        # Pattern 2: "번호 English 량 UNIT spec note"  (no Korean name)
        # Pattern 3: "번호 한글명 량 UNIT spec"  (no English in parens)
        name_match = re.match(
            r"\d+\s+(.+?)\s+([\d,.]+)\s+(MG|GM|G|ML|IU|CFU|%|MCG|UG)\b",
            line, re.IGNORECASE,
        )
        if not name_match:
            continue

        raw_name = name_match.group(1).strip()
        amount_str = name_match.group(2).replace(",", "")
        unit = name_match.group(3).upper()

        try:
            amount = float(amount_str)
        except ValueError:
            amount = 0

        # Extract English name from parentheses if present
        en_match = re.search(r"\(([^)]+)\)", raw_name)
        en_name = ""
        ko_name = raw_name

        if en_match:
            paren_content = en_match.group(1)
            parts = paren_content.split(",")
            candidate = parts[0].strip()
            # Check if it looks like English (has Latin chars)
            if re.search(r"[a-zA-Z]", candidate):
                en_name = candidate
            ko_name = re.sub(r"\(.*?\)", "", raw_name).strip()
        else:
            # No parentheses — check if the name itself is English
            if re.match(r"^[a-zA-Z]", raw_name):
                en_name = raw_name.split()[0] if " " in raw_name else raw_name
                # Full English name might be multi-word
                en_name = re.match(r"^([a-zA-Z][a-zA-Z\s\-\']+)", raw_name)
                en_name = en_name.group(1).strip() if en_name else raw_name
                ko_name = ""

        # Clean up spec codes from names
        for spec in ("KP", "KVP", "USP", "BP", "JP", "EP", "별규"):
            en_name = re.sub(rf"\b{re.escape(spec)}\b", "", en_name).strip()
            ko_name = re.sub(rf"\b{re.escape(spec)}\b", "", ko_name).strip()
        # Remove trailing colons, dashes
        en_name = re.sub(r"[\s:,\-]+$", "", en_name).strip()
        ko_name = re.sub(r"[\s:,\-]+$", "", ko_name).strip()

        role = _classify_ingredient(ko_name, en_name, unit)

        ingredients.append({
            "name_ko": ko_name,
            "name_en": en_name,
            "amount": amount,
            "unit": unit,
            "role": role,
        })

    return ingredients


def parse_dosing_for_species(dosing_text, target_species):
    """Extract dosing info for dog (개) or cat (고양이) from dosing section."""
    if not dosing_text:
        return []

    results = []

    # Find route for target species
    routes = []
    for pattern in [
        rf"{target_species}\s*[:,]\s*(피하주사|근육주사|정맥주사|경구투여|경구|피하|근육|정맥)",
        rf"{target_species}.*?(피하주사|근육주사|정맥주사|경구투여|경구|피하|근육|정맥)",
    ]:
        for m in re.finditer(pattern, dosing_text):
            route_ko = m.group(1)
            for ko, en in ROUTE_MAP.items():
                if ko in route_ko:
                    if en not in routes:
                        routes.append(en)
                    break

    if not routes:
        # Check for general route mentions near species
        if "경구" in dosing_text:
            routes.append("PO")
        elif "주사" in dosing_text:
            routes.append("SC")

    # Extract mg/kg dosing
    dose_patterns = [
        # 5mg/kg pattern
        r"([\d.]+(?:\s*[~\-–]\s*[\d.]+)?)\s*mg\s*/\s*kg",
        # 체중 kg당 X mg pattern
        r"체중\s*(?:1\s*)?kg\s*당\s*([\d.]+(?:\s*[~\-–]\s*[\d.]+)?)\s*mg",
        # Xml/kg pattern (need concentration to convert)
        r"([\d.]+(?:\s*[~\-–]\s*[\d.]+)?)\s*ml\s*/\s*kg",
        # 체중 kg당 X ml pattern
        r"체중\s*(?:1\s*)?kg\s*당\s*([\d.]+(?:\s*[~\-–]\s*[\d.]+)?)\s*ml",
    ]

    # Try to find species-specific dosing section
    species_section = ""
    # Look for section starting with 개 or 개, 고양이
    sp_patterns = [
        rf"(?:{target_species}|개\s*,\s*고양이|개,고양이).*?(?=(?:소|돼지|말|양|닭|주의사항|\Z))",
    ]
    for sp in sp_patterns:
        sm = re.search(sp, dosing_text, re.DOTALL)
        if sm:
            species_section = sm.group(0)
            break

    if not species_section:
        species_section = dosing_text

    for i, pat in enumerate(dose_patterns):
        for dm in re.finditer(pat, species_section, re.IGNORECASE):
            dose_str = dm.group(1).strip()
            unit = "mg/kg" if i < 2 else "ml/kg"
            results.append({
                "value": dose_str,
                "unit": unit,
                "route": routes[0] if routes else "PO",
            })

    # Extract frequency
    freq = "SID"
    if re.search(r"1일\s*2회|2회\s*분", species_section):
        freq = "BID"
    elif re.search(r"1일\s*3회", species_section):
        freq = "TID"
    elif re.search(r"12시간", species_section):
        freq = "BID"
    elif re.search(r"8시간", species_section):
        freq = "TID"
    elif re.search(r"24시간|1일\s*1회", species_section):
        freq = "SID"

    # Extract duration
    duration = None
    dur_match = re.search(r"(\d+)\s*(?:일|days?)\s*(?:간|동안|투여)", species_section)
    if dur_match:
        duration = f"{dur_match.group(1)}일"
    dur_match2 = re.search(r"(\d+)\s*[~\-–]\s*(\d+)\s*일", species_section)
    if dur_match2:
        duration = f"{dur_match2.group(1)}-{dur_match2.group(2)}일"

    for r in results:
        r["frequency"] = freq
        if duration:
            r["duration_note"] = duration

    return results


def parse_warnings(content):
    """Extract warnings and drug interactions from 주의사항 section."""
    section = extract_section(
        content, "주의사항", ["성상ㆍ제조방법", "성상·제조방법", "저장방법", "포장단위"]
    )
    if not section:
        return [], [], []

    contraindications = []
    adverse_effects = []
    interactions = []

    lines = section.split("\n")
    current_subsection = ""

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Detect subsection headers
        if "투여하지 말" in line or "사용하지 말" in line:
            current_subsection = "contraindication"
            continue
        elif "부작용" in line and len(line) < 20:
            current_subsection = "adverse"
            continue
        elif "상호작용" in line and len(line) < 20:
            current_subsection = "interaction"
            continue
        elif re.match(r"^[가-힣]\.", line):
            # New subsection marker (가. 나. 다. etc.)
            if "투여하지" in line or "사용하지" in line:
                current_subsection = "contraindication"
            elif "부작용" in line:
                current_subsection = "adverse"
            elif "상호작용" in line:
                current_subsection = "interaction"
            elif "주의" in line:
                current_subsection = "caution"
            else:
                current_subsection = ""
            continue

        # Collect items based on current subsection
        # Strip numbering like "1. " or "1) "
        cleaned = re.sub(r"^\d+[.)]\s*", "", line).strip()
        if not cleaned or len(cleaned) < 5:
            continue

        if current_subsection == "contraindication":
            contraindications.append(cleaned)
        elif current_subsection == "adverse":
            adverse_effects.append(cleaned)
        elif current_subsection == "interaction":
            interactions.append(cleaned)

    return contraindications, adverse_effects, interactions


def infer_dosage_form(content):
    """Infer dosage form from 성상 section."""
    forms = []
    form_section = re.search(r"제형\s*[:：]\s*(.+?)(?:\n|$)", content)
    if form_section:
        form_text = form_section.group(1).strip()
        for ko, en in FORM_MAP.items():
            if ko in form_text and en not in forms:
                forms.append(en)

    # Also check product name for clues
    product_name = extract_field(content, "제품명")
    name_lower = product_name.lower()
    if "주" in product_name and "Inj" not in forms:
        # Check it's not a different 주 character context
        if re.search(r"주\s*$|주\s*\(|주사", product_name):
            forms.append("Inj")
    if "정" in product_name and "Tab" not in forms:
        if re.search(r"정\s*$|정\s*\(", product_name):
            forms.append("Tab")
    if "캡슐" in product_name and "Cap" not in forms:
        forms.append("Cap")

    # English name hints
    en_name = extract_field(content, "제품 영문명").lower()
    if "inj" in en_name and "Inj" not in forms:
        forms.append("Inj")
    elif "tab" in en_name and "Tab" not in forms:
        forms.append("Tab")
    elif "cap" in en_name and "Cap" not in forms:
        forms.append("Cap")
    elif "drop" in en_name and "Drop" not in forms:
        forms.append("Drop")

    return forms if forms else ["Unknown"]


def infer_drug_class(content):
    """Infer drug class from 분류코드 field."""
    class_code = extract_field(content, "분류코드")
    if not class_code:
        return "Unknown"

    for key, cls in CLASS_MAP.items():
        if key.lower() in class_code.lower():
            return cls
    return "Unknown"


def should_skip(record, content, ingredients):
    """Return (True, reason) if this record should be filtered out."""
    # Check cancellation status
    cancel = extract_field(content, "취소/취하구분")
    if cancel and cancel != "정상":
        return True, f"cancelled: {cancel}"

    # Check if dosing section mentions dog or cat
    dose_section = extract_section(
        content, "용법용량", ["주의사항", "성상"]
    )
    indication_section = extract_section(
        content, "효능효과", ["용법용량", "주의사항"]
    )

    combined = (dose_section or "") + " " + (indication_section or "")
    has_dog = any(t in combined for t in ["개", "강아지", "반려견"])
    has_cat = any(t in combined for t in ["고양이", "반려묘"])

    if not has_dog and not has_cat:
        return True, "no dog/cat in dosing/indication"

    # Check if only feed-based dosing (사료 톤 당)
    if dose_section:
        has_feed = "사료 톤" in dose_section or "톤 당" in dose_section
        has_pharma = any(
            t in dose_section
            for t in ["mg/kg", "mg/mL", "ml/kg", "경구", "주사", "피하", "근육", "정맥", "체중"]
        )
        if has_feed and not has_pharma:
            return True, "feed-only dosing"

    # Check if all ingredients are non-pharmaceutical
    active_pharma = [
        i for i in ingredients
        if i["role"] == "active"
    ]
    if not active_pharma and ingredients:
        return True, "no pharmaceutical active ingredients"

    return False, ""


def parse_record(record):
    """Parse a single AZT record into structured data."""
    content = record.get("raw_content", "")
    product_name_ko = record.get("product_name", "").strip()

    # Basic info
    product_name_en = extract_field(content, "제품 영문명")
    manufacturer = extract_field(content, "업체명")
    approval_date = extract_field(content, "허가일")
    license_info = extract_field(content, "품목정보")
    is_prescription = "○" in extract_field(content, "처방대상의약품여부")

    # Ingredients
    ingredients = parse_ingredients(content)

    # Filter check
    skip, reason = should_skip(record, content, ingredients)
    if skip:
        return None, reason

    # Active ingredients only (exclude excipients, minerals, amino acids)
    active_ingredients = [i for i in ingredients if i["role"] == "active"]
    if not active_ingredients:
        # Fallback: include vitamins/probiotics as active if no pharma active
        active_ingredients = [i for i in ingredients if i["role"] in ("vitamin", "probiotic")]

    # Dosage form
    dosage_forms = infer_dosage_form(content)

    # Drug class
    drug_class = infer_drug_class(content)

    # Dosing
    dose_section = extract_section(content, "용법용량", ["주의사항", "성상"])
    dog_dosing = parse_dosing_for_species(dose_section, "개")
    cat_dosing = parse_dosing_for_species(dose_section, "고양이")

    # Warnings
    contraindications, adverse_effects, interactions = parse_warnings(content)

    # Indications
    indication_text = extract_section(content, "효능효과", ["용법용량"])

    # Available strengths from ingredients
    strengths = []
    for ing in active_ingredients:
        if ing["amount"] > 0:
            unit_map = {"MG": "mg", "GM": "g", "G": "g", "ML": "mL", "MCG": "mcg", "IU": "IU"}
            s_unit = unit_map.get(ing["unit"], ing["unit"].lower())
            # Determine form context
            form = "oral"
            if "Inj" in dosage_forms:
                form = "injectable"
                if s_unit in ("mg", "mcg"):
                    s_unit = s_unit + "/mL"
            strengths.append({
                "value": ing["amount"],
                "unit": s_unit,
                "form": form,
            })

    return {
        "product_name_ko": product_name_ko,
        "product_name_en": product_name_en,
        "manufacturer": manufacturer,
        "approval_date": approval_date,
        "license_info": license_info,
        "is_prescription": is_prescription,
        "active_ingredients": active_ingredients,
        "all_ingredients": ingredients,
        "dosage_forms": dosage_forms,
        "drug_class": drug_class,
        "strengths": strengths,
        "dog_dosing": dog_dosing,
        "cat_dosing": cat_dosing,
        "contraindications_ko": contraindications,
        "adverse_effects_ko": adverse_effects,
        "interactions_ko": interactions,
        "indication_text_ko": indication_text,
        "raw_index": record.get("index"),
    }, ""


def main():
    print(f"Loading records from {INPUT_FILE}...")
    records = load_records(INPUT_FILE)
    print(f"  Total records: {len(records)}")

    parsed = []
    skipped = {"total": 0, "reasons": {}}

    for rec in records:
        result, reason = parse_record(rec)
        if result is None:
            skipped["total"] += 1
            skipped["reasons"][reason] = skipped["reasons"].get(reason, 0) + 1
        else:
            parsed.append(result)

    print(f"\n  Parsed: {len(parsed)}")
    print(f"  Skipped: {skipped['total']}")
    for reason, count in sorted(skipped["reasons"].items(), key=lambda x: -x[1]):
        print(f"    - {reason}: {count}")

    # Write output
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        for item in parsed:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")

    print(f"\nOutput written to {OUTPUT_FILE}")

    # Print some stats
    with_dog_dose = sum(1 for p in parsed if p["dog_dosing"])
    with_cat_dose = sum(1 for p in parsed if p["cat_dosing"])
    with_interactions = sum(1 for p in parsed if p["interactions_ko"])
    with_contras = sum(1 for p in parsed if p["contraindications_ko"])
    unique_actives = set()
    for p in parsed:
        for ing in p["active_ingredients"]:
            en = ing["name_en"].lower().strip()
            if en:
                unique_actives.add(en)

    print(f"\n  Stats:")
    print(f"    With dog dosing: {with_dog_dose}")
    print(f"    With cat dosing: {with_cat_dose}")
    print(f"    With interactions: {with_interactions}")
    print(f"    With contraindications: {with_contras}")
    print(f"    Unique active ingredients (EN): {len(unique_actives)}")
    if unique_actives:
        for a in sorted(unique_actives)[:30]:
            print(f"      - {a}")
        if len(unique_actives) > 30:
            print(f"      ... and {len(unique_actives) - 30} more")


if __name__ == "__main__":
    main()

"""
Populate brief_description, primary_indications, mechanism_short for all drugs.
Uses class-based templates + drug-specific data to generate Korean descriptions.

Each drug gets:
- brief_description: 1-2 sentence Korean description
- primary_indications: array of Korean indication strings
- mechanism_short: brief Korean mechanism of action

Usage: python backend/scripts/populate_drug_info.py
"""
import json
import os
import re
import sys
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "converted"

# ── Class-based description templates ────────────────────────────────────
# {name} = English name, {name_ko} = Korean name, {ingredient} = active ingredient
CLASS_TEMPLATES = {
    "Antibiotic": {
        "desc": "{name_ko}({name})은(는) 세균 감염 치료에 사용되는 항생제입니다.",
        "mechanism": "세균의 성장 또는 번식을 억제하여 감염을 치료합니다.",
        "indications": ["세균성 감염", "피부 감염", "요로감염", "호흡기 감염"],
    },
    "Potentiated Sulfonamide Antimicrobial": {
        "desc": "{name_ko}({name})은(는) 설폰아미드 복합 항균제로, 광범위 세균 감염에 사용됩니다.",
        "mechanism": "엽산 합성을 이중 차단하여 세균의 성장을 억제합니다.",
        "indications": ["세균성 감염", "요로감염", "피부 감염", "원충 감염"],
    },
    "Potentiated Aminopenicillin": {
        "desc": "{name_ko}({name})은(는) 베타-락타마제 억제제가 결합된 광범위 페니실린 항생제입니다.",
        "mechanism": "세균 세포벽 합성을 억제하고, 베타-락타마제 내성균에도 효과적입니다.",
        "indications": ["세균성 감염", "피부 감염", "요로감염", "구강 감염"],
    },
    "Tetracycline Antibiotic": {
        "desc": "{name_ko}({name})은(는) 테트라사이클린 계열 항생제로, 광범위 항균 작용을 합니다.",
        "mechanism": "세균 리보솜 30S 소단위에 결합하여 단백질 합성을 억제합니다.",
        "indications": ["세균성 감염", "리케차 감염", "클라미디아 감염", "마이코플라즈마 감염"],
    },
    "Combination Antibiotic": {
        "desc": "{name_ko}({name})은(는) 복합 항생제로, 광범위 항균 효과를 제공합니다.",
        "mechanism": "여러 작용 기전을 통해 세균의 성장을 억제합니다.",
        "indications": ["세균성 감염", "복합 감염", "내성균 감염"],
    },
    "Broad-Spectrum Antimicrobial Combination Agent": {
        "desc": "{name_ko}({name})은(는) 광범위 항균 복합제로, 다양한 세균 감염에 사용됩니다.",
        "mechanism": "복합 작용 기전으로 광범위 세균을 억제합니다.",
        "indications": ["세균성 감염", "혼합 감염", "피부 감염"],
    },
    "Antifungal": {
        "desc": "{name_ko}({name})은(는) 진균(곰팡이) 감염 치료에 사용되는 항진균제입니다.",
        "mechanism": "진균 세포막의 에르고스테롤 합성을 억제하거나 세포막을 파괴합니다.",
        "indications": ["피부 진균증", "전신 진균 감염", "칸디다증"],
    },
    "Antiparasitic": {
        "desc": "{name_ko}({name})은(는) 기생충 감염 예방 및 치료에 사용되는 구충제입니다.",
        "mechanism": "기생충의 신경근 기능을 억제하거나 대사를 차단하여 구충 효과를 나타냅니다.",
        "indications": ["내부 기생충", "외부 기생충", "벼룩", "진드기", "심장사상충 예방"],
    },
    "Antiprotozoal": {
        "desc": "{name_ko}({name})은(는) 원충 감염 치료에 사용되는 항원충제입니다.",
        "mechanism": "원충의 DNA 합성 또는 대사를 억제합니다.",
        "indications": ["원충 감염", "콕시디아증", "지아르디아증"],
    },
    "NSAID": {
        "desc": "{name_ko}({name})은(는) 통증과 염증을 완화하는 비스테로이드성 항염증제(NSAID)입니다.",
        "mechanism": "시클로옥시게나제(COX) 효소를 억제하여 프로스타글란딘 합성을 감소시킵니다.",
        "indications": ["통증 관리", "골관절염", "수술 후 통증", "염증 완화"],
    },
    "Corticosteroid": {
        "desc": "{name_ko}({name})은(는) 항염증 및 면역억제 효과를 가진 부신피질 호르몬제입니다.",
        "mechanism": "염증 매개체의 생성을 억제하고 면역 반응을 조절합니다.",
        "indications": ["염증성 질환", "알레르기", "자가면역질환", "면역매개성 용혈성 빈혈"],
    },
    "Glucocorticoid": {
        "desc": "{name_ko}({name})은(는) 항염증 및 면역억제 효과를 가진 글루코코르티코이드입니다.",
        "mechanism": "염증 매개체의 생성을 억제하고 면역 반응을 조절합니다.",
        "indications": ["염증성 질환", "알레르기", "자가면역질환"],
    },
    "Analgesic": {
        "desc": "{name_ko}({name})은(는) 통증 완화에 사용되는 진통제입니다.",
        "mechanism": "통증 신호 전달을 차단하거나 통증 인지를 감소시킵니다.",
        "indications": ["급성 통증", "만성 통증", "수술 후 통증"],
    },
    "Opioid": {
        "desc": "{name_ko}({name})은(는) 중등도~중증 통증 관리에 사용되는 오피오이드 진통제입니다.",
        "mechanism": "중추신경계의 뮤(μ) 오피오이드 수용체에 결합하여 통증 인지를 차단합니다.",
        "indications": ["중등도~중증 통증", "수술 전후 진통", "외상 통증"],
    },
    "Opioid Agonist/Anticholinergic": {
        "desc": "{name_ko}({name})은(는) 오피오이드 진통제와 항콜린제의 복합 제제입니다.",
        "mechanism": "오피오이드 수용체 작용과 항콜린 작용을 통해 통증 및 위장관 증상을 관리합니다.",
        "indications": ["통증 관리", "위장관 경련"],
    },
    "Sedative": {
        "desc": "{name_ko}({name})은(는) 진정 및 불안 완화에 사용되는 진정제입니다.",
        "mechanism": "중추신경계를 억제하여 진정, 근이완, 항불안 효과를 나타냅니다.",
        "indications": ["진정", "불안 완화", "수술 전 전처치", "소음 공포증"],
    },
    "Alpha-2-Adrenergic Agonist/Peripheral Antagonist Combination": {
        "desc": "{name_ko}({name})은(는) 알파-2 작용제와 말초 길항제의 복합 진정제입니다.",
        "mechanism": "중추 알파-2 수용체를 자극하여 진정 효과를 나타내면서 말초 부작용을 최소화합니다.",
        "indications": ["진정", "수술 전 전처치"],
    },
    "Anticonvulsant": {
        "desc": "{name_ko}({name})은(는) 발작(경련) 조절에 사용되는 항경련제입니다.",
        "mechanism": "뇌의 비정상적 전기 활동을 억제하여 발작을 예방하고 조절합니다.",
        "indications": ["간질", "발작 조절", "군발 발작"],
    },
    "Antidepressant": {
        "desc": "{name_ko}({name})은(는) 행동 장애 및 불안 치료에 사용되는 항우울제입니다.",
        "mechanism": "세로토닌 및/또는 노르에피네프린 재흡수를 억제하여 신경전달물질 수준을 높입니다.",
        "indications": ["분리불안", "행동 장애", "강박장애", "공포증"],
    },
    "Antiemetic": {
        "desc": "{name_ko}({name})은(는) 구토 예방 및 치료에 사용되는 항구토제입니다.",
        "mechanism": "구토 중추 또는 화학수용체 방아쇠 구역의 수용체를 차단합니다.",
        "indications": ["구토", "멀미", "항암 화학요법 관련 구토", "수술 후 구토"],
    },
    "GI Protectant": {
        "desc": "{name_ko}({name})은(는) 위장관 보호 및 궤양 치료에 사용되는 소화기 보호제입니다.",
        "mechanism": "위산 분비를 억제하거나 위장관 점막을 보호합니다.",
        "indications": ["위궤양", "위식도 역류", "위장관 보호", "약물 유발 위장 손상"],
    },
    "GI Adsorbent/Protectant": {
        "desc": "{name_ko}({name})은(는) 위장관 내 독소를 흡착하여 제거하는 소화기 흡착/보호제입니다.",
        "mechanism": "넓은 표면적으로 독소 및 유해물질을 흡착하여 장관 흡수를 방지합니다.",
        "indications": ["중독", "독소 흡착", "위장관 보호"],
    },
    "Cardiac": {
        "desc": "{name_ko}({name})은(는) 심장 기능 개선에 사용되는 심장약입니다.",
        "mechanism": "심근 수축력, 심박수 또는 혈관 저항을 조절하여 심장 기능을 개선합니다.",
        "indications": ["울혈성 심부전", "부정맥", "심장판막질환"],
    },
    "ACE Inhibitor": {
        "desc": "{name_ko}({name})은(는) 혈압 강하 및 심부전 치료에 사용되는 ACE 억제제입니다.",
        "mechanism": "안지오텐신 전환효소(ACE)를 억제하여 혈관을 확장하고 심장 부담을 줄입니다.",
        "indications": ["울혈성 심부전", "고혈압", "단백뇨"],
    },
    "Aldosterone Antagonist/Angiotensin-Converting Enzyme (ACE) Inhibitor": {
        "desc": "{name_ko}({name})은(는) 알도스테론 길항제/ACE 억제제로, 심부전 치료에 사용됩니다.",
        "mechanism": "알도스테론을 차단하고 ACE를 억제하여 체액 저류와 심장 부담을 줄입니다.",
        "indications": ["울혈성 심부전", "고혈압"],
    },
    "Diuretic": {
        "desc": "{name_ko}({name})은(는) 체액 저류 치료에 사용되는 이뇨제입니다.",
        "mechanism": "신장에서 나트륨과 수분 재흡수를 억제하여 소변 배출을 증가시킵니다.",
        "indications": ["울혈성 심부전", "부종", "복수", "고혈압"],
    },
    "Bronchodilator": {
        "desc": "{name_ko}({name})은(는) 기관지 확장에 사용되는 기관지확장제입니다.",
        "mechanism": "기관지 평활근을 이완시켜 기도를 확장합니다.",
        "indications": ["천식", "기관지염", "기관 허탈", "호흡 곤란"],
    },
    "Hormone": {
        "desc": "{name_ko}({name})은(는) 호르몬 불균형 치료에 사용되는 호르몬제입니다.",
        "mechanism": "체내 호르몬 수준을 조절하거나 보충합니다.",
        "indications": ["호르몬 불균형", "내분비 질환"],
    },
    "Thyroid": {
        "desc": "{name_ko}({name})은(는) 갑상선 기능 이상 치료에 사용되는 갑상선 약물입니다.",
        "mechanism": "갑상선 호르몬을 보충하거나 갑상선 호르몬 생성을 억제합니다.",
        "indications": ["갑상선기능저하증", "갑상선기능항진증"],
    },
    "Immunosuppressant": {
        "desc": "{name_ko}({name})은(는) 면역 반응을 억제하는 면역억제제입니다.",
        "mechanism": "면역 세포의 증식 또는 활성을 억제하여 과도한 면역 반응을 조절합니다.",
        "indications": ["면역매개성 질환", "자가면역질환", "면역매개성 용혈성 빈혈", "장기이식 거부반응 예방"],
    },
    "Antineoplastic Agent": {
        "desc": "{name_ko}({name})은(는) 악성 종양(암) 치료에 사용되는 항종양제입니다.",
        "mechanism": "종양 세포의 DNA 합성, 세포 분열 또는 대사를 억제하여 종양 성장을 저지합니다.",
        "indications": ["악성 종양", "림프종", "비만세포종", "암 화학요법"],
    },
    "Anticoagulant": {
        "desc": "{name_ko}({name})은(는) 혈액 응고를 억제하는 항응고제입니다.",
        "mechanism": "응고 인자의 활성을 억제하거나 혈소판 응집을 방지합니다.",
        "indications": ["혈전색전증 예방", "파종성 혈관내 응고(DIC)", "심장판막질환"],
    },
    "Antihistamine / Corticosteroid": {
        "desc": "{name_ko}({name})은(는) 항히스타민제와 부신피질 호르몬의 복합 제제입니다.",
        "mechanism": "히스타민 수용체를 차단하고 염증 반응을 억제합니다.",
        "indications": ["알레르기", "피부 소양증", "아토피"],
    },
    "Antiretroviral": {
        "desc": "{name_ko}({name})은(는) 바이러스 감염 치료에 사용되는 항바이러스제입니다.",
        "mechanism": "바이러스의 복제 과정을 억제합니다.",
        "indications": ["바이러스 감염", "헤르페스 바이러스", "고양이 면역결핍바이러스"],
    },
    "Reversal Agent": {
        "desc": "{name_ko}({name})은(는) 약물 효과를 역전시키는 길항제/해독제입니다.",
        "mechanism": "대상 약물의 수용체 결합을 경쟁적으로 차단하거나 약물 효과를 직접 중화합니다.",
        "indications": ["약물 과량 투여 해독", "마취 회복", "진정 역전"],
    },
    "Muscle Relaxant": {
        "desc": "{name_ko}({name})은(는) 근육 이완에 사용되는 근이완제입니다.",
        "mechanism": "신경근 접합부 또는 중추신경계에 작용하여 골격근을 이완시킵니다.",
        "indications": ["근경련", "마취 보조", "수술 시 근이완"],
    },
    "Insulin, Rapid/Short-Acting": {
        "desc": "{name_ko}({name})은(는) 속효성/단시간 작용 인슐린으로, 혈당 조절에 사용됩니다.",
        "mechanism": "세포의 포도당 흡수를 촉진하여 혈중 포도당 수준을 낮춥니다.",
        "indications": ["당뇨병", "당뇨병성 케톤산증", "고혈당 응급"],
    },
    "Insulin, Long-Acting": {
        "desc": "{name_ko}({name})은(는) 지속성 인슐린으로, 당뇨병의 장기적 혈당 관리에 사용됩니다.",
        "mechanism": "지속적으로 기저 인슐린을 공급하여 혈중 포도당 수준을 안정적으로 유지합니다.",
        "indications": ["당뇨병", "장기 혈당 관리"],
    },
    "Long-Acting Insulin": {
        "desc": "{name_ko}({name})은(는) 지속성 인슐린으로, 당뇨병의 장기적 혈당 관리에 사용됩니다.",
        "mechanism": "지속적으로 기저 인슐린을 공급하여 혈중 포도당 수준을 안정적으로 유지합니다.",
        "indications": ["당뇨병", "장기 혈당 관리"],
    },
    "Nutritional Supplement": {
        "desc": "{name_ko}({name})은(는) 영양 보충에 사용되는 영양 보조제입니다.",
        "mechanism": "결핍된 영양소를 보충하거나 대사 기능을 지원합니다.",
        "indications": ["영양 결핍", "대사 지원"],
    },
    "Nutritional": {
        "desc": "{name_ko}({name})은(는) 영양 보충 목적으로 사용됩니다.",
        "mechanism": "필수 영양소를 보충하여 체내 대사 기능을 지원합니다.",
        "indications": ["영양 결핍", "보조 치료"],
    },
    "Nutritional / Trace Element": {
        "desc": "{name_ko}({name})은(는) 미량 원소/영양소를 보충하는 영양 보조제입니다.",
        "mechanism": "필수 미량 원소를 보충하여 효소 기능과 대사를 지원합니다.",
        "indications": ["미량 원소 결핍", "영양 보충"],
    },
    "Nutritional Anxiolytic Agent": {
        "desc": "{name_ko}({name})은(는) 영양학적 성분 기반의 항불안 보조제입니다.",
        "mechanism": "천연 성분을 통해 신경 안정 효과를 나타냅니다.",
        "indications": ["불안", "스트레스 완화"],
    },
    "Vitamin": {
        "desc": "{name_ko}({name})은(는) 비타민 보충제로, 결핍 상태의 교정에 사용됩니다.",
        "mechanism": "체내 비타민 수준을 보충하여 필수 대사 과정을 지원합니다.",
        "indications": ["비타민 결핍", "보조 치료"],
    },
    "Hepatoprotectant": {
        "desc": "{name_ko}({name})은(는) 간 보호 및 간 기능 개선에 사용되는 간 보호제입니다.",
        "mechanism": "간세포를 보호하고 간 기능 회복을 촉진합니다.",
        "indications": ["간질환", "간독성 보호", "간 기능 개선"],
    },
    "Laxative/Cathartic": {
        "desc": "{name_ko}({name})은(는) 변비 치료에 사용되는 완하제입니다.",
        "mechanism": "장관 내 수분을 증가시키거나 장 운동을 촉진합니다.",
        "indications": ["변비", "장관 정화"],
    },
    "Euthanasia Agent": {
        "desc": "{name_ko}({name})은(는) 인도적 안락사에 사용되는 약물입니다.",
        "mechanism": "신속하게 의식 소실과 심정지를 유발합니다.",
        "indications": ["인도적 안락사"],
    },
    "Ocular Irrigant": {
        "desc": "{name_ko}({name})은(는) 안구 세척에 사용되는 점안 세정액입니다.",
        "mechanism": "안구 표면을 세척하고 이물질을 제거합니다.",
        "indications": ["안구 세척", "수술 시 관류"],
    },
    "Ocular Diagnostic Agent": {
        "desc": "{name_ko}({name})은(는) 안과 진단에 사용되는 진단 약물입니다.",
        "mechanism": "동공 확장, 각막 염색 등 안과 검사를 보조합니다.",
        "indications": ["안과 진단", "안저 검사", "각막 손상 확인"],
    },
    "Tear Replacement and Ocular Lubricating Agents": {
        "desc": "{name_ko}({name})은(는) 안구 건조 치료에 사용되는 인공 눈물/윤활제입니다.",
        "mechanism": "안구 표면에 수분층을 형성하여 윤활과 보호 효과를 제공합니다.",
        "indications": ["안구건조증", "건성 각결막염(KCS)"],
    },
}

# Default for Unknown class
DEFAULT_TEMPLATE = {
    "desc": "{name_ko}({name})은(는) 수의학에서 사용되는 약물입니다.",
    "mechanism": None,
    "indications": [],
}


def get_existing_info(drug):
    """Extract any existing description-like data from the drug."""
    effects = drug.get("effects_and_mechanisms") or {}
    section = drug.get("section_1_2_10") or {}

    mechanism = effects.get("common_mechanism")
    indications_text = section.get("indications")
    highlights = section.get("highlights")

    return mechanism, indications_text, highlights


def generate_drug_info(drug):
    """Generate brief_description, primary_indications, mechanism_short for a drug."""
    identity = drug.get("drug_identity") or {}
    name = identity.get("name_en") or ""
    name_ko = identity.get("name_ko") or name
    ingredient = identity.get("active_ingredient") or name
    drug_class = identity.get("class") or "Unknown"

    # Get template
    template = CLASS_TEMPLATES.get(drug_class, DEFAULT_TEMPLATE)

    # Generate description
    desc = template["desc"].format(name=name, name_ko=name_ko, ingredient=ingredient)

    # Mechanism: prefer existing data, fall back to template
    existing_mechanism, existing_indications, _ = get_existing_info(drug)
    mechanism = existing_mechanism or template.get("mechanism")

    # Indications: prefer existing data, fall back to template
    indications = template.get("indications", [])

    # Try to extract indications from existing data
    if existing_indications and isinstance(existing_indications, str) and len(existing_indications) > 5:
        # Parse comma/semicolon separated indications
        parts = re.split(r"[;,]", existing_indications)
        parsed = [p.strip() for p in parts if len(p.strip()) > 2]
        if parsed:
            indications = parsed[:8]  # cap at 8

    # For contraindications-derived indications (some drugs have condition fields)
    contras = drug.get("contraindications") or []
    species_notes = drug.get("species_notes") or {}

    return desc, indications, mechanism


def main():
    print("=" * 60)
    print("Populating drug info fields (brief_description, primary_indications, mechanism_short)")
    print("=" * 60)

    total = 0
    populated = 0
    skipped = 0

    for root, _dirs, files in os.walk(DATA_DIR):
        for fname in sorted(files):
            if not fname.endswith(".jsonl"):
                continue
            fpath = os.path.join(root, fname)
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except (json.JSONDecodeError, IOError):
                continue

            total += 1
            desc, indications, mechanism = generate_drug_info(data)

            modified = False

            if not data.get("brief_description"):
                data["brief_description"] = desc
                modified = True

            if not data.get("primary_indications"):
                data["primary_indications"] = indications
                modified = True

            if not data.get("mechanism_short"):
                data["mechanism_short"] = mechanism
                modified = True

            if modified:
                with open(fpath, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                    f.write("\n")
                populated += 1
            else:
                skipped += 1

    print(f"\nTotal drugs: {total}")
    print(f"Populated: {populated}")
    print(f"Skipped (already had data): {skipped}")
    print("=" * 60)


if __name__ == "__main__":
    main()

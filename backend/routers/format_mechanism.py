"""
Mechanism Formatting Endpoint — uses Claude Haiku to format verified drug
interaction data into readable, structured clinical text.

IMPORTANT: This endpoint does NOT generate new clinical claims. It ONLY
reformats existing data fields from the drug database into readable text
with bullet points, headers, and structure. The prompt strictly prohibits
adding information not present in the input data.
"""

import os
import json
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger("nuvovet")

router = APIRouter(prefix="/api/format", tags=["format"])

_ANTHROPIC_API_KEY: Optional[str] = os.environ.get("ANTHROPIC_API_KEY")

# ── Formatting prompt — strictly data-rephrasing only ─────────────────────

_FORMAT_SYSTEM_PROMPT = """당신은 수의 임상 텍스트 포매터입니다. 제공된 약물 상호작용 데이터를 간결하고 명확한 한국어 임상 텍스트로 재구성하는 것이 유일한 역할입니다.

엄격한 규칙:
1. 입력 데이터 필드에 명시적으로 제공된 정보만 사용하십시오.
2. 입력에 없는 새로운 임상 주장, 약물 사실, 용량 권고사항, 또는 기전 세부사항을 절대 추가하지 마십시오.
3. 추측, 추론, 또는 제공된 데이터 이상의 외삽을 절대 하지 마십시오.
4. 각 섹션을 엄격히 분리하십시오 — 기전(MECHANISM) 섹션에는 기전만, 권장 조치(RECOMMENDED ACTION) 섹션에는 권장사항만 포함하십시오.
5. 간결하게 작성하십시오. 각 섹션은 1-3개의 불릿 포인트로 제한하십시오.
6. 데이터 필드가 비어있거나 null이면 해당 섹션을 완전히 생략하십시오.
7. 전체 출력은 반드시 한국어로 작성하십시오. 약물명은 원문 그대로 유지하십시오.
8. 출력 형식: • 문자를 사용한 불릿 포인트가 있는 일반 텍스트. 섹션 헤더는 대문자로 작성하십시오.
9. RAW EVIDENCE, KEYWORDS, CONTRAINDICATION, PHARMACOLOGICAL MECHANISM 같은 데이터베이스 필드가 있으면 이를 durEngine 요약보다 우선하십시오.
10. 입력 필드 사이에 충돌이 있거나 근거가 불충분하면 더 강한 주장으로 확장하지 말고, 더 보수적이고 직접적인 표현만 사용하십시오.

형식 구조:
MECHANISM
• [데이터의 기전 불릿 포인트만 — 권장사항 없음]

RECOMMENDED ACTION
• [데이터의 권장 조치만 — 기전 설명 없음]"""


class FormatMechanismRequest(BaseModel):
    """Input data for mechanism formatting — all fields come from verified JSONL data."""
    drug_a_name: str
    drug_b_name: str = ""  # Empty for drug-disease interactions
    interaction_type: str  # e.g. "drug-drug", "drug-disease", "drug-condition"
    severity: str  # "Critical", "Moderate", "Minor"
    rule_name: str  # e.g. "CYP3A4 Inhibition"

    # Verified data fields — these are the ONLY source of truth
    mechanism_text: str = ""  # From durEngine or rawInteraction evidence
    recommendation_text: str = ""
    alternative_suggestion: str = ""
    literature_summary: str = ""

    # Raw data for traceability
    raw_interaction_evidence: str = ""  # From JSONL drug_interactions[].evidence
    raw_interaction_keywords: list[str] = []  # From JSONL drug_interactions[].keywords
    contra_condition: str = ""  # From JSONL contraindications[].condition
    contra_action: str = ""  # From JSONL contraindications[].action
    effects_mechanism: str = ""  # From JSONL effects_and_mechanisms.common_mechanism
    drug_a_class: str = ""
    drug_b_class: str = ""

    # Literature references
    literature_refs: list[dict] = []  # [{title, source, confidence, pmc_id, url}]


class FormatMechanismResponse(BaseModel):
    formatted_mechanism: str
    formatted_recommendation: str
    formatted_full: str  # Complete formatted output
    data_sources: list[str]  # List of JSONL fields used
    ai_formatted: bool = True  # Flag indicating this text was AI-formatted


@router.post("/mechanism", response_model=FormatMechanismResponse)
async def format_mechanism(req: FormatMechanismRequest):
    """
    Format verified drug interaction data into readable clinical text.
    Uses Claude Haiku for text formatting ONLY — no new clinical content is generated.
    """
    api_key = _ANTHROPIC_API_KEY or os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="ANTHROPIC_API_KEY is not set. LLM formatting is unavailable."
        )

    # Build the data payload for the formatter
    data_sections = []
    sources_used = []

    data_sections.append(f"INTERACTION: {req.drug_a_name}")
    if req.drug_b_name:
        data_sections.append(f"  + {req.drug_b_name}")
    data_sections.append(f"TYPE: {req.interaction_type}")
    data_sections.append(f"SEVERITY: {req.severity}")
    data_sections.append(f"RULE: {req.rule_name}")

    if req.drug_a_class:
        data_sections.append(f"DRUG A CLASS: {req.drug_a_class}")
    if req.drug_b_class:
        data_sections.append(f"DRUG B CLASS: {req.drug_b_class}")

    if req.mechanism_text:
        data_sections.append(f"MECHANISM DATA: {req.mechanism_text}")
        sources_used.append("durEngine.mechanism")
    if req.effects_mechanism:
        data_sections.append(f"PHARMACOLOGICAL MECHANISM: {req.effects_mechanism}")
        sources_used.append("effects_and_mechanisms.common_mechanism")
    if req.raw_interaction_evidence:
        data_sections.append(f"RAW EVIDENCE (from drug database): {req.raw_interaction_evidence}")
        sources_used.append("drug_interactions[].evidence")
    if req.raw_interaction_keywords:
        data_sections.append(f"KEYWORDS: {', '.join(req.raw_interaction_keywords)}")
        sources_used.append("drug_interactions[].keywords")
    if req.contra_condition:
        data_sections.append(f"CONTRAINDICATION: {req.contra_condition} (action: {req.contra_action})")
        sources_used.append("contraindications[].condition")
    if req.recommendation_text:
        data_sections.append(f"RECOMMENDATION DATA: {req.recommendation_text}")
        sources_used.append("durEngine.recommendation")
    if req.alternative_suggestion:
        data_sections.append(f"ALTERNATIVE: {req.alternative_suggestion}")
        sources_used.append("durEngine.alternativeSuggestion")
    if req.literature_summary:
        data_sections.append(f"LITERATURE SUMMARY: {req.literature_summary}")
        sources_used.append("durEngine.literatureSummary")
    if req.literature_refs:
        refs_text = "; ".join(
            f"{r.get('title', 'Unknown')} ({r.get('source', r.get('pmc_id', 'N/A'))})"
            for r in req.literature_refs
        )
        data_sections.append(f"REFERENCES: {refs_text}")
        sources_used.append("literature / drug_references")

    user_message = (
        "아래 제공된 검증된 약물 상호작용 데이터를 한국어로 형식화하십시오. "
        "MECHANISM 섹션에는 기전 정보만, RECOMMENDED ACTION 섹션에는 권장 조치만 포함하십시오. "
        "제공된 데이터만 사용하고 새로운 정보를 추가하지 마십시오.\n\n"
        + "\n".join(data_sections)
    )

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            temperature=0,
            system=_FORMAT_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )
        formatted_text = response.content[0].text.strip()
    except Exception as e:
        logger.error(f"Claude API formatting error: {e}")
        # Fallback: return the raw data in a basic structured format
        formatted_text = _fallback_format(req)

    # Split into mechanism and recommendation sections
    mech_section = ""
    rec_section = ""
    lines = formatted_text.split("\n")
    current_section = None
    mech_lines = []
    rec_lines = []
    for line in lines:
        upper = line.strip().upper()
        if "MECHANISM" in upper:
            current_section = "mechanism"
            continue
        elif "RECOMMENDED ACTION" in upper or "RECOMMENDED" in upper:
            current_section = "recommendation"
            continue

        if current_section == "mechanism":
            mech_lines.append(line)
        elif current_section == "recommendation":
            rec_lines.append(line)

    mech_section = "\n".join(mech_lines).strip() or formatted_text
    rec_section = "\n".join(rec_lines).strip() or req.recommendation_text

    return FormatMechanismResponse(
        formatted_mechanism=mech_section,
        formatted_recommendation=rec_section,
        formatted_full=formatted_text,
        data_sources=sources_used,
        ai_formatted=True,
    )


# ── Korean Translation Endpoint ──────────────────────────────────────────
# Translates English clinical text to concise Korean for the results page.

_TRANSLATE_SYSTEM_PROMPT = """당신은 수의 임상 번역 및 정리 도우미입니다. 입력 텍스트를 사실 그대로 한국어로 번역하거나, 이미 한국어인 경우 의미를 유지한 채 최소한으로만 다듬습니다.

규칙:
1. 약물명(예: Meloxicam, Prednisolone)은 영어 그대로 유지하십시오.
2. 임상 약어(CYP3A4, GI, PO, BID, SID, TID, IV, mg/kg 등)는 그대로 유지하십시오.
3. 문장을 간결하게 번역하되, 임상적으로 중요한 정보를 빠뜨리지 마십시오.
4. 전문 수의사가 이해할 수 있는 수준의 한국어로 작성하십시오.
5. 입력 필드에 없는 사실, 수치, 권고, 기전, 문헌 내용을 추가하지 마십시오.
6. 필드 간 정보를 섞지 마십시오. 각 필드는 해당 필드 텍스트만 번역하십시오.
7. 입력이 비어 있으면 빈 문자열로 반환하십시오.
8. title 과 subtitle 은 짧고 자연스러운 한국어로 번역하십시오.
9. 반드시 JSON 형식으로만 응답하십시오."""


class TranslateKoreanRequest(BaseModel):
    """Batch translate clinical text fields to Korean."""
    texts: list[dict]  # [{id: str, mechanism: str, recommendation: str, alternative: str, literatureSummary: str}]


class TranslatedItem(BaseModel):
    id: str
    title: str = ""
    subtitle: str = ""
    mechanism: str = ""
    recommendation: str = ""
    alternative: str = ""
    literatureSummary: str = ""


class TranslateKoreanResponse(BaseModel):
    translations: list[TranslatedItem]


@router.post("/translate-korean", response_model=TranslateKoreanResponse)
async def translate_korean(req: TranslateKoreanRequest):
    """Translate clinical text to Korean for results page display."""
    api_key = _ANTHROPIC_API_KEY or os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY not set.")

    if not req.texts:
        return TranslateKoreanResponse(translations=[])

    # Build a batch translation request
    items_for_llm = []
    for item in req.texts:
        entry = {"id": item.get("id", "")}
        for field in ["title", "subtitle", "mechanism", "recommendation", "alternative", "literatureSummary"]:
            val = item.get(field, "")
            if val:
                entry[field] = val
        items_for_llm.append(entry)

    user_message = (
        "아래 JSON 배열의 각 항목에 있는 영어 임상 텍스트를 한국어로 번역하십시오. "
        "약물명과 임상 약어는 그대로 유지하십시오. "
        "반드시 동일한 구조의 JSON 배열로만 응답하십시오.\n\n"
        + json.dumps(items_for_llm, ensure_ascii=False, indent=None)
    )

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=4096,
            temperature=0,
            system=_TRANSLATE_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )
        raw_text = response.content[0].text.strip()
        # Extract JSON from response
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
        parsed = json.loads(raw_text)
        translations = [TranslatedItem(**item) for item in parsed]
        return TranslateKoreanResponse(translations=translations)
    except Exception as e:
        logger.error(f"Korean translation error: {e}")
        # Fallback: return originals unchanged
        fallback = [
            TranslatedItem(
                id=item.get("id", ""),
                title=item.get("title", ""),
                subtitle=item.get("subtitle", ""),
                mechanism=item.get("mechanism", ""),
                recommendation=item.get("recommendation", ""),
                alternative=item.get("alternative", ""),
                literatureSummary=item.get("literatureSummary", ""),
            )
            for item in req.texts
        ]
        return TranslateKoreanResponse(translations=fallback)


# ── Owner Handout Generation Endpoint ────────────────────────────────────
# Generates a Korean pet owner discharge instruction from prescription data.

_HANDOUT_SYSTEM_PROMPT = """당신은 수의사를 위한 보호자 안내문 작성 도우미입니다. 처방 데이터를 기반으로 반려동물 보호자가 이해할 수 있는 간결한 한국어 퇴원 안내문을 작성합니다.

규칙:
1. 의학 전문 용어를 사용하지 말고, 보호자가 이해할 수 있는 쉬운 한국어로 작성하십시오.
2. 약물명은 한글명과 영문명을 병기하십시오 (예: 멜록시캄(Meloxicam)).
3. 각 약물에 대해 다음 정보를 포함하십시오:
   - 투여 방법 (경구/주사 등)
   - 투여량과 횟수
   - 식이 주의사항 (공복 투여, 음식과 함께 등)
   - 주의해야 할 부작용 (1-2가지, 쉬운 말로)
4. 위험한 약물 조합이 있다면, 보호자가 알아야 할 증상을 간단히 설명하십시오.
5. 입력 데이터에 없는 정보는 추가하지 마십시오.
6. 한 페이지 분량으로 간결하게 작성하십시오.
7. 반드시 JSON 형식으로만 응답하십시오."""


class HandoutDrugItem(BaseModel):
    name: str
    nameKr: str = ""
    dose: str = ""
    unit: str = ""
    frequency: str = ""
    route: str = ""
    duration: str = ""
    drugClass: str = ""
    speciesNote: str = ""
    foodInteraction: str = ""
    contraindications: list[str] = []
    sideEffects: str = ""


class HandoutPatientInfo(BaseModel):
    name: str = ""
    species: str = ""
    breed: str = ""
    weight: str = ""


class HandoutInteraction(BaseModel):
    drugA: str = ""
    drugB: str = ""
    severity: str = ""
    rule: str = ""
    recommendation: str = ""


class OwnerHandoutRequest(BaseModel):
    patient: HandoutPatientInfo
    drugs: list[HandoutDrugItem]
    interactions: list[HandoutInteraction] = []
    clinicName: str = ""


class HandoutDrugOutput(BaseModel):
    name: str = ""
    howToGive: str = ""
    doseAndFrequency: str = ""
    foodNote: str = ""
    sideEffectsToWatch: str = ""


class HandoutWarning(BaseModel):
    title: str = ""
    description: str = ""


class OwnerHandoutResponse(BaseModel):
    drugs: list[HandoutDrugOutput]
    warnings: list[HandoutWarning] = []
    generalNotes: str = ""


@router.post("/owner-handout", response_model=OwnerHandoutResponse)
async def generate_owner_handout(req: OwnerHandoutRequest):
    """Generate a Korean pet owner discharge handout from prescription data."""
    api_key = _ANTHROPIC_API_KEY or os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY not set.")

    # Build input data for the LLM
    drug_data = []
    for d in req.drugs:
        entry = {
            "약물명": f"{d.nameKr or d.name}({d.name})" if d.nameKr else d.name,
            "용량": d.dose,
            "단위": d.unit,
            "횟수": d.frequency,
            "투여경로": d.route,
            "투여기간": d.duration,
            "약효군": d.drugClass,
        }
        if d.speciesNote:
            entry["종별참고"] = d.speciesNote
        if d.foodInteraction:
            entry["식이상호작용"] = d.foodInteraction
        if d.contraindications:
            entry["금기사항"] = d.contraindications
        if d.sideEffects:
            entry["부작용"] = d.sideEffects
        drug_data.append(entry)

    interaction_data = []
    for ix in req.interactions:
        if ix.severity in ("Critical", "Moderate"):
            interaction_data.append({
                "약물A": ix.drugA,
                "약물B": ix.drugB,
                "심각도": ix.severity,
                "규칙": ix.rule,
                "권고": ix.recommendation,
            })

    input_payload = {
        "환자": {
            "이름": req.patient.name,
            "종": "개" if req.patient.species == "dog" else "고양이" if req.patient.species == "cat" else req.patient.species,
            "품종": req.patient.breed,
            "체중": req.patient.weight,
        },
        "처방약물": drug_data,
    }
    if interaction_data:
        input_payload["주의해야할_약물조합"] = interaction_data

    user_message = (
        "아래 처방 데이터를 기반으로 보호자 퇴원 안내문 내용을 JSON으로 작성하십시오.\n\n"
        "응답 형식:\n"
        '{"drugs": [{"name": "약물명", "howToGive": "투여 방법", "doseAndFrequency": "용량/횟수", '
        '"foodNote": "식이 주의", "sideEffectsToWatch": "관찰할 부작용"}], '
        '"warnings": [{"title": "경고 제목", "description": "설명"}], '
        '"generalNotes": "일반 주의사항"}\n\n'
        + json.dumps(input_payload, ensure_ascii=False, indent=2)
    )

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2048,
            system=_HANDOUT_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )
        raw_text = response.content[0].text.strip()
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
        parsed = json.loads(raw_text)
        return OwnerHandoutResponse(**parsed)
    except Exception as e:
        logger.error(f"Owner handout generation error: {e}")
        # Fallback: basic handout from raw data
        fallback_drugs = []
        for d in req.drugs:
            display_name = f"{d.nameKr}({d.name})" if d.nameKr else d.name
            route_kr = {"PO": "경구 투여 (입으로)", "IV": "정맥 주사", "SC": "피하 주사", "IM": "근육 주사", "Topical": "외용 (바르는 약)"}.get(d.route, d.route)
            freq_kr = {"SID": "1일 1회", "BID": "1일 2회", "TID": "1일 3회", "QID": "1일 4회", "EOD": "격일", "PRN": "필요 시"}.get(d.frequency, d.frequency)
            fallback_drugs.append(HandoutDrugOutput(
                name=display_name,
                howToGive=route_kr,
                doseAndFrequency=f"{d.dose} {d.unit} {freq_kr}" if d.dose else freq_kr,
                foodNote=d.foodInteraction or "",
                sideEffectsToWatch=d.sideEffects or "",
            ))
        fallback_warnings = []
        for ix in req.interactions:
            if ix.severity == "Critical":
                fallback_warnings.append(HandoutWarning(
                    title=f"{ix.drugA} + {ix.drugB} 주의",
                    description=ix.recommendation[:200] if ix.recommendation else "",
                ))
        return OwnerHandoutResponse(
            drugs=fallback_drugs,
            warnings=fallback_warnings,
            generalNotes="처방 약물은 수의사의 지시에 따라 정확히 투여해 주세요. 이상 증상이 나타나면 즉시 내원해 주세요.",
        )


def _fallback_format(req: FormatMechanismRequest) -> str:
    """Basic structured format when Claude API is unavailable."""
    lines = []
    lines.append("MECHANISM")
    if req.mechanism_text:
        lines.append(f"• {req.mechanism_text}")
    if req.effects_mechanism:
        lines.append(f"• 약리 기전: {req.effects_mechanism}")
    if req.raw_interaction_evidence:
        lines.append(f"• 데이터베이스 근거: {req.raw_interaction_evidence}")
    if req.raw_interaction_keywords:
        lines.append(f"• 키워드: {', '.join(req.raw_interaction_keywords)}")

    lines.append("")
    lines.append("RECOMMENDED ACTION")
    if req.recommendation_text:
        lines.append(f"• {req.recommendation_text}")
    if req.alternative_suggestion:
        lines.append(f"• 대안: {req.alternative_suggestion}")

    if req.literature_refs:
        lines.append("")
        lines.append("EVIDENCE SOURCE")
        for ref in req.literature_refs:
            title = ref.get("title", "Unknown")
            source = ref.get("source", ref.get("pmc_id", "N/A"))
            lines.append(f"• {title} ({source})")

    return "\n".join(lines)

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


def _fallback_format(req: FormatMechanismRequest) -> str:
    """Basic structured format when Claude API is unavailable."""
    lines = []
    lines.append("MECHANISM")
    if req.mechanism_text:
        lines.append(f"• {req.mechanism_text}")
    if req.effects_mechanism:
        lines.append(f"• Pharmacology: {req.effects_mechanism}")
    if req.raw_interaction_evidence:
        lines.append(f"• Evidence: {req.raw_interaction_evidence}")
    if req.raw_interaction_keywords:
        lines.append(f"• Keywords: {', '.join(req.raw_interaction_keywords)}")

    lines.append("")
    lines.append("RECOMMENDED ACTION")
    if req.recommendation_text:
        lines.append(f"• {req.recommendation_text}")
    if req.alternative_suggestion:
        lines.append(f"• Alternative: {req.alternative_suggestion}")

    if req.literature_refs:
        lines.append("")
        lines.append("EVIDENCE SOURCE")
        for ref in req.literature_refs:
            title = ref.get("title", "Unknown")
            source = ref.get("source", ref.get("pmc_id", "N/A"))
            lines.append(f"• {title} ({source})")

    return "\n".join(lines)

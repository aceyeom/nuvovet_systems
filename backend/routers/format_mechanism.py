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

_FORMAT_SYSTEM_PROMPT = """You are a veterinary clinical text formatter. Your ONLY job is to reformat the provided drug interaction data into clear, readable clinical text.

STRICT RULES:
1. You may ONLY rephrase information explicitly provided in the input data fields.
2. You must NEVER add new clinical claims, drug facts, dosing recommendations, or mechanism details not present in the input.
3. You must NEVER hallucinate, infer, or extrapolate beyond the provided data.
4. Use bullet points (•), bold headers, and clear section structure.
5. Keep medical terminology accurate — do not simplify beyond recognition.
6. If a data field is empty or null, omit that section entirely. Do NOT fill gaps.
7. Translate any Korean text to English for the formatted output, but preserve the Korean original in parentheses where clinically relevant.
8. Output format: plain text with bullet points using • character. Use ALL CAPS for section headers.

Format structure:
MECHANISM
• [mechanism bullet points from data]

CLINICAL SIGNIFICANCE
• [why this matters, from data only]

RECOMMENDED ACTION
• [action items from data]

EVIDENCE SOURCE
• [citations from data fields]"""


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
        "Format the following verified drug interaction data into readable clinical text. "
        "Use ONLY the data provided below. Do NOT add any new claims.\n\n"
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
        if "MECHANISM" in upper and not "PHARMACOLOGICAL" in upper:
            current_section = "mechanism"
            continue
        elif "RECOMMENDED" in upper or "ACTION" in upper:
            current_section = "recommendation"
            continue
        elif "CLINICAL SIGNIFICANCE" in upper:
            current_section = "mechanism"  # append to mechanism
            mech_lines.append("")  # blank line separator
            continue
        elif "EVIDENCE" in upper or "SOURCE" in upper or "ALTERNATIVE" in upper:
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

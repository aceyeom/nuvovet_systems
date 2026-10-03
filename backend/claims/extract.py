"""
Document → claim draft.

The one place the claims pipeline uses an LLM: reading a photographed clinic
receipt / 진료비 세부내역서 and transcribing it into a structured draft. The
draft is then coded and adjudicated by the deterministic engine, so the model
transcribes; it never decides.
"""

from __future__ import annotations

import base64
import logging
import os
from typing import List, Optional

import anthropic
from pydantic import BaseModel, Field

logger = logging.getLogger("nuvovet")

EXTRACTION_MODEL = os.environ.get("NUVOVET_EXTRACTION_MODEL", "claude-opus-5-5")

PROMPT = """This image is a Korean veterinary clinic document: a receipt (영수증), an itemized bill
(진료비 세부내역서), or a medical record excerpt (진료기록). Transcribe what is printed into the schema.

- Copy line-item text exactly as printed, one entry per printed row. Do not merge, translate, or rename items.
- unit_price and quantity come from the printed columns; if only a row total is printed, set quantity 1 and unit_price to that total.
- Put medicines that are listed with a dose or day count into prescriptions as well as line_items only if they are printed as their own priced row.
- Leave a field null when it is not printed. Do not infer diagnoses, prices, weights, or dates that are not visible.
- visit_date as YYYY-MM-DD."""


class ExtractedLine(BaseModel):
    description: str
    quantity: float = 1
    unit_price: int


class ExtractedPrescription(BaseModel):
    drug: str
    dose_text: Optional[str] = Field(None, description="Dose exactly as printed, e.g. '5mg 1/2T'")
    frequency: Optional[str] = None
    days: Optional[int] = None


class ExtractedDocument(BaseModel):
    clinic_name: Optional[str] = None
    clinic_business_number: Optional[str] = None
    visit_date: Optional[str] = None
    patient_name: Optional[str] = None
    species: Optional[str] = Field(None, description="'dog' or 'cat' when printed")
    breed: Optional[str] = None
    weight_kg: Optional[float] = None
    diagnoses: List[str] = Field(default_factory=list)
    line_items: List[ExtractedLine] = Field(default_factory=list)
    prescriptions: List[ExtractedPrescription] = Field(default_factory=list)
    printed_total: Optional[int] = None


class ExtractionUnavailable(RuntimeError):
    pass


def extract_document(image_bytes: bytes, media_type: str) -> ExtractedDocument:
    """Transcribe one document image. Raises ExtractionUnavailable when no credentials are configured."""
    client = anthropic.Anthropic()
    try:
        response = _call(client, image_bytes, media_type)
    except TypeError as exc:  # raised by the SDK when no credentials can be resolved
        if "authentication" not in str(exc).lower():
            raise
        raise ExtractionUnavailable("no Anthropic credentials configured on the server") from exc
    except anthropic.APIConnectionError as exc:
        raise ExtractionUnavailable("model API unreachable") from exc
    except anthropic.RateLimitError as exc:
        raise ExtractionUnavailable("model API rate limited; retry later") from exc
    except anthropic.APIStatusError as exc:
        logger.warning("Extraction failed with status %s (request %s)", exc.status_code, getattr(exc, "request_id", None))
        raise ExtractionUnavailable(f"model API error {exc.status_code}") from exc
    if response.stop_reason == "refusal" or response.parsed_output is None:
        raise ExtractionUnavailable("The document could not be transcribed.")
    return response.parsed_output


def _call(client: anthropic.Anthropic, image_bytes: bytes, media_type: str):
    return client.beta.messages.parse(
        model=EXTRACTION_MODEL,
        max_tokens=16000,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": media_type,
                                             "data": base64.standard_b64encode(image_bytes).decode("ascii")}},
                {"type": "text", "text": PROMPT},
            ],
        }],
        output_format=ExtractedDocument,
    )

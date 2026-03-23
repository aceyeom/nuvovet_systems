"""
OCR endpoint — extracts structured patient data from EMR screenshots
using Claude claude-haiku-4-5-20251001 vision.
"""

import os
import json
import base64
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File

logger = logging.getLogger("nuvovet")

router = APIRouter(prefix="/api/ocr", tags=["ocr"])

_ANTHROPIC_API_KEY: Optional[str] = os.environ.get("ANTHROPIC_API_KEY")

_OCR_EXTRACTION_PROMPT = """You are extracting structured patient data from a veterinary EMR screenshot. Return a JSON object with exactly these fields and no others. If a field cannot be found in the image, return null for that field. Do not guess or infer values that are not visible in the image.

{
  "patient_name": "string | null",
  "species": "dog | cat | null",
  "breed": "string | null",
  "weight_kg": "float | null",
  "sex": "string | null",
  "age_years": "float | null",
  "conditions": ["string"] | [],
  "allergies": ["string"] | [],
  "current_drugs": ["string"] | [],
  "creatinine_mg_dL": "float | null",
  "alt_u_L": "float | null",
  "owner_phone": "string | null"
}

Return only valid JSON. No explanation, no markdown, no commentary."""


def get_api_key() -> Optional[str]:
    return _ANTHROPIC_API_KEY


@router.post("/extract-patient")
async def ocr_extract_patient(image: UploadFile = File(...)):
    """
    Accept a PNG/JPG/WEBP image, pass it to Claude claude-haiku-4-5-20251001 vision
    for structured patient data extraction, and return the parsed JSON.
    The image is not stored — processed and discarded immediately.
    """
    if not _ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="OCR feature unavailable: ANTHROPIC_API_KEY not configured on the server.",
        )

    # Validate file type
    allowed_types = {"image/png", "image/jpeg", "image/webp"}
    content_type = image.content_type or ""
    if content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image type '{content_type}'. Use PNG, JPEG, or WEBP.",
        )

    # Read image bytes
    image_bytes = await image.read()
    if len(image_bytes) > 20 * 1024 * 1024:  # 20 MB limit
        raise HTTPException(status_code=413, detail="Image too large. Maximum 20 MB.")

    image_b64 = base64.standard_b64encode(image_bytes).decode("utf-8")

    media_type_map = {
        "image/png": "image/png",
        "image/jpeg": "image/jpeg",
        "image/webp": "image/webp",
    }
    media_type = media_type_map.get(content_type, "image/jpeg")

    try:
        import anthropic as anthropic_sdk
        client = anthropic_sdk.Anthropic(api_key=_ANTHROPIC_API_KEY)

        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_b64,
                            },
                        },
                        {
                            "type": "text",
                            "text": _OCR_EXTRACTION_PROMPT,
                        },
                    ],
                }
            ],
        )

        raw_text = message.content[0].text.strip()

        if raw_text.startswith("```"):
            lines = raw_text.split("\n")
            raw_text = "\n".join(
                l for l in lines
                if not l.startswith("```")
            ).strip()

        extracted = json.loads(raw_text)
        return {"ok": True, "data": extracted}

    except json.JSONDecodeError as e:
        logger.warning(f"OCR JSON parse error: {e}")
        raise HTTPException(
            status_code=422,
            detail="Could not parse extracted data from image. Please fill in the form manually.",
        )
    except Exception as e:
        logger.error(f"OCR extraction error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Could not extract data from this screenshot. Please fill in the form manually.",
        )

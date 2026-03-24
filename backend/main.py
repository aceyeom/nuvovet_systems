"""
NuvoVet DUR Backend API
FastAPI server — app setup, CORS, startup, and router registration.

Structure:
  main.py              ← you are here (app entrypoint)
  auth.py              ← authentication (JWT, login, signup)
  routers/
    drugs.py           ← /api/health, /api/drugs/*
    clinical.py        ← /api/breeds, /api/conditions, /api/allergies
    ocr.py             ← /api/ocr/extract-patient
  services/
    drug_loader.py     ← PostgreSQL loading, caching, search index
    drug_mapper.py     ← raw JSONL → frontend Drug contract
"""

import logging
import os
from pathlib import Path

# Load .env from backend/ directory if present (local dev)
_env_file = Path(__file__).parent / ".env"
if _env_file.exists():
    for _line in _env_file.read_text().splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _, _v = _line.partition("=")
            os.environ.setdefault(_k.strip(), _v.strip())

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth import router as auth_router, init_db
from routers.drugs import router as drugs_router
from routers.clinical import router as clinical_router
from routers.medications import router as medications_router
from routers.ocr import router as ocr_router, get_api_key as ocr_api_key
from routers.format_mechanism import router as format_router
from services.drug_loader import get_drug_db
from services.drug_sync import sync_drug_data

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nuvovet")

app = FastAPI(title="NuvoVet DUR API", version="1.0.0")

# ── Routers ───────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(drugs_router)
app.include_router(clinical_router)
app.include_router(medications_router)
app.include_router(ocr_router)
app.include_router(format_router)

# ── CORS ──────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Startup ───────────────────────────────────────────────────────

def _env_flag_enabled(name: str) -> bool:
    return (os.getenv(name) or "").strip().lower() in {"1", "true", "yes", "on"}



@app.on_event("startup")
async def startup_event():
    logger.info("Initialising user database...")
    init_db()
    if _env_flag_enabled("NUVOVET_SYNC_DRUGS_ON_STARTUP"):
        logger.info("NUVOVET_SYNC_DRUGS_ON_STARTUP enabled; syncing JSONL drug data into PostgreSQL...")
        summary = sync_drug_data()
        logger.info("Startup drug sync finished: %s", summary)
    logger.info("Loading drug database...")
    get_drug_db()
    logger.info("Drug database ready.")
    if not ocr_api_key():
        logger.warning(
            "ANTHROPIC_API_KEY is not set — the /api/ocr/extract-patient endpoint will return 503. "
            "Set ANTHROPIC_API_KEY in your environment to enable EMR screenshot import."
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

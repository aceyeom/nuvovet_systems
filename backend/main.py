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
    drug_loader.py     ← JSONL loading, caching, search index
    drug_mapper.py     ← raw JSONL → frontend Drug contract
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth import router as auth_router, init_db
from routers.drugs import router as drugs_router
from routers.clinical import router as clinical_router
from routers.ocr import router as ocr_router, get_api_key as ocr_api_key
from services.drug_loader import get_drug_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nuvovet")

app = FastAPI(title="NuvoVet DUR API", version="1.0.0")

# ── Routers ───────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(drugs_router)
app.include_router(clinical_router)
app.include_router(ocr_router)

# ── CORS ──────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Startup ───────────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    logger.info("Initialising user database...")
    init_db()
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

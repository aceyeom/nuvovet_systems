"""
NuvoVet Backend API
FastAPI server — app setup, CORS, request-size limits, startup, and router registration.

Structure:
  main.py              ← you are here (app entrypoint; also /api/health)
  auth.py              ← authentication (JWT, login, signup)
  routers/
    claims.py          ← /api/claims/* (claims standardization & adjudication)
  claims/              ← claims engine (codebook, knowledge, rules, synthetic eval)
  services/
    drug_loader.py     ← drug records for the claims engine's name resolution and dose references

The legacy DUR routers (routers/drugs.py, clinical.py, medications.py, ocr.py, format_mechanism.py) are not
mounted: they served compendium-derived drug records and text over the public API, and no frontend calls them.
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

from fastapi import FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from auth import IS_PRODUCTION, router as auth_router, init_db
from routers.claims import EXTRACT_PATH, MAX_UPLOAD_BYTES, router as claims_router
from services.drug_loader import get_drug_db
from services.drug_sync import sync_drug_data

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nuvovet")

app = FastAPI(title="NuvoVet API", version="2.0.0")


# ── Validation errors ─────────────────────────────────────────────
# FastAPI's default 422 body echoes each error's `input`, i.e. the submitted values: a claim with one bad field
# would return the raw 동물등록번호 (masked everywhere else), and a bad login body the password. Keep only where
# and what (loc, msg, type).
@app.exception_handler(RequestValidationError)
async def _validation_error(request: Request, exc: RequestValidationError):
    detail = [{k: v for k, v in err.items() if k not in ("input", "ctx", "url")} for err in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": jsonable_encoder(detail)})


# ── Routers ───────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(claims_router)


@app.get("/api/health")
def health():
    return {"status": "ok", "drug_count": len(get_drug_db())}


# ── Request-size limit ────────────────────────────────────────────
# Rejects an oversized body before it is parsed: on the declared Content-Length when there is one, otherwise while
# streaming. Without it a multipart upload of any size is spooled in full before the endpoint can check it.
MAX_BODY_BYTES = int(os.getenv("NUVOVET_MAX_BODY_BYTES") or 1024 * 1024)
BODY_LIMITS = {EXTRACT_PATH: MAX_UPLOAD_BYTES + 64 * 1024}  # the image plus multipart framing


class BodySizeLimitMiddleware:
    def __init__(self, app, default_limit: int, limits: dict):
        self.app = app
        self.default_limit = default_limit
        self.limits = limits

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        limit = self.limits.get(scope["path"].rstrip("/") or "/", self.default_limit)
        declared = dict(scope.get("headers") or []).get(b"content-length")
        if declared is not None:
            try:
                too_large = int(declared) > limit
            except ValueError:
                too_large = False  # the server rejects a malformed Content-Length itself
            if too_large:
                return await _too_large(limit)(scope, receive, send)

        received = 0

        async def limited_receive():
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body") or b"")
                if received > limit:
                    # FastAPI re-raises an HTTPException raised while it reads the body → 413 response.
                    raise HTTPException(status_code=413, detail=_too_large_detail(limit))
            return message

        await self.app(scope, limited_receive, send)


def _too_large_detail(limit: int) -> str:
    return f"Request body larger than {limit // 1024} KB"


def _too_large(limit: int) -> JSONResponse:
    return JSONResponse(status_code=413, content={"detail": _too_large_detail(limit)}, headers={"Connection": "close"})


app.add_middleware(BodySizeLimitMiddleware, default_limit=MAX_BODY_BYTES, limits=BODY_LIMITS)

# ── CORS ──────────────────────────────────────────────────────────
# Comma-separated list, e.g. "https://app.nuvovet.ai,https://nuvovet.vercel.app".
# Unset → allow any origin without credentials (local dev only); production refuses to start without it.
# Auth uses bearer tokens, not cookies, so credentials are never required.
# Added last so it is the outermost middleware: a 413 from the size limit still carries CORS headers.
_cors_origins = [o.strip() for o in (os.getenv("NUVOVET_CORS_ORIGINS") or "").split(",") if o.strip()]
if IS_PRODUCTION and not _cors_origins:
    raise RuntimeError("NUVOVET_CORS_ORIGINS must be set when NUVOVET_ENV=production")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins or ["*"],
    allow_credentials=False,
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
    if not (os.getenv("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC_AUTH_TOKEN")):
        logger.warning(
            "ANTHROPIC_API_KEY is not set — POST /api/claims/extract (receipt photo → claim draft) will return 503."
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

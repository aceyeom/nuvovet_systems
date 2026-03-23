
"""
NuvoVet Authentication Module

Handles account registration/login via JWT and persists account data in PostgreSQL.
Patient records are stored per account in PostgreSQL as well.
"""

import logging
import os
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import bcrypt
import psycopg2
from psycopg2.extras import Json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel, Field

logger = logging.getLogger("nuvovet.auth")

# ── Config ────────────────────────────────────────────────────────
SECRET_KEY = os.environ.get(
    "NUVOVET_SECRET_KEY",
    "nuvovet-dev-secret-change-in-production-9Heav2024"
)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7
FREE_PLAN_DAYS = 30
EMAIL_REGEX = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
USERNAME_REGEX = re.compile(r"^[a-zA-Z0-9_]{3,30}$")

# ── JWT bearer ────────────────────────────────────────────────────
security = HTTPBearer(auto_error=False)


# ── PostgreSQL helpers ────────────────────────────────────────────

def _get_db_url() -> str:
    db_url = (
        os.getenv("DB_INTERNAL_URL")
        or os.getenv("DB_EXTERNAL_URL")
        or os.getenv("DB_URL")
        or os.getenv("DATABASE_URL")
    )
    if not db_url:
        raise RuntimeError(
            "데이터베이스 URL이 필요합니다. "
            "DB_INTERNAL_URL 또는 DB_EXTERNAL_URL(대안: DB_URL, DATABASE_URL)을 설정하세요."
        )
    return db_url


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _dt_to_iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


def _normalize_username(username: str) -> str:
    return (username or "").strip().lower()


def _is_valid_email(value: str) -> bool:
    return bool(EMAIL_REGEX.match(value or ""))


def _is_valid_identifier(value: str) -> bool:
    """Return True if value is a valid email OR a plain username (3-30 alphanumeric/underscore)."""
    return _is_valid_email(value) or bool(USERNAME_REGEX.match(value or ""))


def init_db() -> None:
    """Initialize account/patient tables and seed a default admin account."""
    db_url = _get_db_url()

    with psycopg2.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS accounts (
                    id TEXT PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    plan_tier TEXT NOT NULL DEFAULT 'free',
                    plan_status TEXT NOT NULL DEFAULT 'trial_not_started',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    trial_starts_at TIMESTAMPTZ,
                    trial_ends_at TIMESTAMPTZ,
                    account_data JSONB NOT NULL DEFAULT '{}'::jsonb
                )
                """
            )
            cur.execute(
                """
                ALTER TABLE accounts
                ADD COLUMN IF NOT EXISTS trial_starts_at TIMESTAMPTZ
                """
            )
            cur.execute(
                """
                ALTER TABLE accounts
                ALTER COLUMN trial_ends_at DROP NOT NULL
                """
            )
            cur.execute(
                """
                UPDATE accounts
                SET username = 'admin'
                WHERE username = 'admin@nuvovet.local'
                  AND NOT EXISTS (
                    SELECT 1 FROM accounts a2 WHERE a2.username = 'admin'
                  )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS account_patients (
                    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
                    patient_id TEXT NOT NULL,
                    profile JSONB NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    PRIMARY KEY (account_id, patient_id)
                )
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_account_patients_updated_at
                ON account_patients(account_id, updated_at DESC)
                """
            )

            cur.execute(
                "SELECT id FROM accounts WHERE username = %s",
                ("admin",),
            )
            admin = cur.fetchone()
            if admin is None:
                now = _utcnow()
                trial_end = now + timedelta(days=FREE_PLAN_DAYS)
                cur.execute(
                    """
                    INSERT INTO accounts (
                        id, username, password_hash, plan_tier, plan_status, created_at, trial_starts_at, trial_ends_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        str(uuid.uuid4()),
                        "admin",
                        bcrypt.hashpw(b"admin", bcrypt.gensalt(12)).decode(),
                        "free",
                        "active",
                        now,
                        now,
                        trial_end,
                    ),
                )
                logger.info("Seeded default admin account (username: admin, password: admin)")


# ── Pydantic models ───────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


class SignupRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    plan: str = "free"
    plan_status: str = "trial_not_started"
    account_valid_until: str


class AccountStateRequest(BaseModel):
    data: Dict[str, Any] = Field(default_factory=dict)


class PatientProfileRequest(BaseModel):
    id: Optional[str] = None
    name: str
    owner_phone: Optional[str] = None
    species: str
    breed: Optional[str] = None
    weight_kg: Optional[float] = None
    sex: Optional[str] = None
    age_years: Optional[float] = None
    allergies: List[str] = Field(default_factory=list)
    conditions: List[str] = Field(default_factory=list)
    creatinine_mg_dL: Optional[float] = None
    alt_u_L: Optional[float] = None
    visit_history: List[Dict[str, Any]] = Field(default_factory=list)


# ── JWT helpers ───────────────────────────────────────────────────

def create_access_token(account_id: str, username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {"sub": account_id, "usr": username, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _verify_token(token: str) -> Optional[Dict[str, str]]:
    """Return account claims if token is valid, else None."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        account_id = payload.get("sub")
        username = payload.get("usr")
        if not account_id:
            return None
        return {"account_id": account_id, "username": username or ""}
    except JWTError:
        return None


def _fetch_account_by_username(username: str) -> Optional[Dict[str, Any]]:
    db_url = _get_db_url()
    with psycopg2.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, username, password_hash, plan_tier, plan_status, created_at, trial_ends_at
                FROM accounts
                WHERE username = %s
                """,
                (username,),
            )
            row = cur.fetchone()
            if not row:
                return None
            return {
                "id": row[0],
                "username": row[1],
                "password_hash": row[2],
                "plan_tier": row[3],
                "plan_status": row[4],
                "created_at": row[5],
                "trial_ends_at": row[6],
            }


def _fetch_account_by_id(account_id: str) -> Optional[Dict[str, Any]]:
    db_url = _get_db_url()
    with psycopg2.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, username, plan_tier, plan_status, created_at, trial_starts_at, trial_ends_at
                FROM accounts
                WHERE id = %s
                """,
                (account_id,),
            )
            row = cur.fetchone()
            if not row:
                return None
            return {
                "id": row[0],
                "username": row[1],
                "plan_tier": row[2],
                "plan_status": row[3],
                "created_at": row[4],
                "trial_starts_at": row[5],
                "trial_ends_at": row[6],
            }


def _is_trial_active(account: Dict[str, Any]) -> bool:
    trial_end = account.get("trial_ends_at")
    if trial_end is None:
        return False
    return _utcnow() <= trial_end


def _ensure_active_account(account: Dict[str, Any]) -> None:
    plan_status = account.get("plan_status")
    if plan_status == "trial_not_started":
        return
    if _is_trial_active(account):
        return
    db_url = _get_db_url()
    with psycopg2.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE accounts SET plan_status = 'expired' WHERE id = %s",
                (account["id"],),
            )
    raise HTTPException(
        status_code=403,
        detail="Free plan has expired. This account is valid for 30 days from sign-up.",
    )


def _serialize_account(account: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": account["id"],
        "username": account["username"],
        "plan": account["plan_tier"],
        "plan_status": account["plan_status"],
        "created_at": _dt_to_iso(account["created_at"]),
        "account_valid_until": _dt_to_iso(account["trial_ends_at"]) if account.get("trial_ends_at") else "",
    }


def _normalize_patient_profile(raw: Dict[str, Any], patient_id: str) -> Dict[str, Any]:
    now_iso = _dt_to_iso(_utcnow())
    visit_history = raw.get("visit_history")
    if not isinstance(visit_history, list):
        visit_history = []

    return {
        "id": patient_id,
        "name": (raw.get("name") or "Patient").strip() or "Patient",
        "owner_phone": raw.get("owner_phone"),
        "species": "cat" if raw.get("species") == "cat" else "dog",
        "breed": raw.get("breed"),
        "weight_kg": raw.get("weight_kg"),
        "sex": raw.get("sex"),
        "age_years": raw.get("age_years"),
        "allergies": raw.get("allergies") if isinstance(raw.get("allergies"), list) else [],
        "conditions": raw.get("conditions") if isinstance(raw.get("conditions"), list) else [],
        "creatinine_mg_dL": raw.get("creatinine_mg_dL"),
        "alt_u_L": raw.get("alt_u_L"),
        "visit_history": visit_history,
        "updated_at": now_iso,
        "created_at": raw.get("created_at") or now_iso,
    }


# ── FastAPI dependency ────────────────────────────────────────────

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Dict[str, Any]:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    claims = _verify_token(credentials.credentials)
    if not claims:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    account = _fetch_account_by_id(claims["account_id"])
    if not account:
        raise HTTPException(status_code=401, detail="Account not found")
    _ensure_active_account(account)
    return account


# ── Router ────────────────────────────────────────────────────────

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest):
    username = _normalize_username(req.username)
    if not username or not req.password:
        raise HTTPException(status_code=400, detail="Username/email and password are required")
    if not _is_valid_identifier(username):
        raise HTTPException(status_code=400, detail="Please enter a valid email address or username (3–30 alphanumeric characters / underscores)")

    account = _fetch_account_by_username(username)
    if not account or not bcrypt.checkpw(req.password.encode(), account["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    _ensure_active_account(account)
    token = create_access_token(account["id"], account["username"])
    return TokenResponse(
        access_token=token,
        username=account["username"],
        plan=account["plan_tier"],
        plan_status=account["plan_status"],
        account_valid_until=_dt_to_iso(account["trial_ends_at"]) if account.get("trial_ends_at") else "",
    )


@router.post("/signup", response_model=TokenResponse)
def signup(req: SignupRequest):
    username = _normalize_username(req.username)
    if not username:
        raise HTTPException(status_code=400, detail="Username or email is required")
    if not _is_valid_identifier(username):
        raise HTTPException(status_code=400, detail="Please enter a valid email address or username (3–30 alphanumeric characters / underscores)")
    if not req.password or len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    if _fetch_account_by_username(username):
        raise HTTPException(status_code=409, detail="Username already exists")

    now = _utcnow()
    account_id = str(uuid.uuid4())
    password_hash = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt(12)).decode()

    db_url = _get_db_url()
    with psycopg2.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO accounts (
                    id, username, password_hash, plan_tier, plan_status, created_at, trial_starts_at, trial_ends_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (account_id, username, password_hash, "free", "trial_not_started", now, None, None),
            )

    token = create_access_token(account_id, username)
    return TokenResponse(
        access_token=token,
        username=username,
        plan="free",
        plan_status="trial_not_started",
        account_valid_until="",
    )


@router.get("/me")
def get_me(account: Dict[str, Any] = Depends(get_current_user)):
    return {
        "username": account["username"],
        "authenticated": True,
        "plan": account["plan_tier"],
        "plan_status": account["plan_status"],
        "account_valid_until": _dt_to_iso(account["trial_ends_at"]) if account.get("trial_ends_at") else "",
    }


@router.post("/start-trial")
def start_free_trial(account: Dict[str, Any] = Depends(get_current_user)):
    if account.get("plan_tier") != "free":
        raise HTTPException(status_code=400, detail="Only free plan accounts can start the free trial")
    if account.get("plan_status") == "active" and _is_trial_active(account):
        return {
            "ok": True,
            "plan": account["plan_tier"],
            "plan_status": account["plan_status"],
            "account_valid_until": _dt_to_iso(account["trial_ends_at"]) if account.get("trial_ends_at") else "",
        }
    if account.get("plan_status") == "expired" or account.get("trial_starts_at"):
        raise HTTPException(status_code=409, detail="Free trial has already been used for this account")

    now = _utcnow()
    trial_end = now + timedelta(days=FREE_PLAN_DAYS)
    db_url = _get_db_url()
    with psycopg2.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE accounts
                SET plan_status = 'active', trial_starts_at = %s, trial_ends_at = %s
                WHERE id = %s
                """,
                (now, trial_end, account["id"]),
            )

    return {
        "ok": True,
        "plan": "free",
        "plan_status": "active",
        "account_valid_until": _dt_to_iso(trial_end),
    }


@router.post("/logout")
def logout(account: Dict[str, Any] = Depends(get_current_user)):
    # Token invalidation is client-side (remove from localStorage)
    return {"ok": True}


@router.get("/state")
def get_account_state(account: Dict[str, Any] = Depends(get_current_user)):
    db_url = _get_db_url()
    with psycopg2.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT account_data FROM accounts WHERE id = %s", (account["id"],))
            row = cur.fetchone()
            return {"data": row[0] if row and isinstance(row[0], dict) else {}}


@router.put("/state")
def set_account_state(req: AccountStateRequest, account: Dict[str, Any] = Depends(get_current_user)):
    db_url = _get_db_url()
    with psycopg2.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE accounts SET account_data = %s WHERE id = %s",
                (Json(req.data), account["id"]),
            )
    return {"ok": True, "data": req.data}


@router.get("/patients")
def list_patients(account: Dict[str, Any] = Depends(get_current_user)):
    db_url = _get_db_url()
    with psycopg2.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT patient_id, profile, created_at, updated_at
                FROM account_patients
                WHERE account_id = %s
                ORDER BY updated_at DESC
                """,
                (account["id"],),
            )
            rows = cur.fetchall()

    patients: List[Dict[str, Any]] = []
    for patient_id, profile, created_at, updated_at in rows:
        profile = profile or {}
        profile["id"] = patient_id
        profile["created_at"] = profile.get("created_at") or _dt_to_iso(created_at)
        profile["updated_at"] = profile.get("updated_at") or _dt_to_iso(updated_at)
        patients.append(profile)
    return {"patients": patients}


@router.post("/patients")
def upsert_patient(req: PatientProfileRequest, account: Dict[str, Any] = Depends(get_current_user)):
    patient_id = req.id or str(uuid.uuid4())
    profile = _normalize_patient_profile(req.model_dump(exclude_none=True), patient_id)

    db_url = _get_db_url()
    with psycopg2.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO account_patients (account_id, patient_id, profile, created_at, updated_at)
                VALUES (%s, %s, %s, NOW(), NOW())
                ON CONFLICT (account_id, patient_id)
                DO UPDATE SET
                    profile = EXCLUDED.profile,
                    updated_at = NOW()
                RETURNING created_at, updated_at
                """,
                (account["id"], patient_id, Json(profile)),
            )
            created_at, updated_at = cur.fetchone()

    profile["created_at"] = profile.get("created_at") or _dt_to_iso(created_at)
    profile["updated_at"] = _dt_to_iso(updated_at)
    return {"patient": profile}


@router.post("/patients/{patient_id}/visits")
def add_visit_record(patient_id: str, visit: Dict[str, Any], account: Dict[str, Any] = Depends(get_current_user)):
    db_url = _get_db_url()
    with psycopg2.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT profile FROM account_patients WHERE account_id = %s AND patient_id = %s",
                (account["id"], patient_id),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Patient not found")

            profile = row[0] or {}
            history = profile.get("visit_history") if isinstance(profile.get("visit_history"), list) else []
            history = [visit, *history]
            profile["visit_history"] = history
            profile["updated_at"] = _dt_to_iso(_utcnow())

            cur.execute(
                """
                UPDATE account_patients
                SET profile = %s, updated_at = NOW()
                WHERE account_id = %s AND patient_id = %s
                RETURNING updated_at
                """,
                (Json(profile), account["id"], patient_id),
            )
            updated_at = cur.fetchone()[0]

    profile["id"] = patient_id
    profile["updated_at"] = _dt_to_iso(updated_at)
    return {"patient": profile}


@router.delete("/patients/{patient_id}")
def remove_patient(patient_id: str, account: Dict[str, Any] = Depends(get_current_user)):
    db_url = _get_db_url()
    with psycopg2.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM account_patients WHERE account_id = %s AND patient_id = %s",
                (account["id"], patient_id),
            )
            deleted = cur.rowcount
    if deleted == 0:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"ok": True}

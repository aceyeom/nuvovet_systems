"""
NuvoVet Medications Router

CRUD endpoints for patient medication records.
"""

import logging
import uuid
from datetime import date
from typing import Any, Dict, List, Optional

import psycopg2
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from auth import get_current_user, _get_db_url

logger = logging.getLogger("nuvovet.medications")

router = APIRouter(prefix="/api/patients", tags=["medications"])


# ── Pydantic models ───────────────────────────────────────────────

class MedicationCreateRequest(BaseModel):
    drug_id: Optional[str] = None
    drug_name: str
    dose: Optional[str] = None
    unit: Optional[str] = None
    route: Optional[str] = None
    frequency: Optional[str] = None
    status: str = "active"
    indication: Optional[str] = None
    start_date: Optional[date] = None
    stop_date: Optional[date] = None


class MedicationUpdateRequest(BaseModel):
    drug_id: Optional[str] = None
    drug_name: Optional[str] = None
    dose: Optional[str] = None
    unit: Optional[str] = None
    route: Optional[str] = None
    frequency: Optional[str] = None
    status: Optional[str] = None
    indication: Optional[str] = None
    start_date: Optional[date] = None
    stop_date: Optional[date] = None


# ── Helpers ───────────────────────────────────────────────────────

def _row_to_medication(row) -> Dict[str, Any]:
    return {
        "id": row[0],
        "account_id": row[1],
        "patient_id": row[2],
        "drug_id": row[3],
        "drug_name": row[4],
        "dose": row[5],
        "unit": row[6],
        "route": row[7],
        "frequency": row[8],
        "status": row[9],
        "indication": row[10],
        "start_date": row[11].isoformat() if row[11] else None,
        "stop_date": row[12].isoformat() if row[12] else None,
        "created_at": row[13].isoformat() if row[13] else None,
        "updated_at": row[14].isoformat() if row[14] else None,
    }


_VALID_STATUSES = {"active", "stopped", "prn"}


# ── Endpoints ─────────────────────────────────────────────────────

@router.get("/{patient_id}/medications")
def list_medications(
    patient_id: str,
    status: str = Query("all", regex="^(active|stopped|prn|all)$"),
    account: Dict[str, Any] = Depends(get_current_user),
):
    db_url = _get_db_url()
    with psycopg2.connect(db_url) as conn:
        with conn.cursor() as cur:
            if status == "all":
                cur.execute(
                    """
                    SELECT id, account_id, patient_id, drug_id, drug_name,
                           dose, unit, route, frequency, status,
                           indication, start_date, stop_date, created_at, updated_at
                    FROM patient_medications
                    WHERE account_id = %s AND patient_id = %s
                    ORDER BY created_at DESC
                    """,
                    (account["id"], patient_id),
                )
            else:
                cur.execute(
                    """
                    SELECT id, account_id, patient_id, drug_id, drug_name,
                           dose, unit, route, frequency, status,
                           indication, start_date, stop_date, created_at, updated_at
                    FROM patient_medications
                    WHERE account_id = %s AND patient_id = %s AND status = %s
                    ORDER BY created_at DESC
                    """,
                    (account["id"], patient_id, status),
                )
            rows = cur.fetchall()

    return {"medications": [_row_to_medication(r) for r in rows]}


@router.post("/{patient_id}/medications")
def create_medication(
    patient_id: str,
    req: MedicationCreateRequest,
    account: Dict[str, Any] = Depends(get_current_user),
):
    if req.status not in _VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{req.status}'. Must be one of: active, stopped, prn",
        )

    med_id = str(uuid.uuid4())
    db_url = _get_db_url()
    with psycopg2.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO patient_medications (
                    id, account_id, patient_id, drug_id, drug_name,
                    dose, unit, route, frequency, status,
                    indication, start_date, stop_date
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, account_id, patient_id, drug_id, drug_name,
                          dose, unit, route, frequency, status,
                          indication, start_date, stop_date, created_at, updated_at
                """,
                (
                    med_id,
                    account["id"],
                    patient_id,
                    req.drug_id,
                    req.drug_name,
                    req.dose,
                    req.unit,
                    req.route,
                    req.frequency,
                    req.status,
                    req.indication,
                    req.start_date,
                    req.stop_date,
                ),
            )
            row = cur.fetchone()

    return {"medication": _row_to_medication(row)}


@router.put("/{patient_id}/medications/{med_id}")
def update_medication(
    patient_id: str,
    med_id: str,
    req: MedicationUpdateRequest,
    account: Dict[str, Any] = Depends(get_current_user),
):
    if req.status is not None and req.status not in _VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{req.status}'. Must be one of: active, stopped, prn",
        )

    # Build SET clause dynamically from provided fields
    updates = req.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_parts = []
    params: List[Any] = []
    for field, value in updates.items():
        set_parts.append(f"{field} = %s")
        params.append(value)
    set_parts.append("updated_at = NOW()")

    params.extend([account["id"], patient_id, med_id])

    db_url = _get_db_url()
    with psycopg2.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE patient_medications
                SET {', '.join(set_parts)}
                WHERE account_id = %s AND patient_id = %s AND id = %s
                RETURNING id, account_id, patient_id, drug_id, drug_name,
                          dose, unit, route, frequency, status,
                          indication, start_date, stop_date, created_at, updated_at
                """,
                params,
            )
            row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Medication not found")

    return {"medication": _row_to_medication(row)}


@router.delete("/{patient_id}/medications/{med_id}")
def delete_medication(
    patient_id: str,
    med_id: str,
    account: Dict[str, Any] = Depends(get_current_user),
):
    db_url = _get_db_url()
    with psycopg2.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM patient_medications
                WHERE account_id = %s AND patient_id = %s AND id = %s
                """,
                (account["id"], patient_id, med_id),
            )
            deleted = cur.rowcount

    if deleted == 0:
        raise HTTPException(status_code=404, detail="Medication not found")

    return {"ok": True}

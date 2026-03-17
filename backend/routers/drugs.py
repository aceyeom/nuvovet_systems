"""
Drug endpoints — search, get, and list drugs.
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from services.drug_loader import get_drug_db, get_search_index
from services.drug_mapper import map_drug

logger = logging.getLogger("nuvovet")

router = APIRouter(prefix="/api", tags=["drugs"])


@router.get("/health")
def health():
    db = get_drug_db()
    return {"status": "ok", "drug_count": len(db)}


@router.get("/drugs/search")
def search_drugs(
    q: str = Query(default="", description="Search query"),
    species: Optional[str] = Query(default=None, description="Filter species: dog | cat"),
    limit: int = Query(default=20, le=100),
):
    """Search drugs by name, Korean name, active ingredient, or brand name."""
    db = get_drug_db()
    if not q or len(q.strip()) < 1:
        return {"results": [], "total": 0}

    query = q.strip().lower()
    results = []

    for entry in get_search_index():
        score = 0
        if entry["name_en"].startswith(query):
            score = 100
        elif entry["active"].startswith(query):
            score = 90
        elif query in entry["name_en"]:
            score = 70
        elif query in entry["name_ko"]:
            score = 70
        elif query in entry["active"]:
            score = 60
        elif any(query in b for b in entry["brands"]):
            score = 50

        if score > 0:
            results.append((score, entry["id"]))

    results.sort(key=lambda x: x[0], reverse=True)
    result_ids = [r[1] for r in results[:limit]]

    mapped = []
    for drug_id in result_ids:
        raw = db.get(drug_id)
        if not raw:
            continue
        try:
            drug = map_drug(raw)
            if species and drug["defaultDose"].get(species) is None:
                continue
            mapped.append(drug)
        except Exception as e:
            logger.warning(f"Error mapping {drug_id}: {e}")

    return {"results": mapped, "total": len(mapped)}


@router.get("/drugs/{drug_id}")
def get_drug(drug_id: str):
    """Get full drug record by ID."""
    db = get_drug_db()
    raw = db.get(drug_id)
    if not raw:
        raise HTTPException(status_code=404, detail=f"Drug '{drug_id}' not found")
    try:
        return map_drug(raw)
    except Exception as e:
        logger.error(f"Error mapping drug {drug_id}: {e}")
        raise HTTPException(status_code=500, detail="Error mapping drug data")


@router.get("/drugs")
def list_drugs(
    drug_class: Optional[str] = Query(default=None),
    source: Optional[str] = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
):
    """List drugs with optional class/source filters."""
    db = get_drug_db()
    items = list(db.values())

    if drug_class:
        items = [d for d in items if (d.get("drug_identity") or {}).get("class") == drug_class]
    if source:
        items = [d for d in items if (d.get("drug_identity") or {}).get("source") == source]

    total = len(items)
    page = items[offset: offset + limit]
    results = []
    for raw in page:
        try:
            results.append(map_drug(raw))
        except Exception as e:
            logger.warning(f"Skipping {raw.get('id')}: {e}")

    return {"results": results, "total": total, "offset": offset, "limit": limit}

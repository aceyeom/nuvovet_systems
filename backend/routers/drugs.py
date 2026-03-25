"""
Drug endpoints — search, get, and list drugs.
"""

import logging
import re
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from auth import get_current_user
from services.drug_loader import get_drug_db, get_search_index, refresh_drug_db
from services.drug_mapper import map_drug
from services.drug_sync import sync_drug_data
from services.fuzzy_search import fuzzy_score

logger = logging.getLogger("nuvovet")

router = APIRouter(prefix="/api", tags=["drugs"])


def _normalize_search_text(value: str) -> str:
    """Normalize free-text for resilient drug search matching."""
    text = (value or "").lower()
    text = re.sub(r"[\/_\-(),;]+", " ", text)
    text = text.replace("±", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _token_subset_match(query_norm: str, target_norm: str) -> bool:
    """Return True if all query tokens are present in target tokens.

    This handles cases like "citrate potassium" vs "potassium citrate".
    """
    if not query_norm or not target_norm:
        return False
    q_tokens = [t for t in query_norm.split(" ") if t]
    if not q_tokens:
        return False
    t_set = set(t for t in target_norm.split(" ") if t)
    return all(token in t_set for token in q_tokens)


@router.get("/health")
def health():
    db = get_drug_db()
    return {"status": "ok", "drug_count": len(db)}


@router.post("/admin/drugs/reload")
def reload_drugs(account: Dict[str, Any] = Depends(get_current_user)):
    if account.get("username") != "admin":
        raise HTTPException(status_code=403, detail="Admin account required")

    summary = sync_drug_data()
    db = refresh_drug_db()
    return {
        "status": "ok",
        **summary,
        "cache_drug_count": len(db),
    }


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
    query_norm = _normalize_search_text(query)
    query_first_token = query_norm.split(" ")[0] if query_norm else ""
    results = []

    for entry in get_search_index():
        name_en = entry["name_en"]
        name_ko = entry["name_ko"]
        active = entry["active"]
        brands = entry["brands"]
        drug_id = entry["id"]
        products_ko = entry.get("products_ko") or []
        products_en = entry.get("products_en") or []

        name_en_norm = _normalize_search_text(name_en)
        name_ko_norm = _normalize_search_text(name_ko)
        active_norm = _normalize_search_text(active)
        id_norm = _normalize_search_text(drug_id)
        brand_norms = [_normalize_search_text(b) for b in brands]
        product_ko_norms = [_normalize_search_text(p) for p in products_ko]
        product_en_norms = [_normalize_search_text(p) for p in products_en]

        score = 0
        if name_en.startswith(query) or (query_norm and name_en_norm.startswith(query_norm)):
            score = 100
        elif name_ko.startswith(query):
            score = 100
        elif active.startswith(query) or (query_norm and active_norm.startswith(query_norm)):
            score = 90
        elif query_norm and id_norm.startswith(query_norm):
            score = 85
        elif query in name_en or (query_norm and query_norm in name_en_norm):
            score = 70
        elif query in name_ko or (query_norm and query_norm in name_ko_norm):
            score = 70
        elif query in active or (query_norm and query_norm in active_norm):
            score = 60
        elif query_norm and query_norm in id_norm:
            score = 60
        elif any((query in b) or (query_norm and query_norm in bn) for b, bn in zip(brands, brand_norms)):
            score = 50
        elif any(query in pk or (query_norm and query_norm in pkn) for pk, pkn in zip(products_ko, product_ko_norms)):
            score = 40
        elif any(query_norm and query_norm in pen for pen in product_en_norms):
            score = 40
        elif query_norm and (
            _token_subset_match(query_norm, name_en_norm)
            or _token_subset_match(query_norm, name_ko_norm)
            or _token_subset_match(query_norm, active_norm)
            or _token_subset_match(query_norm, id_norm)
            or any(_token_subset_match(query_norm, bn) for bn in brand_norms)
            or any(_token_subset_match(query_norm, pkn) for pkn in product_ko_norms)
        ):
            score = 45
        elif query_first_token and (
            query_first_token in name_en_norm
            or query_first_token in name_ko_norm
            or query_first_token in active_norm
            or query_first_token in id_norm
            or any(query_first_token in bn for bn in brand_norms)
            or any(query_first_token in pkn for pkn in product_ko_norms)
        ):
            # Fallback for long/annotated queries like "dacarbazine dtic".
            score = 35

        if score > 0:
            results.append((score, drug_id))

    # ── Fuzzy fallback: if exact/substring matching found < 3 results,
    #    run trigram + jamo fuzzy matching on all entries ──
    if len(results) < 3 and len(query) >= 2:
        existing_ids = {r[1] for r in results}
        for entry in get_search_index():
            if entry["id"] in existing_ids:
                continue
            fscore = fuzzy_score(query, entry)
            if fscore > 0:
                results.append((fscore, entry["id"]))

    results.sort(key=lambda x: x[0], reverse=True)
    result_ids = [r[1] for r in results[:limit]]

    mapped = []
    for drug_id in result_ids:
        raw = db.get(drug_id)
        if not raw:
            continue
        try:
            drug = map_drug(raw)
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

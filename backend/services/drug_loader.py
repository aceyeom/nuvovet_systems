"""
Drug database loader — reads JSONL files from data/converted/ and builds
a search index for fast lookups by name, ingredient, or brand.
"""

import json
import logging
from pathlib import Path
from typing import Optional, Dict, List, Any

logger = logging.getLogger("nuvovet")

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "converted"

_DRUG_CACHE: Optional[Dict[str, Any]] = None
_SEARCH_INDEX: Optional[List[Dict[str, Any]]] = None


def _load_all_drugs() -> Dict[str, Any]:
    drugs: Dict[str, Any] = {}
    loaded = skipped = 0
    for path in DATA_DIR.rglob("*.jsonl"):
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, dict) and "id" in data:
                drugs[data["id"]] = data
                loaded += 1
        except Exception:
            skipped += 1
    logger.info(f"Loaded {loaded} drugs ({skipped} skipped)")
    return drugs


def _build_search_index(db: Dict[str, Any]) -> List[Dict[str, Any]]:
    index = []
    for drug_id, raw in db.items():
        identity = raw.get("drug_identity") or {}
        name_en = (identity.get("name_en") or "").lower()
        name_ko = (identity.get("name_ko") or "").lower()
        active = (identity.get("active_ingredient") or "").lower()
        brands = [b.lower() for b in (identity.get("brand_names") or [])]
        index.append({
            "id": drug_id,
            "name_en": name_en,
            "name_ko": name_ko,
            "active": active,
            "brands": brands,
            "class": identity.get("class", ""),
        })
    return index


def get_drug_db() -> Dict[str, Any]:
    global _DRUG_CACHE, _SEARCH_INDEX
    if _DRUG_CACHE is None:
        _DRUG_CACHE = _load_all_drugs()
        _SEARCH_INDEX = _build_search_index(_DRUG_CACHE)
    return _DRUG_CACHE


def get_search_index() -> List[Dict[str, Any]]:
    get_drug_db()  # ensure loaded
    return _SEARCH_INDEX or []

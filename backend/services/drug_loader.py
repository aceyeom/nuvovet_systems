"""
Drug database loader — reads drug records from PostgreSQL and builds
a search index for fast lookups by name, ingredient, or brand.
"""

import logging
import os
from typing import Optional, Dict, List, Any

import psycopg2

logger = logging.getLogger("nuvovet")

_DRUG_CACHE: Optional[Dict[str, Any]] = None
_SEARCH_INDEX: Optional[List[Dict[str, Any]]] = None


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


def _normalize_drug_record(drug_id: str, full_data: Any) -> Optional[Dict[str, Any]]:
    if not isinstance(full_data, dict):
        return None

    data = dict(full_data)
    if not data.get("id"):
        data["id"] = drug_id
    return data


def _load_all_drugs() -> Dict[str, Any]:
    drugs: Dict[str, Any] = {}
    loaded = 0
    skipped = 0
    db_url = _get_db_url()

    try:
        with psycopg2.connect(db_url) as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT drug_id, full_data FROM drugs")
                for drug_id, full_data in cursor.fetchall():
                    record = _normalize_drug_record(drug_id, full_data)
                    if record is None:
                        skipped += 1
                        continue
                    drugs[record["id"]] = record
                    loaded += 1
    except Exception as error:
        logger.exception("Failed to load drugs from PostgreSQL: %s", error)
        raise

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

"""
Drug database loader — reads drug records from PostgreSQL (production) or
local JSONL files (fallback for dev) and builds a search index.
"""

import json
import logging
import os
from pathlib import Path
from typing import Optional, Dict, List, Any

import psycopg2
from psycopg2 import errors as pg_errors

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


def _load_from_local_jsonl() -> Dict[str, Any]:
    """Fall back to local JSONL files under data/converted/ when PostgreSQL
    drugs table is not available (local dev environment)."""
    drugs: Dict[str, Any] = {}
    data_dir = Path(__file__).parent.parent / "data" / "converted"
    if not data_dir.exists():
        logger.warning("Local drug data directory not found: %s", data_dir)
        return drugs

    loaded = 0
    skipped = 0
    for jsonl_file in sorted(data_dir.rglob("*.jsonl")):
        try:
            raw = jsonl_file.read_text(encoding="utf-8").strip()
            if not raw:
                continue
            record = json.loads(raw)
            if not isinstance(record, dict):
                skipped += 1
                continue
            drug_id = record.get("id") or jsonl_file.stem
            record.setdefault("id", drug_id)
            drugs[drug_id] = record
            loaded += 1
        except Exception as exc:
            logger.debug("Skipping %s: %s", jsonl_file.name, exc)
            skipped += 1

    logger.info(
        "Loaded %d drugs from local JSONL files (%d skipped)", loaded, skipped
    )
    return drugs


def _load_all_drugs() -> Dict[str, Any]:
    drugs: Dict[str, Any] = {}
    loaded = 0
    skipped = 0
    db_url = _get_db_url()

    try:
        with psycopg2.connect(db_url) as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT to_regclass('public.drug_references')")
                has_reference_table = cursor.fetchone()[0] is not None

                if has_reference_table:
                    cursor.execute(
                        """
                        SELECT
                            d.drug_id,
                            d.full_data,
                            COALESCE(
                                (
                                    SELECT jsonb_agg(
                                        jsonb_build_object(
                                            'pmc_id', r.pmc_id,
                                            'title', r.title,
                                            'url', r.url,
                                            'issn', r.issn,
                                            'if_score', r.if_score,
                                            'relevance_score', r.relevance_score,
                                            'match_reasons', r.match_reasons
                                        )
                                        ORDER BY r.relevance_score DESC NULLS LAST, r.if_score DESC NULLS LAST, r.inserted_at DESC
                                    )
                                    FROM drug_references r
                                    WHERE r.drug_id = d.drug_id
                                ),
                                '[]'::jsonb
                            ) AS references
                        FROM drugs d
                        """
                    )
                    rows = cursor.fetchall()
                else:
                    cursor.execute("SELECT drug_id, full_data FROM drugs")
                    rows = [(drug_id, full_data, []) for drug_id, full_data in cursor.fetchall()]

                for drug_id, full_data, references in rows:
                    record = _normalize_drug_record(drug_id, full_data)
                    if record is None:
                        skipped += 1
                        continue

                    if isinstance(references, list):
                        record["_reference_context"] = {
                            "references": references,
                            "reference_count": len(references),
                        }

                    drugs[record["id"]] = record
                    loaded += 1
        logger.info(f"Loaded {loaded} drugs from PostgreSQL ({skipped} skipped)")
        return drugs
    except pg_errors.UndefinedTable:
        logger.warning(
            "PostgreSQL 'drugs' table not found — falling back to local JSONL files."
        )
        return _load_from_local_jsonl()
    except Exception as error:
        logger.warning(
            "Failed to load drugs from PostgreSQL (%s) — falling back to local JSONL files.",
            error,
        )
        return _load_from_local_jsonl()


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

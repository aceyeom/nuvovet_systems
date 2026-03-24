import json
import logging
import os
from pathlib import Path
from typing import Any

import psycopg2

logger = logging.getLogger("nuvovet.drug_sync")

ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "converted"
DEFAULT_REFERENCE_RESULT_PATH = ROOT_DIR / "test_pmc_references.json"


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


def load_drugs_from_file(file_path: Path) -> list[dict[str, Any]]:
    with file_path.open("r", encoding="utf-8") as file_obj:
        try:
            data = json.load(file_obj)
            if isinstance(data, list):
                return data
            if isinstance(data, dict):
                return [data]
            raise ValueError(f"지원하지 않는 JSON 구조입니다: {file_path}")
        except json.JSONDecodeError:
            file_obj.seek(0)
            return [json.loads(line) for line in file_obj if line.strip()]


def iter_data_files(data_dir: Path = DATA_DIR):
    for pattern in ("*.json", "*.jsonl"):
        yield from sorted(data_dir.rglob(pattern))


def sync_drug_data(data_dir: Path = DATA_DIR) -> dict[str, int]:
    db_url = _get_db_url()

    if not data_dir.exists():
        raise FileNotFoundError(f"데이터 디렉터리를 찾을 수 없습니다: {data_dir}")

    file_count = 0
    inserted_count = 0
    skipped_count = 0

    with psycopg2.connect(db_url) as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS drugs (
                    drug_id TEXT PRIMARY KEY,
                    name_ko TEXT,
                    drug_class TEXT,
                    full_data JSONB
                )
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS drug_references (
                    id BIGSERIAL PRIMARY KEY,
                    drug_id TEXT NOT NULL,
                    pmc_id TEXT NOT NULL,
                    issn TEXT,
                    title TEXT,
                    url TEXT,
                    if_score DOUBLE PRECISION,
                    relevance_score INTEGER,
                    match_reasons JSONB,
                    raw_payload JSONB,
                    inserted_at TIMESTAMPTZ DEFAULT NOW(),
                    UNIQUE (drug_id, pmc_id)
                )
                """
            )
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS idx_drug_references_drug_id ON drug_references(drug_id)"
            )
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS idx_drug_references_pmc_id ON drug_references(pmc_id)"
            )
            cursor.execute("TRUNCATE TABLE drugs")

            for file_path in iter_data_files(data_dir):
                file_count += 1
                try:
                    drugs_to_insert = load_drugs_from_file(file_path)
                except Exception as error:
                    skipped_count += 1
                    logger.warning("Skipping %s: %s", file_path, error)
                    continue

                for drug in drugs_to_insert:
                    drug_id = drug.get("id")
                    if not drug_id:
                        skipped_count += 1
                        logger.warning("Missing drug id in %s", file_path)
                        continue

                    identity = drug.get("drug_identity") or {}
                    name_ko = identity.get("name_ko", "알 수 없음")
                    drug_class = identity.get("class", "알 수 없음")

                    cursor.execute(
                        """
                        INSERT INTO drugs (drug_id, name_ko, drug_class, full_data)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (drug_id) DO UPDATE
                        SET name_ko = EXCLUDED.name_ko,
                            drug_class = EXCLUDED.drug_class,
                            full_data = EXCLUDED.full_data
                        """,
                        (drug_id, name_ko, drug_class, json.dumps(drug, ensure_ascii=False)),
                    )
                    inserted_count += 1

        conn.commit()

    summary = {
        "files_processed": file_count,
        "records_upserted": inserted_count,
        "records_skipped": skipped_count,
    }
    logger.info("Drug sync complete: %s", summary)
    return summary


def _compute_average_if(candidates: list[dict[str, Any]]) -> float | None:
    scores = []
    for candidate in candidates:
        value = candidate.get("if_score")
        if value is None:
            continue
        try:
            scores.append(float(value))
        except (TypeError, ValueError):
            continue
    return (sum(scores) / len(scores)) if scores else None


def _normalize_pmc_id(value: Any) -> str | None:
    if value is None:
        return None
    pmc_id = str(value).strip()
    if not pmc_id:
        return None
    return pmc_id if pmc_id.upper().startswith("PMC") else f"PMC{pmc_id}"


def _build_pmc_source_file(candidates: list[dict[str, Any]]) -> str:
    pmc_ids = sorted(
        {
            _normalize_pmc_id(candidate.get("pmc_id"))
            for candidate in candidates
            if candidate.get("pmc_id")
        }
    )
    pmc_ids = [pmc_id for pmc_id in pmc_ids if pmc_id]
    return ", ".join(pmc_ids) if pmc_ids else "NO_PMC_REFERENCE"


def _build_pmc_ddi_source(candidates: list[dict[str, Any]]) -> str:
    source_file = _build_pmc_source_file(candidates)
    return f"PMC references: {source_file}" if source_file != "NO_PMC_REFERENCE" else source_file


def sync_reference_results(result_path: Path = DEFAULT_REFERENCE_RESULT_PATH) -> dict[str, int]:
    db_url = _get_db_url()

    if not result_path.exists():
        raise FileNotFoundError(f"레퍼런스 결과 파일을 찾을 수 없습니다: {result_path}")

    with result_path.open("r", encoding="utf-8") as file_obj:
        rows = json.load(file_obj)

    upserted = 0
    updated_quality = 0

    with psycopg2.connect(db_url) as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS drug_references (
                    id BIGSERIAL PRIMARY KEY,
                    drug_id TEXT NOT NULL,
                    pmc_id TEXT NOT NULL,
                    issn TEXT,
                    title TEXT,
                    url TEXT,
                    if_score DOUBLE PRECISION,
                    relevance_score INTEGER,
                    match_reasons JSONB,
                    raw_payload JSONB,
                    inserted_at TIMESTAMPTZ DEFAULT NOW(),
                    UNIQUE (drug_id, pmc_id)
                )
                """
            )

            for row in rows:
                drug_id = row.get("drug_id")
                if not drug_id:
                    continue

                candidates = row.get("sql_candidates") or []
                for candidate in candidates:
                    pmc_id = candidate.get("pmc_id")
                    if not pmc_id:
                        continue

                    cursor.execute(
                        """
                        INSERT INTO drug_references
                        (drug_id, pmc_id, issn, title, url, if_score, relevance_score, match_reasons, raw_payload)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb)
                        ON CONFLICT (drug_id, pmc_id) DO UPDATE
                        SET issn = EXCLUDED.issn,
                            title = EXCLUDED.title,
                            url = EXCLUDED.url,
                            if_score = EXCLUDED.if_score,
                            relevance_score = EXCLUDED.relevance_score,
                            match_reasons = EXCLUDED.match_reasons,
                            raw_payload = EXCLUDED.raw_payload,
                            inserted_at = NOW()
                        """,
                        (
                            drug_id,
                            pmc_id,
                            candidate.get("issn"),
                            candidate.get("title"),
                            candidate.get("url"),
                            candidate.get("if_score"),
                            candidate.get("relevance_score"),
                            json.dumps(candidate.get("match_reasons") or [], ensure_ascii=False),
                            json.dumps(candidate, ensure_ascii=False),
                        ),
                    )
                    upserted += 1

                data_quality_update = row.get("_data_quality") or {}
                data_quality_update["pmc_reference_count"] = len(candidates)
                data_quality_update["average_if_score"] = _compute_average_if(candidates)
                data_quality_update["ddi_source"] = _build_pmc_ddi_source(candidates)

                extraction_metadata_update = row.get("_extraction_metadata") or {}
                extraction_metadata_update["source_file"] = _build_pmc_source_file(candidates)

                cursor.execute(
                    """
                    UPDATE drugs
                    SET full_data = jsonb_set(
                        jsonb_set(
                            COALESCE(full_data, '{}'::jsonb),
                            '{_data_quality}',
                            COALESCE(full_data->'_data_quality', '{}'::jsonb) || %s::jsonb,
                            true
                        ),
                        '{_extraction_metadata}',
                        COALESCE(full_data->'_extraction_metadata', '{}'::jsonb) || %s::jsonb,
                        true
                    )
                    WHERE drug_id = %s
                    """,
                    (
                        json.dumps(data_quality_update, ensure_ascii=False),
                        json.dumps(extraction_metadata_update, ensure_ascii=False),
                        drug_id,
                    ),
                )
                updated_quality += cursor.rowcount

        conn.commit()

    summary = {
        "references_upserted": upserted,
        "quality_rows_updated": updated_quality,
    }
    logger.info("Reference sync complete: %s", summary)
    return summary

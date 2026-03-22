#!/usr/bin/env python3
from __future__ import annotations

import argparse
import glob
import json
import os
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_batch


WORKSPACE_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CHUNK_GLOB = "runs/reference_chunks/test_pmc_references_chunk_[0-9][0-9][0-9].json"
LEGACY_DDI_SOURCE = "plumbs_direct"
LEGACY_SOURCE_PREFIX = "plumbs_output/"
PMC_REFERENCE_PREFIX = "PMC references: "
NO_PMC_REFERENCE = "NO_PMC_REFERENCE"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Normalize legacy reference metadata in chunk files and drugs.full_data"
    )
    parser.add_argument(
        "--chunks",
        action="store_true",
        help="runs/reference_chunks JSON files의 legacy 메타데이터를 PMC 기반 값으로 치환",
    )
    parser.add_argument(
        "--db",
        action="store_true",
        help="drugs.full_data의 legacy 메타데이터를 drug_references 기준으로 치환",
    )
    parser.add_argument(
        "--chunk-glob",
        default=DEFAULT_CHUNK_GLOB,
        help="치환 대상 chunk 파일 glob 패턴",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="변경 예정 수만 계산하고 파일/DB에는 반영하지 않음",
    )
    args = parser.parse_args()
    if not args.chunks and not args.db:
        parser.error("최소 하나의 모드(--chunks 또는 --db)가 필요합니다.")
    return args


def get_db_url() -> str:
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


def normalize_pmc_id(value) -> str | None:
    if value is None:
        return None
    pmc_id = str(value).strip()
    if not pmc_id:
        return None
    return pmc_id if pmc_id.upper().startswith("PMC") else f"PMC{pmc_id}"


def build_pmc_source(values) -> str:
    pmc_ids: list[str] = []
    for value in values:
        pmc_id = normalize_pmc_id(value)
        if pmc_id and pmc_id not in pmc_ids:
            pmc_ids.append(pmc_id)
    return ", ".join(pmc_ids) if pmc_ids else NO_PMC_REFERENCE


def build_pmc_ddi_source(source_file: str) -> str:
    return source_file if source_file == NO_PMC_REFERENCE else f"{PMC_REFERENCE_PREFIX}{source_file}"


def needs_legacy_migration(data_quality: dict, extraction_metadata: dict) -> bool:
    ddi_source = data_quality.get("ddi_source")
    source_file = extraction_metadata.get("source_file")
    return ddi_source == LEGACY_DDI_SOURCE or (
        isinstance(source_file, str) and source_file.startswith(LEGACY_SOURCE_PREFIX)
    )


def select_reference_bucket(row: dict) -> list[dict]:
    sql_candidates = row.get("sql_candidates") or []
    if sql_candidates:
        return sql_candidates
    return row.get("accepted_references") or []


def migrate_chunk_row(row: dict) -> bool:
    data_quality = row.get("_data_quality") or {}
    extraction_metadata = row.get("_extraction_metadata") or {}
    if not needs_legacy_migration(data_quality, extraction_metadata):
        return False

    references = select_reference_bucket(row)
    source_file = build_pmc_source(reference.get("pmc_id") for reference in references)
    ddi_source = build_pmc_ddi_source(source_file)

    changed = False
    if data_quality.get("ddi_source") != ddi_source:
        data_quality["ddi_source"] = ddi_source
        row["_data_quality"] = data_quality
        changed = True
    if extraction_metadata.get("source_file") != source_file:
        extraction_metadata["source_file"] = source_file
        row["_extraction_metadata"] = extraction_metadata
        changed = True
    return changed


def resolve_chunk_paths(pattern: str) -> list[Path]:
    resolved_pattern = str(Path(pattern) if Path(pattern).is_absolute() else WORKSPACE_ROOT / pattern)
    return [Path(path_str) for path_str in sorted(glob.glob(resolved_pattern))]


def migrate_chunk_files(pattern: str, dry_run: bool) -> tuple[int, int]:
    file_paths = resolve_chunk_paths(pattern)
    changed_files = 0
    changed_rows = 0

    for file_path in file_paths:
        rows = json.loads(file_path.read_text(encoding="utf-8"))
        file_changed = 0
        for row in rows:
            if isinstance(row, dict) and migrate_chunk_row(row):
                file_changed += 1
        if file_changed:
            changed_files += 1
            changed_rows += file_changed
            if not dry_run:
                file_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    return changed_files, changed_rows


def migrate_database(dry_run: bool) -> tuple[int, int]:
    db_url = get_db_url()
    updated_rows = 0
    skipped_rows = 0

    with psycopg2.connect(db_url) as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    d.drug_id,
                    d.full_data,
                    COALESCE(
                        array_agg(r.pmc_id ORDER BY r.pmc_id) FILTER (WHERE r.pmc_id IS NOT NULL),
                        ARRAY[]::text[]
                    ) AS pmc_ids
                FROM drugs d
                LEFT JOIN drug_references r ON r.drug_id = d.drug_id
                GROUP BY d.drug_id, d.full_data
                """
            )
            rows = cursor.fetchall()

            updates: list[tuple[str, str]] = []
            for drug_id, full_data, pmc_ids in rows:
                if not isinstance(full_data, dict):
                    skipped_rows += 1
                    continue

                data_quality = full_data.get("_data_quality") or {}
                extraction_metadata = full_data.get("_extraction_metadata") or {}
                if not needs_legacy_migration(data_quality, extraction_metadata):
                    skipped_rows += 1
                    continue

                source_file = build_pmc_source(pmc_ids)
                ddi_source = build_pmc_ddi_source(source_file)

                changed = False
                if data_quality.get("ddi_source") != ddi_source:
                    data_quality["ddi_source"] = ddi_source
                    full_data["_data_quality"] = data_quality
                    changed = True
                if extraction_metadata.get("source_file") != source_file:
                    extraction_metadata["source_file"] = source_file
                    full_data["_extraction_metadata"] = extraction_metadata
                    changed = True

                if changed:
                    updates.append((json.dumps(full_data, ensure_ascii=False), drug_id))
                else:
                    skipped_rows += 1

            updated_rows = len(updates)
            if updates and not dry_run:
                execute_batch(
                    cursor,
                    "UPDATE drugs SET full_data = %s::jsonb WHERE drug_id = %s",
                    updates,
                    page_size=500,
                )

        if dry_run:
            conn.rollback()
        else:
            conn.commit()

    return updated_rows, skipped_rows


def main() -> None:
    args = parse_args()

    if args.chunks:
        changed_files, changed_rows = migrate_chunk_files(args.chunk_glob, args.dry_run)
        print(
            json.dumps(
                {
                    "mode": "chunks",
                    "dry_run": args.dry_run,
                    "changed_files": changed_files,
                    "changed_rows": changed_rows,
                    "chunk_glob": args.chunk_glob,
                },
                ensure_ascii=False,
            )
        )

    if args.db:
        updated_rows, skipped_rows = migrate_database(args.dry_run)
        print(
            json.dumps(
                {
                    "mode": "db",
                    "dry_run": args.dry_run,
                    "updated_rows": updated_rows,
                    "skipped_rows": skipped_rows,
                },
                ensure_ascii=False,
            )
        )


if __name__ == "__main__":
    main()
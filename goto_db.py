import json
import os
from pathlib import Path

import psycopg2

# 환경변수 우선순위: DB_INTERNAL_URL > DB_EXTERNAL_URL > DB_URL > DATABASE_URL
DB_URL = (
    os.getenv("DB_INTERNAL_URL")
    or os.getenv("DB_EXTERNAL_URL")
    or os.getenv("DB_URL")
    or os.getenv("DATABASE_URL")
)
DATA_DIR = Path(__file__).resolve().parent / "backend" / "data" / "converted"


def load_drugs_from_file(file_path: Path):
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


def iter_data_files(data_dir: Path):
    for pattern in ("*.json", "*.jsonl"):
        yield from sorted(data_dir.rglob(pattern))


def insert_drug_data():
    if not DB_URL:
        raise ValueError(
            "데이터베이스 URL이 필요합니다. "
            "DB_INTERNAL_URL 또는 DB_EXTERNAL_URL(대안: DB_URL, DATABASE_URL)을 설정하세요."
        )

    if not DATA_DIR.exists():
        raise FileNotFoundError(f"데이터 디렉터리를 찾을 수 없습니다: {DATA_DIR}")

    conn = None
    cursor = None

    try:
        print("DB에 접속 중입니다...")
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS drugs (
                drug_id TEXT PRIMARY KEY,
                name_ko TEXT,
                drug_class TEXT,
                full_data JSONB
            )
        """)
        print("테이블 세팅 완료.")

        cursor.execute("TRUNCATE TABLE drugs")
        print("기존 데이터 삭제 완료.")

        inserted_count = 0
        skipped_count = 0
        file_count = 0

        for file_path in iter_data_files(DATA_DIR):
            file_count += 1
            try:
                drugs_to_insert = load_drugs_from_file(file_path)
            except Exception as error:
                skipped_count += 1
                print(f"⚠️ 파일 건너뜀: {file_path} ({error})")
                continue

            for drug in drugs_to_insert:
                drug_id = drug.get("id")
                if not drug_id:
                    skipped_count += 1
                    print(f"⚠️ id 없음: {file_path}")
                    continue

                identity = drug.get("drug_identity") or {}
                name_ko = identity.get("name_ko", "알 수 없음")
                drug_class = identity.get("class", "알 수 없음")

                cursor.execute("""
                    INSERT INTO drugs (drug_id, name_ko, drug_class, full_data)
                    VALUES (%s, %s, %s, %s)
                """, (drug_id, name_ko, drug_class, json.dumps(drug, ensure_ascii=False)))
                inserted_count += 1

            print(f"✅ 처리 완료: {file_path}")

        conn.commit()
        print(f"🎉 완료: 파일 {file_count}개 처리, 레코드 {inserted_count}건 insert, {skipped_count}건 건너뜀")

    except Exception as error:
        print(f"❌ 오류가 발생했습니다: {error}")
        if conn is not None:
            conn.rollback()
        raise
    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()


if __name__ == "__main__":
    insert_drug_data()
from argparse import ArgumentParser
from pathlib import Path
from backend.services.drug_sync import DEFAULT_REFERENCE_RESULT_PATH, sync_drug_data, sync_reference_results


def insert_drug_data():
    summary = sync_drug_data()
    print(
        "🎉 완료: 파일 {files_processed}개 처리, 레코드 {records_upserted}건 insert, {records_skipped}건 건너뜀".format(
            **summary
        )
    )


def inject_reference_results(result_path: Path):
    summary = sync_reference_results(result_path)
    print(
        "✅ 완료: 레퍼런스 upsert {references_upserted}건, data_quality 갱신 {quality_rows_updated}건".format(
            **summary
        )
    )


def build_arg_parser():
    parser = ArgumentParser(description="NuvoVet DB data loader")
    parser.add_argument(
        "--mode",
        choices=["drugs", "references"],
        default="drugs",
        help="drugs: converted 데이터를 drugs 테이블에 적재, references: 결과 JSON을 drug_references에 주입",
    )
    parser.add_argument(
        "--result-json",
        default=str(DEFAULT_REFERENCE_RESULT_PATH),
        help="references 모드에서 사용할 결과 JSON 경로",
    )
    return parser


if __name__ == "__main__":
    args = build_arg_parser().parse_args()
    if args.mode == "drugs":
        insert_drug_data()
    else:
        inject_reference_results(Path(args.result_json))
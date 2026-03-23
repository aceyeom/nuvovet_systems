#!/usr/bin/env bash
# =============================================================================
# run_all_references.sh
# 670개 약물 전체 PMC reference 수집 + DB 주입 자동화 스크립트
# 실행: bash run_all_references.sh
# 로그: runs/logs/chunk_NNN.log (청크별), runs/run_all.log (요약)
# =============================================================================

export PYTHONUNBUFFERED=1
PYTHON_BIN="${PYTHON_BIN:-python3}"
PYTHON="${PYTHON_BIN} -u"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHUNK_DIR="${SCRIPT_DIR}/runs/reference_chunks"
LOG_DIR="${SCRIPT_DIR}/runs/logs"
DB_URL="postgresql://vet_dur_db_user:2jhrnPgCUtUwBj2Vj7fSNtRgIozFTlBd@dpg-d6uhkn1j16oc73fu899g-a.oregon-postgres.render.com/vet_dur_db"

mkdir -p "${CHUNK_DIR}" "${LOG_DIR}"

export DB_EXTERNAL_URL="${DB_URL}"

CHUNK_SIZE=50
TOTAL=670
FAILED_CHUNKS=()

echo "============================================================"
echo " NuvoVet 전체 reference 수집 시작"
echo " 총 ${TOTAL}개 약물 / 청크 크기 ${CHUNK_SIZE}"
echo " Python 인터프리터: ${PYTHON_BIN}"
echo " 시작 시각: $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================================"

chunk_idx=0
offset=0

while [ "${offset}" -lt "${TOTAL}" ]; do
    chunk_tag=$(printf "chunk_%03d" "${chunk_idx}")
    out_json="${CHUNK_DIR}/${chunk_tag}.json"
    out_log="${LOG_DIR}/${chunk_tag}.log"

    # 이미 처리된 청크는 건너뜀 (재시작 안전장치)
    if [ -f "${out_json}" ]; then
        echo ""
        echo "[${chunk_tag}] 기존 파일 존재 → DB 주입만 수행"
    else
        echo ""
        echo "──────────────────────────────────────────────────────"
        echo "[${chunk_tag}] 수집 시작: offset=${offset} limit=${CHUNK_SIZE}  $(date '+%H:%M:%S')"
        echo "──────────────────────────────────────────────────────"

        ${PYTHON} "${SCRIPT_DIR}/실험실.py" \
            --all \
            --offset "${offset}" \
            --limit "${CHUNK_SIZE}" \
            --output-prefix "${CHUNK_DIR}/${chunk_tag}" \
            > "${out_log}" 2>&1
        collect_exit=$?

        # 로그 마지막 5줄을 메인 출력에 표시
        tail -5 "${out_log}"

        if [ "${collect_exit}" -ne 0 ]; then
            echo "⚠️  [${chunk_tag}] 수집 오류(exit=${collect_exit}). 건너뜀."
            FAILED_CHUNKS+=("${chunk_tag}_collect")
            offset=$(( offset + CHUNK_SIZE ))
            chunk_idx=$(( chunk_idx + 1 ))
            continue
        fi

        echo "[${chunk_tag}] 수집 완료  $(date '+%H:%M:%S')"
    fi

    # DB 주입
    echo "[${chunk_tag}] DB 주입 중..."
    ${PYTHON} "${SCRIPT_DIR}/goto_db.py" \
        --mode references \
        --result-json "${out_json}"
    db_exit=$?

    if [ "${db_exit}" -ne 0 ]; then
        echo "⚠️  [${chunk_tag}] DB 주입 실패(exit=${db_exit})"
        FAILED_CHUNKS+=("${chunk_tag}_db")
    else
        echo "✅ [${chunk_tag}] DB 주입 완료"
    fi

    offset=$(( offset + CHUNK_SIZE ))
    chunk_idx=$(( chunk_idx + 1 ))

    # NCBI rate-limit 보호
    sleep 2
done

echo ""
echo "============================================================"
echo " 전체 실행 완료: $(date '+%Y-%m-%d %H:%M:%S')"
if [ ${#FAILED_CHUNKS[@]} -gt 0 ]; then
    echo " ⚠️  실패 청크: ${FAILED_CHUNKS[*]}"
else
    echo " ✅ 모든 청크 성공"
fi
echo "============================================================"

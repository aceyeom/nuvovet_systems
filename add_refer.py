import os
import json
import time
import requests
from Bio import Entrez

# --- [기본 설정] ---
Entrez.email = "donghyun040720@gmail.com"  # NCBI 정책상 이메일 필수
INPUT_DIR = "backend/data/converted"
OUTPUT_DIR = "backend/data/enriched" 

def get_fda_drug_interactions(drug_name):
    """
    openFDA API를 호출하여 약물의 공식 상호작용(Drug Interactions) 텍스트를 가져옵니다.
    """
    # 일반명(generic_name) 기준으로 검색
    url = f'https://api.fda.gov/drug/label.json?search=openfda.generic_name:"{drug_name}"&limit=1'
    
    try:
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            results = data.get('results', [])
            
            # FDA 라벨 내에 'drug_interactions' 섹션이 있는지 확인
            if results and 'drug_interactions' in results[0]:
                interaction_text = results[0]['drug_interactions'][0]
                # 텍스트가 너무 길 경우를 대비해 앞부분만 요약하거나 그대로 반환할 수 있습니다.
                return interaction_text
            else:
                return "FDA 라벨 내에 명시된 상호작용(Drug Interactions) 섹션이 없습니다."
        elif response.status_code == 404:
            return "openFDA에서 해당 약물을 찾을 수 없습니다."
        else:
            return f"FDA API 검색 실패 (상태 코드: {response.status_code})"
            
    except Exception as e:
        print(f"  [오류] FDA API 호출 실패: {e}")
        return "FDA API 에러"

def get_pmc_general_sources(drug_name):
    """
    해당 약물에 대한 전반적인 수의학(개/고양이) 논문 레퍼런스를 PMC에서 검색합니다.
    """
    try:
        query = f'"{drug_name}" AND (dog OR canine OR cat OR feline) AND (pharmacokinetics OR "drug interaction" OR safety)'
        
        handle = Entrez.esearch(db="pmc", term=query, retmax=3)
        record = Entrez.read(handle)
        handle.close()

        pmc_ids = record["IdList"]
        references = []

        if not pmc_ids:
            return "수의학 관련 PMC 레퍼런스를 찾을 수 없습니다."

        ids_str = ",".join(pmc_ids)
        handle = Entrez.esummary(db="pmc", id=ids_str)
        summary_records = Entrez.read(handle)
        handle.close()

        for i, summary in enumerate(summary_records, 1):
            title = summary.get("Title", "Title Not Found")
            pmc_id = summary.get("Id", "")
            
            if pmc_id:
                formatted_id = f"PMC{pmc_id}" if not pmc_id.startswith("PMC") else pmc_id
                url = f"https://www.ncbi.nlm.nih.gov/pmc/articles/{formatted_id}/"
            else:
                url = "URL Not Found"

            references.append(f"[{i}] {title} ({url})")

        return "\n".join(references)

    except Exception as e:
        print(f"  [오류] PMC 검색 실패: {e}")
        return f"PMC 에러: {str(e)}"

def process_and_enrich_data():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    for root, dirs, files in os.walk(INPUT_DIR):
        for file in files:
            if not (file.endswith(".json") or file.endswith(".jsonl")):
                continue
                
            input_path = os.path.join(root, file)
            rel_path = os.path.relpath(root, INPUT_DIR)
            output_folder = os.path.join(OUTPUT_DIR, rel_path)
            
            if not os.path.exists(output_folder):
                os.makedirs(output_folder)
                
            output_path = os.path.join(output_folder, file)

            print(f"\n▶ 처리 중: {file}")
            
            try:
                with open(input_path, 'r', encoding='utf-8') as f:
                    data = json.load(f) 
                
                drug_name = data.get("drug_identity", {}).get("name_en", "")
                
                if not drug_name:
                    print("  [스킵] 약물 영문 이름을 찾을 수 없습니다.")
                    continue

                print(f"  [{drug_name}] openFDA 및 PMC 데이터 수집 중...")
                time.sleep(1) # API Rate Limit 방지 (FDA API는 키 없이 분당 40회 제한)
                
                # 1. openFDA 데이터 추출
                fda_interaction_data = get_fda_drug_interactions(drug_name)
                
                # 2. PMC 논문 검색 결과 가져오기
                pmc_sources_str = get_pmc_general_sources(drug_name)
                
                # 3. 데이터 주입 (FDA)
                if "_fda_data" not in data:
                    data["_fda_data"] = {}
                data["_fda_data"]["official_interactions"] = fda_interaction_data
                data["_data_quality"]["ddi_source"] = "openFDA API (Drug Labels)"
                print("  -> openFDA 상호작용 데이터 주입 완료")

                # 4. 데이터 주입 (PMC)
                if "_extraction_metadata" not in data:
                    data["_extraction_metadata"] = {}
                data["_extraction_metadata"]["source_file"] = pmc_sources_str
                print("  -> PMC 수의학 레퍼런스 주입 완료")

                # 결과 저장
                with open(output_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)

            except Exception as e:
                print(f"  [에러] 파일 처리 실패 ({input_path}): {e}")

if __name__ == "__main__":
    print("=== openFDA & PMC 데이터 통합 파이프라인 시작 ===")
    process_and_enrich_data()
    print("\n=== 모든 작업이 완료되었습니다. ===")
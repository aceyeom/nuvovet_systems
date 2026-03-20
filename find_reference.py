import os
from Bio import Entrez
import time

# --- [설정 세션] ---
# NCBI E-utilities 사용을 위해 이메일을 반드시 입력해야 합니다.
# 실제 이메일 주소로 변경해 주세요. (NCBI 정책)
Entrez.email = "donghyun040720@gmail.com" 

# 테스트할 약물 리스트 (10개)
test_drugs = [
    "Ketoconazole", "Aspirin", "Metformin", "Prednisone", 
    "Amoxicillin", "Gabapentin", "Tramadol", "Famotidine", 
    "Clavulanic acid", "Insulin"
]
#Clavulanic acid는 Amoxicillin과 함께 사용되는 β-lactamase 억제제입니다. DDI 연구에서 종종 Amoxicillin과 함께 언급됩니다.
# 출력 파일 이름
output_filename = "test_pmc_references.txt"
# --- ---------------- ---

def get_pmc_references(drug_name):
    """
    PMC에서 약물 이름에 대한 DDI(개/고양이) 관련 논문을 검색하여 제목과 URL을 가져옵니다.
    """
    try:
        # 1. 맞춤형 쿼리 생성
        query = f'"{drug_name}" AND ("drug interaction" OR DDI) AND (dog OR dogs OR canine OR cat OR cats OR feline)'
        
        # 2. Esearch: PMCID 검색
        # retmax=2: 상위 2개만 가져옵니다.
        handle = Entrez.esearch(db="pmc", term=query, retmax=2)
        record = Entrez.read(handle)
        handle.close()

        pmc_ids = record["IdList"]
        references = []

        if not pmc_ids:
            return [] # 검색 결과가 없는 경우

        # 3. Esummary: PMCID로 논문 제목 가져오기
        ids_str = ",".join(pmc_ids)
        handle = Entrez.esummary(db="pmc", id=ids_str)
        summary_records = Entrez.read(handle)
        handle.close()

        for summary in summary_records:
            title = summary.get("Title", "Title Not Found")
            pmc_id = summary.get("ArticleId", {}).get("pmc", "")
            
            # URL 생성
            if pmc_id:
                url = f"https://www.ncbi.nlm.nih.gov/pmc/articles/{pmc_id}/"
            else:
                url = "URL Not Found"

            references.append({"title": title, "url": url})

        return references

    except Exception as e:
        print(f"Error fetching data for {drug_name}: {e}")
        return []

def main():
    print("PMC 레퍼런스 수집 테스트를 시작합니다...")
    
    with open(output_filename, "w", encoding="utf-8") as f:
        f.write("--- PMC 레퍼런스 수집 테스트 결과 ---\n\n")

        for drug in test_drugs:
            print(f"[{drug}] 검색 중...")
            
            # API 호출 (API 키 없으므로 초당 3회 미만 유지 위해 약간의 대기)
            time.sleep(0.5) 
            
            refs = get_pmc_references(drug)

            f.write(f"■ Drug Name: {drug}\n")
            if not refs:
                f.write("  -> 검색된 레퍼런스가 없습니다.\n")
            else:
                for i, ref in enumerate(refs, 1):
                    f.write(f"  [{i}] Title: {ref['title']}\n")
                    f.write(f"     URL: {ref['url']}\n")
            f.write("-" * 30 + "\n\n")

    print(f"\n테스트가 완료되었습니다. '{output_filename}' 파일을 확인해 주세요.")

if __name__ == "__main__":
    main()
import fitz  # PyMuPDF
import json
import re
from pathlib import Path

# 1. 트리거 문구 (References...)
TRIGGER_PATTERN = re.compile(r'References\s*For the complete list of references, see wiley\.com/go/budde/plumb', re.IGNORECASE)

# 2. 발음 기호 정규식
PRONUNCIATION_PATTERN = re.compile(r'^\s*\([a-z]+-[a-z\-\s]+\)', re.IGNORECASE | re.MULTILINE)

# 3. 목차 키워드 리스트
SECTIONS_KEYWORDS = [
    "Uses/Indications", "Pharmacology/Actions", "Pharmacokinetics", 
    "Contraindications/Precautions/Warnings", "Adverse Effects", 
    "Reproductive/Nursing Safety", "Overdose/Acute Toxicity", 
    "Drug Interactions", "Laboratory Considerations", "Dosages", 
    "Monitoring", "Client Information", "Chemistry/Synonyms", 
    "Storage/Stability", "Compatibility/Compounding Considerations", 
    "Dosage Forms/Regulatory Status", "References"
]

def parse_into_sections(raw_text):
    """
    '### 목차' 마커를 기준으로 텍스트를 딕셔너리로 분할하는 함수
    """
    sections_dict = {}
    
    # '### '로 시작하는 부분을 기준으로 텍스트 분할
    # 정규식 캡처 그룹 '()'을 사용하여 구분자(목차 이름)도 결과 리스트에 포함되게 함
    parts = re.split(r'\n+###\s+([A-Za-z0-9\s/]+)\n+', raw_text)
    
    # 첫 번째 덩어리는 보통 첫 목차가 나오기 전의 서론(Intro) 및 발음기호/분류 등입니다.
    intro_text = parts[0].strip()
    if intro_text:
        sections_dict["General Information"] = intro_text
        
    # parts 리스트는 [내용, 목차1, 목차1_내용, 목차2, 목차2_내용...] 형태가 됩니다.
    for i in range(1, len(parts), 2):
        sec_name = parts[i].strip()
        sec_content = parts[i+1].strip() if (i+1) < len(parts) else ""
        sections_dict[sec_name] = sec_content
        
    return sections_dict

def extract_data_from_pdf(pdf_path):
    results = []
    full_text_blocks = []
    
    try:
        doc = fitz.open(pdf_path)
        for page in doc:
            page_content = page.get_text("text") or ""
            
            # 표(Table) 추출 및 표준 마크다운 형식으로 변환 (LLM 인식률 극대화)
            tabs = page.find_tables()
            if tabs and tabs.tables:
                for tab in tabs.tables:
                    parsed_table = tab.extract()
                    if not parsed_table: continue
                    
                    # 마크다운 표 헤더 생성
                    headers = parsed_table[0]
                    col_count = len(headers)
                    markdown_separator = "|" + "|".join(["---"] * col_count) + "|"
                    
                    # 행 데이터 조립
                    table_rows = []
                    for row in parsed_table:
                        safe_row = [str(cell).replace('\n', ' ') if cell else "" for cell in row]
                        table_rows.append("| " + " | ".join(safe_row) + " |")
                    
                    # 최종 마크다운 표 삽입
                    table_str = "\n" + table_rows[0] + "\n" + markdown_separator + "\n" + "\n".join(table_rows[1:]) + "\n"
                    page_content += f"\n\n[TABLE_START]\n{table_str}\n[TABLE_END]\n"
                    
            full_text_blocks.append(page_content)
            
        doc.close()
        
    except Exception as e:
        print(f"  [오류] '{pdf_path.name}' 파일을 읽는 중 문제 발생: {e}")
        return []

    all_text = "\n".join(full_text_blocks)
    blocks = TRIGGER_PATTERN.split(all_text)

    for block in blocks:
        block = block.strip()
        if not block: continue

        match = PRONUNCIATION_PATTERN.search(block)
        if match:
            # 발음 기호 이전의 텍스트를 줄바꿈 기준으로 나눔
            pre_text = block[:match.start()].strip()
            lines = [line.strip() for line in pre_text.split('\n') if line.strip()]
            
            # 단독으로 존재하는 숫자(페이지 번호) 제거
            lines = [line for line in lines if not line.isdigit()]
            
            if lines:
                # 💡 핵심 1: 가장 첫 번째 줄을 '진짜 성분명'으로 확정
                ingredient = lines[0]
                
                # 💡 핵심 2: 성분명과 발음 기호 사이에 있던 약어(예: NAC, ACC) 살리기
                raw_content_start = block[match.start():].strip()
                if len(lines) > 1:
                    extra_synonyms = "\n".join(lines[1:])
                    # 약어들을 발음 기호 위로 다시 합쳐서 General Information에 들어가게 함
                    raw_content = f"{extra_synonyms}\n\n{raw_content_start}"
                else:
                    raw_content = raw_content_start
            else:
                ingredient = "Unknown"
                raw_content = block[match.start():].strip()
            
            # 페이지 헤더/푸터 잡음 제거 (기존과 동일)
            header_pattern = re.compile(rf'^\s*(\d+\s+{re.escape(ingredient)}|{re.escape(ingredient)}\s+\d+)\s*$', re.IGNORECASE | re.MULTILINE)
            raw_content = header_pattern.sub('', raw_content)
            
            # 목차 키워드를 ### 마커로 변환 (기존과 동일)
            for kw in SECTIONS_KEYWORDS:
                raw_content = re.sub(rf'^\s*{re.escape(kw)}\s*$', f"\n\n### {kw}\n\n", raw_content, flags=re.MULTILINE)

            raw_content = re.sub(r'\n{3,}', '\n\n', raw_content).strip()

            # 텍스트를 파싱하여 Dictionary로 변환
            structured_sections = parse_into_sections(raw_content)

            # JSON 저장용 객체 조립
            results.append({
                "ingredient": ingredient,
                "source_file": pdf_path.name,
                "sections": structured_sections
            })

    return results

def process_directory(input_dir, output_file):
    base_dir = Path(input_dir)
    if not base_dir.exists() or not base_dir.is_dir():
        print(f"경로를 찾을 수 없습니다: {base_dir.resolve()}")
        return
        
    pdf_files = list(base_dir.rglob('*.pdf'))
    print(f"총 {len(pdf_files)}개의 PDF 파일을 구조화합니다...\n")
    
    all_data = []
    for i, pdf_path in enumerate(pdf_files, 1):
        print(f"[{i}/{len(pdf_files)}] {pdf_path.name} 처리 중...")
        all_data.extend(extract_data_from_pdf(pdf_path))
        
    with open(output_file, 'w', encoding='utf-8') as f:
        for entry in all_data:
            f.write(json.dumps(entry, ensure_ascii=False) + '\n')
            
    print(f"\n✅ 완료! 총 {len(all_data)}개의 약물이 '{output_file}'에 구조화되어 저장되었습니다.")

# ----------------- 실행부 -----------------
INPUT_FOLDER = "tt"
OUTPUT_JSONL = "4.pdf_data_structure.jsonl"
process_directory(INPUT_FOLDER, OUTPUT_JSONL)
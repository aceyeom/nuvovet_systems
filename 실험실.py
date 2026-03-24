import csv
import json
import os
import random
import re
import time
import xml.etree.ElementTree as ET
from argparse import ArgumentParser
from pathlib import Path

import requests

try:
    from anthropic import Anthropic
except ImportError:
    Anthropic = None
    print("⚠️ [경고] anthropic 패키지가 설치되지 않았습니다. 'pip install anthropic'을 실행하세요.")

# --- [설정 세션] ---
NCBI_EMAIL = "donghyun040720@gmail.com"
NCBI_TOOL = "nuvovet_reference_sampler"
NCBI_EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"

# [핵심] Claude API 키 설정
CLAUDE_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
CLAUDE_MODEL_CANDIDATES = [
    "claude-haiku-4-5-20251001",
    "claude-sonnet-4-20250514",
]
CLAUDE_STRICT_MODE = os.environ.get("CLAUDE_STRICT_MODE", "0") == "1"

DATA_DIR = Path(__file__).resolve().parent / "backend" / "data" / "converted"
JCR_CSV_PATH = Path(__file__).resolve().parent / "2025JCRIMPACTFACTORS.csv"
SCIMAGO_CSV_PATH = Path(__file__).resolve().parent / "scimagojr 2024.csv"
TEXT_OUTPUT_FILENAME = "test_pmc_references.txt"
JSON_OUTPUT_FILENAME = "test_pmc_references.json"
# 기본 샘플 수를 늘려 한 번에 더 많은 약물을 점검
RANDOM_SAMPLE_SIZE = int(os.environ.get("RANDOM_SAMPLE_SIZE", "30"))
SEARCH_CANDIDATE_COUNT = int(os.environ.get("SEARCH_CANDIDATE_COUNT", "20"))
SELECT_REFERENCE_COUNT = 2
API_DELAY_SECONDS = 0.5
REQUEST_TIMEOUT_SECONDS = 20
JCR_METRIC_YEAR = "2025"
SCIMAGO_METRIC_YEAR = "2024"

# Anthropic 클라이언트 초기화 및 알림
if Anthropic and CLAUDE_API_KEY:
    claude_client = Anthropic(api_key=CLAUDE_API_KEY)
    print("✅ Claude API 키가 정상적으로 인식되었습니다. LLM 검증을 활성화합니다.")
else:
    claude_client = None
    print("⚠️ [경고] Claude API 키를 찾을 수 없습니다. LLM 검증 단계가 모두 통과(Pass) 처리됩니다.")

claude_active_model = None
claude_disabled = False

DOG_CAT_SPECIES_TERMS = {"dog", "dogs", "canine", "cat", "cats", "feline"}
DIRECT_RELEVANCE_TERMS = {"pharmacokinetic", "pharmacokinetics", "pharmacodynamic", "pharmacology", "bioavailability", "absorption", "distribution", "metabolism", "excretion", "clearance", "half-life", "dosage", "dose", "dosing", "efficacy", "safety", "toxicity", "adverse", "contraindication", "warning", "drug interaction", "interaction", "treatment", "label", "approved", "nada", "package insert"}
FDA_SIGNAL_TERMS = {"label", "approved", "nada", "package insert"}
DDI_SIGNAL_TERMS = {"drug interaction", "interaction", "cytochrome", "cyp"}
SOLVENT_EXCLUSION_TERMS = {"vehicle control", "used as vehicle", "vehicle-treated", "solvent", "solvents", "excipient", "reagent", "stock solution", "dissolved in", "diluted in dmso", "containing 2% dimethyl sulfoxide"}
METHOD_EXCLUSION_TERMS = {"transcriptome", "dataset", "screening", "organoid", "cell line", "metabolomics", "proteomics", "rna-seq", "high-throughput", "acute myeloid leukemia", "cell signatures"}


# --- [유틸리티 및 저널 메트릭 함수] ---
def normalize_text(text: str) -> str: return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()
def normalize_issn(issn: str) -> str: return re.sub(r"[^0-9Xx]+", "", str(issn or "").upper())
def split_issns(raw_issn_field: str): return [normalized for part in str(raw_issn_field or "").split(",") if (normalized := normalize_issn(part))]

def load_scimago_metrics(csv_path: Path):
    by_issn, by_title = {}, {}
    if not csv_path.exists(): return {"by_issn": by_issn, "by_title": by_title}
    with csv_path.open("r", encoding="utf-8-sig", newline="") as file_obj:
        reader = csv.DictReader(file_obj, delimiter=";")
        for row in reader:
            title = (row.get("Title") or "").strip()
            normalized_title = normalize_text(title)
            issns = split_issns(row.get("Issn", ""))
            metric_record = {"journal_title": title, "sjr": (row.get("SJR") or "").strip(), "sjr_best_quartile": (row.get("SJR Best Quartile") or "").strip(), "h_index": (row.get("H index") or "").strip(), "metric_year": SCIMAGO_METRIC_YEAR}
            if normalized_title and normalized_title not in by_title: by_title[normalized_title] = metric_record
            for issn in issns: by_issn.setdefault(issn, metric_record)
    return {"by_issn": by_issn, "by_title": by_title}

def load_jcr_metrics(csv_path: Path):
    by_issn, by_title = {}, {}
    if not csv_path.exists(): return {"by_issn": by_issn, "by_title": by_title}
    with csv_path.open("r", encoding="utf-8-sig", newline="") as file_obj:
        reader = csv.DictReader(file_obj)
        for row in reader:
            journal_name = (row.get("Journal Name") or "").strip()
            abbreviated_journal = (row.get("Abbreviated Journal") or "").strip()
            issns = sorted(value for value in {normalize_issn(str(row.get("ISSN") or "")), normalize_issn(str(row.get("eISSN") or ""))} if value and value != "NA")
            metric_record = {
                "journal_title": journal_name, "abbreviated_journal": abbreviated_journal, "issns": issns,
                "jif": (row.get("JIF") or "").strip(), "five_year_jif": (row.get("5-Year JIF") or "").strip(),
                "jif_quartile": (row.get("JIF Quartile") or "").strip(), "jci": (row.get("JCI") or "").strip(),
                "metric_year": JCR_METRIC_YEAR, "metric_source": "Journal Citation Reports"
            }
            for title_variant in (journal_name, abbreviated_journal):
                normalized_title = normalize_text(title_variant)
                if normalized_title and normalized_title not in by_title: by_title[normalized_title] = metric_record
            for issn in issns: by_issn.setdefault(issn, metric_record)
    return {"by_issn": by_issn, "by_title": by_title}

JCR_METRICS_INDEX = load_jcr_metrics(JCR_CSV_PATH)
SCIMAGO_METRICS_INDEX = load_scimago_metrics(SCIMAGO_CSV_PATH)

def build_journal_metrics(journal_title: str, journal_issns):
    jcr_metrics, scimago_metrics = None, None
    for issn in journal_issns or []:
        normalized_issn = normalize_issn(issn)
        if not jcr_metrics: jcr_metrics = JCR_METRICS_INDEX["by_issn"].get(normalized_issn)
        if not scimago_metrics: scimago_metrics = SCIMAGO_METRICS_INDEX["by_issn"].get(normalized_issn)
    
    normalized_title = normalize_text(journal_title)
    if not jcr_metrics and normalized_title: jcr_metrics = JCR_METRICS_INDEX["by_title"].get(normalized_title)
    if not scimago_metrics and normalized_title: scimago_metrics = SCIMAGO_METRICS_INDEX["by_title"].get(normalized_title)

    if not (jcr_metrics or scimago_metrics): return None

    metric_summary = {"jcr": jcr_metrics, "scimago": scimago_metrics}
    if jcr_metrics:
        metric_summary.update({"impact_factor": jcr_metrics.get("jif"), "impact_factor_5year": jcr_metrics.get("five_year_jif"), "impact_factor_quartile": jcr_metrics.get("jif_quartile"), "journal_citation_indicator": jcr_metrics.get("jci")})
    if scimago_metrics:
        metric_summary.update({"sjr": scimago_metrics.get("sjr"), "sjr_best_quartile": scimago_metrics.get("sjr_best_quartile"), "h_index": scimago_metrics.get("h_index")})
    return metric_summary

def parse_float(value):
    try: return float(str(value).replace(",", "").strip())
    except (TypeError, ValueError): return None

def derive_if_score(journal_metrics: dict):
    if not journal_metrics: return None
    jif = parse_float(journal_metrics.get("impact_factor"))
    return jif if jif is not None else parse_float(journal_metrics.get("sjr"))

def build_sql_candidate(reference: dict):
    journal_issns = reference.get("journal_issns") or []
    return {
        "pmc_id": reference.get("pmc_id"), "issn": journal_issns[0] if journal_issns else None,
        "title": reference.get("title"), "url": reference.get("url"),
        "if_score": derive_if_score(reference.get("journal_metrics")),
        "relevance_score": reference.get("score"), "match_reasons": reference.get("reasons") or [],
        "journal_title": reference.get("journal_title"), "journal_issns": journal_issns,
        "journal_metrics": reference.get("journal_metrics") or {},
        "ddi_relevant": bool(reference.get("ddi_relevant")), "fda_relevant": bool(reference.get("fda_relevant")),
        "llm_invalid": bool(reference.get("llm_invalid", False)),
    }

# --- [텍스트 매칭 유틸리티] ---
def contains_normalized_term(normalized_text: str, term: str) -> bool:
    if not normalized_text or not (normalized_term := normalize_text(term)): return False
    return re.search(rf"(?:^|\s){re.escape(normalized_term)}(?:\s|$)", normalized_text) is not None

def collect_matching_terms(normalized_text: str, terms): return sorted(term for term in terms if contains_normalized_term(normalized_text, term))

def collect_species_hits(text: str, terms):
    hits = []
    for term in sorted(terms):
        for match in re.finditer(rf"(?<![A-Za-z]){re.escape(term)}(?![A-Za-z])", text, re.IGNORECASE):
            if match.group(0).isupper() and len(match.group(0)) > 1: continue
            hits.append(term)
            break
    return hits

def prettify_drug_name(stem: str) -> str: return " ".join(stem.replace("__", ", ").replace("_", " ").strip().split()).title()

def build_drug_aliases(drug_name: str):
    aliases = {drug_name}
    cleaned = re.sub(r"\b(systemic|ophthalmic|topical|otic)\b", "", drug_name.lower())
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" ,")
    if cleaned: aliases.add(cleaned)
    if primary := cleaned.split(",")[0].strip(): aliases.add(primary)
    return sorted(normalize_text(alias) for alias in aliases if alias.strip())

def iter_drug_records():
    for file_path in sorted(DATA_DIR.rglob("*.jsonl")):
        # ophthalmic을 무조건 건너뛰던 기존 로직 삭제 (점안제도 검색 시도)
        yield {"name": prettify_drug_name(file_path.stem), "file_path": file_path}

def load_drug_payload(file_path: Path):
    with file_path.open("r", encoding="utf-8") as file_obj: return json.load(file_obj)

# --- [약물 분류 및 동적 쿼리 빌더 (HYBRID 적용)] ---
def get_ingredients(drug_name: str):
    """복합제 이름 분리 및 제형 키워드 제거"""
    clean_name = re.sub(r"_(ophthalmic|topical|otic|oral|injectable|systemic|intravenous|transdermal)", "", drug_name.lower())
    return [i.strip() for i in re.split(r"[_/]", clean_name) if i.strip()]

def is_topical_drug(drug_name: str) -> bool:
    return any(term in drug_name.lower() for term in ["ophthalmic", "topical", "otic", "lubricant", "stain", "irrigating"])

def build_dynamic_query(drug_name: str) -> str:
    ingredients = get_ingredients(drug_name)
    is_topical = is_topical_drug(drug_name)
    
    # 성분 OR 묶음
    drug_queries = [f'("{ing}"[Title/Abstract] OR "{ing}"[Name of Substance])' for ing in ingredients]
    drug_block = f"({' OR '.join(drug_queries)})"
    
    species_block = '("Dogs"[Mesh] OR "Cats"[Mesh] OR dog[Title/Abstract] OR dogs[Title/Abstract] OR canine[Title/Abstract] OR cat[Title/Abstract] OR cats[Title/Abstract] OR feline[Title/Abstract])'
    
    # 국소 제제 vs 전신 제제 분리
    if is_topical:
        relevance_block = '(corneal[Title/Abstract] OR ocular[Title/Abstract] OR intraocular[Title/Abstract] OR eye[Title/Abstract] OR topical[Title/Abstract] OR "adverse effects"[Title/Abstract])'
    else:
        relevance_block = '("Pharmacokinetics"[Mesh] OR "Drug Interactions"[Mesh] OR "Toxicity"[Mesh] OR pharmacokinetic*[Title/Abstract] OR pharmacology[Title/Abstract] OR metabolism[Title/Abstract] OR clearance[Title/Abstract] OR "half-life"[Title/Abstract] OR bioavailability[Title/Abstract] OR dosage[Title/Abstract] OR dosing[Title/Abstract] OR safety[Title/Abstract] OR toxicity[Title/Abstract] OR adverse[Title/Abstract] OR contraindication*[Title/Abstract] OR "drug interaction"[Title/Abstract] OR efficacy[Title/Abstract] OR label[Title/Abstract] OR approved[Title/Abstract])'
    
    exclusion_block = '("In Vitro Techniques"[Mesh] OR "vehicle control"[Title/Abstract] OR solvent[Title/Abstract] OR solvents[Title/Abstract] OR excipient[Title/Abstract] OR reagent[Title/Abstract] OR transcriptome[Title/Abstract] OR dataset[Title/Abstract] OR "cell line"[Title/Abstract] OR organoid[Title/Abstract] OR screening[Title/Abstract])'
    
    return f"{drug_block} AND {species_block} AND {relevance_block} NOT {exclusion_block}"


def build_species_relaxed_query(drug_name: str) -> str:
    ingredients = get_ingredients(drug_name)
    drug_queries = [f'("{ing}"[Title/Abstract] OR "{ing}"[Name of Substance])' for ing in ingredients]
    drug_block = f"({' OR '.join(drug_queries)})"
    relevance_block = '("Pharmacokinetics"[Mesh] OR "Drug Interactions"[Mesh] OR "Toxicity"[Mesh] OR pharmacokinetic*[Title/Abstract] OR pharmacology[Title/Abstract] OR metabolism[Title/Abstract] OR clearance[Title/Abstract] OR "half-life"[Title/Abstract] OR bioavailability[Title/Abstract] OR dosage[Title/Abstract] OR dosing[Title/Abstract] OR safety[Title/Abstract] OR toxicity[Title/Abstract] OR adverse[Title/Abstract] OR contraindication*[Title/Abstract] OR "drug interaction"[Title/Abstract] OR efficacy[Title/Abstract] OR label[Title/Abstract] OR approved[Title/Abstract])'
    exclusion_block = '("In Vitro Techniques"[Mesh] OR "vehicle control"[Title/Abstract] OR solvent[Title/Abstract] OR solvents[Title/Abstract] OR excipient[Title/Abstract] OR reagent[Title/Abstract] OR transcriptome[Title/Abstract] OR dataset[Title/Abstract] OR "cell line"[Title/Abstract] OR organoid[Title/Abstract] OR screening[Title/Abstract])'
    return f"{drug_block} AND {relevance_block} NOT {exclusion_block}"


def build_broad_query(drug_name: str) -> str:
    ingredients = get_ingredients(drug_name)
    drug_queries = [f'("{ing}"[Title/Abstract] OR "{ing}"[Name of Substance])' for ing in ingredients]
    return f"({' OR '.join(drug_queries)})"


def build_fallback_queries(drug_name: str):
    return [
        ("strict", build_dynamic_query(drug_name), True, 4),
        ("species_relaxed", build_species_relaxed_query(drug_name), True, 3),
        ("broad", build_broad_query(drug_name), False, 3),
    ]

def ncbi_get(endpoint: str, params: dict):
    response = requests.get(f"{NCBI_EUTILS_BASE}/{endpoint}", params={**params, "email": NCBI_EMAIL, "tool": NCBI_TOOL}, timeout=REQUEST_TIMEOUT_SECONDS)
    response.raise_for_status()
    return response

def search_pmc_ids(query: str):
    return ncbi_get("esearch.fcgi", {"db": "pmc", "term": query, "retmax": SEARCH_CANDIDATE_COUNT, "sort": "relevance", "retmode": "json"}).json().get("esearchresult", {}).get("idlist", [])

def fetch_summaries(pmc_ids):
    if not pmc_ids: return {}
    result = ncbi_get("esummary.fcgi", {"db": "pmc", "id": ",".join(pmc_ids), "retmode": "json"}).json().get("result", {})
    return {str(uid): {"title": result.get(str(uid), {}).get("title", "Title Not Found"), "url": f"https://www.ncbi.nlm.nih.gov/pmc/articles/PMC{uid}/"} for uid in result.get("uids", []) if str(uid).strip()}

def join_text(element): return " ".join(part.strip() for part in element.itertext() if part and part.strip()) if element is not None else ""

def parse_article_metadata_xml(raw_xml: str):
    try: root = ET.fromstring(raw_xml)
    except ET.ParseError: return {}
    article_map = {}
    for article in root.findall(".//article"):
        pmc_id = join_text(article.find(".//front/article-meta/article-id[@pub-id-type='pmcaid']")) or join_text(article.find(".//front/article-meta/article-id[@pub-id-type='pmcid']")).replace("PMC", "").strip()
        if pmc_id:
            article_map[pmc_id] = {
                "abstract": join_text(article.find(".//front/article-meta/abstract")),
                "journal_title": join_text(article.find(".//front/journal-meta/journal-title-group/journal-title")),
                "journal_issns": [txt for txt in (join_text(n) for n in article.findall(".//front/journal-meta/issn")) if txt]
            }
    return article_map

def fetch_article_metadata_chunk(pmc_ids):
    if not pmc_ids: return {}
    response = ncbi_get("efetch.fcgi", {"db": "pmc", "id": ",".join(pmc_ids), "retmode": "xml"})
    return parse_article_metadata_xml(response.text)

def fetch_article_metadata(pmc_ids):
    if not pmc_ids: return {}
    try:
        return fetch_article_metadata_chunk(pmc_ids)
    except requests.HTTPError as error:
        status_code = getattr(getattr(error, "response", None), "status_code", None)
        if status_code == 400 and len(pmc_ids) > 1:
            mid = len(pmc_ids) // 2
            merged = {}
            merged.update(fetch_article_metadata(pmc_ids[:mid]))
            merged.update(fetch_article_metadata(pmc_ids[mid:]))
            return merged
        return {}
    except requests.RequestException:
        return {}

def check_contextual_distance(text: str, ingredients: list) -> bool:
    """약물 성분 중 하나라도 종(species) 키워드와 150자 이내에 등장하는지 확인"""
    text_lower = text.lower()
    for ing in ingredients:
        safe_ing = re.escape(ing.lower())
        pattern1 = rf"({safe_ing}).{{0,150}}(dog|dogs|canine|cat|cats|feline)"
        pattern2 = rf"(dog|dogs|canine|cat|cats|feline).{{0,150}}({safe_ing})"
        if re.search(pattern1, text_lower) or re.search(pattern2, text_lower):
            return True
    return False

# --- [기존 스코어링 로직 연동 (HYBRID 평가)] ---
def evaluate_candidate(drug_name: str, title: str, abstract_text: str, require_species: bool = True):
    title_abstract = f"{title} {abstract_text}".strip()
    normalized_title_abstract = normalize_text(title_abstract)
    title_lower = title.lower()

    # 다중 성분 매칭 로직
    ingredients = get_ingredients(drug_name)
    drug_hit = False
    matched_ing = None

    for ing in ingredients:
        aliases = build_drug_aliases(ing)
        if any(alias and contains_normalized_term(normalized_title_abstract, alias) for alias in aliases):
            drug_hit = True
            matched_ing = ing
            break

    species_hits = collect_species_hits(title_abstract, DOG_CAT_SPECIES_TERMS)
    direct_hits = collect_matching_terms(normalized_title_abstract, DIRECT_RELEVANCE_TERMS)
    solvent_hits = collect_matching_terms(normalized_title_abstract, SOLVENT_EXCLUSION_TERMS)
    method_hits = collect_matching_terms(normalized_title_abstract, METHOD_EXCLUSION_TERMS)

    score = 0
    reasons = []
    excluded = False

    # 기존 가산점 로직을 100% 그대로 유지
    if drug_hit:
        score += 6
        reasons.append(f"drug_match({matched_ing})")
    else:
        excluded = True
        reasons.append("excluded_no_drug")

    if species_hits:
        score += 4
        reasons.append(f"species:{', '.join(species_hits[:3])}")
    elif require_species:
        excluded = True
        reasons.append("excluded_no_species")
    else:
        reasons.append("species_not_required_fallback")

    if drug_hit and species_hits:
        if check_contextual_distance(title_abstract, ingredients):
            score += 3
            reasons.append("context_distance_match")
        else:
            score -= 2
            reasons.append("context_distance_penalty")

    if direct_hits:
        score += min(len(direct_hits), 5)
        reasons.append(f"relevance:{', '.join(direct_hits[:4])}")

    if any(term in title_lower for term in ["review", "guideline", "consensus", "pharmacokinetic", "toxicity", "safety"]):
        score += 2
        reasons.append("high_signal_title")

    if solvent_hits:
        excluded = True
        reasons.append(f"excluded_solvent:{', '.join(solvent_hits[:3])}")

    if method_hits and len(direct_hits) < 2:
        excluded = True
        reasons.append(f"excluded_method_bias:{', '.join(method_hits[:3])}")

    ddi_relevant = any(contains_normalized_term(normalized_title_abstract, term) for term in DDI_SIGNAL_TERMS)
    fda_relevant = any(contains_normalized_term(normalized_title_abstract, term) for term in FDA_SIGNAL_TERMS)

    return {"score": score, "reasons": reasons, "excluded": excluded, "ddi_relevant": ddi_relevant, "fda_relevant": fda_relevant}

# --- [Claude LLM 검증 (디버그 강화)] ---
def extract_claude_text(message) -> str:
    contents = getattr(message, "content", []) or []
    for block in contents:
        text_value = getattr(block, "text", None)
        if isinstance(text_value, str) and text_value.strip():
            return text_value
    return ""

def validate_with_claude(drug_name: str, title: str, abstract_text: str) -> bool:
    if not claude_client: return True
    if not abstract_text or len(abstract_text) < 50: return False

    is_topical = is_topical_drug(drug_name)
    context_hint = (
        "This is a topical/ophthalmic drug. Focus on local efficacy, corneal safety, or ocular toxicity rather than systemic pharmacokinetics." 
        if is_topical else 
        "Focus on systemic pharmacokinetics, safety, toxicity, or efficacy."
    )

    prompt = f"""
    You are an expert veterinary pharmacologist. Read the following article title and abstract.
    Determine if this study is an *in vivo* study evaluating the drug '{drug_name}' in dogs or cats.
    {context_hint}
    Exclude in vitro studies, or studies where the animal was merely a model for human disease without veterinary relevance.
    Title: {title}
    Abstract: {abstract_text}
    Respond with ONLY ONE WORD: 'VALID' if it meets the criteria, or 'INVALID' if it does not.
    """
    print(f"    [LLM] '{title[:30]}...' 검증 요청 중...")
    for model_name in CLAUDE_MODEL_CANDIDATES:
        try:
            message = claude_client.messages.create(
                model=model_name,
                max_tokens=10,
                temperature=0.0,
                messages=[{"role": "user", "content": prompt}]
            )
            result = extract_claude_text(message).strip().upper()
            # VALID/INVALID 외 여분 텍스트가 섞이는 경우를 위해 문자만 정규화
            normalized = re.sub(r"[^A-Z]", "", result)
            is_valid = normalized == "VALID"
            print(f"    [LLM:{model_name}] {result} -> {'✅ 승인' if is_valid else '❌ 거절'}")
            return is_valid
        except Exception as e:
            print(f"    [LLM 통신 에러:{model_name}] {e}")
            continue

    return False if CLAUDE_STRICT_MODE else True

# --- [메인 검색 오케스트레이션] ---
def get_pmc_references(drug_name: str):
    query = build_dynamic_query(drug_name)
    try:
        for query_mode, current_query, require_species, min_score in build_fallback_queries(drug_name):
            pmc_ids = search_pmc_ids(current_query)
            if not pmc_ids:
                continue

            summaries = fetch_summaries(pmc_ids)
            article_metadata = fetch_article_metadata(pmc_ids)

            candidates = []
            for pmc_id in pmc_ids:
                summary = summaries.get(pmc_id, {})
                title = summary.get("title", "Title Not Found")
                article_record = article_metadata.get(pmc_id, {})
                abstract_text = article_record.get("abstract", "")

                evaluation = evaluate_candidate(
                    drug_name,
                    title,
                    abstract_text,
                    require_species=require_species,
                )

                if evaluation["excluded"] or evaluation["score"] < min_score:
                    continue

                candidates.append({
                    "pmc_id": pmc_id,
                    "title": title,
                    "url": summary.get("url"),
                    "abstract": abstract_text,
                    "journal_title": article_record.get("journal_title", ""),
                    "journal_issns": article_record.get("journal_issns", []),
                    "journal_metrics": build_journal_metrics(article_record.get("journal_title", ""), article_record.get("journal_issns", [])),
                    "score": evaluation["score"],
                    "reasons": evaluation["reasons"] + [f"query_mode:{query_mode}"],
                    "ddi_relevant": evaluation["ddi_relevant"],
                    "fda_relevant": evaluation["fda_relevant"],
                })

            if not candidates:
                continue

            candidates.sort(key=lambda item: item["score"], reverse=True)

            final_valid = []
            llm_rejected = []

            for candidate in candidates:
                if len(final_valid) >= SELECT_REFERENCE_COUNT:
                    break

                is_valid = validate_with_claude(drug_name, candidate["title"], candidate["abstract"])
                if is_valid:
                    candidate["llm_invalid"] = False
                    candidate["reasons"].append("llm_validated_in_vivo")
                    final_valid.append(candidate)
                else:
                    candidate["llm_invalid"] = True
                    candidate["reasons"].append("llm_rejected")
                    llm_rejected.append(candidate)

            remaining = SELECT_REFERENCE_COUNT - len(final_valid)
            if remaining > 0 and llm_rejected:
                final_valid.extend(llm_rejected[:remaining])

            if final_valid:
                return current_query, final_valid

        return query, []

    except Exception as error:
        print(f"Error fetching data for {drug_name}: {error}")
        return query, []

# --- [리포트 생성 및 실행 진입점 (기존과 동일하게 유지)] ---
def _normalize_pmc_id(value):
    if not value: return None
    pmc_id = str(value).strip()
    return pmc_id if pmc_id.upper().startswith("PMC") else f"PMC{pmc_id}"

def _build_reference_source_file(references):
    pmc_ids = [pmc for ref in references if (pmc := _normalize_pmc_id(ref.get("pmc_id")))]
    return ", ".join(dict.fromkeys(pmc_ids)) if pmc_ids else "NO_PMC_REFERENCE"

def _build_reference_ddi_source(references):
    pmc_ids = [pmc for ref in references if (pmc := _normalize_pmc_id(ref.get("pmc_id")))]
    unique_pmcs = list(dict.fromkeys(pmc_ids))
    return f"PMC references: {', '.join(unique_pmcs)}" if unique_pmcs else "NO_PMC_REFERENCE"

def write_text_report(result_rows, text_output_filename):
    with open(text_output_filename, "w", encoding="utf-8") as file_obj:
        for row in result_rows:
            file_obj.write(f"■ Drug Name: {row['drug_name']}\n")
            # sql_candidates 우선, 없으면 accepted_references fallback
            refs = row.get("sql_candidates") or row.get("accepted_references") or []
            if not refs:
                file_obj.write("  -> 적합한 논문 없음\n")
            for ref in refs:
                invalid_flag = " [LLM_INVALID]" if ref.get("llm_invalid") else ""
                score = ref.get("relevance_score") or ref.get("score", "?")
                reasons = ref.get("match_reasons") or ref.get("reasons") or []
                file_obj.write(f"  - Title: {ref['title']}{invalid_flag}\n    Score: {score}\n    Match: {', '.join(reasons)}\n")
            file_obj.write("-" * 30 + "\n")
        failed_drugs = [row['drug_name'] for row in result_rows if not (row.get("sql_candidates") or row.get("accepted_references"))]
        file_obj.write(f"\n📊 요약: 총 {len(result_rows)}개 중 {len(result_rows) - len(failed_drugs)}개 성공, {len(failed_drugs)}개 실패\n")

def write_json_report(result_rows, json_output_filename):
    with open(json_output_filename, "w", encoding="utf-8") as file_obj:
        json.dump(result_rows, file_obj, ensure_ascii=False, indent=2)

def write_failed_drugs_report(result_rows, failed_output_filename):
    failed_drugs = [row['drug_name'] for row in result_rows if not (row.get("sql_candidates") or row.get("accepted_references"))]
    if failed_drugs:
        with open(failed_output_filename, "w", encoding="utf-8") as file_obj:
            json.dump(failed_drugs, file_obj, ensure_ascii=False, indent=2)

def build_arg_parser():
    parser = ArgumentParser(description="PMC reference generator (Hybrid Mode)")
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--sample-size", type=int, default=RANDOM_SAMPLE_SIZE)
    parser.add_argument("--seed", type=int, default=None)
    parser.add_argument("--shuffle", action="store_true")
    parser.add_argument("--output-prefix", type=str, default=Path(JSON_OUTPUT_FILENAME).with_suffix("").name)
    parser.add_argument("--drug-ids-file", type=str, default=None, help="처리할 drug_id 목록 파일(txt/json)")
    return parser


def load_target_drug_ids(path_str: str | None):
    if not path_str:
        return None
    path = Path(path_str)
    if not path.exists():
        raise FileNotFoundError(f"drug id 파일을 찾을 수 없습니다: {path}")

    text = path.read_text(encoding="utf-8").strip()
    if not text:
        return set()

    try:
        payload = json.loads(text)
        if isinstance(payload, list):
            return {str(item).strip() for item in payload if str(item).strip()}
    except json.JSONDecodeError:
        pass

    return {line.strip() for line in text.splitlines() if line.strip()}

def main():
    args = build_arg_parser().parse_args()
    output_prefix = args.output_prefix
    
    print("🚀 PMC 레퍼런스 수집(Hybrid)을 시작합니다...")
    all_records = list(iter_drug_records())
    target_ids = load_target_drug_ids(args.drug_ids_file)

    if target_ids is not None:
        filtered_records = []
        for record in all_records:
            payload = load_drug_payload(record["file_path"])
            if payload.get("id") in target_ids:
                filtered_records.append(record)
        all_records = filtered_records
        print(f"target drug_id 필터 적용: {len(target_ids)}개 요청 / {len(all_records)}개 매칭")
    
    # 레코드 선택 로직
    records = list(all_records)
    if args.shuffle: random.Random(args.seed).shuffle(records)
    offset = max(0, args.offset)
    if args.all: sampled_records = records[offset:(offset + args.limit if args.limit else None)]
    else: sampled_records = random.Random(args.seed).sample(records, min(args.sample_size, len(records))) if args.seed else random.sample(records, min(args.sample_size, len(records)))

    print(f"총 레코드: {len(all_records)}개 | 처리 대상: {len(sampled_records)}개")
    
    result_rows = []
    for record in sampled_records:
        print(f"\n[{record['name']}] 검색 및 분석 중...")
        time.sleep(API_DELAY_SECONDS)
        payload = load_drug_payload(record["file_path"])
        query, accepted_references = get_pmc_references(record["name"])

        sql_candidates = [build_sql_candidate(ref) for ref in accepted_references]
        if_scores = [c["if_score"] for c in sql_candidates if c.get("if_score") is not None]
        # VALID 기준 카운트 (llm_invalid=False 인 것만)
        valid_count = sum(1 for c in sql_candidates if not c.get("llm_invalid", False))

        result_rows.append({
            "drug_name": record["name"], "drug_id": payload.get("id"), "query": query,
            # accepted_references: abstract 포함 원본 (디버깅/검토용)
            "accepted_references": accepted_references,
            # sql_candidates: goto_db.py가 읽어 DB에 upsert하는 가공본
            "sql_candidates": sql_candidates,
            "_data_quality": {
                "overall_confidence": int(max(0, min(100, 60 + (valid_count * 8)))),
                "ddi_source": _build_reference_ddi_source(sql_candidates),
                "pmc_reference_count": len(sql_candidates),
                "valid_reference_count": valid_count,
                "average_if_score": (sum(if_scores) / len(if_scores)) if if_scores else None,
            }
        })

    write_text_report(result_rows, f"{output_prefix}.txt")
    write_json_report(result_rows, f"{output_prefix}.json")
    write_failed_drugs_report(result_rows, f"{output_prefix}_failed_drugs.json")
    print("\n✅ 모든 처리가 완료되었습니다!")

if __name__ == "__main__":
    main()
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
    from anthropic import Anthropic  # 추가된 패키지: pip install anthropic
except ImportError:
    Anthropic = None

# --- [설정 세션] ---
NCBI_EMAIL = "donghyun040720@gmail.com"
NCBI_TOOL = "nuvovet_reference_sampler"
NCBI_EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"

# [추가] Claude API 키 설정 (환경 변수에서 읽어야 함)
CLAUDE_API_KEY = os.environ.get("ANTHROPIC_API_KEY")

CLAUDE_MODEL_CANDIDATES = [
    "claude-3-5-haiku-latest",
    "claude-3-5-sonnet-latest",
    "claude-3-haiku-20240307",
]
CLAUDE_STRICT_MODE = os.environ.get("CLAUDE_STRICT_MODE", "0") == "1"

DATA_DIR = Path(__file__).resolve().parent / "backend" / "data" / "converted"
JCR_CSV_PATH = Path(__file__).resolve().parent / "2025JCRIMPACTFACTORS.csv"
SCIMAGO_CSV_PATH = Path(__file__).resolve().parent / "scimagojr 2024.csv"
TEXT_OUTPUT_FILENAME = "test_pmc_references.txt"
JSON_OUTPUT_FILENAME = "test_pmc_references.json"
RANDOM_SAMPLE_SIZE = 10
SEARCH_CANDIDATE_COUNT = 15 # LLM 필터링을 고려해 후보군 소폭 증가
SELECT_REFERENCE_COUNT = 2
API_DELAY_SECONDS = 0.5
REQUEST_TIMEOUT_SECONDS = 20
JCR_METRIC_YEAR = "2025"
SCIMAGO_METRIC_YEAR = "2024"

# Anthropic 클라이언트 초기화
claude_client = Anthropic(api_key=CLAUDE_API_KEY) if Anthropic and CLAUDE_API_KEY else None
claude_active_model = None
claude_disabled = False

DOG_CAT_SPECIES_TERMS = {"dog", "dogs", "canine", "cat", "cats", "feline"}
# ... (기존 TERMS 설정 유지) ...
DIRECT_RELEVANCE_TERMS = {"pharmacokinetic", "pharmacokinetics", "pharmacodynamic", "pharmacology", "bioavailability", "absorption", "distribution", "metabolism", "excretion", "clearance", "half-life", "dosage", "dose", "dosing", "efficacy", "safety", "toxicity", "adverse", "contraindication", "warning", "drug interaction", "interaction", "treatment", "label", "approved", "nada", "package insert"}
FDA_SIGNAL_TERMS = {"label", "approved", "nada", "package insert"}
DDI_SIGNAL_TERMS = {"drug interaction", "interaction"}
SOLVENT_EXCLUSION_TERMS = {"vehicle control", "used as vehicle", "vehicle-treated", "solvent", "solvents", "excipient", "reagent", "stock solution", "dissolved in", "diluted in dmso", "containing 2% dimethyl sulfoxide"}
METHOD_EXCLUSION_TERMS = {"transcriptome", "dataset", "screening", "organoid", "cell line", "metabolomics", "proteomics", "rna-seq", "high-throughput", "acute myeloid leukemia", "cell signatures"}

FDA_LABEL_FIELDS = [
    "drug_identity.brand_names", "drug_identity.dosage_form", "drug_identity.available_strengths", "drug_identity.formulary_status", "contraindications", "precautions", "dosage_and_kinetics.dog.dosage_list", "dosage_and_kinetics.cat.dosage_list", "section_1_2_10.indications", "section_1_2_10.client_info", "storage_and_forms.forms"
]

# --- (기존 유틸리티 함수들 유지: normalize_text ~ load_drug_payload) ---
def normalize_text(text: str) -> str: return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()
def normalize_issn(issn: str) -> str: return re.sub(r"[^0-9Xx]+", "", str(issn or "").upper())
def split_issns(raw_issn_field: str): return [normalized for part in str(raw_issn_field or "").split(",") if (normalized := normalize_issn(part))]

def load_scimago_metrics(csv_path: Path):
    by_issn, by_title = {}, {}
    if not csv_path.exists(): return {"by_issn": by_issn, "by_title": by_title, "source_file": str(csv_path), "metric_year": SCIMAGO_METRIC_YEAR}
    with csv_path.open("r", encoding="utf-8-sig", newline="") as file_obj:
        reader = csv.DictReader(file_obj, delimiter=";")
        for row in reader:
            title = (row.get("Title") or "").strip()
            normalized_title = normalize_text(title)
            issns = split_issns(row.get("Issn", ""))
            metric_record = {"journal_title": title, "sjr": (row.get("SJR") or "").strip(), "sjr_best_quartile": (row.get("SJR Best Quartile") or "").strip(), "h_index": (row.get("H index") or "").strip(), "metric_year": SCIMAGO_METRIC_YEAR}
            if normalized_title and normalized_title not in by_title: by_title[normalized_title] = metric_record
            for issn in issns: by_issn.setdefault(issn, metric_record)
    return {"by_issn": by_issn, "by_title": by_title, "source_file": str(csv_path), "metric_year": SCIMAGO_METRIC_YEAR}


def load_jcr_metrics(csv_path: Path):
    by_issn, by_title = {}, {}
    if not csv_path.exists():
        return {"by_issn": by_issn, "by_title": by_title, "source_file": str(csv_path), "metric_year": JCR_METRIC_YEAR}

    with csv_path.open("r", encoding="utf-8-sig", newline="") as file_obj:
        reader = csv.DictReader(file_obj)
        for row in reader:
            journal_name = (row.get("Journal Name") or "").strip()
            abbreviated_journal = (row.get("Abbreviated Journal") or "").strip()
            issn_values = {
                normalize_issn(str(row.get("ISSN") or "")),
                normalize_issn(str(row.get("eISSN") or "")),
            }
            issns = sorted(value for value in issn_values if value and value != "NA")

            metric_record = {
                "journal_title": journal_name,
                "abbreviated_journal": abbreviated_journal,
                "issns": issns,
                "publisher": (row.get("Publisher") or "").strip(),
                "jif": (row.get("JIF") or "").strip(),
                "five_year_jif": (row.get("5-Year JIF") or "").strip(),
                "jif_without_self_cites": (row.get("JIF Without Self-Cites") or "").strip(),
                "jci": (row.get("JCI") or "").strip(),
                "jif_quartile": (row.get("JIF Quartile") or "").strip(),
                "category": (row.get("Category") or "").strip(),
                "jif_rank": (row.get("JIF Rank") or "").strip(),
                "metric_year": JCR_METRIC_YEAR,
                "metric_source": "Journal Citation Reports",
            }

            for title_variant in (journal_name, abbreviated_journal):
                normalized_title = normalize_text(title_variant)
                if normalized_title and normalized_title not in by_title:
                    by_title[normalized_title] = metric_record

            for issn in issns:
                by_issn.setdefault(issn, metric_record)

    return {"by_issn": by_issn, "by_title": by_title, "source_file": str(csv_path), "metric_year": JCR_METRIC_YEAR}

JCR_METRICS_INDEX = load_jcr_metrics(JCR_CSV_PATH)
SCIMAGO_METRICS_INDEX = load_scimago_metrics(SCIMAGO_CSV_PATH)


def lookup_jcr_metrics(journal_title: str, journal_issns):
    for issn in journal_issns or []:
        normalized_issn = normalize_issn(issn)
        if matched := JCR_METRICS_INDEX["by_issn"].get(normalized_issn):
            return {**matched, "match_method": "issn", "matched_value": normalized_issn}

    normalized_title = normalize_text(journal_title)
    if normalized_title and (matched := JCR_METRICS_INDEX["by_title"].get(normalized_title)):
            return {**matched, "match_method": "title", "matched_value": journal_title}
    return None

def lookup_scimago_metrics(journal_title: str, journal_issns):
    for issn in journal_issns or []:
        normalized_issn = normalize_issn(issn)
        if matched := SCIMAGO_METRICS_INDEX["by_issn"].get(normalized_issn):
            return {**matched, "match_method": "issn", "matched_value": normalized_issn}
    normalized_title = normalize_text(journal_title)
    if normalized_title and (matched := SCIMAGO_METRICS_INDEX["by_title"].get(normalized_title)):
            return {**matched, "match_method": "title", "matched_value": journal_title}
    return None


def build_journal_metrics(journal_title: str, journal_issns):
    jcr_metrics = lookup_jcr_metrics(journal_title=journal_title, journal_issns=journal_issns)
    scimago_metrics = lookup_scimago_metrics(journal_title=journal_title, journal_issns=journal_issns)

    primary_metrics = jcr_metrics or scimago_metrics
    if not primary_metrics:
        return None

    metric_summary = {
        "primary_metric_source": primary_metrics.get("metric_source"),
        "metric_year": primary_metrics.get("metric_year"),
        "match_method": primary_metrics.get("match_method"),
        "matched_value": primary_metrics.get("matched_value"),
        "jcr": jcr_metrics,
        "scimago": scimago_metrics,
    }

    if jcr_metrics:
        metric_summary.update({
            "impact_factor": jcr_metrics.get("jif"),
            "impact_factor_5year": jcr_metrics.get("five_year_jif"),
            "impact_factor_quartile": jcr_metrics.get("jif_quartile"),
            "journal_citation_indicator": jcr_metrics.get("jci"),
        })

    if scimago_metrics:
        metric_summary.update({
            "sjr": scimago_metrics.get("sjr"),
            "sjr_best_quartile": scimago_metrics.get("sjr_best_quartile"),
            "h_index": scimago_metrics.get("h_index"),
        })

    return metric_summary


def parse_float(value):
    try:
        normalized = str(value).replace(",", "").strip()
        return float(normalized) if normalized else None
    except (TypeError, ValueError):
        return None


def derive_if_score(journal_metrics: dict):
    if not journal_metrics:
        return None
    jif = parse_float(journal_metrics.get("impact_factor"))
    if jif is not None:
        return jif

    # Fallback: SCImago SJR (when JCR IF is unavailable)
    sjr = parse_float(journal_metrics.get("sjr"))
    return sjr


def build_sql_candidate(reference: dict):
    journal_issns = reference.get("journal_issns") or []
    journal_metrics = reference.get("journal_metrics") or {}
    return {
        "pmc_id": reference.get("pmc_id"),
        "issn": journal_issns[0] if journal_issns else None,
        "title": reference.get("title"),
        "url": reference.get("url"),
        "if_score": derive_if_score(journal_metrics),
        "relevance_score": reference.get("score"),
        "match_reasons": reference.get("reasons") or [],
        "journal_title": reference.get("journal_title"),
        "journal_issns": journal_issns,
        "journal_metrics": journal_metrics,
        "ddi_relevant": bool(reference.get("ddi_relevant")),
        "fda_relevant": bool(reference.get("fda_relevant")),
    }

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
    cleaned = re.sub(r"\b(systemic|ophthalmic|topical)\b", "", drug_name.lower())
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" ,")
    if cleaned: aliases.add(cleaned)
    if primary := cleaned.split(",")[0].strip(): aliases.add(primary)
    return sorted(normalize_text(alias) for alias in aliases if alias.strip())

def iter_drug_records():
    for file_path in sorted(DATA_DIR.rglob("*.jsonl")):
        if "ophthalmic" in file_path.stem.lower(): continue
        yield {"name": prettify_drug_name(file_path.stem), "file_path": file_path}

def load_drug_payload(file_path: Path):
    with file_path.open("r", encoding="utf-8") as file_obj: return json.load(file_obj)

# --- [개선 1: MeSH 통제어휘 기반 Query 빌드] ---
def build_strict_query(drug_name: str) -> str:
    species_block = '("Dogs"[Mesh] OR "Cats"[Mesh] OR dog[Title/Abstract] OR dogs[Title/Abstract] OR canine[Title/Abstract] OR cat[Title/Abstract] OR cats[Title/Abstract] OR feline[Title/Abstract])'
    drug_block = f'("{drug_name}"[Title/Abstract] OR "{drug_name}"[Name of Substance])'
    relevance_block = (
        '("Pharmacokinetics"[Mesh] OR "Drug Interactions"[Mesh] OR "Toxicity"[Mesh] OR '
        'pharmacokinetic*[Title/Abstract] OR pharmacology[Title/Abstract] OR metabolism[Title/Abstract] '
        'OR clearance[Title/Abstract] OR "half-life"[Title/Abstract] OR bioavailability[Title/Abstract] '
        'OR dosage[Title/Abstract] OR dosing[Title/Abstract] OR safety[Title/Abstract] '
        'OR toxicity[Title/Abstract] OR adverse[Title/Abstract] OR contraindication*[Title/Abstract] '
        'OR "drug interaction"[Title/Abstract] OR efficacy[Title/Abstract] OR label[Title/Abstract] '
        'OR approved[Title/Abstract])'
    )
    exclusion_block = (
        '("In Vitro Techniques"[Mesh] OR "vehicle control"[Title/Abstract] OR solvent[Title/Abstract] OR solvents[Title/Abstract] '
        'OR excipient[Title/Abstract] OR reagent[Title/Abstract] OR transcriptome[Title/Abstract] '
        'OR dataset[Title/Abstract] OR "cell line"[Title/Abstract] OR organoid[Title/Abstract] '
        'OR screening[Title/Abstract])'
    )
    return f'{drug_block} AND {species_block} AND {relevance_block} NOT {exclusion_block}'

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
    try:
        root = ET.fromstring(raw_xml)
    except ET.ParseError:
        return {}

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
    if not pmc_ids:
        return {}
    response = ncbi_get("efetch.fcgi", {"db": "pmc", "id": ",".join(pmc_ids), "retmode": "xml"})
    return parse_article_metadata_xml(response.text)

def fetch_article_metadata(pmc_ids):
    if not pmc_ids:
        return {}

    try:
        return fetch_article_metadata_chunk(pmc_ids)
    except requests.HTTPError as error:
        response = getattr(error, "response", None)
        status_code = getattr(response, "status_code", None)
        if status_code == 400 and len(pmc_ids) > 1:
            mid = max(1, len(pmc_ids) // 2)
            left = fetch_article_metadata(pmc_ids[:mid])
            right = fetch_article_metadata(pmc_ids[mid:])
            merged = {}
            merged.update(left)
            merged.update(right)
            return merged
        if status_code == 400 and len(pmc_ids) == 1:
            print(f"  [!] efetch skipped invalid PMC id: {pmc_ids[0]}")
            return {}
        raise
    except requests.RequestException:
        if len(pmc_ids) > 1:
            mid = max(1, len(pmc_ids) // 2)
            left = fetch_article_metadata(pmc_ids[:mid])
            right = fetch_article_metadata(pmc_ids[mid:])
            merged = {}
            merged.update(left)
            merged.update(right)
            return merged
        return {}

# --- [개선 2: 문맥 거리 분석 함수] ---
def check_contextual_distance(text: str, drug_name: str) -> bool:
    """약물명과 종(species)이 150자 이내에 등장하는지 확인"""
    safe_drug = re.escape(drug_name.lower())
    pattern1 = rf"({safe_drug}).{{0,150}}(dog|dogs|canine|cat|cats|feline)"
    pattern2 = rf"(dog|dogs|canine|cat|cats|feline).{{0,150}}({safe_drug})"
    text_lower = text.lower()
    return bool(re.search(pattern1, text_lower) or re.search(pattern2, text_lower))

def evaluate_candidate(drug_name: str, title: str, abstract_text: str):
    title_abstract = f"{title} {abstract_text}".strip()
    normalized_title_abstract = normalize_text(title_abstract)
    title_lower = title.lower()

    aliases = build_drug_aliases(drug_name)
    drug_hit = any(alias and contains_normalized_term(normalized_title_abstract, alias) for alias in aliases)
    species_hits = collect_species_hits(title_abstract, DOG_CAT_SPECIES_TERMS)
    direct_hits = collect_matching_terms(normalized_title_abstract, DIRECT_RELEVANCE_TERMS)
    solvent_hits = collect_matching_terms(normalized_title_abstract, SOLVENT_EXCLUSION_TERMS)
    method_hits = collect_matching_terms(normalized_title_abstract, METHOD_EXCLUSION_TERMS)

    score = 0
    reasons = []
    excluded = False

    if drug_hit:
        score += 6
        reasons.append("title_or_abstract_contains_drug")
    else:
        excluded = True
        reasons.append("excluded_no_drug")

    if species_hits:
        score += 4
        reasons.append(f"species:{', '.join(species_hits[:3])}")
    else:
        excluded = True
        reasons.append("excluded_no_species")

    # [개선 2 적용]: 문맥적 거리에 따른 점수 가감
    if drug_hit and species_hits:
        if check_contextual_distance(title_abstract, drug_name):
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

# --- [개선 3: Claude LLM 기반 초록 2차 검증] ---
def parse_claude_validation_result(raw_result: str):
    normalized = re.sub(r"[^A-Z]+", "", str(raw_result or "").upper())
    if normalized == "VALID":
        return True
    if normalized == "INVALID":
        return False
    return False


def extract_claude_text(message) -> str:
    contents = getattr(message, "content", []) or []
    for block in contents:
        text_value = getattr(block, "text", None)
        if isinstance(text_value, str) and text_value.strip():
            return text_value
    return ""


def should_try_next_claude_model(error: Exception) -> bool:
    lowered = str(error).lower()
    return "not_found_error" in lowered or "model:" in lowered


def call_claude_with_fallback(prompt: str):
    global claude_active_model, claude_disabled

    if not claude_client or claude_disabled:
        return None

    candidates = []
    if claude_active_model:
        candidates.append(claude_active_model)
    for model_name in CLAUDE_MODEL_CANDIDATES:
        if model_name not in candidates:
            candidates.append(model_name)

    last_error = None
    for model_name in candidates:
        try:
            message = claude_client.messages.create(
                model=model_name,
                max_tokens=10,
                temperature=0.0,
                messages=[{"role": "user", "content": prompt}],
            )
            claude_active_model = model_name
            return message
        except Exception as error:
            last_error = error
            if should_try_next_claude_model(error):
                continue
            raise

    claude_disabled = True
    if last_error is not None:
        print(f"  [!] Claude disabled (no available model): {last_error}")
    return None


def validate_with_claude(drug_name: str, title: str, abstract_text: str) -> bool:
    if not claude_client: return True # API 키가 없으면 기본 통과
    if not abstract_text or len(abstract_text) < 50: return False # 초록이 너무 짧으면 제외

    prompt = f"""
    You are an expert veterinary pharmacologist. Read the following article title and abstract.
    Determine if this study is an *in vivo* study (conducted on live animals) specifically evaluating the pharmacokinetics, safety, toxicity, or efficacy of the drug '{drug_name}' in dogs (canine) or cats (feline).
    
    Exclude in vitro studies, human studies, or studies where the animal was merely a model for human disease without veterinary clinical relevance. Exclude if '{drug_name}' is just used as a solvent or minor reagent.
    
    Title: {title}
    Abstract: {abstract_text}
    
    Respond with ONLY ONE WORD: 'VALID' if it meets the criteria, or 'INVALID' if it does not.
    """
    try:
        message = call_claude_with_fallback(prompt)
        if message is None:
            return True if not CLAUDE_STRICT_MODE else False
        result = extract_claude_text(message).strip().upper()
        return parse_claude_validation_result(result)
    except Exception as e:
        print(f"  [!] Claude API Error for '{drug_name}': {e}")
        return False if CLAUDE_STRICT_MODE else True

# (기존 get_evidence_targets, build_metadata_patch 함수 유지)
def get_evidence_targets(file_path: Path, payload: dict):
    # 기존 코드 동일...
    return {"pmc_fields": payload.get("_data_quality", {}).get("pmc_rag_fields", []), "fda_label_fields": list(FDA_LABEL_FIELDS), "file_path": str(file_path)}

def build_metadata_patch(payload: dict, accepted_references, evidence_targets):
    # 기존 코드 동일...
    current_source = payload.get("_extraction_metadata", {}).get("source_file")
    return {"_extraction_metadata.source_file": {"suggested": f"{current_source} + PMC strict vet references" if accepted_references else current_source}}


def _normalize_pmc_id(value):
    if value is None:
        return None
    pmc_id = str(value).strip()
    if not pmc_id:
        return None
    return pmc_id if pmc_id.upper().startswith("PMC") else f"PMC{pmc_id}"


def _build_reference_source_file(references):
    pmc_ids = []
    for reference in references:
        pmc_id = _normalize_pmc_id(reference.get("pmc_id"))
        if pmc_id and pmc_id not in pmc_ids:
            pmc_ids.append(pmc_id)
    return ", ".join(pmc_ids) if pmc_ids else "NO_PMC_REFERENCE"


def _build_reference_ddi_source(references):
    source_file = _build_reference_source_file(references)
    return f"PMC references: {source_file}" if source_file != "NO_PMC_REFERENCE" else source_file

def get_pmc_references(drug_name: str):
    query = build_strict_query(drug_name)
    try:
        pmc_ids = search_pmc_ids(query)
        if not pmc_ids: return query, []

        summaries = fetch_summaries(pmc_ids)
        article_metadata = fetch_article_metadata(pmc_ids)

        candidates = []
        for pmc_id in pmc_ids:
            summary = summaries.get(pmc_id, {})
            title = summary.get("title", "Title Not Found")
            article_record = article_metadata.get(pmc_id, {})
            abstract_text = article_record.get("abstract", "")
            evaluation = evaluate_candidate(drug_name, title, abstract_text)

            if evaluation["excluded"] or evaluation["score"] < 4: continue

            candidates.append({
                "pmc_id": pmc_id, "title": title, "url": summary.get("url"), 
                "abstract": abstract_text, "journal_title": article_record.get("journal_title", ""),
                "journal_issns": article_record.get("journal_issns", []), 
                "journal_metrics": build_journal_metrics(article_record.get("journal_title", ""), article_record.get("journal_issns", [])),
                "score": evaluation["score"], "reasons": evaluation["reasons"],
                "ddi_relevant": evaluation["ddi_relevant"], "fda_relevant": evaluation["fda_relevant"]
            })

        candidates.sort(key=lambda item: item["score"], reverse=True)
        
        # [개선 3 적용]: 상위 후보군에 대해 Claude 검증 실행
        final_accepted = []
        for candidate in candidates:
            if validate_with_claude(drug_name, candidate["title"], candidate["abstract"]):
                candidate["reasons"].append("llm_validated_in_vivo")
                final_accepted.append(candidate)
            else:
                candidate["reasons"].append("llm_rejected_in_vitro_or_irrelevant")
                # 테스트 리포트를 위해 남겨두되, 최종 DB 삽입 시에는 필터링 가능
            
            # 원하는 개수만큼 찾았으면 중단 (API 비용 절감)
            if len([c for c in final_accepted if "llm_validated_in_vivo" in c["reasons"]]) >= SELECT_REFERENCE_COUNT:
                break

        return query, final_accepted

    except Exception as error:
        print(f"Error fetching data for {drug_name}: {error}")
        return query, []

# (기존 write_text_report, write_json_report, main 함수 동일하게 유지)
def write_text_report(result_rows, text_output_filename):
    with open(text_output_filename, "w", encoding="utf-8") as file_obj:
        for row in result_rows:
            file_obj.write(f"■ Drug Name: {row['drug_name']}\n")
            if not row["accepted_references"]: file_obj.write("  -> 적합한 논문 없음\n")
            
            for ref in row["accepted_references"]:
                file_obj.write(f"  - Title: {ref['title']}\n")
                file_obj.write(f"    Journal: {ref.get('journal_title') or 'Unknown Journal'}\n")
                metrics = ref.get("journal_metrics") or {}
                if metrics.get("jcr"):
                    file_obj.write(
                        "    JCR: "
                        f"JIF {metrics.get('impact_factor') or 'N/A'}, "
                        f"5Y JIF {metrics.get('impact_factor_5year') or 'N/A'}, "
                        f"JCI {metrics.get('journal_citation_indicator') or 'N/A'}, "
                        f"Quartile {metrics.get('impact_factor_quartile') or 'N/A'}\n"
                    )
                else:
                    file_obj.write("    JCR: 매핑 없음\n")

                if metrics.get("scimago"):
                    file_obj.write(
                        "    SCImago: "
                        f"SJR {metrics.get('sjr') or 'N/A'} ({metrics.get('sjr_best_quartile') or 'N/A'}), "
                        f"H-index {metrics.get('h_index') or 'N/A'}\n"
                    )
                else:
                    file_obj.write("    SCImago: 매핑 없음\n")

                file_obj.write(f"    Match: {', '.join(ref['reasons'])}\n")
            file_obj.write("-" * 30 + "\n")
        failed_drugs = [row['drug_name'] for row in result_rows if not row['accepted_references']]
        file_obj.write("\n" + "="*40 + "\n")
        file_obj.write("📊 레퍼런스 수집 결과 요약\n")
        file_obj.write("="*40 + "\n")
        file_obj.write(f"▶ 총 테스트 약물: {len(result_rows)}개\n")
        file_obj.write(f"▶ 수집 성공: {len(result_rows) - len(failed_drugs)}개\n")
        file_obj.write(f"▶ 수집 실패: {len(failed_drugs)}개\n")
        
        if failed_drugs:
            file_obj.write("\n❌ 실패한 약물 리스트:\n")
            for drug in failed_drugs:
                file_obj.write(f"  - {drug}\n")

def write_failed_drugs_report(result_rows, failed_output_filename):
    # accepted_references가 비어있는 약물명만 추출
    failed_drugs = [row['drug_name'] for row in result_rows if not row['accepted_references']]
    
    if failed_drugs:
        with open(failed_output_filename, "w", encoding="utf-8") as file_obj:
            json.dump(failed_drugs, file_obj, ensure_ascii=False, indent=2)
        print(f"\n  ⚠️ [알림] 레퍼런스를 찾지 못한 약물 {len(failed_drugs)}개는 '{failed_output_filename}'에 따로 저장되었습니다.")
    else:
        print("\n  ✅ [알림] 실패한 약물이 없습니다. 모든 레퍼런스 수집 성공!")

def write_json_report(result_rows, json_output_filename):
    with open(json_output_filename, "w", encoding="utf-8") as file_obj:
        json.dump(result_rows, file_obj, ensure_ascii=False, indent=2)


def build_arg_parser():
    parser = ArgumentParser(description="PMC reference generator for converted drug data")
    parser.add_argument("--all", action="store_true", help="전체 converted 데이터를 처리합니다")
    parser.add_argument("--offset", type=int, default=0, help="처리 시작 인덱스")
    parser.add_argument("--limit", type=int, default=None, help="처리 개수 제한")
    parser.add_argument("--sample-size", type=int, default=RANDOM_SAMPLE_SIZE, help="샘플 모드 처리 개수")
    parser.add_argument("--seed", type=int, default=None, help="샘플링/셔플 시드")
    parser.add_argument("--shuffle", action="store_true", help="처리 전 레코드 순서를 셔플")
    parser.add_argument(
        "--output-prefix",
        type=str,
        default=Path(JSON_OUTPUT_FILENAME).with_suffix("").name,
        help="출력 파일 prefix (예: test_pmc_references_chunk_000)",
    )
    return parser


def select_records(all_records, args):
    records = list(all_records)
    if args.shuffle:
        rng = random.Random(args.seed)
        rng.shuffle(records)

    total = len(records)
    offset = max(0, args.offset)
    if offset >= total:
        return [], total

    if args.all:
        selected = records[offset:]
    elif args.limit is not None:
        selected = records[offset: offset + max(0, args.limit)]
    else:
        sample_size = min(max(0, args.sample_size), total)
        if args.seed is not None:
            rng = random.Random(args.seed)
            selected = rng.sample(records, sample_size)
        else:
            selected = random.sample(records, sample_size)

    if args.limit is not None and args.all:
        selected = selected[:max(0, args.limit)]

    return selected, total


def main():
    args = build_arg_parser().parse_args()

    output_prefix = args.output_prefix
    text_output_filename = f"{output_prefix}.txt"
    json_output_filename = f"{output_prefix}.json"
    failed_output_filename = f"{output_prefix}_failed_drugs.json"

    print("PMC 레퍼런스 수집 테스트를 시작합니다...")
    all_records = list(iter_drug_records())
    sampled_records, total_count = select_records(all_records, args)
    print(f"총 레코드: {total_count}개 | 이번 실행 대상: {len(sampled_records)}개")
    print(f"출력: {text_output_filename}, {json_output_filename}")

    result_rows = []
    for record in sampled_records:
        print(f"[{record['name']}] 검색 및 분석 중...")
        time.sleep(API_DELAY_SECONDS)
        payload = load_drug_payload(record["file_path"])
        query, accepted_references = get_pmc_references(record["name"])

        sql_candidates = [build_sql_candidate(reference) for reference in accepted_references]
        if_scores = [candidate["if_score"] for candidate in sql_candidates if candidate.get("if_score") is not None]
        average_if_score = (sum(if_scores) / len(if_scores)) if if_scores else None

        result_rows.append({
            "drug_name": record["name"],
            "drug_id": payload.get("id"),
            "query": query,
            "accepted_references": accepted_references,
            "sql_candidates": sql_candidates,
            "_data_quality": {
                "overall_confidence": int(max(0, min(100, 60 + (len(accepted_references) * 8)))),
                # Deprecated: retained for compatibility during migration phase
                "ddi_source": _build_reference_ddi_source(sql_candidates or accepted_references),
                "requires_pmc_rag": bool((payload.get("_data_quality") or {}).get("requires_pmc_rag", True)),
                "pmc_rag_fields": (payload.get("_data_quality") or {}).get("pmc_rag_fields") or [],
                "pmc_reference_count": len(accepted_references),
                "average_if_score": average_if_score,
            },
            "_extraction_metadata": {
                # Deprecated: retained for compatibility during migration phase
                "source_file": _build_reference_source_file(sql_candidates or accepted_references),
            },
        })
    write_text_report(result_rows, text_output_filename)
    write_json_report(result_rows, json_output_filename)
    write_failed_drugs_report(result_rows, failed_output_filename)
    print("완료!")

if __name__ == "__main__":
    main()
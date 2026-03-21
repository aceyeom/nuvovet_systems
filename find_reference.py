import json
import random
import re
import time
import xml.etree.ElementTree as ET
from pathlib import Path

import requests

# --- [설정 세션] ---
NCBI_EMAIL = "donghyun040720@gmail.com"
NCBI_TOOL = "nuvovet_reference_sampler"
NCBI_EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"

DATA_DIR = Path(__file__).resolve().parent / "backend" / "data" / "converted"
TEXT_OUTPUT_FILENAME = "test_pmc_references.txt"
JSON_OUTPUT_FILENAME = "test_pmc_references.json"
RANDOM_SAMPLE_SIZE = 10
SEARCH_CANDIDATE_COUNT = 12
SELECT_REFERENCE_COUNT = 2
API_DELAY_SECONDS = 0.5
REQUEST_TIMEOUT_SECONDS = 20

DOG_CAT_SPECIES_TERMS = {
    "dog",
    "dogs",
    "canine",
    "cat",
    "cats",
    "feline",
}

DIRECT_RELEVANCE_TERMS = {
    "pharmacokinetic",
    "pharmacokinetics",
    "pharmacodynamic",
    "pharmacology",
    "bioavailability",
    "absorption",
    "distribution",
    "metabolism",
    "excretion",
    "clearance",
    "half-life",
    "dosage",
    "dose",
    "dosing",
    "efficacy",
    "safety",
    "toxicity",
    "adverse",
    "contraindication",
    "warning",
    "drug interaction",
    "interaction",
    "treatment",
    "label",
    "approved",
    "nada",
    "package insert",
}

FDA_SIGNAL_TERMS = {
    "label",
    "approved",
    "nada",
    "package insert",
}

DDI_SIGNAL_TERMS = {
    "drug interaction",
    "interaction",
}

SOLVENT_EXCLUSION_TERMS = {
    "vehicle control",
    "used as vehicle",
    "vehicle-treated",
    "solvent",
    "solvents",
    "excipient",
    "reagent",
    "stock solution",
    "dissolved in",
    "diluted in dmso",
    "containing 2% dimethyl sulfoxide",
}

METHOD_EXCLUSION_TERMS = {
    "transcriptome",
    "dataset",
    "screening",
    "organoid",
    "cell line",
    "metabolomics",
    "proteomics",
    "rna-seq",
    "high-throughput",
    "acute myeloid leukemia",
    "cell signatures",
}

FDA_LABEL_FIELDS = [
    "drug_identity.brand_names",
    "drug_identity.dosage_form",
    "drug_identity.available_strengths",
    "drug_identity.formulary_status",
    "contraindications",
    "precautions",
    "dosage_and_kinetics.dog.dosage_list",
    "dosage_and_kinetics.cat.dosage_list",
    "section_1_2_10.indications",
    "section_1_2_10.client_info",
    "storage_and_forms.forms",
]


def normalize_text(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def contains_normalized_term(normalized_text: str, term: str) -> bool:
    normalized_term = normalize_text(term)
    if not normalized_text or not normalized_term:
        return False
    return re.search(rf"(?:^|\s){re.escape(normalized_term)}(?:\s|$)", normalized_text) is not None


def collect_matching_terms(normalized_text: str, terms):
    return sorted(term for term in terms if contains_normalized_term(normalized_text, term))


def collect_species_hits(text: str, terms):
    hits = []
    for term in sorted(terms):
        pattern = re.compile(rf"(?<![A-Za-z]){re.escape(term)}(?![A-Za-z])", re.IGNORECASE)
        for match in pattern.finditer(text):
            matched_text = match.group(0)
            if matched_text.isupper() and len(matched_text) > 1:
                continue
            hits.append(term)
            break
    return hits


def prettify_drug_name(stem: str) -> str:
    name = stem.replace("__", ", ").replace("_", " ").strip()
    name = " ".join(name.split())
    return name.title()


def build_drug_aliases(drug_name: str):
    aliases = {drug_name}
    lowered = drug_name.lower()
    cleaned = re.sub(r"\b(systemic|ophthalmic|topical)\b", "", lowered)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" ,")
    if cleaned:
        aliases.add(cleaned)
    primary = cleaned.split(",")[0].strip()
    if primary:
        aliases.add(primary)
    return sorted(normalize_text(alias) for alias in aliases if alias.strip())


def iter_drug_records():
    for file_path in sorted(DATA_DIR.rglob("*.jsonl")):
        stem_lower = file_path.stem.lower()
        if "ophthalmic" in stem_lower:
            continue
        yield {
            "name": prettify_drug_name(file_path.stem),
            "file_path": file_path,
        }


def load_drug_payload(file_path: Path):
    with file_path.open("r", encoding="utf-8") as file_obj:
        return json.load(file_obj)


def build_strict_query(drug_name: str) -> str:
    species_block = "(dog[Title/Abstract] OR dogs[Title/Abstract] OR canine[Title/Abstract] OR cat[Title/Abstract] OR cats[Title/Abstract] OR feline[Title/Abstract])"
    relevance_block = (
        '(pharmacokinetic*[Title/Abstract] OR pharmacology[Title/Abstract] OR metabolism[Title/Abstract] '
        'OR clearance[Title/Abstract] OR "half-life"[Title/Abstract] OR bioavailability[Title/Abstract] '
        'OR dosage[Title/Abstract] OR dosing[Title/Abstract] OR safety[Title/Abstract] '
        'OR toxicity[Title/Abstract] OR adverse[Title/Abstract] OR contraindication*[Title/Abstract] '
        'OR "drug interaction"[Title/Abstract] OR efficacy[Title/Abstract] OR label[Title/Abstract] '
        'OR approved[Title/Abstract])'
    )
    exclusion_block = (
        '("vehicle control"[Title/Abstract] OR solvent[Title/Abstract] OR solvents[Title/Abstract] '
        'OR excipient[Title/Abstract] OR reagent[Title/Abstract] OR transcriptome[Title/Abstract] '
        'OR dataset[Title/Abstract] OR "cell line"[Title/Abstract] OR organoid[Title/Abstract] '
        'OR screening[Title/Abstract])'
    )
    return f'"{drug_name}"[Title/Abstract] AND {species_block} AND {relevance_block} NOT {exclusion_block}'


def ncbi_get(endpoint: str, params: dict):
    response = requests.get(
        f"{NCBI_EUTILS_BASE}/{endpoint}",
        params={**params, "email": NCBI_EMAIL, "tool": NCBI_TOOL},
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    return response


def search_pmc_ids(query: str):
    response = ncbi_get(
        "esearch.fcgi",
        {
            "db": "pmc",
            "term": query,
            "retmax": SEARCH_CANDIDATE_COUNT,
            "sort": "relevance",
            "retmode": "json",
        },
    )
    record = response.json()
    return record.get("esearchresult", {}).get("idlist", [])


def fetch_summaries(pmc_ids):
    if not pmc_ids:
        return {}

    response = ncbi_get(
        "esummary.fcgi",
        {
            "db": "pmc",
            "id": ",".join(pmc_ids),
            "retmode": "json",
        },
    )
    result = response.json().get("result", {})

    summary_map = {}
    for pmc_id in result.get("uids", []):
        record = result.get(pmc_id, {})
        pmc_id = str(pmc_id).strip()
        if pmc_id:
            summary_map[pmc_id] = {
                "title": record.get("title", "Title Not Found"),
                "url": f"https://www.ncbi.nlm.nih.gov/pmc/articles/PMC{pmc_id}/",
            }
    return summary_map


def join_text(element):
    if element is None:
        return ""
    return " ".join(part.strip() for part in element.itertext() if part and part.strip())


def fetch_article_abstracts(pmc_ids):
    if not pmc_ids:
        return {}

    response = ncbi_get(
        "efetch.fcgi",
        {
            "db": "pmc",
            "id": ",".join(pmc_ids),
            "retmode": "xml",
        },
    )
    raw_xml = response.text

    try:
        root = ET.fromstring(raw_xml)
    except ET.ParseError:
        return {}

    article_map = {}
    for article in root.findall(".//article"):
        pmc_id = join_text(article.find(".//front/article-meta/article-id[@pub-id-type='pmcaid']"))
        if not pmc_id:
            raw_pmcid = join_text(article.find(".//front/article-meta/article-id[@pub-id-type='pmcid']"))
            pmc_id = raw_pmcid.replace("PMC", "").strip()
        abstract_text = join_text(article.find(".//front/article-meta/abstract"))
        if pmc_id:
            article_map[pmc_id] = {"abstract": abstract_text}
    return article_map


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
        reasons.append("excluded_no_drug_in_title_abstract")

    if species_hits:
        score += 4
        reasons.append(f"species:{', '.join(species_hits[:3])}")
    else:
        excluded = True
        reasons.append("excluded_no_dog_cat_in_title_abstract")

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

    return {
        "score": score,
        "reasons": reasons,
        "excluded": excluded,
        "ddi_relevant": ddi_relevant,
        "fda_relevant": fda_relevant,
    }


def get_evidence_targets(file_path: Path, payload: dict):
    data_quality = payload.get("_data_quality") or {}
    pmc_fields = data_quality.get("pmc_rag_fields") or []

    fda_label_fields = list(FDA_LABEL_FIELDS)
    approved_label_signals = []

    dosage_and_kinetics = payload.get("dosage_and_kinetics") or {}
    for species_payload in dosage_and_kinetics.values():
        if not isinstance(species_payload, dict):
            continue
        for dosage in species_payload.get("dosage_list") or []:
            combined = " ".join(
                str(dosage.get(key, ""))
                for key in ("context", "evidence", "duration_note")
            ).lower()
            if "fda" in combined or "label" in combined or "approved" in combined:
                approved_label_signals.append(combined)

    if approved_label_signals:
        fda_label_fields.append("dosage_and_kinetics.*.dosage_list[*].evidence")

    return {
        "pmc_fields": pmc_fields,
        "fda_label_fields": sorted(set(fda_label_fields)),
        "file_path": str(file_path),
    }


def build_metadata_patch(payload: dict, accepted_references, evidence_targets):
    data_quality = payload.get("_data_quality") or {}
    extraction_metadata = payload.get("_extraction_metadata") or {}

    current_ddi_source = data_quality.get("ddi_source")
    current_source_file = extraction_metadata.get("source_file")

    suggested_ddi_source = current_ddi_source
    if accepted_references and any(reference["ddi_relevant"] for reference in accepted_references):
        suggested_ddi_source = "PMC_strict_vet"

    suggested_source_file = current_source_file
    if accepted_references:
        suggested_source_file = f"{current_source_file} + PMC strict vet references"

    return {
        "_data_quality.ddi_source": {
            "current": current_ddi_source,
            "suggested": suggested_ddi_source,
        },
        "_extraction_metadata.source_file": {
            "current": current_source_file,
            "suggested": suggested_source_file,
        },
        "fda_label": {
            "available_now": any(reference["fda_relevant"] for reference in accepted_references),
            "candidate_fields": evidence_targets["fda_label_fields"],
            "status": "pending_manual_label_ingest",
        },
    }


def get_pmc_references(drug_name: str):
    query = build_strict_query(drug_name)

    try:
        pmc_ids = search_pmc_ids(query)
        if not pmc_ids:
            return query, []

        summaries = fetch_summaries(pmc_ids)
        article_abstracts = fetch_article_abstracts(pmc_ids)

        candidates = []
        for pmc_id in pmc_ids:
            summary = summaries.get(pmc_id, {})
            title = summary.get("title", "Title Not Found")
            abstract_text = article_abstracts.get(pmc_id, {}).get("abstract", "")
            evaluation = evaluate_candidate(drug_name=drug_name, title=title, abstract_text=abstract_text)

            if evaluation["excluded"] or evaluation["score"] < 4:
                continue

            candidates.append(
                {
                    "pmc_id": pmc_id,
                    "title": title,
                    "url": summary.get("url", "URL Not Found"),
                    "abstract": abstract_text,
                    "score": evaluation["score"],
                    "reasons": evaluation["reasons"],
                    "ddi_relevant": evaluation["ddi_relevant"],
                    "fda_relevant": evaluation["fda_relevant"],
                }
            )

        candidates.sort(key=lambda item: item["score"], reverse=True)
        return query, candidates[:SELECT_REFERENCE_COUNT]

    except Exception as error:
        print(f"Error fetching data for {drug_name}: {error}")
        return query, []


def write_text_report(result_rows):
    with open(TEXT_OUTPUT_FILENAME, "w", encoding="utf-8") as file_obj:
        file_obj.write("--- PMC 레퍼런스 수집 테스트 결과 ---\n\n")

        for row in result_rows:
            file_obj.write(f"■ Drug Name: {row['drug_name']}\n")
            file_obj.write(f"  Query: {row['query']}\n")
            file_obj.write(
                "  PMC 보강 필드: "
                + (", ".join(row["evidence_targets"]["pmc_fields"]) if row["evidence_targets"]["pmc_fields"] else "없음")
                + "\n"
            )
            file_obj.write(
                "  FDA 라벨 보강 필드: "
                + ", ".join(row["evidence_targets"]["fda_label_fields"])
                + "\n"
            )

            if not row["accepted_references"]:
                file_obj.write("  -> 제목 또는 초록에 약물명과 개/고양이 종 언급이 동시에 있는 직접 관련 레퍼런스를 찾지 못했습니다.\n")
            else:
                for index, reference in enumerate(row["accepted_references"], start=1):
                    file_obj.write(f"  [{index}] Score: {reference['score']}\n")
                    file_obj.write(f"     Title: {reference['title']}\n")
                    file_obj.write(f"     URL: {reference['url']}\n")
                    file_obj.write(f"     Match: {', '.join(reference['reasons'])}\n")

            file_obj.write("-" * 30 + "\n\n")


def write_json_report(result_rows):
    with open(JSON_OUTPUT_FILENAME, "w", encoding="utf-8") as file_obj:
        json.dump(result_rows, file_obj, ensure_ascii=False, indent=2)


def main():
    print("PMC 레퍼런스 수집 테스트를 시작합니다...")

    all_records = list(iter_drug_records())
    sampled_records = random.sample(all_records, min(RANDOM_SAMPLE_SIZE, len(all_records)))
    result_rows = []

    for record in sampled_records:
        drug_name = record["name"]
        print(f"[{drug_name}] 검색 중...")
        time.sleep(API_DELAY_SECONDS)

        payload = load_drug_payload(record["file_path"])
        query, accepted_references = get_pmc_references(drug_name)
        evidence_targets = get_evidence_targets(record["file_path"], payload)
        metadata_patch = build_metadata_patch(payload, accepted_references, evidence_targets)

        result_rows.append(
            {
                "drug_name": drug_name,
                "drug_id": payload.get("id"),
                "drug_file": str(record["file_path"]),
                "query": query,
                "evidence_targets": evidence_targets,
                "accepted_references": accepted_references,
                "proposed_metadata_updates": metadata_patch,
            }
        )

    write_text_report(result_rows)
    write_json_report(result_rows)

    print(
        f"\n테스트가 완료되었습니다. '{TEXT_OUTPUT_FILENAME}' 및 '{JSON_OUTPUT_FILENAME}' 파일을 확인해 주세요."
    )


if __name__ == "__main__":
    main()

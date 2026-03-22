#!/usr/bin/env python3
import argparse
import json
import re
import sys
import time
from collections import Counter
from pathlib import Path


WORKSPACE_ROOT = Path(__file__).resolve().parents[2]
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

import find_reference as fr


DEFAULT_FAILED_GLOB = "runs/reference_chunks/test_pmc_references_chunk_*_failed_drugs.json"
DEFAULT_OUTPUT_JSON = "runs/reference_chunks/failed_drugs_recheck.json"
DEFAULT_OUTPUT_TXT = "runs/reference_chunks/failed_drugs_recheck.txt"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Re-check failed drug references with relevance-first fallback strategies."
    )
    parser.add_argument("--failed-glob", default=DEFAULT_FAILED_GLOB)
    parser.add_argument("--output-json", default=DEFAULT_OUTPUT_JSON)
    parser.add_argument("--output-txt", default=DEFAULT_OUTPUT_TXT)
    parser.add_argument("--limit", type=int, default=None, help="Limit the number of drugs to process")
    parser.add_argument("--max-alternatives", type=int, default=3)
    parser.add_argument("--sleep", type=float, default=0.34, help="Delay between API calls (seconds)")
    return parser.parse_args()


def normalize_drug_key(name: str) -> str:
    cleaned = re.sub(r"\s+", " ", (name or "").strip())
    return fr.normalize_text(cleaned)


def load_failed_drugs(failed_glob: str) -> list[str]:
    drugs: list[str] = []
    for file_path in sorted(WORKSPACE_ROOT.glob(failed_glob)):
        with file_path.open("r", encoding="utf-8") as file_obj:
            payload = json.load(file_obj)
        if isinstance(payload, list):
            drugs.extend(str(item).strip() for item in payload if str(item).strip())

    unique = []
    seen = set()
    for drug in drugs:
        key = normalize_drug_key(drug)
        if key and key not in seen:
            unique.append(drug)
            seen.add(key)
    return unique


def build_record_index() -> dict[str, dict]:
    index: dict[str, dict] = {}
    for record in fr.iter_drug_records():
        key = normalize_drug_key(record["name"])
        if key and key not in index:
            index[key] = record
    return index


def build_relaxed_query(drug_name: str) -> str:
    species_block = (
        "(dog[Title/Abstract] OR dogs[Title/Abstract] OR canine[Title/Abstract] "
        "OR cat[Title/Abstract] OR cats[Title/Abstract] OR feline[Title/Abstract])"
    )
    relevance_block = (
        '(pharmacokinetic*[Title/Abstract] OR pharmacology[Title/Abstract] OR metabolism[Title/Abstract] '
        'OR clearance[Title/Abstract] OR "half-life"[Title/Abstract] OR bioavailability[Title/Abstract] '
        'OR dosage[Title/Abstract] OR dosing[Title/Abstract] OR safety[Title/Abstract] '
        'OR toxicity[Title/Abstract] OR adverse[Title/Abstract] OR contraindication*[Title/Abstract] '
        'OR "drug interaction"[Title/Abstract] OR efficacy[Title/Abstract] OR label[Title/Abstract] '
        'OR approved[Title/Abstract])'
    )
    drug_block = f'("{drug_name}"[Title/Abstract] OR "{drug_name}"[Name of Substance])'
    return f"{drug_block} AND {species_block} AND {relevance_block}"


def build_broad_query(drug_name: str) -> str:
    species_block = (
        "(dog[Title/Abstract] OR dogs[Title/Abstract] OR canine[Title/Abstract] "
        "OR cat[Title/Abstract] OR cats[Title/Abstract] OR feline[Title/Abstract])"
    )
    return f'("{drug_name}"[Title/Abstract] OR "{drug_name}"[Name of Substance]) AND {species_block}'


def parse_metric_float(value) -> float | None:
    try:
        raw = str(value).replace(",", "").strip()
        return float(raw) if raw else None
    except (TypeError, ValueError):
        return None


def reliability_score(journal_metrics: dict | None) -> tuple[float, list[str]]:
    if not journal_metrics:
        return 0.0, ["no_journal_metric"]

    score = 0.0
    reasons: list[str] = []
    jcr = journal_metrics.get("jcr") or {}
    scimago = journal_metrics.get("scimago") or {}

    if jcr:
        score += 4.0
        reasons.append("jcr_available")
        quartile = str(jcr.get("jif_quartile") or "").upper().strip()
        quartile_bonus = {"Q1": 3.0, "Q2": 2.0, "Q3": 1.0, "Q4": 0.5}.get(quartile, 0.0)
        if quartile_bonus:
            score += quartile_bonus
            reasons.append(f"jcr_{quartile.lower()}")
        jif = parse_metric_float(jcr.get("jif"))
        if jif is not None:
            score += min(jif, 20.0) / 5.0
            reasons.append("jif_signal")

    if scimago:
        score += 2.0
        reasons.append("scimago_available")
        quartile = str(scimago.get("sjr_best_quartile") or "").upper().strip()
        quartile_bonus = {"Q1": 2.0, "Q2": 1.5, "Q3": 1.0, "Q4": 0.5}.get(quartile, 0.0)
        if quartile_bonus:
            score += quartile_bonus
            reasons.append(f"scimago_{quartile.lower()}")
        h_index = parse_metric_float(scimago.get("h_index"))
        if h_index is not None:
            score += min(h_index, 300.0) / 100.0
            reasons.append("h_index_signal")

    return score, reasons


def summarize_exclusion(candidates: list[dict]) -> dict:
    reason_counter: Counter[str] = Counter()
    for candidate in candidates:
        for reason in candidate.get("reasons") or []:
            if reason.startswith("excluded_"):
                reason_counter[reason] += 1

    if not reason_counter:
        return {
            "primary_reason": "no_exclusion_reason_captured",
            "reason_counts": {},
        }

    primary_reason = reason_counter.most_common(1)[0][0]
    return {
        "primary_reason": primary_reason,
        "reason_counts": dict(reason_counter),
    }


def run_query_tier(drug_name: str, tier_name: str, query: str, delay_seconds: float) -> dict:
    pmc_ids = fr.search_pmc_ids(query)
    time.sleep(delay_seconds)

    summaries = fr.fetch_summaries(pmc_ids)
    time.sleep(delay_seconds)

    article_metadata = fr.fetch_article_metadata(pmc_ids)
    time.sleep(delay_seconds)

    ranked = []
    for pmc_id in pmc_ids:
        summary = summaries.get(pmc_id, {})
        title = summary.get("title", "Title Not Found")
        article_record = article_metadata.get(pmc_id, {})
        abstract_text = article_record.get("abstract", "")
        evaluation = fr.evaluate_candidate(drug_name=drug_name, title=title, abstract_text=abstract_text)

        journal_title = article_record.get("journal_title", "")
        journal_issns = article_record.get("journal_issns", [])
        journal_metrics = fr.build_journal_metrics(journal_title=journal_title, journal_issns=journal_issns)
        rel_score, rel_reasons = reliability_score(journal_metrics)

        relevance = float(evaluation.get("score", 0))
        combined = relevance * 10.0 + rel_score
        ranked.append(
            {
                "pmc_id": pmc_id,
                "title": title,
                "url": summary.get("url", ""),
                "journal_title": journal_title,
                "journal_issns": journal_issns,
                "journal_metrics": journal_metrics,
                "relevance_score": relevance,
                "reliability_score": rel_score,
                "combined_score": combined,
                "excluded": bool(evaluation.get("excluded")),
                "ddi_relevant": bool(evaluation.get("ddi_relevant")),
                "fda_relevant": bool(evaluation.get("fda_relevant")),
                "reasons": list(evaluation.get("reasons") or []) + rel_reasons,
            }
        )

    ranked.sort(key=lambda item: item["combined_score"], reverse=True)
    accepted = [
        item
        for item in ranked
        if not item["excluded"] and item["relevance_score"] >= 4.0
    ]

    return {
        "tier": tier_name,
        "query": query,
        "pmc_count": len(pmc_ids),
        "candidate_count": len(ranked),
        "accepted_count": len(accepted),
        "accepted": accepted,
        "ranked": ranked,
    }


def choose_alternatives(tier_results: list[dict], max_alternatives: int) -> list[dict]:
    merged = []
    seen = set()

    for tier in tier_results:
        for item in tier["accepted"]:
            pmc_id = item.get("pmc_id")
            if pmc_id and pmc_id not in seen:
                enriched = dict(item)
                enriched["selected_from_tier"] = tier["tier"]
                merged.append(enriched)
                seen.add(pmc_id)

    # If no accepted refs are found, offer near-miss candidates as alternatives.
    if not merged:
        for tier in tier_results:
            for item in tier["ranked"]:
                pmc_id = item.get("pmc_id")
                if not pmc_id or pmc_id in seen:
                    continue

                blocked_by_hard_exclusion = any(
                    reason.startswith("excluded_solvent") or reason.startswith("excluded_method_bias")
                    for reason in item.get("reasons") or []
                )
                if blocked_by_hard_exclusion:
                    continue

                if item.get("relevance_score", 0.0) < 2.0:
                    continue

                enriched = dict(item)
                enriched["selected_from_tier"] = tier["tier"]
                merged.append(enriched)
                seen.add(pmc_id)
                if len(merged) >= max_alternatives:
                    break
            if len(merged) >= max_alternatives:
                break

    return merged[:max_alternatives]


def diagnose_failure(tier_results: list[dict]) -> dict:
    any_pmc = any(tier["pmc_count"] > 0 for tier in tier_results)
    any_accepted = any(tier["accepted_count"] > 0 for tier in tier_results)

    if any_accepted:
        return {
            "status": "resolved_by_retry",
            "primary_reason": "resolved_with_fallback_query",
            "reason_counts": {},
        }

    all_ranked = []
    for tier in tier_results:
        all_ranked.extend(tier["ranked"])

    exclusion = summarize_exclusion(all_ranked)
    if not any_pmc:
        return {
            "status": "no_hits",
            "primary_reason": "no_pmc_results_for_all_tiers",
            "reason_counts": exclusion["reason_counts"],
        }

    return {
        "status": "still_unresolved",
        "primary_reason": exclusion["primary_reason"],
        "reason_counts": exclusion["reason_counts"],
    }


def recheck_drug(drug_name: str, max_alternatives: int, delay_seconds: float) -> dict:
    strict_query = fr.build_strict_query(drug_name)
    relaxed_query = build_relaxed_query(drug_name)
    broad_query = build_broad_query(drug_name)

    tier_results = [
        run_query_tier(drug_name, "strict", strict_query, delay_seconds),
        run_query_tier(drug_name, "relaxed_relevance", relaxed_query, delay_seconds),
        run_query_tier(drug_name, "broad_species", broad_query, delay_seconds),
    ]

    alternatives = choose_alternatives(tier_results, max_alternatives)
    diagnosis = diagnose_failure(tier_results)

    return {
        "drug_name": drug_name,
        "diagnosis": diagnosis,
        "tier_results": [
            {
                "tier": tier["tier"],
                "query": tier["query"],
                "pmc_count": tier["pmc_count"],
                "candidate_count": tier["candidate_count"],
                "accepted_count": tier["accepted_count"],
            }
            for tier in tier_results
        ],
        "alternatives": alternatives,
    }


def write_text_report(rows: list[dict], output_path: Path) -> None:
    lines = []
    resolved = 0
    unresolved = 0

    for row in rows:
        diagnosis = row["diagnosis"]
        if diagnosis["status"] == "resolved_by_retry":
            resolved += 1
        else:
            unresolved += 1

        lines.append(f"[Drug] {row['drug_name']}")
        lines.append(f"  status: {diagnosis['status']}")
        lines.append(f"  primary_reason: {diagnosis['primary_reason']}")
        if diagnosis["reason_counts"]:
            lines.append(f"  reason_counts: {json.dumps(diagnosis['reason_counts'], ensure_ascii=False)}")

        for tier in row["tier_results"]:
            lines.append(
                "  "
                + f"tier={tier['tier']}, pmc={tier['pmc_count']}, "
                + f"candidates={tier['candidate_count']}, accepted={tier['accepted_count']}"
            )

        if row["alternatives"]:
            lines.append("  alternatives:")
            for alt in row["alternatives"]:
                lines.append(
                    "    "
                    + f"- PMC{alt.get('pmc_id')}: rel={alt.get('relevance_score')}, "
                    + f"trust={round(float(alt.get('reliability_score') or 0), 2)}, "
                    + f"tier={alt.get('selected_from_tier')}"
                )
                lines.append(f"      title: {alt.get('title')}")
                lines.append(f"      url: {alt.get('url')}")

        lines.append("")

    lines.append("==== Summary ====")
    lines.append(f"total: {len(rows)}")
    lines.append(f"resolved_by_retry: {resolved}")
    lines.append(f"still_unresolved: {unresolved}")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    args = parse_args()
    failed_drugs = load_failed_drugs(args.failed_glob)
    if args.limit is not None:
        failed_drugs = failed_drugs[: max(0, args.limit)]

    record_index = build_record_index()

    rows = []
    for idx, drug_name in enumerate(failed_drugs, start=1):
        print(f"[{idx}/{len(failed_drugs)}] rechecking: {drug_name}")
        result = recheck_drug(
            drug_name=drug_name,
            max_alternatives=max(1, args.max_alternatives),
            delay_seconds=max(0.0, args.sleep),
        )

        key = normalize_drug_key(drug_name)
        if key in record_index:
            result["drug_file"] = str(record_index[key]["file_path"])

        rows.append(result)

    output_json = WORKSPACE_ROOT / args.output_json
    output_txt = WORKSPACE_ROOT / args.output_txt
    output_json.parent.mkdir(parents=True, exist_ok=True)

    with output_json.open("w", encoding="utf-8") as file_obj:
        json.dump(rows, file_obj, ensure_ascii=False, indent=2)

    write_text_report(rows, output_txt)

    resolved = sum(1 for row in rows if row["diagnosis"]["status"] == "resolved_by_retry")
    unresolved = len(rows) - resolved
    print(f"done: {len(rows)}")
    print(f"resolved_by_retry: {resolved}")
    print(f"still_unresolved: {unresolved}")
    print(f"json_report: {output_json}")
    print(f"text_report: {output_txt}")


if __name__ == "__main__":
    main()
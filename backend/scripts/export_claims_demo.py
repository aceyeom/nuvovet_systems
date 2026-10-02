"""
Export the synthetic claims demo as a static snapshot for the frontend.

The insurer console reads the live API when it is reachable and falls back to
this file, so the hosted demo works before the backend is redeployed.

    python scripts/export_claims_demo.py                # from backend/
    python scripts/export_claims_demo.py --stats-only   # only frontend/src/data/landingStats.json

Codes without a public price source are exported with `benchmark: null`; the
fee-benchmark page lists them separately and never invents a price.

It also writes the landing page's hero figures (landingStats.json), computed
from the same data, so the page never states a number the repo does not
produce. tests/test_data_licensing.py fails when that file is stale.
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from fastapi.encoders import jsonable_encoder  # noqa: E402

from claims import knowledge  # noqa: E402
from claims.codebook import compact, procedure_book  # noqa: E402
from routers.claims import _demo, _sorted_rows, _summary, insurer_profiles_payload  # noqa: E402

OUT = ROOT.parent / "frontend" / "src" / "data" / "claimsDemoSnapshot.json"
STATS_OUT = ROOT.parent / "frontend" / "src" / "data" / "landingStats.json"


def landing_stats(n: int = 300, seed: int = 7) -> dict:
    """Figures quoted on the landing page: Korean name aliases the resolver uses, and how many findings in the
    demo batch carry a rule ID and an explanation."""
    book = knowledge._curated_book()
    db = knowledge.get_drug_db()
    curated = {compact(a) for drug_id, names in book["aliases"].items() if drug_id in db for a in names}
    curated |= {compact(k) for k in (book.get("combinations") or {}) if not k.startswith("_")}
    curated.discard("")
    qia = set(knowledge._qia_index())
    _, ev = _demo(n, seed)
    findings = [f for _, r in ev["_results"] for f in r.findings]
    explained = sum(1 for f in findings if f.rule and f.title and f.detail)
    return {
        "aliases": {"total": len(curated | qia), "curated": len(curated), "qia": len(qia)},
        "findings": {"total": len(findings), "with_rule_and_explanation": explained,
                     "with_evidence": sum(1 for f in findings if f.evidence)},
        "params": {"n": n, "seed": seed},
    }


def write_landing_stats() -> None:
    STATS_OUT.write_text(json.dumps(landing_stats(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {STATS_OUT}")


def _compact(obj):
    """Drop null / empty values from per-claim details (the console reads absent and null alike) and the
    per-claim copy of the insurer profile's source list (the snapshot carries the profiles once)."""
    if isinstance(obj, dict):
        return {k: _compact(v) for k, v in obj.items() if v is not None and v != [] and v != {} and k != "source_urls"}
    if isinstance(obj, list):
        return [_compact(v) for v in obj]
    return obj


def main(n: int = 300, seed: int = 7) -> None:
    _, ev = _demo(n, seed)
    rows = _sorted_rows(ev["_results"])
    details = {
        r.claim_id: {"claim": c.claim, "policy": c.policy, "labels": c.labels, "adjudication": r}
        for c, r in ev["_results"]
    }
    evaluation = {k: v for k, v in ev.items() if k != "_results"}
    procedures = [
        {k: p.get(k) for k in ("code", "category", "coverage_category", "name_ko", "name_en", "unit", "benchmark")}
        for p in procedure_book()["codes"]
    ]
    snapshot = {
        "synthetic": True,
        "params": {"n": n, "seed": seed},
        "summary": _summary(ev),
        "claims": rows,
        "details": _compact(jsonable_encoder(details)),
        "evaluation": evaluation,
        "procedures": procedures,
        "region_multipliers": procedure_book()["_meta"]["region_multipliers"],
        "insurers": insurer_profiles_payload(),
    }
    OUT.write_text(json.dumps(jsonable_encoder(snapshot), ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size / 1024:.0f} KB, {len(rows)} claims)")


if __name__ == "__main__":
    if "--stats-only" not in sys.argv:
        main()
    write_landing_stats()

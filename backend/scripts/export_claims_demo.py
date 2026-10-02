"""
Export the synthetic claims demo as a static snapshot for the frontend.

The insurer console reads the live API when it is reachable and falls back to
this file, so the hosted demo works before the backend is redeployed.

    python scripts/export_claims_demo.py   # from backend/
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from fastapi.encoders import jsonable_encoder  # noqa: E402

from claims.codebook import procedure_book  # noqa: E402
from routers.claims import _demo, _row, _summary  # noqa: E402

OUT = ROOT.parent / "frontend" / "src" / "data" / "claimsDemoSnapshot.json"


def main(n: int = 300, seed: int = 7) -> None:
    _, ev = _demo(n, seed)
    rows = [_row(c, r) for c, r in ev["_results"]]
    rows.sort(key=lambda x: (x["decision"] == "auto_approve", -x["finding_count"], -x["billed"]))
    details = {
        r.claim_id: {"claim": c.claim, "policy": c.policy, "labels": c.labels, "adjudication": r}
        for c, r in ev["_results"]
    }
    evaluation = {k: v for k, v in ev.items() if k != "_results"}
    procedures = [
        {k: p[k] for k in ("code", "category", "name_ko", "name_en", "unit", "benchmark")}
        for p in procedure_book()["codes"]
    ]
    snapshot = {
        "synthetic": True,
        "params": {"n": n, "seed": seed},
        "summary": _summary(ev),
        "claims": rows,
        "details": details,
        "evaluation": evaluation,
        "procedures": procedures,
        "region_multipliers": procedure_book()["_meta"]["region_multipliers"],
    }
    OUT.write_text(json.dumps(jsonable_encoder(snapshot), ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size / 1024:.0f} KB, {len(rows)} claims)")


if __name__ == "__main__":
    main()

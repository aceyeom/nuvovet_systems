"""Price percentiles against a log-normal fitted to each code's p10/p50/p90."""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Optional

from .codebook import procedure_book, procedures_by_code

_Z90 = 1.2815515655446004  # standard-normal z at the 90th percentile


def _phi(z: float) -> float:
    return 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))


@dataclass
class PricePosition:
    percentile: float
    median: int
    p90: int
    region_multiplier: float
    source: str
    is_estimate: bool


def region_multiplier(region: Optional[str]) -> float:
    table = procedure_book()["_meta"]["region_multipliers"]
    return table.get(region or "", table["default"])


def price_position(code: str, unit_price: int, region: Optional[str] = None) -> Optional[PricePosition]:
    proc = procedures_by_code().get(code)
    if not proc or unit_price <= 0:
        return None
    bm = proc["benchmark"]
    m = region_multiplier(region)
    p10, p50, p90 = bm["p10"] * m, bm["p50"] * m, bm["p90"] * m
    # Asymmetric spread: right-skewed vet prices need separate tails.
    sigma = math.log(p90 / p50) / _Z90 if unit_price >= p50 else math.log(p50 / p10) / _Z90
    z = math.log(unit_price / p50) / sigma if sigma > 0 else 0.0
    return PricePosition(
        percentile=round(100 * _phi(z), 1),
        median=int(round(p50, -2)),
        p90=int(round(p90, -2)),
        region_multiplier=m,
        source=bm["source"],
        is_estimate=bool(bm.get("is_estimate", True)),
    )

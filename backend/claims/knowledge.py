"""
Drug knowledge used by the claims engine.

Resolution (Korean product name / brand / ingredient → drug id) runs over the
drug database. Therapeutic class comes from NuvoVet's own controlled vocabulary.
Dose references come from the legacy drug records and are always returned with
their provenance so a reviewer can see how much weight a finding deserves.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from functools import lru_cache
from typing import Dict, List, Optional, Tuple

from services.drug_loader import get_drug_db
from services.fuzzy_search import fuzzy_score

from .codebook import DATA_DIR, compact

_STRENGTH = re.compile(
    r"\d+(\.\d+)?\s*(mg/ml|mg|mcg|μg|ug|ml|g|%|iu|정|캡슐|cap|tab|t|c|병|포|일분)?", re.IGNORECASE
)
_NON_SYSTEMIC = ("ophthalmic", "otic", "topical", "transdermal")
_NON_SYSTEMIC_HINTS = ("점안", "안약", "안연고", "ophthalmic", "eye", "귀약", "otic", "연고", "topical", "외용", "패치", "patch")


@lru_cache(maxsize=1)
def _classes() -> dict:
    return json.loads((DATA_DIR / "therapeutic_classes.json").read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def clinical_rules() -> dict:
    return json.loads((DATA_DIR / "clinical_rules.json").read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def _alias_index() -> List[Tuple[str, str]]:
    """(compact alias, canonical drug_id), longest first. Curated aliases outrank the raw DB."""
    book = json.loads((DATA_DIR / "kr_drug_aliases.json").read_text(encoding="utf-8"))
    db = get_drug_db()
    pairs = [
        (compact(alias), drug_id)
        for drug_id, names in book["aliases"].items()
        if drug_id in db
        for alias in [drug_id.replace("_", " "), *names]
        if len(compact(alias)) >= 2
    ]
    return sorted(pairs, key=lambda p: len(p[0]), reverse=True)


def _canonical(drug_id: str) -> str:
    """Map duplicate Korean-id product records onto the canonical ingredient record."""
    if drug_id.isascii():
        return drug_id
    for alias, canon in _alias_index():
        if alias == compact(drug_id):
            return canon
    return drug_id


@lru_cache(maxsize=1)
def _name_index() -> List[Tuple[str, str, int]]:
    """(compact name, drug_id, priority) — higher priority = more canonical name."""
    out: List[Tuple[str, str, int]] = []
    for drug_id, raw in get_drug_db().items():
        ident = raw.get("drug_identity") or {}
        canon = [drug_id.replace("_", " "), ident.get("name_en"), ident.get("name_ko"), ident.get("active_ingredient")]
        for name in canon:
            c = compact(name or "")
            if len(c) >= 2:
                out.append((c, drug_id, 3))
        for name in (ident.get("product_names_ko") or []) + (ident.get("product_names_en") or []):
            c = compact(_STRENGTH.sub(" ", name or ""))
            if len(c) >= 2:
                out.append((c, drug_id, 2))
        for name in ident.get("brand_names") or []:
            c = compact(name or "")
            # Short Latin brand names ("M", "Inj") produce false hits inside longer words.
            if len(c) >= 4 or (len(c) >= 2 and re.search("[가-힣]", c)):
                out.append((c, drug_id, 1))
    return sorted(out, key=lambda t: (len(t[0]), t[2]), reverse=True)


def _penalty(drug_id: str, wants_local: bool) -> int:
    local = any(tag in drug_id for tag in _NON_SYSTEMIC)
    return 0 if local == wants_local else 1


@lru_cache(maxsize=4096)
def resolve_drug(name: str) -> Tuple[Optional[str], float]:
    """Return (drug_id, confidence) for a free-text drug or product name."""
    raw = (name or "").strip()
    if not raw:
        return None, 0.0
    wants_local = any(h in raw.lower() for h in _NON_SYSTEMIC_HINTS)
    text = compact(_STRENGTH.sub(" ", raw))
    if not text:
        return None, 0.0
    db = get_drug_db()
    if text.replace(" ", "_") in db:
        return _canonical(text.replace(" ", "_")), 1.0

    for alias, canon in _alias_index():
        if alias == text:
            return canon, 0.99
    for alias, canon in _alias_index():
        if len(alias) >= 3 and alias in text:
            # Prefer a local (ophthalmic/otic) record when the line says so.
            if wants_local and not any(tag in canon for tag in _NON_SYSTEMIC):
                local = [c for a, c in _alias_index() if a == alias and any(t in c for t in _NON_SYSTEMIC)]
                canon = local[0] if local else canon
            return canon, round(min(0.95, 0.7 + 0.3 * len(alias) / len(text)), 2)

    exact = [(d, p) for c, d, p in _name_index() if c == text]
    if exact:
        exact.sort(key=lambda t: (_penalty(t[0], wants_local), -t[1]))
        return _canonical(exact[0][0]), 0.97

    contained = [(c, d, p) for c, d, p in _name_index() if len(c) >= 3 and c in text]
    if contained:
        best_len = len(contained[0][0])
        top = [t for t in contained if len(t[0]) == best_len]
        top.sort(key=lambda t: (_penalty(t[1], wants_local), -t[2]))
        coverage = best_len / len(text)
        return _canonical(top[0][1]), round(min(0.93, 0.55 + 0.4 * coverage), 2)

    # Fuzzy fallback over the search index (handles typos and jamo variants).
    from services.drug_loader import get_search_index

    query = _STRENGTH.sub(" ", raw).strip().lower()
    scored = [(fuzzy_score(query, entry), entry["id"]) for entry in get_search_index()]
    scored = [s for s in scored if s[0] >= 30]
    if scored:
        scored.sort(key=lambda s: (-s[0], _penalty(s[1], wants_local)))
        return _canonical(scored[0][1]), round(scored[0][0] / 100, 2)
    return None, 0.0


def drug_label(drug_id: str) -> str:
    ident = (get_drug_db().get(drug_id) or {}).get("drug_identity") or {}
    return ident.get("name_ko") or ident.get("name_en") or drug_id


def therapeutic_class(drug_id: Optional[str]) -> Optional[str]:
    if not drug_id:
        return None
    book = _classes()
    if drug_id in book["drugs"]:
        return book["drugs"][drug_id]
    db_class = ((get_drug_db().get(drug_id) or {}).get("drug_identity") or {}).get("class") or ""
    return book["db_class_fallback"].get(db_class.strip().lower())


def class_label(cls: Optional[str]) -> str:
    return (_classes()["classes"].get(cls or "") or {}).get("ko", cls or "미분류")


@dataclass
class DoseReference:
    max_mg_per_kg: float
    typical_mg_per_kg: float
    contexts: List[str]
    provenance: str


def _parse_values(value) -> List[float]:
    if value is None:
        return []
    if isinstance(value, (int, float)):
        return [float(value)]
    return [float(x) for x in re.findall(r"\d+(?:\.\d+)?", str(value))]


def dose_reference(drug_id: str, species: str, route: Optional[str] = None) -> Optional[DoseReference]:
    """Highest per-administration mg/kg found for the species (optionally the route)."""
    raw = get_drug_db().get(drug_id) or {}
    entries = ((raw.get("dosage_and_kinetics") or {}).get(species) or {}).get("dosage_list") or []
    candidates: List[Tuple[float, str]] = []
    for e in entries:
        if not isinstance(e, dict) or (e.get("unit") or "").lower() != "mg/kg":
            continue
        if route and e.get("route") and e["route"].upper() != route.upper():
            continue
        vals = _parse_values(e.get("value"))
        if e.get("max_dose_mg_kg") is not None:
            vals += _parse_values(e.get("max_dose_mg_kg"))
        if vals:
            candidates.append((max(vals), e.get("context") or ""))
    if not candidates and route:
        return dose_reference(drug_id, species, None)
    if not candidates:
        return None
    top = max(c[0] for c in candidates)
    ordered = sorted(c[0] for c in candidates)
    typical = ordered[(len(ordered) - 1) // 2]  # lower median: robust to one high-dose indication
    source = ((raw.get("_data_quality") or {}).get("ddi_source") or "unknown").lower()
    provenance = (
        "legacy compendium-derived record (pending clean-room rebuild)"
        if "plumb" in source
        else "legacy drug record (unreviewed)"
    )
    return DoseReference(top, typical, [c[1] for c in candidates if c[0] == top][:2], provenance)


def chronic_marker_diagnoses(drug_id: Optional[str]) -> Optional[List[str]]:
    if not drug_id:
        return None
    markers = clinical_rules()["chronic_marker_drugs"]
    return markers.get(drug_id)

"""
Drug knowledge used by the claims engine.

Resolution (Korean product name / brand / ingredient → drug id) runs in priority order:

  1. an exact drug id
  2. curated aliases (kr_drug_aliases.json), exact
  3. QIA registry brand stems (qia_aliases.json, licence number as provenance), exact
  4. curated or QIA alias inside a longer line (longest wins; curated on ties; QIA stems flagged
     contains_ok only — '펜다졸' is inside '옥스펜다졸', so it is exact-only)
  5. drug-database names, exact then contained
  6. fuzzy similarity (last resort; flagged source='fuzzy')

Resolution never lands on a legacy QIA-created duplicate or junk record (legacy_drug_records.json):
duplicates are followed to their canonical record, junk (excipients, fragments, biologics,
supplements) is never returned. `resolve_drug` keeps the v1 `(drug_id, confidence)` return;
`resolve_drug_full` also returns every ingredient of a combination product and the provenance.

Therapeutic class comes from NuvoVet's own controlled vocabulary. Dose references come from the
legacy drug records and are always returned with their provenance so a reviewer can see how much
weight a finding deserves. Only the numbers are used: the records' prose (indication 'context', evidence
text) is LLM-converted compendium text and is never passed into a finding (docs/DATA_PROVENANCE.md).
NUVOVET_DISABLE_LEGACY_DOSES=1 turns off the compendium-derived dose references altogether.
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from functools import lru_cache
from typing import Dict, FrozenSet, List, Optional, Tuple

from services.drug_loader import get_drug_db
from services.fuzzy_search import fuzzy_score

from .codebook import DATA_DIR, compact

_STRENGTH = re.compile(
    r"\d+(\.\d+)?\s*(mg/ml|mg|mcg|μg|ug|ml|g|%|iu|정|캡슐|cap|tab|t|c|병|포|일분)?", re.IGNORECASE
)
_NON_SYSTEMIC = ("ophthalmic", "otic", "topical", "transdermal")
# v1 accepted fuzzy scores ≥ 30. On the 2026-10 audit, Korean jamo matches in the 30–35 band were mostly wrong
# (아미노피린 → aminophylline, 노르플록사신 → orbifloxacin, 겐타마이신 점안액 tied with natamycin), while English typos
# score 41–45 (enrofloxacine, furosemid, gabapentine). Below 40 the line stays unresolved for a human.
FUZZY_MIN_SCORE = 40
_NON_SYSTEMIC_HINTS = ("점안", "안약", "안연고", "ophthalmic", "eye", "귀약", "otic", "연고", "topical", "외용", "패치", "patch")


def _read(name: str) -> dict:
    path = DATA_DIR / name
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


@lru_cache(maxsize=1)
def _classes() -> dict:
    return json.loads((DATA_DIR / "therapeutic_classes.json").read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def clinical_rules() -> dict:
    return json.loads((DATA_DIR / "clinical_rules.json").read_text(encoding="utf-8"))


# ── Product-name stems (shared with scripts/build_qia_aliases.py and build_noncovered.py) ──

_FORM = (r"주사액|주사제|주사|현탁액|현탁|츄어블정|츄어블|필름코팅정|정제|정|캡슐|캅셀|액제|액|산제|산|과립|안연고|안약|연고|크림|"
         r"점안액|점이액|점안|점이|스팟온|스포트온|스프레이|겔|젤|시럽|외용액|분무제|좌제|플러스주|주")
_SIZE = (r"초소형견용|소형견용|중형견용|대형견용|초대형견용|고양이용|강아지용|애견용|개용|"
         r"초소형견|소형견|중형견|대형견|초대형견|소형|중형|대형|용")
_TAIL = re.compile(r"[\s\-_/.,]*(?:" + _FORM + "|" + _SIZE + r")$")
_SPECIES_WORD = re.compile(r"\s+(?:독|캣|도그|dog|cat)$", re.I)
_EN_FORM_WORDS = re.compile(
    r"\b(tab(let)?s?|inj(ection)?|susp(ension)?|sol(ution)?|chewables?|caps?(ule)?s?|oral|for|dogs?|cats?|"
    r"small|medium|large|xs|s|m|l|xl|plus|forte)\b", re.I)


def product_stem(name: str) -> str:
    """Brand stem of a product name: '바이트릴 50mg 정 (엔로플록사신)' → '바이트릴',
    '하트캅-츄어블 정 초소형견용' → '하트캅'. Strengths, bracketed text, dosage forms and size words go."""
    n = re.sub(r"\([^)]*\)|\[[^\]]*\]|<[^>]*>", "", name or "")
    n = re.sub(r"\d+(\.\d+)?\s*(mg|㎎|ml|㎖|g|%|kg|iu|mcg|㎍)?", "", n, flags=re.I)
    n = re.sub(r"\b(S|M|L|XS|XL|SS|LL)\b", "", n).strip(" -_/.,")
    prev = None
    while prev != n:
        prev = n
        n = _SPECIES_WORD.sub("", _TAIL.sub("", n)).strip(" -_/.,")
    return compact(n)


def english_product_stem(name: str) -> Optional[str]:
    """English brand stem ('Convenia inj' → 'convenia'): letters only, 5+ characters."""
    s = re.sub(r"\([^)]*\)", "", name or "")
    s = re.sub(r"\d+(\.\d+)?\s*(mg|ml|g|%|kg|iu|mcg)?", " ", s, flags=re.I)
    s = compact(_EN_FORM_WORDS.sub(" ", s))
    return s if len(s) >= 5 and s.isalpha() and s.isascii() else None


# ── Canonical records ─────────────────────────────────────────────


@lru_cache(maxsize=1)
def _legacy() -> Tuple[Dict[str, str], FrozenSet[str]]:
    book = _read("legacy_drug_records.json")
    excluded = frozenset(x for ids in (book.get("excluded") or {}).values() for x in ids)
    return dict(book.get("duplicates") or {}), excluded


def is_excluded_record(drug_id: Optional[str]) -> bool:
    """Excipients, parse fragments, biologics and supplements the QIA import once created as 'drugs'."""
    return bool(drug_id) and drug_id in _legacy()[1]


@lru_cache(maxsize=1)
def _curated_book() -> dict:
    return _read("kr_drug_aliases.json")


@lru_cache(maxsize=1)
def _alias_index() -> List[Tuple[str, str]]:
    """(compact alias, canonical drug_id), longest first. Curated aliases outrank the raw DB."""
    book = _curated_book()
    db = get_drug_db()
    pairs = [
        (compact(alias), drug_id)
        for drug_id, names in book["aliases"].items()
        if drug_id in db
        for alias in [drug_id.replace("_", " "), *names]
        if len(compact(alias)) >= 2
    ]
    for brand, ids in (book.get("combinations") or {}).items():
        if not brand.startswith("_") and ids and all(i in db for i in ids) and len(compact(brand)) >= 2:
            pairs.append((compact(brand), ids[0]))
    return sorted(pairs, key=lambda p: len(p[0]), reverse=True)


@lru_cache(maxsize=1)
def _curated_combinations() -> Dict[str, Tuple[str, ...]]:
    combos = _curated_book().get("combinations") or {}
    return {compact(k): tuple(v) for k, v in combos.items() if not k.startswith("_")}


def _canonical(drug_id: str) -> str:
    """Follow legacy QIA duplicates to their canonical record; map other Korean-id records via the curated aliases."""
    dups, _ = _legacy()
    seen = set()
    while drug_id in dups and drug_id not in seen:
        seen.add(drug_id)
        drug_id = dups[drug_id]
    if drug_id.isascii():
        return drug_id
    for alias, canon in _alias_index():
        if alias == compact(drug_id):
            return canon
    return drug_id


@lru_cache(maxsize=1)
def _qia_index() -> Dict[str, dict]:
    """Brand stem → QIA alias entry, keeping only entries whose ingredients are canonical, resolvable records."""
    db = get_drug_db()
    out = {}
    for stem, entry in (_read("qia_aliases.json").get("aliases") or {}).items():
        ids = [_canonical(i) for i in entry.get("ingredients") or []]
        if ids and all(i in db and not is_excluded_record(i) for i in ids):
            out[stem] = {**entry, "ingredients": ids, "drug_id": ids[0]}
    return out


@lru_cache(maxsize=1)
def _qia_contained() -> List[Tuple[str, dict]]:
    return sorted(((s, e) for s, e in _qia_index().items() if e.get("contains_ok") and len(s) >= 3),
                  key=lambda p: len(p[0]), reverse=True)


@lru_cache(maxsize=1)
def _name_index() -> List[Tuple[str, str, int]]:
    """(compact name, canonical drug_id, priority) — higher priority = more canonical name. Junk records are skipped;
    names stranded on legacy duplicates (often the Korean product names) resolve to the canonical record."""
    out: List[Tuple[str, str, int]] = []
    for drug_id, raw in get_drug_db().items():
        if is_excluded_record(drug_id):
            continue
        target = _canonical(drug_id)
        if is_excluded_record(target):
            continue
        ident = raw.get("drug_identity") or {}
        canon = [drug_id.replace("_", " "), ident.get("name_en"), ident.get("name_ko"), ident.get("active_ingredient")]
        for name in canon:
            c = compact(name or "")
            if len(c) >= 2:
                out.append((c, target, 3))
        for name in (ident.get("product_names_ko") or []) + (ident.get("product_names_en") or []):
            c = compact(_STRENGTH.sub(" ", name or ""))
            if len(c) >= 2:
                out.append((c, target, 2))
        for name in ident.get("brand_names") or []:
            c = compact(name or "")
            # Short Latin brand names ("M", "Inj") produce false hits inside longer words.
            if len(c) >= 4 or (len(c) >= 2 and re.search("[가-힣]", c)):
                out.append((c, target, 1))
    return sorted(out, key=lambda t: (len(t[0]), t[2]), reverse=True)


def _penalty(drug_id: str, wants_local: bool) -> int:
    local = any(tag in drug_id for tag in _NON_SYSTEMIC)
    return 0 if local == wants_local else 1


# ── Resolution ────────────────────────────────────────────────────


@dataclass(frozen=True)
class DrugResolution:
    """A resolved drug line. `ingredients` lists every active ingredient of a combination product."""

    drug_id: Optional[str]
    confidence: float
    ingredients: Tuple[str, ...] = ()
    source: str = "none"  # db_id | curated | qia | db_name | fuzzy | none
    matched: Optional[str] = None  # the alias, stem or name that matched
    licence_no: Optional[str] = None  # QIA 품목정보 when the QIA registry supplied the match
    product_name: Optional[str] = None

    @property
    def is_combination(self) -> bool:
        return len(self.ingredients) > 1

    def as_tuple(self) -> Tuple[Optional[str], float]:
        return self.drug_id, self.confidence


UNRESOLVED = DrugResolution(None, 0.0)


def _curated(drug_id: str, conf: float, alias: str, keys: Tuple[str, ...]) -> DrugResolution:
    combos = _curated_combinations()
    ingredients: Tuple[str, ...] = combos.get(alias, ())
    if not ingredients:
        # A curated brand that the QIA registry lists as a combination ('밀베맥스' → + praziquantel).
        for key in (alias, *keys):
            q = _qia_index().get(key)
            if q and drug_id in q["ingredients"]:
                ingredients = tuple(q["ingredients"])
                break
    return DrugResolution(drug_id, conf, ingredients or (drug_id,), "curated", alias)


def _is_local(drug_id: str) -> bool:
    return any(tag in drug_id for tag in _NON_SYSTEMIC)


def _qia(entry: dict, conf: float, stem: str, text: str) -> DrugResolution:
    """For a combination, the primary id is the ingredient a curated alias in the same line names
    ('하트가드 플러스' → ivermectin), else the first ingredient on the label."""
    ingredients = tuple(entry["ingredients"])
    primary = entry["drug_id"]
    if len(ingredients) > 1:
        named = next((c for a, c in _alias_index() if len(a) >= 3 and a in text and c in ingredients), None)
        primary = named or primary
    return DrugResolution(primary, conf, ingredients, "qia", stem, entry.get("licence_no"), entry.get("product_name"))


@lru_cache(maxsize=4096)
def resolve_drug_full(name: str) -> DrugResolution:
    """Resolve a free-text drug or product name; see the module docstring for the priority order."""
    raw = (name or "").strip()
    if not raw:
        return UNRESOLVED
    wants_local = any(h in raw.lower() for h in _NON_SYSTEMIC_HINTS)
    text = compact(_STRENGTH.sub(" ", raw))
    if not text:
        return UNRESOLVED
    # Brand stems drop dosage-form words; when the line says eye/ear/topical, only the full text may match exactly
    # ('사이클로스포린 점안액' must not collapse to the systemic '사이클로스포린').
    stems = tuple(k for k in (product_stem(raw), english_product_stem(raw) or "") if k and k != text)
    keys = (text,) + stems
    db = get_drug_db()

    # 1. an exact drug id
    if text.replace(" ", "_") in db and not is_excluded_record(text):
        drug_id = _canonical(text)
        if not is_excluded_record(drug_id):
            return DrugResolution(drug_id, 1.0, (drug_id,), "db_id", text)

    # 2. curated alias, exact
    for alias, canon in _alias_index():
        if alias == text or (alias in stems and (not wants_local or _is_local(canon))):
            return _curated(canon, 0.99, alias, keys)

    # 3. QIA registry stem, exact
    for key in keys:
        entry = _qia_index().get(key)
        if entry and (key == text or not wants_local or entry.get("route") == "local"):
            return _qia(entry, 0.97, key, text)

    # 4. curated or QIA alias inside a longer line: the longest wins, curated on ties
    curated_hit = next(((a, c) for a, c in _alias_index() if len(a) >= 3 and a in text), None)
    qia_hit = next(((s, e) for s, e in _qia_contained() if s in text), None)
    if curated_hit and (not qia_hit or len(curated_hit[0]) >= len(qia_hit[0])):
        alias, canon = curated_hit
        # Prefer a local (ophthalmic/otic) record when the line says so.
        if wants_local and not any(tag in canon for tag in _NON_SYSTEMIC):
            local = [c for a, c in _alias_index() if a == alias and any(t in c for t in _NON_SYSTEMIC)]
            canon = local[0] if local else canon
        return _curated(canon, round(min(0.95, 0.7 + 0.3 * len(alias) / len(text)), 2), alias, keys)
    if qia_hit:
        stem, entry = qia_hit
        return _qia(entry, round(min(0.93, 0.7 + 0.3 * len(stem) / len(text)), 2), stem, text)

    # 5. drug-database names
    exact = [(d, p) for c, d, p in _name_index() if c == text]
    if exact:
        exact.sort(key=lambda t: (_penalty(t[0], wants_local), -t[1]))
        drug_id = exact[0][0]
        return DrugResolution(drug_id, 0.97, (drug_id,), "db_name", text)
    contained = [(c, d, p) for c, d, p in _name_index() if len(c) >= 3 and c in text]
    if contained:
        best_len = len(contained[0][0])
        top = [t for t in contained if len(t[0]) == best_len]
        top.sort(key=lambda t: (_penalty(t[1], wants_local), -t[2]))
        coverage = best_len / len(text)
        return DrugResolution(top[0][1], round(min(0.93, 0.55 + 0.4 * coverage), 2), (top[0][1],), "db_name", top[0][0])

    # 6. fuzzy fallback over the search index (handles typos and jamo variants); never lands on junk.
    from services.drug_loader import get_search_index

    query = _STRENGTH.sub(" ", raw).strip().lower()
    scored = []
    for entry in get_search_index():
        drug_id = _canonical(entry["id"])
        if is_excluded_record(entry["id"]) or is_excluded_record(drug_id):
            continue
        score = fuzzy_score(query, entry)
        if score >= FUZZY_MIN_SCORE:
            scored.append((score, drug_id))
    if scored:
        scored.sort(key=lambda s: (-s[0], _penalty(s[1], wants_local)))
        score, drug_id = scored[0]
        return DrugResolution(drug_id, round(score / 100, 2), (drug_id,), "fuzzy", None)
    return UNRESOLVED


def resolve_drug(name: str) -> Tuple[Optional[str], float]:
    """Return (drug_id, confidence) for a free-text drug or product name."""
    return resolve_drug_full(name).as_tuple()


# ── Drug-like receipt lines ───────────────────────────────────────

_DRUG_LINE = re.compile(
    r"(\binj\b|inj\.|injection|\btab(let)?s?\b|\bcaps?(ule)?s?\b|\bsusp\b|\bsyrup\b|\d\s*(mg|mcg|㎎|ml|㎖|iu)\b|"
    r"\((정|주|캡슐|액|산|시럽|연고)\)|주사액|주사제|현탁액|츄어블|정제|캡슐|시럽|점안액|점이액|연고)",
    re.IGNORECASE)


def looks_like_drug(text: str) -> bool:
    """Receipt/EMR lines such as 'Famotidine Inj.', '바이트릴 (정)', 'Convenia inj', '세파렉신 250mg' or a known brand."""
    raw = text or ""
    if _DRUG_LINE.search(raw):
        return True
    keys = {compact(raw), product_stem(raw)}
    return any(k in _qia_index() for k in keys) or any(a in keys for a, _ in _alias_index())


def resolve_drug_line(text: str) -> Optional[DrugResolution]:
    """Route a line the procedure codebook could not place: if it looks like a drug and resolves through an exact id,
    curated alias, QIA stem or DB name (not fuzzy), return the resolution; otherwise None."""
    if not looks_like_drug(text):
        return None
    r = resolve_drug_full(text)
    return r if r.drug_id and r.source != "fuzzy" else None


# ── Non-covered products (quasi-drugs, preventives, vaccines) ─────


@lru_cache(maxsize=1)
def _noncovered() -> Dict[str, dict]:
    return _read("noncovered_products.json").get("products") or {}


@lru_cache(maxsize=1)
def _noncovered_contained() -> List[Tuple[str, dict]]:
    return sorted(((s, e) for s, e in _noncovered().items() if e.get("contains_ok") and len(s) >= 3),
                  key=lambda p: len(p[0]), reverse=True)


@lru_cache(maxsize=4096)
def noncovered_product(name: str) -> Optional[dict]:
    """The non-covered product entry (category, coverage, licence_no, product_name) a line names, or None.
    Exact brand stem first, then a stem flagged contains_ok inside the line. Generic words never match."""
    raw = (name or "").strip()
    if not raw:
        return None
    keys = [k for k in dict.fromkeys((product_stem(raw), compact(_STRENGTH.sub(" ", raw)), english_product_stem(raw) or "")) if k]
    book = _noncovered()
    for k in keys:
        if k in book:
            return {**book[k], "stem": k}
    text = compact(raw)
    for stem, entry in _noncovered_contained():
        if stem in text:
            return {**entry, "stem": stem}
    return None


def is_noncovered_product(name: str) -> Optional[str]:
    """Category ('shampoo_cleanser', 'heartworm_preventive', 'vaccine', …) when the line names a product that
    pet insurance does not cover as treatment, else None. Coverage maps a hit to reason 'noncovered_product:<category>'."""
    hit = noncovered_product(name)
    return hit["category"] if hit else None


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
    contexts: List[str]  # indication text behind the reference; always empty for legacy records (see module docstring)
    provenance: str


def legacy_doses_disabled() -> bool:
    return (os.getenv("NUVOVET_DISABLE_LEGACY_DOSES") or "").strip().lower() in {"1", "true", "yes", "on"}


def _parse_values(value) -> List[float]:
    if value is None:
        return []
    if isinstance(value, (int, float)):
        return [float(value)]
    return [float(x) for x in re.findall(r"\d+(?:\.\d+)?", str(value))]


def dose_reference(drug_id: str, species: str, route: Optional[str] = None) -> Optional[DoseReference]:
    """Highest per-administration mg/kg found for the species (optionally the route)."""
    raw = get_drug_db().get(drug_id) or {}
    source = ((raw.get("_data_quality") or {}).get("ddi_source") or "unknown").lower()
    if "plumb" in source and legacy_doses_disabled():
        return None
    entries = ((raw.get("dosage_and_kinetics") or {}).get(species) or {}).get("dosage_list") or []
    candidates: List[float] = []
    for e in entries:
        if not isinstance(e, dict) or (e.get("unit") or "").lower() != "mg/kg":
            continue
        if route and e.get("route") and e["route"].upper() != route.upper():
            continue
        vals = _parse_values(e.get("value"))
        if e.get("max_dose_mg_kg") is not None:
            vals += _parse_values(e.get("max_dose_mg_kg"))
        if vals:
            candidates.append(max(vals))
    if not candidates and route:
        return dose_reference(drug_id, species, None)
    if not candidates:
        return None
    ordered = sorted(candidates)
    typical = ordered[(len(ordered) - 1) // 2]  # lower median: robust to one high-dose indication
    provenance = (
        "legacy compendium-derived record (pending clean-room rebuild)"
        if "plumb" in source
        else "legacy drug record (unreviewed)"
    )
    # No indication text: every legacy record's prose is converted compendium text (it used to reach insurers here).
    return DoseReference(ordered[-1], typical, [], provenance)


def chronic_marker_diagnoses(drug_id: Optional[str]) -> Optional[List[str]]:
    if not drug_id:
        return None
    markers = clinical_rules()["chronic_marker_drugs"]
    return markers.get(drug_id)

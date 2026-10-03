"""
Standard code lookup for procedures and diagnoses.

Matching rules (both codebooks):
  - Text is compacted (lowercase, no spaces/punctuation) so '혈액 검사(CBC)' ≈ '혈액검사cbc'.
  - Latin terms of 4 characters or fewer ('ct', 'ua', 'uti', 'dm', 'chem') match only whole Latin
    tokens of the line, optionally with a digit suffix ('Chem10'). Substring hits like
    "Doctor's fee"→CT or "routine"→UTI are impossible.
  - The longest matching term wins. Near-ties (within 2 characters) go to the code that agrees
    with the EMR category hint, then the longer term, then the more specific code.
  - A code may 'supersede' others: an ICU line that also says "hospitalization" is ICU.
  - An entry may list 'exclude_contexts': a term occurrence inside one of them is not a hit
    ('간질' is epilepsy, but '간질성 폐렴' is interstitial pneumonia).

Procedure lines additionally understand the EMR naming pattern '<category>-<item>(<modifier>)'
(e.g. '검사-X-ray(경상)', '입원-소형견(1일)'): the prefix is a category hint, gates a few
ambiguous synonyms (bare '켄넬코프' is a vaccine only under '예방-'), and supplies a default
code when the item itself is not recognised. A line that names a discount ('미용 할인',
'원단위 절사') is the discount code ADM-004, whatever else it names.

Diagnoses additionally:
  - drop clauses that state a negative result ('심장사상충 검사 음성', '파보 키트 음성');
  - let a preventive code (vaccination, neutering, check-up, parasite prevention) yield to a disease
    named elsewhere in the text ('건강검진 중 발견된 심잡음' is a heart murmur);
  - leave a preventive-only text unmapped when it describes a complication ('예방접종 후 알레르기 반응',
    '중성화 수술 후 봉합부 감염'): those go to a human, not to a preventive exclusion;
  - leave a 'screening_words' code unmapped when the text only names the test ('심장사상충 검사').

`match_procedure` / `match_diagnosis` keep the v1 tuple return `(code, confidence)`;
`match_procedure_full` / `match_diagnosis_full` return a `Match` with the evidence.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Callable, Dict, FrozenSet, List, Optional, Sequence, Set, Tuple

DATA_DIR = Path(__file__).parent / "data"

_STRIP = re.compile(r"[\s\-_/(),.\[\]·:;'\"]+")
_LATIN_TOKEN = re.compile(r"[a-z0-9]+")
_LATIN_CHUNK = re.compile(r"[a-z0-9]+(?:['’\-/.][a-z0-9]+)*")
SHORT_LATIN_MAX = 4
NEAR_TIE = 2
DEFAULT_CONFIDENCE = 0.7


def compact(text: str) -> str:
    """Lowercase and drop whitespace/punctuation so '혈액 검사(CBC)' ≈ '혈액검사cbc'."""
    return _STRIP.sub("", (text or "").lower())


def latin_tokens(text: str) -> FrozenSet[str]:
    """Whole Latin/digit tokens of a line, plus joined chunks ('X-ray' → 'xray', 'Na/K' → 'nak')."""
    low = (text or "").lower()
    out = set(_LATIN_TOKEN.findall(low))
    out.update(compact(m) for m in _LATIN_CHUNK.findall(low))
    out.discard("")
    return frozenset(out)


def _load(name: str) -> dict:
    return json.loads((DATA_DIR / name).read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def procedure_book() -> dict:
    return _load("procedure_codes.json")


@lru_cache(maxsize=1)
def diagnosis_book() -> dict:
    return _load("diagnosis_codes.json")


@lru_cache(maxsize=1)
def procedures_by_code() -> Dict[str, dict]:
    return {c["code"]: c for c in procedure_book()["codes"]}


@lru_cache(maxsize=1)
def diagnoses_by_code() -> Dict[str, dict]:
    return {d["code"]: d for d in diagnosis_book()["diagnoses"]}


# ── Match result ──────────────────────────────────────────────────


@dataclass(frozen=True)
class Match:
    """A code lookup with its evidence. `as_tuple()` gives the v1 `(code, confidence)` pair."""

    code: Optional[str]
    confidence: float
    matched_term: Optional[str] = None
    category_hint: Optional[str] = None  # EMR category key ('검사') or internal category ('lab') used as hint
    method: str = "none"  # code | exact | contains | category_default | bundle | none
    item_text: Optional[str] = None  # the line text after an EMR '<category>-' prefix
    components: Tuple[str, ...] = ()  # every code of a bundled line such as 'CBC+Chem'

    def as_tuple(self) -> Tuple[Optional[str], float]:
        return self.code, self.confidence


NO_MATCH = Match(None, 0.0)


# ── Term index ────────────────────────────────────────────────────


@dataclass(frozen=True)
class _Term:
    term: str
    code: str
    category: str
    gate: Optional[str]  # EMR category key the term is restricted to, or None
    short_latin: bool
    generic: bool  # generic / fallback code (or a symptom-level diagnosis)
    order: int
    exclude: Tuple[str, ...] = ()  # compact contexts in which an occurrence of the term does not count


def _is_short_latin(term: str) -> bool:
    return term.isascii() and len(term) <= SHORT_LATIN_MAX


def _entry_terms(entry: dict) -> List[str]:
    terms = [entry["name_ko"], entry["name_en"], *entry.get("synonyms", [])]
    return [t for t in (compact(x) for x in terms) if len(t) >= 2]


def _build_terms(entries: Sequence[dict], generic_codes: Set[str]) -> List[_Term]:
    out: List[_Term] = []
    seen: Set[Tuple[str, str, Optional[str]]] = set()
    for order, e in enumerate(entries):
        generic = e["code"] in generic_codes or e.get("specificity") == "symptom"
        exclude = tuple(c for c in (compact(x) for x in e.get("exclude_contexts") or []) if c)
        gated = [(g, t) for g, ts in (e.get("prefix_synonyms") or {}).items() for t in ts]
        for gate, raw in [(None, t) for t in _entry_terms(e)] + [(g, compact(t)) for g, t in gated]:
            key = (raw, e["code"], gate)
            if len(raw) < 2 or key in seen:
                continue
            seen.add(key)
            out.append(_Term(raw, e["code"], e.get("category", ""), gate, _is_short_latin(raw), generic, order,
                             tuple(c for c in exclude if raw in c)))
    # Longest first so '심장초음파' is tried before '초음파' and 'probnp' before 'bnp'.
    return sorted(out, key=lambda t: len(t.term), reverse=True)


@lru_cache(maxsize=1)
def _procedure_terms() -> List[_Term]:
    meta = procedure_book()["_meta"]
    return _build_terms(procedure_book()["codes"], set(meta.get("generic_codes", [])))


@lru_cache(maxsize=1)
def _diagnosis_terms() -> List[_Term]:
    return _build_terms(diagnosis_book()["diagnoses"], set())


def _hit(t: _Term, text: str, tokens: FrozenSet[str]) -> bool:
    if not t.short_latin:
        for ctx in t.exclude:
            text = text.replace(ctx, "\x00")
        return t.term in text
    if t.term in tokens:
        return True
    n = len(t.term)
    return any(len(tok) > n and tok.startswith(t.term) and tok[n:].isdigit() for tok in tokens)


# ── EMR category prefix ───────────────────────────────────────────


@lru_cache(maxsize=1)
def _emr_categories() -> Dict[str, dict]:
    cats = procedure_book()["_meta"].get("emr_categories") or {}
    return {k: v for k, v in cats.items() if not k.startswith("_")}


@lru_cache(maxsize=1)
def _category_aliases() -> Dict[str, str]:
    """compact(alias or key) → EMR category key."""
    out: Dict[str, str] = {}
    for key, spec in _emr_categories().items():
        for name in [key, *spec.get("aliases", [])]:
            out.setdefault(compact(name), key)
    return out


@lru_cache(maxsize=1)
def _prefix_re() -> re.Pattern:
    names = sorted({n for k, v in _emr_categories().items() for n in [k, *v.get("aliases", [])]}, key=len, reverse=True)
    alt = "|".join(re.escape(n) for n in names)
    return re.compile(rf"^\s*(?:\[\s*({alt})\s*\]\s*[-–—:]?\s*|({alt})\s*(?:[-–—:]\s*|$))")


def parse_emr_prefix(text: str) -> Tuple[Optional[str], str]:
    """Split '검사-X-ray(경상)' into ('검사', 'X-ray(경상)'). Returns (None, text) when there is no prefix."""
    raw = text or ""
    m = _prefix_re().match(raw)
    if not m:
        return None, raw
    return _category_aliases()[compact(m.group(1) or m.group(2))], raw[m.end():]


def normalize_category_hint(hint: Optional[str]) -> Optional[str]:
    """Map a printed heading / EMR prefix ('검사료', '[처치]', '수액·수혈') or an internal category ('lab') to a hint key."""
    if not hint or not hint.strip():
        return None
    if hint in procedure_book()["_meta"]["categories"]:
        return hint
    key = _category_aliases().get(compact(hint))
    if key:
        return key
    pre, _ = parse_emr_prefix(hint)
    return pre


def _hint_categories(hint: Optional[str]) -> Set[str]:
    if not hint:
        return set()
    if hint in procedure_book()["_meta"]["categories"]:
        return {hint}
    return set(_emr_categories().get(hint, {}).get("categories", []))


def _gate_open(t: _Term, hint: Optional[str]) -> bool:
    if t.gate is None:
        return True
    if not hint:
        return False
    return t.gate == hint or (hint in procedure_book()["_meta"]["categories"] and t.category == hint)


# ── Ranking ───────────────────────────────────────────────────────


def _rank(hits: List[_Term], allowed: Set[str], specific_first: bool) -> _Term:
    """Longest term wins. Within NEAR_TIE characters of the longest (only when there is a category hint,
    or `specific_first` for diagnoses): category-hint agreement, then (diagnoses) disease over symptom,
    then term length, then non-generic code, then codebook order."""
    longest = max(len(t.term) for t in hits)
    floor = longest - NEAR_TIE if (allowed or specific_first) else longest
    near = [t for t in hits if len(t.term) >= floor]
    return max(near, key=lambda t: (t.category in allowed, (not t.generic) if specific_first else True,
                                    len(t.term), not t.generic, -t.order))


def _apply_supersedes(best: _Term, hits: List[_Term], by_code: Dict[str, dict], generic_yields: bool) -> _Term:
    """A hit whose code lists the winner in 'supersedes' takes over ('Hospitalization - ICU' → ICU).
    For procedures, a generic code also yields to a specific code of the same category
    ('재진 진료비' is a follow-up consultation, not an unspecified one)."""
    for t in hits:
        sup = by_code.get(t.code, {}).get("supersedes") or []
        if best.code in sup:
            return max((h for h in hits if h.code == t.code), key=lambda h: len(h.term))
    if generic_yields and best.generic:
        specific = [h for h in hits if not h.generic and h.category == best.category]
        if specific:
            return max(specific, key=lambda h: (len(h.term), -h.order))
    return best


def _contains_confidence(term: str, text: str, agrees: bool) -> float:
    coverage = len(term) / max(len(text), 1)
    return round(min(0.95, 0.6 + 0.4 * coverage + (0.05 if agrees else 0.0)), 2)


Refine = Callable[[List[_Term], str, FrozenSet[str]], List[_Term]]


def _match_text(text_raw: str, terms: List[_Term], by_code: Dict[str, dict], hint: Optional[str],
                specific_first: bool, refine: Optional[Refine] = None) -> Match:
    text = compact(text_raw)
    if not text:
        return NO_MATCH
    allowed = _hint_categories(hint)
    tokens = latin_tokens(text_raw)
    exact = [t for t in terms if t.term == text and _gate_open(t, hint)]
    if exact:
        best = _rank(exact, allowed, specific_first)
        return Match(best.code, 0.98, best.term, hint, "exact")
    hits = [t for t in terms if _gate_open(t, hint) and _hit(t, text, tokens)]
    if hits and refine:
        hits = refine(hits, text, tokens)
    if not hits:
        return NO_MATCH
    best = _apply_supersedes(_rank(hits, allowed, specific_first), hits, by_code, generic_yields=not specific_first)
    return Match(best.code, _contains_confidence(best.term, text, best.category in allowed), best.term, hint, "contains")


# ── Procedures ────────────────────────────────────────────────────


def _contradicts_hint(m: Match, body: str, hint: Optional[str]) -> bool:
    """Under a category hint, a code from another category must explain at least half of the item text:
    '수술-초음파 수술기(하모닉)' is a surgical device, not an abdominal ultrasound."""
    allowed = _hint_categories(hint)
    if not allowed or m.method == "exact":
        return False
    category = procedures_by_code()[m.code]["category"]
    return category not in allowed and len(m.matched_term or "") * 2 < len(compact(body))


def _split_bundle(body: str) -> List[str]:
    parts = [p.strip() for p in re.split(r"\s*[+＋]\s*", body)]
    return [p for p in parts if p]


DISCOUNT_CODE = "ADM-004"
# Words that make a line a discount whatever else it names ('미용 할인', '원단위 절사', '쿠폰 할인').
# Not 'dc': in EMR text 'D/C' is usually discharge (퇴원약), so it only counts on a negative amount (models).
DISCOUNT_WORDS = ("할인", "에누리", "절사", "쿠폰", "discount")
# Receipt adjustments that may carry a negative amount (LineItem validation): the discount words plus
# '단수 조정', '포인트 사용', '적립금 사용' and 'D/C' / 'DC'.
ADJUSTMENT_RE = re.compile(r"할인|에누리|절사|조정|쿠폰|포인트|적립금|discount|(?<![a-z])d\s*[/.]?\s*c(?![a-z])", re.I)
_ADJUSTMENT_FILLER_RE = re.compile(r"사용|금액|이벤트|적용", re.I)


def discount_word(text: str) -> Optional[str]:
    """The discount word a line names, if any ('회원 할인' → '할인')."""
    c = compact(text)
    return next((w for w in DISCOUNT_WORDS if w in c), None)


def discount_target(text: str) -> Optional[str]:
    """The coverage category a discount line names ('미용 할인' → 'non_medical', '입원비 할인' → 'medical'), or None
    when it names none ('회원 할인', '원단위 절사')."""
    rest = _ADJUSTMENT_FILLER_RE.sub(" ", ADJUSTMENT_RE.sub(" ", text or ""))
    if len(compact(rest)) < 2:
        return None
    code = match_procedure(rest)[0]
    if not code or code == DISCOUNT_CODE:
        return None
    return procedures_by_code()[code].get("coverage_category")


def match_procedure_full(description: str, code: Optional[str] = None, category_hint: Optional[str] = None) -> Match:
    """Code a free-text line item. A supplied valid code is trusted outright.

    `category_hint` is the printed heading or EMR prefix (LineItem.category_raw); when absent the
    '<category>-<item>' prefix of the description itself is used.
    """
    if code and code in procedures_by_code():
        return Match(code, 1.0, None, normalize_category_hint(category_hint), "code")
    prefix, body = parse_emr_prefix(description or "")
    if prefix and not compact(body):
        body = description or ""  # the whole line is a category word ('의료폐기물', '조제료')
    hint = normalize_category_hint(category_hint) or prefix
    by_code = procedures_by_code()
    terms = _procedure_terms()
    default = _emr_categories().get(hint or "", {}).get("default")

    word = discount_word(body)
    if word and DISCOUNT_CODE in by_code:
        text = compact(body)
        method = "exact" if text == word else "contains"
        conf = 0.98 if method == "exact" else _contains_confidence(word, text, False)
        return Match(DISCOUNT_CODE, conf, word, hint, method, body if prefix else None)

    parts = _split_bundle(body) if "+" in body or "＋" in body else []
    if len(parts) >= 2:
        coded = [m for m in (_match_text(p, terms, by_code, hint, False) for p in parts) if m.code]
        if len(coded) >= 2:
            first = coded[0]
            codes = tuple(dict.fromkeys(m.code for m in coded))
            return Match(first.code, first.confidence, first.matched_term, hint, "bundle", body, codes)

    m = _match_text(body, terms, by_code, hint, False)
    if m.code and not _contradicts_hint(m, body, hint):
        return Match(m.code, m.confidence, m.matched_term, hint, m.method, body if prefix else None)
    if default and default in by_code:
        return Match(default, DEFAULT_CONFIDENCE, None, hint, "category_default", body if prefix else None)
    return Match(None, 0.0, None, hint, "none", body if prefix else None)


def match_procedure(description: str, code: Optional[str] = None,
                    category_hint: Optional[str] = None) -> Tuple[Optional[str], float]:
    """Return (code, confidence). A supplied valid code is trusted outright."""
    return match_procedure_full(description, code, category_hint).as_tuple()


# ── Diagnoses ─────────────────────────────────────────────────────


# A clause that states a negative result names a ruled-out disease, not a diagnosis ('심장사상충 검사 음성').
_NEGATIVE_RESULT = re.compile(r"음성|미검출|검출\s*안\s*됨|negative|\bneg\b", re.I)
_CLAUSE_SPLIT = re.compile(r"[,;/·+\n]|\s및\s|\s그리고\s|\band\b", re.I)
# A preventive-only text with one of these describes a complication of the preventive care, not the care itself.
PREVENTIVE_COMPLICATION_MARKERS = ("후", "부작용", "반응", "감염", "육종", "발견", "음성", "양성", "알레르기", "쇼크", "reaction",
                                   "adverse", "after", "post", "sarcoma", "infection")
# A test name with one of these states a result; without one, a 'screening_words' code stays unmapped.
_POSITIVE_RESULT = ("양성", "확진", "감염", "positive")


def _drop_negative_clauses(text: str) -> str:
    if not _NEGATIVE_RESULT.search(text or ""):
        return text or ""
    return " ".join(c for c in _CLAUSE_SPLIT.split(text) if not _NEGATIVE_RESULT.search(c))


def _is_preventive_dx(code: str) -> bool:
    return "preventive" in (diagnoses_by_code().get(code, {}).get("coverage_tags") or [])


def _refine_diagnosis_hits(hits: List[_Term], text: str, tokens: FrozenSet[str]) -> List[_Term]:
    preventive = sorted((t for t in hits if _is_preventive_dx(t.code)), key=lambda t: len(t.term), reverse=True)
    if preventive:
        blanked = text
        for t in preventive:
            blanked = blanked.replace(t.term, "\x00" * len(t.term))
        # A disease named after the preventive context wins ('건강검진 중 발견된 심잡음', '중성화 후 자궁축농증');
        # one inside it ('심장사상충 예방') or before it ('벼룩 진드기 예방': what is prevented) does not.
        first_end = min((text.find(t.term) + len(t.term) for t in preventive if t.term in text), default=0)
        others = [t for t in hits if not _is_preventive_dx(t.code) and _hit(t, blanked, tokens)
                  and blanked.find(t.term, first_end) >= 0]
        if others:
            hits = others
        elif any(compact(m) in text for m in PREVENTIVE_COMPLICATION_MARKERS):
            return []
    by_code = diagnoses_by_code()
    kept = []
    for t in hits:
        words = [compact(w) for w in by_code.get(t.code, {}).get("screening_words") or []]
        if any(w in text for w in words) and not any(compact(p) in text for p in _POSITIVE_RESULT):
            continue  # '심장사상충 검사' names the test, not the disease
        kept.append(t)
    return kept


def match_diagnosis_full(text_or_code: str) -> Match:
    """Code a free-text diagnosis. Disease-level codes beat symptom-level codes on near-ties; negative results,
    complications of preventive care and bare test names stay unmapped (module docstring)."""
    if text_or_code in diagnoses_by_code():
        return Match(text_or_code, 1.0, None, None, "code")
    text = _drop_negative_clauses(text_or_code or "")
    return _match_text(text, _diagnosis_terms(), diagnoses_by_code(), None, True, refine=_refine_diagnosis_hits)


def match_diagnosis(text_or_code: str) -> Tuple[Optional[str], float]:
    return match_diagnosis_full(text_or_code).as_tuple()

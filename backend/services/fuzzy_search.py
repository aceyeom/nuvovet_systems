"""
Fuzzy search engine — trigram similarity (English) + jamo decomposition (Korean).

Used as a fallback when exact/substring matching in drugs.py yields no results.
All computation is in-memory (no DB dependencies).
"""

import re
from typing import List, Tuple

# ── Hangul Jamo decomposition tables ────────────────────────────
# Unicode Hangul: 0xAC00 + (initial * 21 + medial) * 28 + final
_INITIALS = list(
    "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"
)
_MEDIALS = list(
    "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ"
)
_FINALS = list(
    " ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ"
)

_HANGUL_BASE = 0xAC00


def decompose_hangul(text: str) -> str:
    """Decompose Hangul syllables into individual jamo components.

    '엔로' → 'ㅇㅔㄴㄹㅗ'
    Preserves non-Hangul characters as-is.
    """
    result = []
    for ch in text:
        code = ord(ch)
        if _HANGUL_BASE <= code <= 0xD7A3:
            offset = code - _HANGUL_BASE
            initial = offset // (21 * 28)
            medial = (offset % (21 * 28)) // 28
            final = offset % 28
            result.append(_INITIALS[initial])
            result.append(_MEDIALS[medial])
            if final > 0:
                result.append(_FINALS[final])
        elif 0x3131 <= code <= 0x3163:
            # Already a jamo character
            result.append(ch)
        else:
            result.append(ch)
    return "".join(result)


def extract_initials(text: str) -> str:
    """Extract only the initial consonants from Hangul text.

    '엔로플록사신' → 'ㅇㄹㅍㄹㅅㅅ'
    """
    result = []
    for ch in text:
        code = ord(ch)
        if _HANGUL_BASE <= code <= 0xD7A3:
            offset = code - _HANGUL_BASE
            initial = offset // (21 * 28)
            result.append(_INITIALS[initial])
        elif 0x3131 <= code <= 0x314E:
            # Already an initial consonant jamo
            result.append(ch)
    return "".join(result)


def is_jamo_only(text: str) -> bool:
    """Check if text consists only of jamo characters (consonants/vowels)."""
    for ch in text:
        code = ord(ch)
        if not (0x3131 <= code <= 0x3163) and ch != " ":
            return False
    return True


def is_korean(text: str) -> bool:
    """Check if text contains any Korean characters."""
    for ch in text:
        code = ord(ch)
        if (_HANGUL_BASE <= code <= 0xD7A3) or (0x3131 <= code <= 0x3163):
            return True
    return False


# ── Trigram similarity ──────────────────────────────────────────

def trigrams(s: str) -> set:
    """Generate character trigrams from a string."""
    if len(s) < 3:
        return {s} if s else set()
    return {s[i : i + 3] for i in range(len(s) - 2)}


def trigram_similarity(a: str, b: str) -> float:
    """Jaccard similarity of trigram sets. Range: 0.0 – 1.0."""
    ta, tb = trigrams(a.lower()), trigrams(b.lower())
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


# ── Combined fuzzy scorer ──────────────────────────────────────

def fuzzy_score(
    query: str,
    targets: dict,
) -> int:
    """Score a single search index entry against a fuzzy query.

    Args:
        query: The user's search query (lowercased)
        targets: Dict with keys like name_en, name_ko, active, brands, products_ko, products_en

    Returns:
        Score 0–45 (0 = no match). Only called as fallback after exact matching fails.
    """
    query = query.strip().lower()
    if not query:
        return 0

    best = 0

    if is_korean(query):
        # ── Korean fuzzy matching ──
        query_jamo = decompose_hangul(query)
        query_initials = extract_initials(query)
        is_initial_only = is_jamo_only(query.replace(" ", ""))

        for field in ("name_ko", "active", "products_ko"):
            values = targets.get(field)
            if values is None:
                continue
            if isinstance(values, str):
                values = [values]
            for val in values:
                if not val:
                    continue
                val_lower = val.lower()

                # Full jamo decomposition match
                val_jamo = decompose_hangul(val_lower)
                if query_jamo in val_jamo:
                    score = 35
                    best = max(best, score)
                    continue

                # Initial consonant matching (ㅇㄹㅍ → 엔로플...)
                if is_initial_only:
                    val_initials = extract_initials(val_lower)
                    if query.replace(" ", "") in val_initials:
                        best = max(best, 30)
                        continue

                # Trigram similarity on decomposed jamo
                sim = trigram_similarity(query_jamo, val_jamo)
                if sim > 0.25:
                    score = int(20 + sim * 20)
                    best = max(best, min(score, 40))

        # Also try Korean product name matching
        for prod in (targets.get("products_ko") or []):
            if not prod:
                continue
            prod_lower = prod.lower()
            if query in prod_lower:
                best = max(best, 40)
            elif decompose_hangul(query) in decompose_hangul(prod_lower):
                best = max(best, 35)

    else:
        # ── English fuzzy matching (trigram) ──
        for field in ("name_en", "active", "products_en"):
            values = targets.get(field)
            if values is None:
                continue
            if isinstance(values, str):
                values = [values]
            for val in values:
                if not val:
                    continue
                sim = trigram_similarity(query, val.lower())
                if sim > 0.25:
                    score = int(20 + sim * 25)
                    best = max(best, min(score, 45))

        # Brand names
        for brand in (targets.get("brands") or []):
            if not brand:
                continue
            sim = trigram_similarity(query, brand.lower())
            if sim > 0.3:
                score = int(15 + sim * 20)
                best = max(best, min(score, 35))

        # Product English names
        for prod in (targets.get("products_en") or []):
            if not prod:
                continue
            if query in prod.lower():
                best = max(best, 40)
            else:
                sim = trigram_similarity(query, prod.lower())
                if sim > 0.3:
                    score = int(20 + sim * 20)
                    best = max(best, min(score, 40))

    return best

"""Standard code lookup for procedures and diagnoses."""

from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Optional, Tuple

DATA_DIR = Path(__file__).parent / "data"

_STRIP = re.compile(r"[\s\-_/(),.\[\]·:;'\"]+")


def compact(text: str) -> str:
    """Lowercase and drop whitespace/punctuation so '혈액 검사(CBC)' ≈ '혈액검사cbc'."""
    return _STRIP.sub("", (text or "").lower())


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


def _terms(entry: dict) -> List[str]:
    terms = [entry["name_ko"], entry["name_en"], *entry.get("synonyms", [])]
    return [t for t in (compact(x) for x in terms) if len(t) >= 2]


@lru_cache(maxsize=1)
def _procedure_terms() -> List[Tuple[str, str]]:
    pairs = [(term, c["code"]) for c in procedure_book()["codes"] for term in _terms(c)]
    # Longest term first so '심장초음파' wins over '초음파' and 'probnp' over 'bnp'.
    return sorted(pairs, key=lambda p: len(p[0]), reverse=True)


@lru_cache(maxsize=1)
def _diagnosis_terms() -> List[Tuple[str, str]]:
    pairs = [(term, d["code"]) for d in diagnosis_book()["diagnoses"] for term in _terms(d)]
    return sorted(pairs, key=lambda p: len(p[0]), reverse=True)


def match_procedure(description: str, code: Optional[str] = None) -> Tuple[Optional[str], float]:
    """Return (code, confidence). A supplied valid code is trusted outright."""
    if code and code in procedures_by_code():
        return code, 1.0
    text = compact(description)
    if not text:
        return None, 0.0
    for term, c in _procedure_terms():
        if term == text:
            return c, 0.98
    for term, c in _procedure_terms():
        if term in text:
            # Confidence grows with how much of the line the matched term explains.
            coverage = len(term) / max(len(text), 1)
            return c, round(min(0.95, 0.6 + 0.4 * coverage), 2)
    return None, 0.0


def match_diagnosis(text_or_code: str) -> Tuple[Optional[str], float]:
    if text_or_code in diagnoses_by_code():
        return text_or_code, 1.0
    text = compact(text_or_code)
    if not text:
        return None, 0.0
    for term, c in _diagnosis_terms():
        if term == text:
            return c, 0.98
    for term, c in _diagnosis_terms():
        if term in text:
            coverage = len(term) / max(len(text), 1)
            return c, round(min(0.95, 0.6 + 0.4 * coverage), 2)
    return None, 0.0

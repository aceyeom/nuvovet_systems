#!/usr/bin/env python3
"""
Build claims/data/qia_aliases.json from the raw QIA (농림축산검역본부) product-registry scrape.

Input   backend/data/AZ트/dog_drugs_only_raw.jsonl  (3,161 records; the raw file, not the cleaned subset)
Output  backend/claims/data/qia_aliases.json

Rules (docs/claims/SCHEMA_V2_SPEC.md §A6–7):
  * Exact ingredient matching only: the English INN with salts/hydrates stripped, the Korean name with
    salt suffixes stripped, or the registry's own Korean↔English pairs ('아목시실린수화물(Amoxicillin
    Hydrate, EP)'). No fuzzy matching: in the audit, jamo-fuzzy was ~27% precise.
  * Every active ingredient must map. Combination products list every ingredient (or the existing
    combination record, e.g. amoxicillin_clavulanate). Excipients are ignored; partly mapped products
    get no alias.
  * Only domestic companion-animal drugs (동물용의약품): export-only (수출용) and livestock-only
    products are dropped; quasi-drugs and biologics are handled by build_noncovered.py.
  * Targets are canonical records: QIA-created duplicates and junk listed in
    claims/data/legacy_drug_records.json are never targets, and an eye/ear product never lands on a
    systemic record (or vice versa) when a route-specific record exists.
  * A brand stem that maps to two different ingredient sets is dropped (listed in _meta.conflicts).
  * Each alias carries its licence number (품목정보) so it can be re-checked against medi.qia.go.kr.

Usage:  cd backend && python3 scripts/build_qia_aliases.py
"""

from __future__ import annotations

import collections
import glob
import json
import os
import re
import sys
from datetime import date
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Set, Tuple

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from claims.codebook import compact  # noqa: E402
from claims.knowledge import english_product_stem, product_stem as stem  # noqa: E402

RAW = BACKEND / "data" / "AZ트" / "dog_drugs_only_raw.jsonl"
CONVERTED = BACKEND / "data" / "converted"
DATA = BACKEND / "claims" / "data"
OUT = DATA / "qia_aliases.json"

# ── Raw registry ──────────────────────────────────────────────────


def load_raw(path: Path = RAW) -> List[dict]:
    """The scrape has a few records with raw newlines inside JSON strings; join them back."""
    recs, buf = [], ""
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            s = buf + line
            try:
                rec = json.loads(s, strict=False)
            except json.JSONDecodeError:
                buf = s.rstrip("\n") + "\\n"
                continue
            buf = ""
            if "raw_content" not in rec:
                rec["raw_content"] = rec.get("raw\n_content", "")
            recs.append(rec)
    return recs


HEAD = ["제품명", "제품 영문명", "업체명", "업상태", "허가일", "품목정보", "취소/취하구분", "허가심사유형", "제조/수입구분", "분류코드"]
SEC_END = r"(?=\n(?:효능효과|용법용량|주의사항|성상ㆍ제조방법|성상|저장방법|포장단위|top)\b|\Z)"
AMT = r"(?:[\d,]+(?:\.\d+)?|적량|-|미량)"
ROW_FULL = re.compile(r"^(\d+)\s+(.+?)\s+(" + AMT + r")\s+(\S+)\s+(.*)$")
ROW_NAME = re.compile(r"^(\d+)\s+(.+)$")


def _field(c: str, name: str) -> Optional[str]:
    m = re.search(r"^" + re.escape(name) + r" (.*)$", c, re.M)
    return m.group(1).strip() if m else None


def _section(c: str, start: str) -> str:
    m = re.search(r"\n" + start + r"[^\n]*\n(.*?)" + SEC_END, c, re.S)
    return m.group(1).strip() if m else ""


def _ingredients(c: str) -> List[dict]:
    m = re.search(r"원료약품 및 분량\n(.*?)(?=\n효능효과|\n용법용량|\n주의사항|\Z)", c, re.S)
    rows, fmt = [], None
    for line in (m.group(1) if m else "").split("\n"):
        line = line.strip()
        if line.startswith("순번 성분명 분량"):
            fmt = "full"
            continue
        if line.startswith("순번 성분명"):
            fmt = "name"
            continue
        if line.startswith("첨가제"):
            break
        if fmt is None:
            continue
        if fmt == "full":
            mm = ROW_FULL.match(line)
            if mm:
                rows.append(dict(n=int(mm.group(1)), name=mm.group(2).strip(), rest=mm.group(5)))
                continue
        mm = ROW_NAME.match(line)
        if mm:
            rows.append(dict(n=int(mm.group(1)), name=mm.group(2).strip(), rest=None))
    return rows


SPECIES = {
    "dog": r"(?:애완견|소형견|중형견|대형견|노견|반려견|(?<![가-힣0-9])개(?=$|[^가-힣]|와|의|에|는|및|용|나|,)|강아지|애견|자견|성견|(?<![가-힣])견(?=[^가-힣]|$))",
    "cat": r"(?:애완묘|고양이|반려묘|애묘|(?<![가-힣])묘(?=[^가-힣]|$))",
    "cattle": r"(?:(?<![가-힣])소(?=$|[^가-힣]|와|의|에|는|및|,)|송아지|젖소|육우|한우|비육우|착유우)",
    "pig": r"(?:돼지|자돈|모돈|비육돈|양돈)",
    "poultry": r"(?:(?<![가-힣])닭|육계|산란계|칠면조|(?<![가-힣])오리(?!지)|가금|병아리|메추리)",
    "horse": r"(?:(?<![가-힣])말(?=$|[^가-힣]|과|의|에|은|및|,))",
    "small_ruminant": r"(?:산양|면양|(?<![가-힣])양(?=$|[^가-힣]|과|의|에|은|및|,)|염소|사슴)",
    "fish": r"(?:어류|넙치|조피볼락|송어|뱀장어|틸라피아|숭어)",
    "pet": r"(?:반려동물|애완동물|펫(?![가-힣]))",
    "bee": r"(?:꿀벌|봉군|벌통)",
}
_SPECIES_RE = {k: re.compile(v, re.M) for k, v in SPECIES.items()}
COMPANION = {"dog", "cat", "pet"}


def species_of(*texts: str) -> Set[str]:
    return {k for k, rx in _SPECIES_RE.items() for t in texts if rx.search(t or "")}


def parse(rec: dict) -> dict:
    c = rec["raw_content"]
    p = {k: _field(c, k) for k in HEAD}
    p["index"] = rec.get("index")
    p["product_name"] = (rec.get("product_name") or p["제품명"] or "").strip()
    p["ingredients"] = _ingredients(c)
    p["efficacy"] = _section(c, "효능효과")
    p["dosage"] = _section(c, "용법용량")
    m = re.search(r"제형\s*[:：]\s*([^\n]+)", c)
    p["form"] = m.group(1).strip() if m else ""
    info = p["품목정보"] or ""
    p["licence_no"] = info
    p["category"] = info.split("-")[0] if info else "?"  # 동물용의약품 | 동물용의약외품 | 생물의약품
    sp = species_of(p["efficacy"], p["dosage"], p["product_name"])
    p["species"] = sp
    comp, live = sp & COMPANION, sp - COMPANION
    p["species_class"] = ("no_species_found" if not sp else "companion_only" if comp and not live
                          else "mixed" if comp else "livestock_only")
    p["export_only"] = "수출" in p["product_name"]
    return p


def load_registry(path: Path = RAW) -> List[dict]:
    return [parse(r) for r in load_raw(path)]


def companion_species(p: dict) -> List[str]:
    out = sorted(p["species"] & {"dog", "cat"})
    return out or (["dog", "cat"] if "pet" in p["species"] else [])


# ── Canonical drug records ────────────────────────────────────────

NON_SYSTEMIC = ("ophthalmic", "otic", "topical", "transdermal")


def load_records() -> Dict[str, dict]:
    recs = {}
    for f in glob.glob(str(CONVERTED / "*" / "*.jsonl")):
        try:
            r = json.loads(Path(f).read_text(encoding="utf-8").strip())
        except Exception:
            continue
        if isinstance(r, dict):
            recs[r.get("id") or os.path.basename(f)[:-6]] = r
    return recs


def legacy_map() -> Tuple[Dict[str, str], Set[str]]:
    book = json.loads((DATA / "legacy_drug_records.json").read_text(encoding="utf-8"))
    return book["duplicates"], {x for ids in book["excluded"].values() for x in ids}


def qia_created(recs: Dict[str, dict]) -> Set[str]:
    return {k for k, r in recs.items() if "한국 허가자료" in json.dumps(r.get("organ_burden_logic", {}), ensure_ascii=False)}


def canonical_targets(recs: Dict[str, dict]) -> Set[str]:
    """ASCII ids that are not a legacy duplicate or junk. QIA-only ingredients (febantel, fipronil) are kept."""
    dups, excluded = legacy_map()
    return {k for k in recs if k.isascii() and k not in dups and k not in excluded}


EN_SALTS = ["hydrochloride monohydrate", "hydrochloride", "hydrobromide", "hcl", "hci", "monohydrate", "dihydrate", "trihydrate",
            "sesquihydrate", "hydrate", "anhydrous", "disodium phosphate", "sodium phosphate", "sodium succinate", "sodium",
            "potassium", "calcium", "magnesium", "sulfate", "sulphate", "maleate", "mesylate", "mesilate", "besylate", "besilate",
            "acetate", "tartrate", "citrate", "fumarate", "succinate", "phosphate", "gluconate", "lactate", "bromide", "nitrate",
            "valerate", "propionate", "pivalate", "dipropionate", "benzoate", "palmitate", "embonate", "pamoate", "tosylate",
            "oxime", "base", "salt", "benzathine", "procaine", "decanoate", "furoate", "acetonide", "esylate", "lactobionate",
            "stearate", "estolate", "ethylsuccinate", "disodium", "chloride", "iodide"]
IONS = {"sodium", "potassium", "calcium", "magnesium", "zinc", "iron", "ferrous", "ferric", "copper", "cupric", "manganese", "cobalt",
        "lithium", "ammonium", "chloride", "sulfate", "carbonate", "acetate", "citrate", "phosphate", "lactate", "gluconate", "oxide",
        "hydroxide", "bromide", "iodide", "selenite", "benzoate", "stearate", "sulfur"}
KO_SALTS = ["염산염수화물", "염산염", "염산", "황산염", "황산", "메실산염", "말레산염", "베실산염", "인산나트륨", "인산염", "이나트륨", "나트륨", "칼륨",
            "칼슘", "수화물", "이수화물", "삼수화물", "일수화물", "아세트산염", "타르타르산염", "타르타르산", "시트르산염", "푸마르산염", "숙신산염",
            "프로피온산염", "디프로피온산염", "발레르산염", "피발산염", "파모산염", "옥심", "브롬화물", "브롬화수소산염", "질산염", "젖산염",
            "글루콘산염", "토실산염", "벤질페니실린", "에스테르", "무수물", "무수"]
# Systemic products whose only same-name record is route-specific.
EN_OVERRIDES = {"prednisolone": "prednisolone_prednisone", "prednisone": "prednisolone_prednisone"}


def en_norm(s: Optional[str]) -> str:
    s = (s or "").lower()
    s = re.sub(r"\([^)]*\)", "", s)
    s = re.sub(r"\b(kvp|usp|bp|kp|jp|ep|nf|ph\.?\s*eur|별규|injection|inj|tablets?|oral|systemic|intravenous)\b", "", s)
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    changed = True
    while changed:
        changed = False
        for suf in sorted(EN_SALTS, key=len, reverse=True):
            if s.endswith(" " + suf):
                res = s[: -len(suf) - 1].strip()
                if len(res) >= 5 and res not in IONS:
                    s, changed = res, True
    return s.replace(" ", "")


def ko_norm(s: Optional[str]) -> str:
    s = re.sub(r"\([^)]*\)", "", s or "")
    s = re.sub(r"[\s\-_,·\.]", "", s)
    changed = True
    while changed:
        changed = False
        for suf in sorted(KO_SALTS, key=len, reverse=True):
            if s.endswith(suf) and len(s) > len(suf) + 1:
                s, changed = s[: -len(suf)], True
        for pre in ("염산", "황산"):
            if s.startswith(pre) and len(s) > len(pre) + 2:
                s, changed = s[len(pre):], True
    return s


def build_index(recs: Dict[str, dict], allowed: Set[str]) -> Tuple[Dict[str, Set[str]], Dict[str, Set[str]]]:
    en: Dict[str, Set[str]] = collections.defaultdict(set)
    ko: Dict[str, Set[str]] = collections.defaultdict(set)
    for rid in allowed:
        di = recs[rid].get("drug_identity") or {}
        for n in (rid.replace("_", " "), di.get("name_en"), di.get("active_ingredient")):
            k = en_norm(n)
            if len(k) >= 3 and k not in IONS:
                en[k].add(rid)
        if di.get("name_ko"):
            k = ko_norm(di["name_ko"])
            if len(k) >= 3:
                ko[k].add(rid)
    return en, ko


def is_local(rid: str) -> bool:
    return any(t in rid for t in NON_SYSTEMIC)


def pick(ids: Iterable[str], want_local: bool) -> Optional[str]:
    """Route-aware choice; never put an eye/ear product on a systemic record or a systemic product on a local one."""
    ids = sorted(ids)
    local = [i for i in ids if is_local(i)]
    systemic = [i for i in ids if not is_local(i)]
    if want_local:
        return (local or systemic or [None])[0]
    return (systemic or [None])[0]


# ── Ingredient rows ───────────────────────────────────────────────

EXC_KO = ["주사용수", "정제수", "증류수", "유당", "셀룰로오스", "셀룰로우스", "스테아르산마그네슘", "스테아린산마그네슘", "벤질알코올", "벤질알콜",
          "프로필렌글리콜", "폴리에틸렌글리콜", "에탄올", "염화나트륨", "향", "전분", "이산화규소", "실리카", "젤라틴", "글리세린", "글리세롤",
          "파라벤", "파라옥시안식향산", "수산화나트륨", "염산(", "구연산", "시트르산", "포도당", "덱스트린", "말토덱스트린", "만니톨", "소르비톨",
          "자당", "백당", "탈크", "활석", "카르복시메틸", "히드록시프로필", "포비돈", "크로스포비돈", "폴리소르베이트", "레시틴", "대두유",
          "옥수수유", "참기름", "유동파라핀", "디메틸설폭시드", "부틸히드록시", "토코페롤아세테이트(", "산화철", "색소", "이산화티탄", "에데트산",
          "아황산", "피로아황산", "메타중아황산", "인산이수소", "인산수소", "완충", "부형제", "결정셀룰", "등외분", "효모", "난황", "락토오스",
          "감미", "사료공정서", "라우릴황산", "마크로골", "아스파탐", "염화메틸렌", "락트산", "젖산", "알기닌", "아르기닌(Arginine, EP)",
          "디부틸히드록시", "사카린", "디에틸렌글리콜", "이소프로판올", "이소프로필", "오파드라이", "간 파우더", "간파우더", "초코", "향료", "착향",
          "감미제", "부틸알코올", "클로로크레솔", "클로로클레솔", "메틸파라", "프로필파라", "파라옥시", "니켈글루코네이트", "벤토나이트",
          "에칠알코올", "에틸알코올", "아세트산나트륨", "초산나트륨", "인산나트륨", "수산화칼륨", "황산(", "요소"]
EXC_EN = ["water for injection", "lactose", "cellulose", "magnesium stearate", "benzyl alcohol", "propylene glycol", "polyethylene glycol",
          "ethanol", "sodium chloride", "flavor", "flavour", "starch", "silicon dioxide", "silica", "gelatin", "glycerin", "glycerol", "paraben",
          "hydroxybenzoate", "sodium hydroxide", "hydrochloric acid", "citric acid", "dextrose", "glucose", "dextrin", "mannitol", "sorbitol",
          "sucrose", "talc", "carboxymethyl", "hydroxypropyl", "povidone", "polysorbate", "lecithin", "soybean oil", "paraffin",
          "dimethyl sulfoxide", "butylated", "iron oxide", "titanium dioxide", "edetate", "edta", "metabisulfite", "bisulfite",
          "phosphate buffer", "yeast", "yolk", "vehicle", "excipient", "sodium carboxymethyl", "croscarmellose", "stearic acid", "aroma",
          "pork liver", "beef", "chicken", "lauryl", "macrogol", "aspartame", "methylene chloride", "lactic acid", "butylhydroxy",
          "butylhydorxy", "saccharin", "diethylene glycol", "isopropanol", "isopropyl", "fragrance", "opadry", "liver powder", "chocolate",
          "sodium acetate", "arginine", "chlorocresol", "bentonite"]
NONDRUG = re.compile(
    r"(비타민|vitamin|^l-|^dl-|^d-|아미노|메티오닌|methionin|리신|lysine|트레오닌|류신|발린|글리신|글루타민|아르기닌|카르니틴|carnitine|타우린|"
    r"taurine|칼슘|calcium|칼륨|potassium|나트륨|sodium|마그네슘|magnes|아연|zinc|철|iron|ferr|셀레늄|셀렌|selen|구리|copper|cupric|망간|mangan|"
    r"코발트|cobalt|요오드|iod|바실러스|bacillus|락토바실|lactobac|엔테로코|enterococ|비피도|bifido|효모|yeast|효소|amylase|protease|xylanase|"
    r"아밀라|프로테아|올리고당|oligosacch|추출물|extract|오일|oil|향$|flavor|니코틴산|nicotin|niacin|판토텐|panto|엽산|folic|비오틴|biotin|"
    r"리보플라빈|riboflavin|시아노코발라민|cyanocobal|티아민|치아민|thiamin|피리독신|pyridox|콜린|choline|이노시톨|inositol|글루코사민|glucosam|"
    r"콘드로이친|chondroit|오메가|omega|레시틴|말분|당|시럽|알코올|alcohol|알콜|글리콜|glycol|에테르|ether|라우릴|lauryl|페놀|phenol|수산화|"
    r"hydroxide|과당|fructose|소르비톨|sorbitol|사카린|saccharin)", re.I)
SUPPLEMENT_IDS = {"vitamin_a", "pyridoxine", "thiamine", "lysine", "methionine", "magnesium_iv", "ascorbic_acid", "folic_acid", "taurine",
                  "calcium_oral_carbonate_gluconate_lactate", "niacinamide", "levocarnitine", "vitamin_e_selenium", "sodium_bicarbonate",
                  "acetic_acid", "ferrous_sulfate", "iron_dextran", "mineral_oil", "sorbitol", "ethanol", "caffeine", "zinc_systemic",
                  "glycerin_oral", "dextrose_50_injection", "hypertonic_saline_7_to_7_5_percent", "cyanocobalamin", "methyl_p_hydroxybenzoate"}
# Existing combination records and the INN prefixes that identify them.
COMBOS = {"amoxicillin_clavulanate": ["amoxic", "clavul"], "ampicillin_sulbactam": ["ampici", "sulbac"],
          "sulfa_trimethoprim": ["sulfa", "trimet"], "sulfadimethoxine_ormetoprim": ["sulfad", "ormeto"],
          "selamectin_sarolaner": ["selame", "sarola"], "ivermectin_clorsulon": ["iverme", "clorsu"],
          "emodepside_praziquantel": ["emodep", "prazi"], "eprinomectin_praziquantel": ["eprino", "prazi"],
          "pyrimethamine_sulfadiazine": ["pyrime", "sulfadi"], "spironolactone_benazepril": ["spiron", "benaze"],
          "tiletamine_zolazepam": ["tileta", "zolaze"], "medetomidine_vatinoxan": ["medeto", "vatino"],
          "trimeprazine_prednisolone": ["trimep", "predni"], "diphenoxylate_atropine": ["diphen", "atropi"],
          "kaolin_pectin": ["kaolin", "pectin"], "imipenem_cilastatin": ["imipen", "cilast"],
          "piperacillin_tazobactam": ["pipera", "tazoba"], "oxytetracycline_polymyxin_b_ophthalmic": ["oxytet", "polymy"],
          "glucosamine_chondroitin_sulfate": ["glucos", "chondr"]}


def is_excipient(name: str) -> bool:
    low = name.lower()
    return any(k in name for k in EXC_KO) or any(k in low for k in EXC_EN)


def split_name(name: str) -> Tuple[str, List[str]]:
    """'아목시실린수화물(Amoxicillin Hydrate, EP;역가)' → ('아목시실린수화물', ['Amoxicillin Hydrate'])."""
    ko = re.split(r"[\(（]", name)[0].strip()
    ko = re.split(r"\s+[\d\.,]+(?:\s|$|\(|[가-힣A-Za-z])", ko)[0].strip() or ko
    ens = []
    m = re.search(r"\(([^()]*[A-Za-z][^()]*)\)", name)
    if m:
        ens.append(re.split(r"[,;]", m.group(1))[0])
    if not re.search("[가-힣]", ko) and re.search("[A-Za-z]", ko):
        ens.append(ko)
        ko = ""
    return ko, ens


def wants_local(p: dict) -> Optional[str]:
    """'ophthalmic' / 'otic' for eye and ear products, else None."""
    text = p["product_name"] + " " + (p["form"] or "") + " " + p["dosage"][:200]
    if any(h in text for h in ("점안", "안약", "안연고")):
        return "ophthalmic"
    if "점이" in text:
        return "otic"
    return None


class Mapper:
    def __init__(self, registry: List[dict], recs: Dict[str, dict]):
        self.allowed = canonical_targets(recs)
        self.en, self.ko = build_index(recs, self.allowed)
        self.combos = [(k, v) for k, v in COMBOS.items() if k in self.allowed]
        pairs: Dict[str, collections.Counter] = collections.defaultdict(collections.Counter)
        for p in registry:
            for x in p["ingredients"]:
                ko, ens = split_name(x["name"])
                if ko and ens and re.search("[가-힣]", ko):
                    k, e = ko_norm(ko), en_norm(ens[0])
                    if len(k) >= 2 and len(e) >= 3:
                        pairs[k][e] += 1
        self.ko2en = {k: c.most_common(1)[0][0] for k, c in pairs.items()}

    def localise(self, rid: Optional[str], local: Optional[str]) -> Optional[str]:
        """An eye/ear product whose ingredient matched a systemic record moves to the route-specific record
        when one exists ('싸이클론 안연고' → cyclosporine_ophthalmic)."""
        if not rid or not local or is_local(rid):
            return rid
        base = re.sub(r"_(systemic|oral|iv_systemic|intravenous)$", "", rid)
        for cand in (f"{base}_{local}", f"{base}_topical"):
            if cand in self.allowed:
                return cand
        return rid

    def en_lookup(self, e: str, local: Optional[str]) -> Optional[str]:
        k = en_norm(e)
        if len(k) < 3:
            return None
        if not local and k in EN_OVERRIDES and EN_OVERRIDES[k] in self.allowed:
            return EN_OVERRIDES[k]
        return self.localise(pick(self.en[k], bool(local)), local) if k in self.en else None

    def map_row(self, x: dict, local: bool) -> Tuple[Optional[str], Optional[str], Optional[str]]:
        """→ (drug_id, how, english guess)."""
        ko, ens = split_name(x["name"])
        for e in ens:
            r = self.en_lookup(e, local)
            if r:
                return r, "en", en_norm(e)
        if ko:
            k = ko_norm(ko)
            if k in self.ko:
                r = self.localise(pick(self.ko[k], bool(local)), local)
                if r:
                    return r, "ko", None
            if k in self.ko2en:
                r = self.en_lookup(self.ko2en[k], local)
                if r:
                    return r, "ko→en (registry pair)", self.ko2en[k]
        if x.get("rest"):
            m = re.search(r"([A-Za-z][A-Za-z \-]{3,})", x["rest"])
            if m:
                r = self.en_lookup(m.group(1), local)
                if r:
                    return r, "rest", None
        guess = en_norm(ens[0]) if ens else (self.ko2en.get(ko_norm(ko)) if ko else None)
        return None, None, guess

    def map_product(self, p: dict) -> dict:
        local = wants_local(p)
        actives = []
        for x in p["ingredients"]:
            if is_excipient(x["name"]):
                continue
            rid, how, guess = self.map_row(x, local)
            actives.append(dict(name=x["name"], map=rid, how=how, en_guess=guess))
        p["actives"] = actives
        p["route"] = "local" if local else "systemic"
        p["local_route"] = local
        ids = list(dict.fromkeys(a["map"] for a in actives if a["map"]))  # table order
        p["mapped_ids"] = ids
        names = {en_norm(i) for i in ids} | {a["en_guess"] for a in actives if a.get("en_guess")}
        p["combo_id"] = None
        if len(actives) >= 2:
            for rid, parts in self.combos:
                if all(any(n and n.startswith(pt) for n in names) for pt in parts):
                    p["combo_id"] = rid
        p["tier"], p["ingredient_ids"] = tier(p)
        return p


# Buffers, solvents and preservatives that occasionally map to a drug record.
EXCIPIENT_LIKE_IDS = {"sodium_bicarbonate", "acetic_acid", "ethanol", "sorbitol", "glycerin_oral", "mineral_oil",
                      "methyl_p_hydroxybenzoate", "caffeine"}


def tier(p: dict) -> Tuple[str, List[str]]:
    p["actives"] = [a for a in p["actives"] if a["map"] not in EXCIPIENT_LIKE_IDS or len(p["actives"]) == 1]
    p["mapped_ids"] = [i for i in p["mapped_ids"] if i not in EXCIPIENT_LIKE_IDS or len(p["mapped_ids"]) == 1]
    acts, ids = p["actives"], p["mapped_ids"]
    if not acts:
        return "no_ingredients", []
    unmapped = [a for a in acts if not a["map"]]
    if p["combo_id"] and all(a["map"] or a.get("en_guess") for a in acts):
        return "combo", [p["combo_id"]]
    if not unmapped and len(ids) == 1:
        return ("supplement" if ids[0] in SUPPLEMENT_IDS else "single_drug"), ids
    if not unmapped and len(ids) >= 2:
        drugs = [i for i in ids if i not in SUPPLEMENT_IDS]
        return ("multi_drug", drugs + [i for i in ids if i in SUPPLEMENT_IDS]) if drugs else ("supplement", ids)
    if ids:
        return "partial", ids
    return "unmapped", []


ALIAS_TIERS = ("single_drug", "combo", "multi_drug")


def eligible_drug(p: dict) -> bool:
    return (p["category"] == "동물용의약품" and not p["export_only"]
            and p["species_class"] in ("companion_only", "mixed"))


def english_stem(p: dict) -> Optional[str]:
    return english_product_stem(p.get("제품 영문명") or "")


def build(registry: Optional[List[dict]] = None) -> dict:
    registry = registry or load_registry()
    recs = load_records()
    mapper = Mapper(registry, recs)
    drugs = [mapper.map_product(p) for p in registry if eligible_drug(p)]
    tiers = collections.Counter(p["tier"] for p in drugs)

    stems: Dict[str, List[dict]] = collections.defaultdict(list)
    for p in drugs:
        if p["tier"] not in ALIAS_TIERS:
            continue
        for s, kind in ((stem(p["product_name"]), "ko"), (english_stem(p), "en")):
            if not s or len(s) < 2:
                continue
            inn = mapper.en.get(en_norm(s)) if kind == "en" else None
            if inn and not (set(inn) & set(p["ingredient_ids"])):
                continue  # an English product name that is another drug's INN
            stems[s].append(dict(p=p, kind=kind))

    aliases, conflicts = {}, {}
    for s, hits in sorted(stems.items()):
        sets = {tuple(h["p"]["ingredient_ids"]) for h in hits}
        if len(sets) > 1:
            conflicts[s] = sorted({"+".join(x) for x in sets})
            continue
        ps = sorted((h["p"] for h in hits), key=lambda p: p["licence_no"])
        first = ps[0]
        ingredients = list(first["ingredient_ids"])
        aliases[s] = {
            "ingredients": ingredients,
            "drug_id": ingredients[0],
            "combination": first["tier"] in ("combo", "multi_drug"),
            "licence_no": first["licence_no"],
            "licence_nos": sorted({p["licence_no"] for p in ps}),
            "product_name": first["product_name"],
            "product_name_en": first.get("제품 영문명"),
            "category": first["category"],
            "species": sorted({sp for p in ps for sp in companion_species(p)}),
            "export_only": False,
            "route": first["route"],
            "stem_source": sorted({h["kind"] for h in hits}),
        }
    _flag_containment(aliases, recs)
    return {
        "_meta": {
            "description": "Korean (and English) brand stems from the QIA 동물용의약품 registry → canonical drug ids, with the licence number (품목정보) as provenance. Built by backend/scripts/build_qia_aliases.py; do not edit by hand.",
            "source": "backend/data/AZ트/dog_drugs_only_raw.jsonl (QIA product registry scrape, collected 2026-02-24/25; 3,161 records). Licence numbers allow an exact re-pull from medi.qia.go.kr. Licensing of the scrape is unconfirmed: see docs/DATA_PROVENANCE.md.",
            "rules": "exact ingredient matching only (English INN, Korean name, registry Korean↔English pairs); every active ingredient mapped; domestic companion drugs only (export-only and livestock-only dropped); targets exclude legacy duplicates/junk (legacy_drug_records.json); conflicting stems dropped. 'contains_ok' marks stems safe to match inside a longer receipt line (Korean, 3+ characters, not part of another drug's name); English stems are exact-match only.",
            "built": date.today().isoformat(),
            "counts": {
                "registry_records": len(registry),
                "domestic_companion_drugs": len(drugs),
                "products_by_tier": dict(sorted(tiers.items())),
                "aliases": len(aliases),
                "combination_aliases": sum(1 for a in aliases.values() if a["combination"]),
                "conflicting_stems_dropped": len(conflicts),
            },
            "conflicts": conflicts,
        },
        "aliases": aliases,
    }


def _flag_containment(aliases: Dict[str, dict], recs: Dict[str, dict]) -> None:
    """A stem may match inside a longer line only if it is 3+ characters and is not a substring of a name
    that belongs to a different drug ('사메' inside '덱사메타손')."""
    names: Dict[str, Set[str]] = collections.defaultdict(set)
    dups, excluded = legacy_map()
    curated = json.loads((DATA / "kr_drug_aliases.json").read_text(encoding="utf-8"))["aliases"]
    for did, ns in curated.items():
        for n in ns:
            names[compact(n)].add(did)
    for rid, r in recs.items():
        if rid in excluded:
            continue
        di = r.get("drug_identity") or {}
        for n in [di.get("name_ko"), di.get("name_en"), *(di.get("product_names_ko") or [])]:
            c = compact(n or "")
            if len(c) >= 3:
                names[c].add(dups.get(rid, rid))
    for s, a in aliases.items():
        names[s].update(a["ingredients"])
    for s, a in aliases.items():
        own = set(a["ingredients"])
        clash = any(s in n and n != s and not (ids & own) for n, ids in names.items())
        english_only = a["stem_source"] == ["en"]  # English brand words ('impact') stay exact-match only
        a["contains_ok"] = len(s) >= 3 and not s.isdigit() and not clash and not english_only


def main() -> None:
    out = build()
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    c = out["_meta"]["counts"]
    print(f"wrote {OUT.relative_to(BACKEND)}: {c['aliases']} aliases ({c['combination_aliases']} combinations), "
          f"{c['conflicting_stems_dropped']} conflicting stems dropped; products by tier {c['products_by_tier']}")


if __name__ == "__main__":
    main()

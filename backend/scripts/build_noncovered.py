#!/usr/bin/env python3
"""
Build claims/data/noncovered_products.json: products that Korean pet insurance does not pay for as
treatment, keyed by brand stem, each with its QIA licence number (품목정보).

Input   backend/data/AZ트/dog_drugs_only_raw.jsonl (raw QIA registry scrape; see build_qia_aliases.py)
Output  backend/claims/data/noncovered_products.json

Categories (coverage → what the engine should do with a matching line or prescription):
  동물용의약외품 (quasi-drugs)             coverage 'non_medical'
      shampoo_cleanser, wipes, deodorant, oral_care, ear_eye_care, skin_care, insect_repellent,
      supplement, quasi_drug_other
  생물의약품 that are vaccines              coverage 'preventive'  → vaccine
  동물용의약품 labelled for prevention       coverage 'preventive'
      heartworm_preventive  (efficacy mentions 심장사상충 + 예방)
      parasite_preventive   (efficacy mentions 예방 for fleas/ticks/worms)
    'label_also_treats' is true when the label also claims treatment (치료/구제), so coverage may
    still apply when a matching parasitic diagnosis is on the claim.

Ectoparasiticides whose label says 치료/구제 rather than 예방 (NexGard, Bravecto chews, Frontline) are
listed as parasite_preventive because insurers exclude them as 외부기생충 예방약 (BRAND_FAMILY adds the
receipt spellings 하트가드, 심파리카, 프론트라인 for their registry families). Dewormers labelled only for 구제
(Drontal, Panacur) are not listed: they treat an infestation.

Therapeutic biologics (monoclonal antibodies such as lokivetmab, interferons, immunoglobulins) are
not listed. Export-only and livestock-only products are dropped. A stem that is also a brand of a
covered drug (curated or QIA alias) is dropped; 'contains_ok' marks stems safe to match inside a
longer line (Korean, 4+ characters, not part of any drug name).

Usage:  cd backend && python3 scripts/build_noncovered.py
"""

from __future__ import annotations

import collections
import json
import re
import sys
from datetime import date
from pathlib import Path
from typing import Dict, List, Optional, Set

sys.path.insert(0, str(Path(__file__).resolve().parent))

from build_qia_aliases import BACKEND, DATA, Mapper, companion_species, load_records, load_registry  # noqa: E402
from claims.codebook import compact  # noqa: E402
from claims.knowledge import english_product_stem, product_stem, therapeutic_class  # noqa: E402

OUT = DATA / "noncovered_products.json"

# Quasi-drug subtypes, tried in this order on the product name, then on the label's 효능효과.
# (Korean keywords, English keywords); English keywords match whole words only ('oral' is not inside 'floral').
QUASI_SUBTYPES = [
    ("oral_care", "치약|구강|덴탈|양치|치석|구취|입냄새|칫솔|잇몸|오랄", "dental|oral|tooth|toothpaste|teeth|plaque"),
    ("ear_eye_care", "이어|귀|눈물|아이\\s*클|안구|눈\\s*세정|아이워시", "ear|ears|eye|eyes|otic"),
    ("insect_repellent", "기피|해충|벼룩|진드기|모기|살충", "repellent|repel|flea|fleas|tick|ticks|insect"),
    ("wipes", "티슈|와이프|물티슈|타올", "wipe|wipes|tissue|towel"),
    ("deodorant", "탈취|소취|냄새|데오|향수|코롱|미스트|프레쉬너", "perfume|deodorant|deodorizer|mist|cologne|fresh"),
    ("shampoo_cleanser", "샴푸|린스|컨디셔너|세정|클렌|워시|버블|목욕|폼|비누", "shampoo|conditioner|cleanser|cleansing|wash|bath|foam|soap"),
    ("supplement", "영양|보조|비타민|유산균|프로바이오|관절|오메가|면역|글루코사민|칼슘|츄|간식",
     "vitamin|probiotic|probiotics|omega|supplement|nutri|joint"),
    ("skin_care", "상처|피부|보습|크림|밤|연고|패치|소독|살균|젤|로션|스프레이", "cream|balm|wound|skin|gel|lotion|spray"),
]
_QUASI = [(cat, re.compile(f"(?:{ko})|(?<![a-z])(?:{en})(?![a-z])", re.I)) for cat, ko, en in QUASI_SUBTYPES]
VACCINE = re.compile(r"백신|vaccine|왁친|예방접종|면역", re.I)
THERAPEUTIC_BIOLOGIC = re.compile(r"단클론|항체|monoclonal|mab\b|인터페론|interferon|인터루킨|면역글로불린|immunoglobulin|globulin|혈청|"
                                  r"antiserum|치료|완화", re.I)
PARASITE = re.compile(r"심장사상충|사상충|벼룩|진드기|모기|회충|구충|촌충|조충|선충|편충|내부기생충|외부기생충|기생충")
TREATS = re.compile(r"치료|구제")
# Monthly/periodic ectoparasiticides. Their labels often say 치료/구제 (treat an infestation) rather than 예방,
# but insurers exclude them as 외부기생충 예방약; listed as parasite_preventive with label_also_treats.
ECTOPARASITICIDES = {"afoxolaner", "fluralaner", "sarolaner", "lotilaner", "fipronil", "selamectin", "selamectin_sarolaner",
                     "imidacloprid_systemic", "permethrin", "spinosad", "lufenuron"}
# Brand names written on receipts → the registry stem of that brand family (spelling variants, brand without suffix).
BRAND_FAMILY = {"하트가드": "하트가드플러스", "심파리카": "심패리카", "심파리카트리오": "심패리카트리오",
                "어드보킷": "애드보킷", "프론트라인": "프론트라인플러스"}


def quasi_subtype(p: dict) -> str:
    for text in (p["product_name"] + " " + (p.get("제품 영문명") or ""), p["efficacy"][:400]):
        for cat, rx in _QUASI:
            if rx.search(text):
                return cat
    return "quasi_drug_other"


def _antiparasitic(p: dict, mapper: Mapper) -> bool:
    """Every mapped active ingredient is an antiparasitic; with nothing mapped, a parasite word must sit
    right before '예방' (a liver drug that mentions fluke prevention in passing does not qualify)."""
    mapper.map_product(p)
    ids = p["mapped_ids"]
    if ids:
        return all(therapeutic_class(i) == "antiparasitic" for i in ids)
    return bool(re.search(PARASITE.pattern + r".{0,30}예방", p["efficacy"]))


def classify(p: dict, mapper: Mapper) -> Optional[dict]:
    if p["export_only"] or p["species_class"] == "livestock_only":
        return None
    cat = p["category"]
    if cat == "동물용의약외품":
        return {"category": quasi_subtype(p), "coverage": "non_medical"}
    if p["species_class"] not in ("companion_only", "mixed"):
        return None
    text = p["product_name"] + " " + (p.get("제품 영문명") or "") + " " + p["efficacy"]
    if cat == "생물의약품":
        if THERAPEUTIC_BIOLOGIC.search(p["product_name"] + " " + p["efficacy"][:300]):
            return None  # monoclonal antibodies, interferons, sera: treatments, not vaccines
        if VACCINE.search(text) or "예방" in p["efficacy"]:
            return {"category": "vaccine", "coverage": "preventive"}
        return None
    if cat != "동물용의약품" or not PARASITE.search(p["efficacy"]) or not _antiparasitic(p, mapper):
        return None
    eff = p["efficacy"].replace("예방", "")
    if "예방" in p["efficacy"]:
        sub = "heartworm_preventive" if "심장사상충" in p["efficacy"] else "parasite_preventive"
        return {"category": sub, "coverage": "preventive", "label_also_treats": bool(TREATS.search(eff))}
    if set(p["mapped_ids"]) & ECTOPARASITICIDES and re.search(r"벼룩|진드기", p["efficacy"]):
        return {"category": "parasite_preventive", "coverage": "preventive", "label_also_treats": True}
    return None


def covered_drug_names(recs: Dict[str, dict], preventive_stems: Set[str]) -> Dict[str, Set[str]]:
    """compact name → drug ids, for every brand/ingredient name of a drug that is not itself preventive-only."""
    names: Dict[str, Set[str]] = collections.defaultdict(set)
    curated = json.loads((DATA / "kr_drug_aliases.json").read_text(encoding="utf-8"))
    for did, ns in curated["aliases"].items():
        for n in ns:
            if compact(n) not in preventive_stems:  # '레볼루션', '브라벡토' are brands of preventives
                names[compact(n)].add(did)
    qia = json.loads((DATA / "qia_aliases.json").read_text(encoding="utf-8"))["aliases"]
    for s, a in qia.items():
        if s not in preventive_stems:
            names[s].update(a["ingredients"])
    for rid, r in recs.items():
        di = r.get("drug_identity") or {}
        for n in [di.get("name_ko"), di.get("name_en"), di.get("active_ingredient"), rid.replace("_", " ")]:
            c = compact(n or "")
            if len(c) >= 3:
                names[c].add(rid)
    return names


def build(registry: Optional[List[dict]] = None) -> dict:
    registry = registry or load_registry()
    recs = load_records()
    mapper = Mapper(registry, recs)
    rows = []
    for p in registry:
        c = classify(p, mapper)
        if c:
            rows.append((p, c))
    by_stem: Dict[str, List[tuple]] = collections.defaultdict(list)
    for p, c in rows:
        for s in {product_stem(p["product_name"]), english_product_stem(p.get("제품 영문명") or "")}:
            if s and len(s) >= 2:
                by_stem[s].append((p, c))

    preventive_stems = {s for s, hits in by_stem.items() if all(c["coverage"] == "preventive" for _, c in hits)}
    drug_names = covered_drug_names(recs, preventive_stems)

    products, dropped = {}, {}
    priority = [c for c, _, _ in QUASI_SUBTYPES] + ["quasi_drug_other", "vaccine", "heartworm_preventive", "parasite_preventive"]
    for s, hits in sorted(by_stem.items()):
        if s in drug_names:
            dropped[s] = "also the brand or name of a covered drug"
            continue
        cats = collections.Counter(c["category"] for _, c in hits)
        top = max(cats, key=lambda k: (cats[k], -priority.index(k)))
        chosen = sorted(((p, c) for p, c in hits if c["category"] == top), key=lambda pc: pc[0]["licence_no"])
        p, c = chosen[0]
        products[s] = {
            "category": top,
            "coverage": c["coverage"],
            "licence_no": p["licence_no"],
            "licence_nos": sorted({q["licence_no"] for q, _ in chosen}),
            "product_name": p["product_name"],
            "product_name_en": p.get("제품 영문명"),
            "registry_category": p["category"],
            "species": sorted({sp for q, _ in chosen for sp in companion_species(q)}),
            **({"label_also_treats": any(cc.get("label_also_treats") for _, cc in chosen)} if c["coverage"] == "preventive" and top != "vaccine" else {}),
        }
    for brand, family in BRAND_FAMILY.items():
        if family in products and brand not in products:
            products[brand] = {**products[family], "brand_family_of": family}
    for s, e in products.items():
        korean = bool(re.search("[가-힣]", s))
        inside_drug = any(s in n and n != s for n in drug_names)
        e["contains_ok"] = korean and len(s) >= 4 and not inside_drug

    counts = collections.Counter(e["category"] for e in products.values())
    return {
        "_meta": {
            "description": "Products pet insurance does not pay for as treatment: QIA 동물용의약외품 (quasi-drugs), vaccines, and drugs labelled for parasite/heartworm prevention. Keyed by brand stem (claims.knowledge.product_stem). Built by backend/scripts/build_noncovered.py; do not edit by hand.",
            "source": "backend/data/AZ트/dog_drugs_only_raw.jsonl (QIA product registry scrape, collected 2026-02-24/25). licence_no is the registry 품목정보 for re-checking on medi.qia.go.kr. Licensing of the scrape is unconfirmed: see docs/DATA_PROVENANCE.md.",
            "coverage_rule": "A line item or prescription that matches is ineligible with reason 'noncovered_product:<category>'. For heartworm_preventive / parasite_preventive with label_also_treats, a claimed parasitic diagnosis (e.g. NVD-INF-002 heartworm disease) may make it eligible; that is a policy decision for the engine.",
            "subtype_rules": {c: {"ko": ko, "en": en} for c, ko, en in QUASI_SUBTYPES},
            "built": date.today().isoformat(),
            "counts": {"products": len(products), "by_category": dict(sorted(counts.items())),
                       "dropped_as_drug_brand": len(dropped)},
            "dropped": dropped,
        },
        "products": products,
    }


def main() -> None:
    out = build()
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    c = out["_meta"]["counts"]
    print(f"wrote {OUT.relative_to(BACKEND)}: {c['products']} product stems {c['by_category']}; "
          f"{c['dropped_as_drug_brand']} dropped as covered-drug brands")


if __name__ == "__main__":
    main()

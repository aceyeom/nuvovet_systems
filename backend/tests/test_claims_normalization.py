"""
Normalization layer of the claims engine (docs/claims/SCHEMA_V2_SPEC.md §A):
procedure/diagnosis matching, EMR prefixes, codebook integrity, drug resolution (curated > QIA > DB > fuzzy),
legacy-record canonicalisation and the non-covered product dictionary.
"""

import json
import re
import sys
from pathlib import Path

import pytest

from claims.codebook import (
    Match,
    diagnoses_by_code,
    diagnosis_book,
    match_diagnosis,
    match_diagnosis_full,
    match_procedure,
    match_procedure_full,
    normalize_category_hint,
    parse_emr_prefix,
    procedure_book,
    procedures_by_code,
)
from claims.knowledge import (
    _legacy,
    is_noncovered_product,
    looks_like_drug,
    noncovered_product,
    resolve_drug,
    resolve_drug_full,
    resolve_drug_line,
    therapeutic_class,
)
from services.drug_loader import get_drug_db

FIXTURES = Path(__file__).parent / "fixtures"
DATA = Path(__file__).resolve().parents[1] / "claims" / "data"


def _load(name):
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def _ok(code, expected):
    if expected is None:
        return code is None
    return code in expected if isinstance(expected, list) else code == expected


# ── Procedure probe ───────────────────────────────────────────────

def test_emr_probe_accuracy_at_least_95_percent():
    probe = _load("emr_lines.json")
    rows = probe["lines"]
    assert len(rows) == 209
    wrong = []
    for row in rows:
        code = match_procedure(row["text"])[0]
        if "route_to_drug" in row:
            good = (code is None or code.startswith("RX-")) and resolve_drug(row["text"])[0] == row["route_to_drug"]
        else:
            good = _ok(code, row["expected"])
        if not good:
            wrong.append((row["text"], row["expected"], code))
    accuracy = 1 - len(wrong) / len(rows)
    assert accuracy >= 0.95, wrong


def test_false_positive_probe_at_least_14_of_16():
    rows = _load("emr_lines.json")["false_positive_probe"]
    assert len(rows) == 16
    correct = sum(_ok(match_procedure(r["text"])[0], r["expected"]) for r in rows)
    assert correct >= 14, [(r["text"], match_procedure(r["text"])) for r in rows]


def test_tuning_round2_clinic_lines_at_least_95_percent():
    # Formerly 'held_out': these strings were used for fixes, so this is in-sample (see the fixture _meta).
    rows = _load("emr_lines.json")["tuning_round2"]
    wrong = [(r["text"], r["expected"], match_procedure(r["text"])[0]) for r in rows
             if not _ok(match_procedure(r["text"])[0], r["expected"])]
    assert 1 - len(wrong) / len(rows) >= 0.95, wrong


@pytest.mark.parametrize("text", [
    "Doctor's fee", "Infection control fee", "Ectropion surgery",   # 'ct' was CT
    "Usual visit", "Manual review",                                  # 'ua' was urinalysis
    "Antibiotic sensitivity note", "because", "grade 3 MPL",
])
def test_short_latin_terms_need_a_token_boundary(text):
    assert match_procedure(text)[0] is None


@pytest.mark.parametrize("text,code", [
    ("Chem10 + Lyte4", "LAB-002"), ("Chem17", "LAB-002"), ("CT 촬영", "IMG-004"), ("검사-CT(조영)", "IMG-004"),
    ("X-ray 2매", "IMG-001"), ("검사-T4", "LAB-010"), ("검사-fT4", "LAB-010"), ("SNAP 4Dx Plus", "LAB-012"),
    ("UA", "LAB-004"), ("AUS", "IMG-002"), ("Rad 2V", "IMG-001"), ("Dual-energy CT", "IMG-004"),
])
def test_short_latin_terms_still_match_whole_tokens(text, code):
    assert match_procedure(text)[0] == code


# ── EMR category prefix ───────────────────────────────────────────

def test_parse_emr_prefix():
    assert parse_emr_prefix("검사-X-ray(경상)") == ("검사", "X-ray(경상)")
    assert parse_emr_prefix("수액/수혈-수혈(전혈)") == ("수액/수혈", "수혈(전혈)")
    assert parse_emr_prefix("[처치] 귀세척") == ("처치", "귀세척")
    assert parse_emr_prefix("X-ray 2매") == (None, "X-ray 2매")
    assert parse_emr_prefix("진료비 세부내역서")[0] is None  # a space is not a separator


def test_prefix_default_code_when_item_is_unmatched():
    m = match_procedure_full("입원-소형견(1일)")
    assert (m.code, m.method, m.category_hint) == ("HOS-001", "category_default", "입원")
    assert match_procedure("의료폐기물-처리비")[0] == "ADM-002"
    assert match_procedure("마취-기타")[0] == "ANE-001"


def test_prefix_strips_category_word_from_the_item():
    # Without the prefix split, '수액' in '수액/수혈' coded transfusions as IV fluids.
    assert match_procedure("수액/수혈-수혈(전혈)")[0] == "TRT-013"
    assert match_procedure("마취-진정(덱스메데토미딘)")[0] == "ANE-002"


def test_prefix_gated_synonyms():
    assert match_procedure("켄넬코프")[0] is None              # could be treatment of kennel cough
    assert match_procedure("예방-켄넬코프")[0] == "PRE-006"
    assert match_procedure("켄넬코프", category_hint="예방")[0] == "PRE-006"
    assert match_procedure("백내장 검사")[0] is None
    assert match_procedure("수술-백내장")[0] == "SUR-013"


def test_category_hint_accepts_receipt_headings_and_internal_categories():
    assert normalize_category_hint("검사료") == "검사"
    assert normalize_category_hint("수액·수혈") == "수액/수혈"
    assert normalize_category_hint("lab") == "lab"
    assert normalize_category_hint("") is None
    assert match_procedure("소형견(1일)", category_hint="입원료")[0] == "HOS-001"


def test_hint_contradiction_leaves_line_unmapped():
    assert match_procedure("수술-초음파 수술기(하모닉)")[0] is None   # harmonic scalpel, not an ultrasound


def test_supersedes_and_generic_codes():
    assert match_procedure("Hospitalization - ICU")[0] == "HOS-002"
    assert match_procedure("수술-난소자궁적출(자궁축농증)")[0] == "SUR-009"
    assert match_procedure("재진 진료비")[0] == "CON-002"      # generic CON-000 yields
    assert match_procedure("진료비")[0] == "CON-000"


def test_bundle_lines_report_every_component():
    m = match_procedure_full("CBC+Chem")
    assert m.code == "LAB-001" and m.method == "bundle" and m.components == ("LAB-001", "LAB-002")


def test_v1_tuple_api_is_preserved():
    result = match_procedure("초진료")
    assert isinstance(result, tuple) and len(result) == 2
    assert match_procedure("아무거나", "LAB-001") == ("LAB-001", 1.0)
    full = match_procedure_full("검사-CBC")
    assert isinstance(full, Match) and full.matched_term == "cbc" and full.as_tuple() == match_procedure("검사-CBC")
    assert isinstance(match_diagnosis("외이염"), tuple)


def test_synthetic_demo_vocabulary_is_unchanged():
    base = _load("synthetic_vocab_baseline.json")
    assert {t: match_procedure(t)[0] for t in base["procedures"]} == base["procedures"]
    assert {t: match_diagnosis(t)[0] for t in base["diagnoses"]} == base["diagnoses"]
    assert {t: resolve_drug(t)[0] for t in base["drugs"]} == base["drugs"]


# ── Diagnoses ─────────────────────────────────────────────────────

def test_diagnosis_false_positives_are_gone():
    rows = _load("diagnosis_probe.json")["false_positive"]
    wrong = [(r["text"], r["expected"], match_diagnosis(r["text"])[0]) for r in rows
             if not _ok(match_diagnosis(r["text"])[0], r["expected"])]
    assert not wrong


@pytest.mark.parametrize("text,forbidden", [
    ("routine checkup", "NVD-URO-001"), ("hepatic insufficiency", "NVD-URO-003"), ("admission", "NVD-END-001"),
    ("pruritus", "NVD-RES-002"), ("fading kitten", "NVD-DER-005"), ("MDR1 Deficient", "NVD-URO-003"),
])
def test_diagnosis_short_latin_terms_need_token_boundary(text, forbidden):
    assert match_diagnosis(text)[0] != forbidden


def test_diagnosis_probe_accuracy():
    rows = _load("diagnosis_probe.json")["realistic"]
    wrong = [(r["text"], r["expected"], match_diagnosis(r["text"])[0]) for r in rows
             if not _ok(match_diagnosis(r["text"])[0], r["expected"])]
    assert 1 - len(wrong) / len(rows) >= 0.95, wrong


@pytest.mark.parametrize("text,code", [
    ("고관절 이형성증", "NVD-ORT-005"), ("단두종 기도 증후군", "NVD-RES-004"), ("IMHA", "NVD-HEM-001"),
    ("림프종", "NVD-ONC-002"), ("녹내장", "NVD-OPH-005"), ("애디슨병", "NVD-END-005"),
    ("심장사상충 감염", "NVD-INF-002"), ("바베시아", "NVD-INF-003"), ("항문낭염", "NVD-DER-006"),
    ("잠복고환", "NVD-REP-002"), ("제대탈장", "NVD-HRN-001"), ("잔존유치", "NVD-DEN-003"), ("체리아이", "NVD-OPH-006"),
    ("식욕부진", "NVD-SYM-001"), ("구토", "NVD-SYM-002"), ("설사", "NVD-SYM-003"), ("파행", "NVD-SYM-004"),
    ("소양감", "NVD-SYM-005"), ("탈모", "NVD-SYM-006"),
])
def test_new_diagnosis_codes(text, code):
    assert match_diagnosis(text)[0] == code


def test_disease_beats_symptom_and_prevention_stays_prevention():
    assert match_diagnosis("구토, 설사 (급성 위장염)")[0] == "NVD-GI-001"
    assert match_diagnosis("탈모, 소양감 - 아토피")[0] == "NVD-DER-001"
    assert match_diagnosis("심장사상충 예방")[0] == "NVD-PRE-003"
    assert match_diagnosis_full("구토").method == "exact"


# ── Codebook integrity ────────────────────────────────────────────

def test_procedure_codebook_integrity():
    book = procedure_book()
    meta = book["_meta"]
    codes = procedures_by_code()
    assert len(codes) == len(book["codes"]) >= 122
    for c in book["codes"]:
        assert c["category"] in meta["categories"], c["code"]
        assert c["coverage_category"] in meta["coverage_categories"], c["code"]
        assert isinstance(c["max_qty_per_visit"], int) and c["max_qty_per_visit"] >= 1, c["code"]
        assert c["unit"], c["code"]
        bm = c["benchmark"]
        if bm is not None:
            assert bm["p10"] < bm["p50"] < bm["p90"] and bm["source"], c["code"]
        for sup in c.get("supersedes") or []:
            assert sup in codes, (c["code"], sup)
        for gate in c.get("prefix_synonyms") or {}:
            assert gate in meta["emr_categories"], (c["code"], gate)
        assert c.get("allows_negative_price", False) == (c["code"] == "ADM-004")
    for key, spec in meta["emr_categories"].items():
        if key.startswith("_"):
            continue
        assert spec["default"] is None or spec["default"] in codes
        assert set(spec["categories"]) <= set(meta["categories"])
    expected = {"ADM-002": "admin", "ADM-003": "admin", "ADM-004": "discount", "ADM-005": "euthanasia",
                "NON-005": "non_medical", "NON-006": "non_medical", "NON-007": "non_medical", "PRE-013": "preventive"}
    assert {k: codes[k]["coverage_category"] for k in expected} == expected


def test_new_procedure_codes_have_no_invented_prices():
    old_codes = {"CON-001", "CON-002", "CON-003", "CON-004", "HOS-001", "HOS-002", "ADM-001", "RX-001", "RX-002"}
    new_codes = [c for c in procedure_book()["codes"] if c["benchmark"] is None]
    assert len(new_codes) == 61  # 60 from the v2 merge + PRE-015 (species-neutral vaccination, 2026-10-02 review)
    assert not old_codes & {c["code"] for c in new_codes}


def test_diagnosis_codebook_integrity():
    book = diagnosis_book()
    meta = book["_meta"]
    procs = procedures_by_code()
    classes = json.loads((DATA / "therapeutic_classes.json").read_text(encoding="utf-8"))["classes"]
    cats = procedure_book()["_meta"]["categories"]
    assert len(book["diagnoses"]) >= 65
    for d in book["diagnoses"]:
        assert d["body_system"] in meta["body_systems"], d["code"]
        assert d["condition_group"] in meta["condition_groups"], d["code"]
        assert d["specificity"] in ("diagnosis", "symptom"), d["code"]
        assert isinstance(d["congenital"], bool)
        ref = d["mafra_standard_ref"]
        assert ref is None or set(ref) == {"species_prefix", "code", "version"}
        assert set(d["expected_drug_classes"]) <= set(classes), d["code"]
        assert set(d["expected_procedure_categories"]) <= set(cats), d["code"]
        assert all(p in procs for p in d["atypical_procedures"]), d["code"]
        for sup in d.get("supersedes") or []:
            assert sup in diagnoses_by_code()
    symptoms = {d["name_ko"] for d in book["diagnoses"] if d["specificity"] == "symptom"}
    assert symptoms == {"식욕부진", "구토", "설사", "파행", "소양감", "탈모"}
    groups = {d["code"]: d["condition_group"] for d in book["diagnoses"]}
    assert groups["NVD-ORT-001"] == groups["NVD-ORT-005"] == "patella_hip"
    assert groups["NVD-DEN-001"] == "dental" and groups["NVD-CAR-001"] == "chronic_cardiac"


# ── Drug resolution ───────────────────────────────────────────────

@pytest.mark.parametrize("name,drug_id", [
    ("클라벳", "amoxicillin_clavulanate"),            # v1: amoxicillin
    ("펜다졸", "fenbendazole"),                         # v1: oxfendazole
    ("펜다졸 정", "fenbendazole"),
    ("타이로세틴-F", "sulfa_trimethoprim"),             # v1: tylosin
    ("프레드니소론(주)", "prednisolone_prednisone"),   # an injection, not the eye drop
    ("보미스탑 주", "maropitant"), ("클라펫 정", "amoxicillin_clavulanate"), ("셀리녹스-주", "cefovecin"),
    ("리버토르", "atipamezole"), ("프로하트 SR-12", "moxidectin"), ("노로딘", "sulfa_trimethoprim"),
    ("Convenia inj", "cefovecin"), ("Famotidine Inj.", "famotidine"), ("바이트릴 (정)", "enrofloxacin"),
    ("Amoxi-clav", "amoxicillin_clavulanate"), ("사이클로스포린 점안액", "cyclosporine_ophthalmic"),
    ("덱사메타손", "dexamethasone"), ("사메", "s_adenosyl_methionine_same"), ("레볼루션 플러스", "selamectin_sarolaner"),
])
def test_drug_resolution_cases_from_the_audit(name, drug_id):
    assert resolve_drug(name)[0] == drug_id


def test_qia_alias_carries_licence_provenance():
    r = resolve_drug_full("보미스탑 주")
    assert r.source == "qia" and re.fullmatch(r"동물용의약품-(제조|수입)-\d+-\d+", r.licence_no) and r.product_name


def test_curated_aliases_outrank_qia():
    r = resolve_drug_full("바이트릴")
    assert r.source == "curated" and r.drug_id == "enrofloxacin"


@pytest.mark.parametrize("name,primary,ingredients", [
    ("하트가드 플러스", "ivermectin", {"ivermectin", "pyrantel"}),
    ("드론탈 플러스", "praziquantel", {"praziquantel", "pyrantel", "febantel"}),
    ("넥스가드 스펙트라", "afoxolaner", {"afoxolaner", "milbemycin_oxime"}),
    ("밀베맥스", "milbemycin_oxime", {"milbemycin_oxime", "praziquantel"}),
    ("심파리카 트리오", "sarolaner", {"sarolaner", "moxidectin", "pyrantel"}),
    ("클라벳", "amoxicillin_clavulanate", {"amoxicillin_clavulanate"}),
])
def test_resolve_drug_full_returns_every_ingredient(name, primary, ingredients):
    r = resolve_drug_full(name)
    assert r.drug_id == primary and set(r.ingredients) == ingredients
    assert r.is_combination == (len(ingredients) > 1)
    assert resolve_drug(name) == r.as_tuple()  # v1 API returns the primary id


def test_resolution_never_lands_on_legacy_duplicates_or_junk():
    dups, excluded = _legacy()
    db = get_drug_db()
    queries = set(dups) | set(excluded)
    for rid in queries & set(db):
        ident = db[rid].get("drug_identity") or {}
        queries.update(n for n in [ident.get("name_ko"), ident.get("name_en"), *(ident.get("product_names_ko") or [])] if n)
    landed = {q: resolve_drug(q)[0] for q in queries}
    bad = {q: r for q, r in landed.items() if r in dups or r in excluded}
    assert not bad
    assert resolve_drug("메토클로프라미드염산염")[0] == "metoclopramide"
    assert resolve_drug("Magnesium stearate")[0] is None


def test_low_score_fuzzy_matches_are_not_accepted():
    assert resolve_drug("아미노피린")[0] is None      # v1: aminophylline
    assert resolve_drug("zz알수없는약")[0] is None
    assert resolve_drug("enrofloxacine")[0] == "enrofloxacin"


def test_qia_alias_file_is_well_formed():
    book = json.loads((DATA / "qia_aliases.json").read_text(encoding="utf-8"))
    dups, excluded = _legacy()
    db = get_drug_db()
    aliases = book["aliases"]
    assert len(aliases) >= 600
    for stem, a in aliases.items():
        assert re.fullmatch(r"동물용의약품-(제조|수입)-\d+-\d+", a["licence_no"]), stem
        assert a["export_only"] is False and a["category"] == "동물용의약품"
        assert a["ingredients"] and a["drug_id"] == a["ingredients"][0]
        assert all(i in db and i.isascii() and i not in dups and i not in excluded for i in a["ingredients"]), stem
        if len(a["ingredients"]) > 1:
            assert a["combination"], stem
        elif a["combination"]:  # a single existing combination record, e.g. amoxicillin_clavulanate
            assert "_" in a["ingredients"][0], stem
        if a["stem_source"] == ["en"]:
            assert not a["contains_ok"], stem
    assert sum(a["combination"] for a in aliases.values()) >= 100


# ── Drug-like lines ───────────────────────────────────────────────

@pytest.mark.parametrize("text,drug_id", [
    ("Famotidine Inj.", "famotidine"), ("바이트릴 (정)", "enrofloxacin"), ("Convenia inj", "cefovecin"),
    ("세파렉신 250mg", "cephalexin"), ("클라벳", "amoxicillin_clavulanate"),
])
def test_drug_like_lines_route_to_the_resolver(text, drug_id):
    assert looks_like_drug(text)
    assert resolve_drug_line(text).drug_id == drug_id


@pytest.mark.parametrize("text", ["혈액검사(CBC)", "입원-소형견(1일)", "위생미용", "진단서 발급"])
def test_procedure_lines_are_not_drug_lines(text):
    assert resolve_drug_line(text) is None


# ── Non-covered products ──────────────────────────────────────────

@pytest.mark.parametrize("name,category", [
    ("하트가드 플러스", "heartworm_preventive"), ("하트가드", "heartworm_preventive"),
    ("넥스가드 스펙트라", "heartworm_preventive"), ("넥스가드", "parasite_preventive"),
    ("브라벡토 츄어블정", "parasite_preventive"), ("심파리카", "parasite_preventive"),
    ("세레스토", "insect_repellent"), ("노비박 래비스", "vaccine"), ("바이오멀티케어", "supplement"),
])
def test_noncovered_products(name, category):
    assert is_noncovered_product(name) == category
    hit = noncovered_product(name)
    assert hit["licence_no"] and hit["coverage"] in ("preventive", "non_medical")


@pytest.mark.parametrize("name", ["아포퀠 5.4mg", "바이트릴", "메타캄", "세파렉신 250mg", "드론탈 플러스", "사이토포인트",
                                  "이버멕틴", "혈액검사(CBC)", "샴푸약"])
def test_treatments_are_not_noncovered(name):
    assert is_noncovered_product(name) is None


def test_no_treatment_drug_brand_is_flagged_noncovered():
    qia = json.loads((DATA / "qia_aliases.json").read_text(encoding="utf-8"))["aliases"]
    curated = json.loads((DATA / "kr_drug_aliases.json").read_text(encoding="utf-8"))["aliases"]
    names = [a["product_name"] for a in qia.values() if all(therapeutic_class(i) != "antiparasitic" for i in a["ingredients"])]
    names += [n for did, ns in curated.items() if therapeutic_class(did) != "antiparasitic" for n in ns]
    flagged = [(n, is_noncovered_product(n)) for n in names if is_noncovered_product(n)]
    assert not flagged
    base = _load("synthetic_vocab_baseline.json")
    assert not [t for t in [*base["procedures"], *base["drugs"]] if is_noncovered_product(t)]


def test_noncovered_file_is_well_formed():
    book = json.loads((DATA / "noncovered_products.json").read_text(encoding="utf-8"))
    allowed = {"shampoo_cleanser", "wipes", "deodorant", "oral_care", "ear_eye_care", "skin_care", "insect_repellent",
               "supplement", "quasi_drug_other", "vaccine", "heartworm_preventive", "parasite_preventive"}
    products = book["products"]
    assert len(products) >= 3000
    for stem, e in products.items():
        assert e["category"] in allowed, stem
        assert re.fullmatch(r"(동물용의약품|동물용의약외품|생물의약품)-(제조|수입)?-\d+-\d+", e["licence_no"]), stem
        assert e["coverage"] == ("non_medical" if e["registry_category"] == "동물용의약외품" else "preventive"), stem


# ── Generated data stays in sync with its build scripts ───────────

@pytest.fixture(scope="module")
def build_scripts():
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
    import build_noncovered
    import build_qia_aliases
    return build_qia_aliases, build_noncovered


def test_qia_aliases_match_build_script(build_scripts):
    build_qia_aliases, _ = build_scripts
    committed = json.loads((DATA / "qia_aliases.json").read_text(encoding="utf-8"))
    assert build_qia_aliases.build()["aliases"] == committed["aliases"]


def test_noncovered_products_match_build_script(build_scripts):
    _, build_noncovered = build_scripts
    committed = json.loads((DATA / "noncovered_products.json").read_text(encoding="utf-8"))
    assert build_noncovered.build()["products"] == committed["products"]


# ── 2026-10-02 review: realistic wording written outside the tuning loop ─────

def test_realistic_review_probe_lines():
    rows = _load("realistic_probe_2026_10_02.json")["lines"]
    wrong = [(r["text"], r["expected"], match_procedure(r["text"])[0]) for r in rows
             if not _ok(match_procedure(r["text"])[0], r["expected"])]
    assert 1 - len(wrong) / len(rows) >= 0.95, wrong


def test_realistic_review_probe_diagnoses_only_known_misses():
    book = _load("realistic_probe_2026_10_02.json")
    wrong = {r["text"] for r in book["diagnoses"] if not _ok(match_diagnosis(r["text"])[0], r["expected"])}
    assert wrong <= set(book["_meta"]["known_misses"]), wrong


@pytest.mark.parametrize("text,forbidden", [
    ("포도막염", "NVD-TOX-001"), ("포도상구균 감염", "NVD-TOX-001"),                 # uveitis / staph are not grape toxicity
    ("간질성 폐렴", "NVD-NEU-002"), ("간질성 신염", "NVD-NEU-002"),                  # interstitial ≠ epilepsy (SIU chronic)
    ("구충 감염증", "NVD-PRE-003"), ("예방접종 후 알레르기 반응", "NVD-PRE-001"),      # disease / complication ≠ prevention
    ("백신 부작용(안면부종)", "NVD-PRE-001"), ("접종부위 육종", "NVD-PRE-001"),
    ("중성화 수술 후 봉합부 감염", "NVD-PRE-002"), ("건강검진 중 발견된 심잡음", "NVD-PRE-004"),
    ("고관절 탈구(교통사고)", "NVD-ORT-005"), ("외상성 고관절 탈구", "NVD-ORT-005"),  # trauma ≠ hip dysplasia (365-day wait)
    ("범백혈구감소증(고양이 파보)", "NVD-INF-001"), ("고양이 파보", "NVD-INF-001"),     # feline, not canine parvo
    ("심장사상충 검사 음성", "NVD-INF-002"), ("심장사상충 검사", "NVD-INF-002"),       # a negative test / a test name
])
def test_diagnosis_false_positives_with_coverage_consequences(text, forbidden):
    assert match_diagnosis(text)[0] != forbidden


@pytest.mark.parametrize("text,code", [
    ("간질", "NVD-NEU-002"), ("특발성 간질", "NVD-NEU-002"), ("간질성 폐렴", "NVD-RES-003"),
    ("포도 섭취", "NVD-TOX-001"), ("건포도 중독", "NVD-TOX-001"),
    ("예방접종", "NVD-PRE-001"), ("종합백신", "NVD-PRE-001"), ("구충제 투약", "NVD-PRE-003"), ("벼룩 진드기 예방", "NVD-PRE-003"),
    ("건강검진 중 발견된 심잡음", "NVD-CAR-001"), ("중성화 수술 후 자궁축농증", "NVD-REP-001"),
    ("고양이 파보", "NVD-INF-005"), ("범백", "NVD-INF-005"), ("파보", "NVD-INF-001"),
    ("심장사상충 검사 양성", "NVD-INF-002"), ("심장사상충 감염, 파보 음성", "NVD-INF-002"), ("파보 음성, 장염", "NVD-GI-001"),
    ("외이도염(양측)", "NVD-DER-004"), ("MPL grade 2", "NVD-ORT-001"), ("고관절 이형성증", "NVD-ORT-005"),
])
def test_diagnosis_fixes_keep_the_real_meaning(text, code):
    assert match_diagnosis(text)[0] == code


def test_preventive_complications_go_to_a_human():
    for text in ("예방접종 후 알레르기 반응", "중성화 수술 후 봉합부 감염", "백신 부작용(안면부종)"):
        assert match_diagnosis(text)[0] is None, text


def test_discharge_meds_are_not_a_discount():
    assert match_procedure("퇴원약(D/C)")[0] != "ADM-004"
    assert match_procedure("D/C 약 7일")[0] != "ADM-004"
    assert "dc" not in procedures_by_code()["ADM-004"]["synonyms"]


@pytest.mark.parametrize("text", ["미용 할인", "입원비 할인", "할인(미용)", "원단위 절사", "쿠폰", "진료비 할인(회원)"])
def test_discount_words_make_a_discount_line(text):
    assert match_procedure(text)[0] == "ADM-004"


def test_discount_target_category():
    from claims.codebook import discount_target
    assert discount_target("미용 할인") == "non_medical"
    assert discount_target("입원비 할인") == "medical"
    assert discount_target("회원 할인") is None and discount_target("원단위 절사") is None


@pytest.mark.parametrize("text,code", [
    ("예방주사", "PRE-015"), ("고양이 예방주사", "PRE-015"), ("백신 접종", "PRE-015"), ("추가접종", "PRE-015"),
    ("DHPPL 종합백신", "PRE-003"), ("DHPP vaccine", "PRE-003"), ("광견병 백신", "PRE-005"), ("FVRCP vaccine", "PRE-004"),
    ("예방접종증명서", "ADM-001"),
    ("야간 입원(1일)", "HOS-001"), ("귀 세정 처치", "TRT-005"), ("엘리자베스 카라", "NON-004"),
    ("수술-슬개골탈구(MPL) 교정술", "SUR-001"), ("슬개골 탈구 수술(우측)", "SUR-001"), ("수술료-슬개골 내측탈구 정복술(좌)", "SUR-001"),
])
def test_review_procedure_fixes(text, code):
    assert match_procedure(text)[0] == code


def test_patella_word_alone_is_not_surgery():
    assert match_procedure("슬개골 촉진 검사")[0] != "SUR-001"
    assert match_procedure("grade 3 MPL")[0] is None


def test_species_neutral_vaccination_has_no_species_and_no_price():
    pre = procedures_by_code()["PRE-015"]
    assert pre["coverage_category"] == "preventive" and pre["benchmark"] is None
    assert "PRE-015" in procedure_book()["_meta"]["generic_codes"]  # a named vaccine (DHPPL, FVRCP) wins


@pytest.mark.parametrize("name,drug_id", [
    ("prednisolone", "prednisolone_prednisone"), ("Prednisolone 5mg", "prednisolone_prednisone"),
    ("Prednisolone tab", "prednisolone_prednisone"), ("prednisolone inj", "prednisolone_prednisone"),
    ("Amoxicillin-clav 250mg", "amoxicillin_clavulanate"), ("Synulox 250mg", "amoxicillin_clavulanate"),
    # eye drops and other prednisolone-containing records keep resolving to themselves
    ("prednisolone acetate 1% eye drops", "prednisolone_ophthalmic"), ("Pred Forte", "prednisolone_ophthalmic"),
    ("프레드니솔론 점안액", "prednisolone_ophthalmic"), ("Methylprednisolone acetate inj", "methylprednisolone"),
    ("Trimeprazine tartrate, Prednisolone", "trimeprazine_prednisolone"), ("Pred-G", "gentamicin_ophthalmic"),
])
def test_english_prednisolone_is_the_systemic_drug(name, drug_id):
    assert resolve_drug(name)[0] == drug_id

"""
Labelled synthetic claims for demos and engine evaluation.

Everything here is generated: clinics are named '샘플동물병원', prices are drawn
from the seed benchmarks, and anomalies are injected at known rates so recall
and false-positive rates can be measured. Synthetic results say nothing about
real-world performance; they test that the rules do what they claim to do.

v2 changes:
  - Line, diagnosis and drug wording is drawn mostly from EMR-style / clinic-style variants
    (the EMR probe strings in backend/tests/fixtures/emr_lines.json, e.g. '검사-X-ray(경상)',
    '입원-소형견(1일)', 'Famotidine Inj.'), so exact codebook terms are a minority and the
    evaluation is no longer circular. Receipts also carry admin lines (의료폐기물), discounts
    and drug-like injection lines that the engine must route to the drug resolver.
  - Each claim carries the documents its insurer profile asks for (receipt, statement,
    진단서 above the threshold, photos when unregistered, originals above the threshold),
    an intake channel and an insurer id. KB is not used: its 진단서 needs KB's own disease
    codes, which are not public, and synthetic codes would be fabricated.
  - New anomaly types that should pend, not review: total_only_receipt, missing_dx,
    above_threshold_no_cert, mixed_basket.

What the gate does and does not measure (review 2026-10-02): LINE_VARIANTS / DX_VARIANTS come from the EMR probe
strings the codebook was tuned on, so the gate on them is in-sample: it cannot see a normalization failure on
wording nobody tuned for. `generate(vocabulary="alt")` draws from ALT_LINE_VARIANTS / ALT_DX_VARIANTS instead —
clinic wording written for the review, never used to add codebook synonyms — and the tests report that gate
separately. Half of the total-only receipts arrive as an ordinary photo (labelled RECEIPT_ITEMIZED, no
RECEIPT_TOTAL_ONLY document) at their real amount, so the engine has to recognise them from the line itself and
recall is not 100% by construction.
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta
from typing import Dict, List, Optional, Tuple

from .benchmarks import region_multiplier
from .codebook import match_procedure, procedures_by_code
from .engine import insurer_profile
from .knowledge import resolve_drug
from .models import (
    Claim,
    Clinic,
    Deductible,
    Diagnosis,
    DocType,
    Document,
    IntakeChannel,
    LineItem,
    Limits,
    Patient,
    Policy,
    Prescription,
    WaitingPeriods,
)

REGIONS = ["서울"] * 5 + ["경기"] * 5 + ["인천", "부산", "부산", "대구", "광주", "대전", "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"]
DOG_BREEDS = [("말티즈", 2.5, 5), ("토이푸들", 2.5, 5), ("포메라니안", 2, 4), ("비숑 프리제", 4, 8), ("시츄", 4, 8), ("웰시코기", 10, 15), ("골든 리트리버", 25, 35), ("진돗개", 15, 22), ("셰틀랜드 쉽독", 6, 11), ("닥스훈트", 5, 10)]
CAT_BREEDS = [("코리안 숏헤어", 3, 6), ("페르시안", 3, 5.5), ("러시안 블루", 3, 5.5), ("스코티시 폴드", 3, 5.5), ("브리티시 숏헤어", 4, 7)]

# diagnosis text → (species, [(canonical line description, code, qty range)], [(drug, mg/kg range, freq, days)], weight,
#                   optional drug-like injection lines printed on the receipt)
SCENARIOS: Dict[str, dict] = {
    "아토피 피부염": {"species": None, "w": 10, "lines": [("재진료", "CON-002", (1, 1)), ("피부 세포검사", "LAB-006", (1, 2)), ("귀 도말검사", "LAB-007", (0, 1))],
                  "rx": [("아포퀠", (0.4, 0.6), "BID", 14), ("세파렉신", (15, 22), "BID", 14)]},
    "외이염": {"species": None, "w": 12, "lines": [("초진료", "CON-001", (1, 1)), ("귀 도말검사", "LAB-007", (1, 1)), ("귀 세척", "TRT-005", (1, 1)), ("귀약(외용제)", "RX-002", (1, 1))],
            "rx": []},
    "급성 위장염": {"species": None, "w": 14, "lines": [("초진료", "CON-001", (1, 1)), ("혈액검사(CBC)", "LAB-001", (1, 1)), ("혈청화학검사", "LAB-002", (1, 1)), ("복부 방사선", "IMG-001", (2, 2)), ("정맥 수액 처치", "TRT-001", (1, 1)), ("주사료", "TRT-003", (1, 2))],
               "rx": [("세레니아", (1, 1), "SID", 3), ("파모티딘", (0.5, 1), "BID", 5), ("메트로니다졸", (10, 15), "BID", 5)],
               "inj": ["Famotidine Inj.", "Maropitant inj.", "Ondansetron inj"]},
    "췌장염": {"species": None, "w": 5, "lines": [("초진료", "CON-001", (1, 1)), ("cPL 키트검사", "LAB-009", (1, 1)), ("혈액검사(CBC)", "LAB-001", (1, 1)), ("혈청화학검사", "LAB-002", (1, 1)), ("복부초음파", "IMG-002", (1, 1)), ("입원비", "HOS-001", (2, 4)), ("정맥 수액 처치", "TRT-001", (2, 4))],
            "rx": [("세레니아", (1, 1), "SID", 4), ("부프레노르핀", (0.01, 0.02), "TID", 3)],
            "inj": ["Famotidine Inj.", "Maropitant inj."]},
    "슬개골 탈구": {"species": "dog", "w": 7, "lines": [("초진료", "CON-001", (1, 1)), ("방사선 촬영", "IMG-001", (2, 3)), ("혈액검사(CBC)", "LAB-001", (1, 1)), ("혈청화학검사", "LAB-002", (1, 1)), ("호흡마취", "ANE-001", (1, 1)), ("슬개골 탈구 정복술", "SUR-001", (1, 1)), ("입원비", "HOS-001", (2, 3))],
              "rx": [("메타캄", (0.1, 0.1), "SID", 7), ("세파렉신", (20, 22), "BID", 7), ("가바펜틴", (5, 10), "BID", 7)],
              "inj": ["Buprenorphine inj"]},
    "이첨판 폐쇄부전증": {"species": "dog", "w": 6, "lines": [("재진료", "CON-002", (1, 1)), ("심장초음파", "IMG-003", (1, 1)), ("흉부 방사선", "IMG-001", (1, 2)), ("NT-proBNP", "LAB-014", (0, 1))],
                  "rx": [("베트메딘", (0.2, 0.3), "BID", 30), ("푸로세미드", (1, 2), "BID", 30)]},
    "고양이 하부요로계 질환": {"species": "cat", "w": 6, "lines": [("초진료", "CON-001", (1, 1)), ("요검사", "LAB-004", (1, 1)), ("복부 방사선", "IMG-001", (1, 2)), ("복부초음파", "IMG-002", (1, 1))],
                      "rx": [("가바펜틴", (5, 10), "BID", 7), ("부프레노르핀", (0.01, 0.02), "BID", 3)]},
    "세균성 방광염": {"species": "dog", "w": 5, "lines": [("초진료", "CON-001", (1, 1)), ("요검사", "LAB-004", (1, 1)), ("세균배양·감수성검사", "LAB-008", (0, 1))],
                "rx": [("클라바목스", (12.5, 13.75), "BID", 10)], "inj": ["Convenia inj"]},
    "만성 신장병": {"species": "cat", "w": 4, "lines": [("재진료", "CON-002", (1, 1)), ("혈청화학검사", "LAB-002", (1, 1)), ("요검사", "LAB-004", (1, 1)), ("피하 수액", "TRT-002", (1, 1)), ("혈압 측정", "TRT-009", (1, 1))],
               "rx": [("세레니아", (1, 1), "SID", 7)]},
    "결막염": {"species": None, "w": 5, "lines": [("초진료", "CON-001", (1, 1)), ("형광 염색검사", "TRT-007", (1, 1)), ("눈물량 검사", "TRT-008", (1, 1)), ("점안액", "RX-002", (1, 2))],
            "rx": []},
    "켄넬코프": {"species": "dog", "w": 5, "lines": [("초진료", "CON-001", (1, 1)), ("흉부 방사선", "IMG-001", (1, 2))],
              "rx": [("독시사이클린", (5, 5), "BID", 10)]},
    "위장관 이물": {"species": "dog", "w": 3, "lines": [("야간 응급 진찰", "CON-004", (1, 1)), ("방사선 촬영", "IMG-001", (2, 3)), ("복부초음파", "IMG-002", (1, 1)), ("혈액검사(CBC)", "LAB-001", (1, 1)), ("호흡마취", "ANE-001", (1, 1)), ("위장관 이물 제거술", "SUR-003", (1, 1)), ("입원비", "HOS-001", (2, 4)), ("정맥 수액 처치", "TRT-001", (2, 4))],
               "rx": [("세레니아", (1, 1), "SID", 3), ("클라바목스", (12.5, 13.75), "BID", 7)],
               "inj": ["Buprenorphine inj", "Maropitant inj."]},
    "예방접종": {"species": "dog", "w": 6, "lines": [("재진료", "CON-002", (1, 1)), ("DHPPL 종합백신", "PRE-003", (1, 1)), ("광견병 백신", "PRE-005", (0, 1))], "rx": []},
}

# EMR-style and clinic-style wording for each canonical line (EMR probe strings, backend/tests/fixtures/emr_lines.json).
LINE_VARIANTS: Dict[str, List[str]] = {
    "초진료": ["진찰-초진", "진찰료(초진)", "초진 진찰", "초진"],
    "재진료": ["진찰-재진", "진찰-재진(경과관찰)", "재진 진료비", "Recheck exam", "재진(경과)"],
    "야간 응급 진찰": ["진찰-야간진료", "진찰-초진(야간)", "응급진료비", "야간 진료 할증", "진찰-심야할증(22시 이후)"],
    "피부 세포검사": ["검사-피부스크래핑", "피부 테이프 검사", "피부 소파검사"],
    "귀 도말검사": ["검사-귀도말", "검사-귀 도말(현미경)", "Ear cytology", "이도 도말"],
    "귀 세척": ["처치-귀세척", "귀 세척(양쪽)", "이도 세척"],
    "귀약(외용제)": ["약제-귀약", "귀약"],
    "점안액": ["약제-안약(점안액)", "점안액(안약)", "안약"],
    "혈액검사(CBC)": ["검사-CBC", "검사-혈액검사(CBC)", "검사-전혈구검사(ProCyte)", "검사-혈구검사", "CBC 검사", "혈액 검사 CBC"],
    "혈청화학검사": ["검사-혈액화학(Chem17)", "검사-생화학 10종", "검사-혈청화학(Catalyst)", "생화학검사 15종", "혈액화학 검사(12항목)"],
    "복부 방사선": ["검사-X-ray(경상)", "방사선 촬영(복부 2매)", "검사-X-ray 2컷", "X-Ray 촬영"],
    "흉부 방사선": ["방사선-흉부 2view", "흉부 방사선(2view)", "검사-흉부 X-ray 3컷", "Radiographs (2 views)"],
    "방사선 촬영": ["검사-X-ray(경상)", "Rad 2V", "X-Ray 촬영", "검사-X-ray 2컷"],
    "정맥 수액 처치": ["수액/수혈-정맥수액(1일)", "처치-수액처치", "IVF", "수액처치(1일)", "정맥수액(24시간)"],
    "주사료": ["처치-피하주사", "처치-근육주사", "주사(항구토제)", "근육 주사"],
    "cPL 키트검사": ["검사-cPL", "검사-Spec cPL", "Snap cPL", "췌장 키트(cPL)"],
    "복부초음파": ["검사-복부초음파", "검사-초음파(복부)", "AUS", "복부 초음파 검사", "Abdominal ultrasound"],
    "호흡마취": ["마취-호흡마취(30분)", "호흡마취(1시간)", "마취(호흡)"],
    "슬개골 탈구 정복술": ["수술-슬개골탈구(MPL) 교정술", "슬개골 탈구 수술(우측)", "슬개골 정복술"],
    "심장초음파": ["검사-심장초음파(Echo)", "심장 초음파", "Echo"],
    "NT-proBNP": ["검사-NT-proBNP", "proBNP", "심장 바이오마커(NT-proBNP)"],
    "요검사": ["검사-요검사(UA)", "소변검사(스틱)", "Urinalysis", "요 검사(침사 포함)"],
    "세균배양·감수성검사": ["세균 배양 검사", "배양 및 감수성"],
    "피하 수액": ["수액/수혈-피하수액", "SQ fluids", "피하수액 처치", "SC fluids"],
    "혈압 측정": ["검사-혈압측정", "혈압 측정"],
    "형광 염색검사": ["검사-형광염색", "형광 염색"],
    "눈물량 검사": ["검사-쉬르머 눈물검사(STT)", "눈물량 검사(STT)"],
    "위장관 이물 제거술": ["수술-이물제거(장절개)", "이물 제거 수술", "장절개술(이물)"],
    "DHPPL 종합백신": ["예방-종합백신(DHPPL)", "종합백신(DHPPL)", "DHPP vaccine"],
    "광견병 백신": ["예방-광견병", "광견병 예방접종", "Rabies vaccine"],
    "MRI 촬영": ["검사-MRI(뇌)", "MRI(척추)"],
}
DX_VARIANTS: Dict[str, List[str]] = {
    "아토피 피부염": ["아토피성 피부염", "Atopic dermatitis", "알레르기성 피부염", "아토피 피부염 재발"],
    "외이염": ["외이염(양측)", "양측 외이염", "Otitis externa"],
    "급성 위장염": ["위장염", "Acute gastroenteritis", "급성 장염", "구토, 설사 (급성 위장염)"],
    "췌장염": ["급성 췌장염", "Pancreatitis"],
    "슬개골 탈구": ["슬개골 탈구 3기 (좌측)", "내측 슬개골 탈구", "슬개골 탈구(우측)"],
    "이첨판 폐쇄부전증": ["이첨판 폐쇄부전증 (B2)", "MMVD", "이첨판 폐쇄부전"],
    "고양이 하부요로계 질환": ["FLUTD", "특발성 방광염", "하부요로계 질환"],
    "세균성 방광염": ["방광염", "UTI"],
    "만성 신장병": ["CKD", "만성 신부전 (CKD 3기)"],
    "결막염": ["Conjunctivitis", "결막염(좌안)"],
    "켄넬코프": ["기관지염(켄넬코프)"],
    "위장관 이물": ["이물 섭취", "장폐색(이물)", "Foreign body"],
}
RX_VARIANTS: Dict[str, List[str]] = {
    "아포퀠": ["아포퀠 5.4mg", "Apoquel 3.6mg", "아포퀠정 16mg"],
    "세파렉신": ["세파렉신 250mg", "Cephalexin 500mg cap", "세파렉신캡슐"],
    "세레니아": ["세레니아정 16mg", "Cerenia 16mg tab"],
    "파모티딘": ["파모티딘 10mg", "Famotidine 10mg tab", "가스터정"],
    "메트로니다졸": ["메트로니다졸 250mg", "Metronidazole 250mg tab", "후라시닐정"],
    "부프레노르핀": ["Buprenorphine", "부프레노르핀 주사"],
    "메타캄": ["메타캄 현탁액", "Metacam 1.5mg/ml", "멜록시캄"],
    "가바펜틴": ["가바펜틴 100mg", "Gabapentin 100mg cap", "뉴론틴"],
    "베트메딘": ["베트메딘 1.25mg", "Vetmedin 2.5mg", "피모벤단"],
    "푸로세미드": ["라식스", "Furosemide 20mg", "푸로세미드정 40mg"],
    "클라바목스": ["클라바목스 250mg", "Clavamox 62.5mg", "아목시실린/클라불란산"],
    "독시사이클린": ["독시사이클린 100mg", "Doxycycline 50mg tab"],
}
CANONICAL_SHARE = 0.25  # share of lines/diagnoses/drugs printed with the exact codebook wording

# Alternative clinic wording for the same canonical items, written for the 2026-10-02 review WITHOUT tuning the
# codebook to it (first pass on n=400, seed 7, before that round's fixes: clean false alarm 1.2%, clean
# auto-approve 43%, clean pend 26%). Only the strings the review itself reported (외이도염, 귀 세정, 구토/설사) were
# then fixed in the codebook, so those are in-sample; the rest stay unmapped where the codebook does not know them
# and measure what happens to unseen wording (low-confidence review / DX_UNMAPPED pend, never a false alarm).
ALT_LINE_VARIANTS: Dict[str, List[str]] = {
    "초진료": ["초진 진료비", "진료비(초진)", "첫 진료", "초진비"],
    "재진료": ["재진 진료", "재진비", "재방문 진찰", "follow-up exam"],
    "야간 응급 진찰": ["응급 진료(야간)", "야간 할증 진찰료", "심야 응급"],
    "피부 세포검사": ["피부 세포학 검사", "피부 도말", "테이프 스트립 검사"],
    "귀 도말검사": ["귀 현미경 검사", "이도 세포검사", "귀 분비물 검사"],
    "귀 세척": ["귀 세정 처치", "이도 세정", "귀 세정"],
    "귀약(외용제)": ["점이액", "귀 연고", "이용제"],
    "점안액": ["안약(점안제)", "인공눈물", "점안제"],
    "혈액검사(CBC)": ["전혈구 검사", "CBC(혈구)", "혈구 검사"],
    "혈청화학검사": ["생화학 검사", "혈액 생화학(10종)", "간·신장 수치 검사"],
    "복부 방사선": ["복부 X선", "엑스레이(복부)", "방사선(복부 2장)"],
    "흉부 방사선": ["흉부 X선", "엑스레이(흉부)", "흉부 촬영 2장"],
    "방사선 촬영": ["X선 촬영", "엑스레이", "방사선 2매"],
    "정맥 수액 처치": ["수액 처치(정맥)", "IV 수액", "수액 1일"],
    "주사료": ["주사 처치", "피하 주사", "주사 1회"],
    "cPL 키트검사": ["췌장염 키트", "췌장 특이 리파아제 검사", "cPL"],
    "복부초음파": ["초음파(복부)", "복부 US", "초음파 검사"],
    "호흡마취": ["가스마취", "흡입마취(1시간)", "전신마취(호흡)"],
    "슬개골 탈구 정복술": ["슬개골 교정 수술", "MPL 수술(좌)", "슬개골 탈구 교정술"],
    "심장초음파": ["심초음파", "심장 에코", "심장 초음파 검사"],
    "NT-proBNP": ["BNP 검사", "proBNP 키트"],
    "요검사": ["소변 검사", "뇨검사", "요침사"],
    "세균배양·감수성검사": ["배양검사", "항생제 감수성 검사", "세균 배양(외부)"],
    "피하 수액": ["피하수액", "피하 수액 처치", "SC 수액"],
    "혈압 측정": ["혈압 검사", "도플러 혈압"],
    "형광 염색검사": ["플루오레세인 염색", "각막 염색 검사"],
    "눈물량 검사": ["쉬르머 검사", "STT"],
    "위장관 이물 제거술": ["개복 이물 제거", "장 이물 제거술", "위 절개 이물 제거"],
    # 'species_mismatch' injects this on cat claims, so every wording must name the dog vaccine (a bare
    # '종합 예방접종' does not: it was dropped from the first draft for that reason, not because it failed).
    "DHPPL 종합백신": ["종합백신 접종", "DHPPL 접종", "개 5종 종합백신"],
    "광견병 백신": ["광견병 주사", "광견병 예방주사"],
    "MRI 촬영": ["MRI", "자기공명영상"],
}
ALT_DX_VARIANTS: Dict[str, List[str]] = {
    "아토피 피부염": ["알러지성 피부염", "피부 알레르기", "아토피"],
    "외이염": ["외이도염(양측)", "외이도염", "좌측 외이도염"],
    "급성 위장염": ["구토", "설사", "구토 및 식욕부진"],
    "췌장염": ["급성췌장염 의심", "췌장염 (cPL 양성)"],
    "슬개골 탈구": ["MPL grade 2", "슬개골 내측 탈구", "슬탈 3기"],
    "이첨판 폐쇄부전증": ["이첨판 역류", "MVD", "심장병(이첨판)"],
    "고양이 하부요로계 질환": ["특발성 방광염(고양이)", "FIC", "배뇨곤란"],
    "세균성 방광염": ["요로감염", "방광염(세균성)"],
    "만성 신장병": ["신부전", "CKD IRIS 2기", "만성 신부전"],
    "결막염": ["결막 충혈", "알레르기성 결막염"],
    "켄넬코프": ["기관지염", "기침 (켄넬코프 의심)"],
    "위장관 이물": ["이물 섭취 (양말)", "장 이물", "위 내 이물"],
}
VOCABULARIES = {"tuned": (LINE_VARIANTS, DX_VARIANTS), "alt": (ALT_LINE_VARIANTS, ALT_DX_VARIANTS)}
UNDECLARED_TOTAL_ONLY_SHARE = 0.5  # total-only receipts sent as an ordinary receipt photo (no RECEIPT_TOTAL_ONLY)

INSURERS = [("default", 30), ("samsung", 15), ("meritz", 20), ("db", 10), ("hyundai", 8), ("nh", 7), ("lotte", 5), ("mybrown", 5)]

ANOMALIES = ["inflated_price", "unindicated_procedure", "undisclosed_chronic", "species_mismatch", "duplicate",
             "ineligible_items", "overdose", "waiting_period", "pre_policy",
             "total_only_receipt", "missing_dx", "above_threshold_no_cert", "mixed_basket"]

# anomaly → rule ids (or 'pend.<CODE>' / 'siu.<CODE>') that count as detecting it
DETECTED_BY = {
    "inflated_price": ("pricing.regional_outlier", "pricing.above_posted_fee"),
    "unindicated_procedure": ("clinical.procedure_not_indicated",),
    "undisclosed_chronic": ("clinical.undisclosed_chronic_condition",),
    "species_mismatch": ("integrity.species_mismatch_item", "integrity.breed_species_mismatch", "integrity.species_mismatch_diagnosis"),
    "duplicate": ("integrity.duplicate_claim",),
    "ineligible_items": ("coverage.line_ineligible",),
    "overdose": ("clinical.dose_above_reference",),
    "waiting_period": ("coverage.diagnosis_excluded",),
    "pre_policy": ("coverage.before_policy_start",),
    "total_only_receipt": ("pend.RECEIPT_NOT_ITEMIZED",),
    "missing_dx": ("pend.MISSING_DX",),
    "above_threshold_no_cert": ("pend.NEED_DX_CERT",),
    "mixed_basket": ("pend.MIXED_BASKET_UNSPLIT",),
}
# Drugs whose legacy dose reference cannot reveal a ×10 decimal shift of the scenario dose: furosemide's
# reference maximum is 12 mg/kg per administration, above 10 × the 1–2 mg/kg scenario dose. A known blind
# spot of the reference data (not of the rule); injecting it would measure the data, not the rule.
OVERDOSE_BLIND_SPOTS = {"furosemide"}
PEND_ANOMALIES = {"total_only_receipt", "missing_dx", "above_threshold_no_cert", "mixed_basket"}


@dataclass
class SyntheticCase:
    claim: Claim
    policy: Policy
    labels: List[str] = field(default_factory=list)


def _clinics(rng: random.Random, n: int) -> List[Tuple[Clinic, float]]:
    out = []
    for i in range(n):
        region = rng.choice(REGIONS)
        high = i % 9 == 4  # a few systematically expensive clinics
        factor = rng.uniform(2.4, 3.0) if high else rng.lognormvariate(0, 0.1)
        clinic = Clinic(clinic_id=f"HOSP-{1000 + i}", name=f"샘플동물병원 {i + 1:02d}", region=region,
                        brn=f"SYN-{100 + i:03d}-00-{10000 + i:05d}", emr_vendor=rng.choice(["EMR-A", "EMR-B", "EMR-C"]),
                        participation_status=rng.choice(["none", "none", "precheck", "direct"]))
        out.append((clinic, factor))
    return out


def _price(rng, code: str, region: str, factor: float) -> int:
    p50 = procedures_by_code()[code]["benchmark"]["p50"]
    return int(round(p50 * region_multiplier(region) * factor * rng.lognormvariate(0, 0.12), -2))


def _wording(rng: random.Random, canonical: str, variants: Dict[str, List[str]]) -> str:
    alts = variants.get(canonical) or []
    return canonical if not alts or rng.random() < CANONICAL_SHARE else rng.choice(alts)


def _hospital_wording(rng: random.Random, species: str, weight: float) -> str:
    if rng.random() < CANONICAL_SHARE:
        return "입원비"
    if species == "cat":
        return "입원-고양이(1일)"
    if weight < 10:
        return rng.choice(["입원-소형견(1일)", "입원비(소형견)"])
    return "입원(중형견) 1일" if weight < 25 else "입원-대형견(1일)"


def _over(amount: int, rule: Optional[dict]) -> bool:
    if not rule or rule.get("threshold") is None:
        return False
    return amount >= rule["threshold"] if rule.get("inclusive") else amount > rule["threshold"]


def _medical_amount(lines: List[LineItem], rx: List[Prescription]) -> int:
    total = 0
    for li in lines:
        code = match_procedure(li.description, li.code, li.category_raw)[0]
        cc = procedures_by_code()[code].get("coverage_category") if code else "medical"
        if cc == "medical":
            total += li.total
    return total + sum(int(round(r.unit_price * r.quantity)) for r in rx)


def _channel(rng: random.Random, insurer: str, clinic: Clinic) -> IntakeChannel:
    if insurer == "mybrown" and clinic.participation_status == "direct":
        return IntakeChannel.live_counter
    if insurer == "meritz" and clinic.participation_status == "direct" and rng.random() < 0.6:
        return IntakeChannel.emr_autoclaim
    return rng.choices([IntakeChannel.insurer_app, IntakeChannel.owner_upload, IntakeChannel.fax_email], [45, 40, 15])[0]


def _documents(rng: random.Random, claim: Claim, insurer: str, *, omit_dx_cert: bool = False,
               total_only: bool = False, declared: bool = True) -> List[Document]:
    """The documents a complete claim for this insurer profile would carry. A total-only receipt that is not
    `declared` arrives as an ordinary receipt photo: nothing but the line itself shows it is a total."""
    profile = insurer_profile(insurer)
    channel = claim.intake_channel
    if channel == IntakeChannel.live_counter:
        return []
    source = "emr" if channel == IntakeChannel.emr_autoclaim else ("pdf" if channel == IntakeChannel.fax_email else "photo")
    issued = claim.visit_date
    docs = [Document(doc_type=DocType.RECEIPT_TOTAL_ONLY if total_only and declared else DocType.RECEIPT_ITEMIZED, source=source,
                     issued_at=issued, issuer_brn=claim.clinic.brn)]
    if not total_only and (profile.get("detail_statement_listed") or rng.random() < 0.5):
        docs.append(Document(doc_type=DocType.DETAIL_STATEMENT, source=source, issued_at=issued, issuer_brn=claim.clinic.brn))
    if rng.random() < 0.4:
        docs.append(Document(doc_type=DocType.PAYMENT_SLIP, source="photo", issued_at=issued, issuer_brn=claim.clinic.brn))
    medical = _medical_amount(claim.line_items, claim.prescriptions) if not total_only else sum(li.total for li in claim.line_items)
    if _over(medical, profile.get("dx_certificate")) and not omit_dx_cert:
        docs.append(Document(doc_type=DocType.DX_CERT_STATUTORY, source=source, issued_at=issued, issuer_brn=claim.clinic.brn,
                             vet_license_no="SYN-VET-0000", serial_no=f"{issued.year}-SYN-{rng.randint(1, 9999):04d}", has_seal=True))
    if any((procedures_by_code().get(match_procedure(li.description)[0] or "") or {}).get("category") == "imaging"
           for li in claim.line_items) and rng.random() < 0.35:
        docs.append(Document(doc_type=DocType.IMAGING, source="pdf" if source == "pdf" else "photo",
                             captured_at=datetime.combine(claim.visit_date, time(rng.randint(9, 19), rng.randint(0, 59)))))
    pid = profile.get("pet_id") or {}
    unregistered = not claim.patient.registration_no
    if pid.get("photos") == "always" or (pid.get("photos") == "when_unregistered" and unregistered):
        docs += [Document(doc_type=DocType(t), source="photo") for t in pid.get("photo_set", [])]
    billed = sum(li.total for li in claim.line_items) + sum(int(round(r.unit_price * r.quantity)) for r in claim.prescriptions)
    if _over(billed, profile.get("originals")):
        received = datetime.combine((claim.submitted_date or claim.visit_date) + timedelta(days=5), time(10, 0))
        docs[0] = docs[0].model_copy(update={"original_received_at": received})
    return docs


def _diagnosis(rng: random.Random, text: str, visit: date, with_cert: bool):
    if rng.random() < 0.5:
        return text
    return Diagnosis(text_raw=text, certainty="final", diagnosis_date=visit,
                     source_doc=DocType.DX_CERT_STATUTORY if with_cert else DocType.RECEIPT_ITEMIZED)


def _policy(rng: random.Random, i: int, start: date, insurer: str) -> Policy:
    if start >= date(2025, 5, 1):
        return Policy(policy_id=f"POL-{i + 1:05d}", start_date=start, regime="fss_2025_05", insurer_id=insurer,
                      copay_ratio=0.3, deductible=Deductible(amount=30_000, basis="per_visit"),
                      waiting_periods=WaitingPeriods(), limits=Limits(annual_amount=5_000_000))
    copay = rng.choice([0.3, 0.3, 0.2])  # legacy in-force products, some at 80% coverage
    return Policy(policy_id=f"POL-{i + 1:05d}", start_date=start, regime="legacy", insurer_id=insurer,
                  copay_ratio=copay, deductible=Deductible(amount=rng.choice([10_000, 20_000, 30_000]), basis="per_visit"),
                  waiting_periods=WaitingPeriods(), limits=Limits(annual_amount=5_000_000))


def generate(n: int = 400, seed: int = 7, anomaly_rate: float = 0.4, as_of: date = date(2026, 9, 30),
             vocabulary: str = "tuned") -> List[SyntheticCase]:
    """`vocabulary`: 'tuned' (the EMR probe wording the codebook was tuned on) or 'alt' (untuned wording, module doc)."""
    line_variants, dx_variants = VOCABULARIES[vocabulary]
    rng = random.Random(seed)
    clinics = _clinics(rng, 36)
    scenario_names = list(SCENARIOS)
    weights = [SCENARIOS[s]["w"] for s in scenario_names]
    cases: List[SyntheticCase] = []

    for i in range(n):
        name = rng.choices(scenario_names, weights)[0]
        sc = SCENARIOS[name]
        species = sc["species"] or rng.choice(["dog", "dog", "dog", "cat"])
        breed, lo, hi = rng.choice(DOG_BREEDS if species == "dog" else CAT_BREEDS)
        weight = round(rng.uniform(lo, hi), 1)
        clinic, factor = rng.choice(clinics)
        visit = as_of - timedelta(days=rng.randint(0, 180))
        policy_start = visit - timedelta(days=rng.randint(400, 1400))
        insurer = rng.choices([k for k, _ in INSURERS], [w for _, w in INSURERS])[0]
        registered = rng.random() < (0.85 if species == "dog" else 0.25)
        channel = _channel(rng, insurer, clinic)
        live = channel in (IntakeChannel.live_counter, IntakeChannel.emr_autoclaim)
        labels: List[str] = []
        if factor > 2:
            labels.append("inflated_price")

        lines: List[LineItem] = []
        for desc, code, (qlo, qhi) in sc["lines"]:
            q = rng.randint(qlo, qhi)
            if q:
                text = _hospital_wording(rng, species, weight) if code == "HOS-001" else _wording(rng, desc, line_variants)
                lines.append(LineItem(description=text, code=None, quantity=q, unit_price=_price(rng, code, clinic.region, factor)))
        if sc.get("inj") and rng.random() < 0.35:
            lines.append(LineItem(description=rng.choice(sc["inj"]), quantity=1, unit_price=rng.choice([8000, 12000, 15000, 22000])))
        rx = [Prescription(drug=_wording(rng, d, RX_VARIANTS), dose_mg_per_kg=round(rng.uniform(*rng_range), 3), frequency=f, days=days,
                           unit_price=rng.choice([800, 1200, 1500, 2000]), quantity=days * (2 if f == "BID" else 3 if f == "TID" else 1))
              for d, rng_range, f, days in sc["rx"]]
        dx_text = _wording(rng, name, dx_variants)
        diagnoses: list = [dx_text]
        total_only = omit_cert = False
        declared = True

        if rng.random() < anomaly_rate:
            kind = rng.choice(ANOMALIES)
            if kind == "inflated_price" and lines:
                j = rng.randrange(len(lines))
                lines[j] = lines[j].model_copy(update={"unit_price": int(lines[j].unit_price * rng.uniform(2.6, 3.4))})
            elif kind == "unindicated_procedure" and name in ("아토피 피부염", "외이염", "결막염", "켄넬코프"):
                lines.append(LineItem(description=_wording(rng, "MRI 촬영", line_variants), unit_price=_price(rng, "IMG-005", clinic.region, 1.0)))
            elif kind == "undisclosed_chronic" and name not in ("이첨판 폐쇄부전증", "예방접종"):
                policy_start = visit - timedelta(days=rng.randint(35, 200))
                drug = rng.choice([("베트메딘", 0.25), ("씬지로이드", 0.02), ("페노바르비탈", 2.5), ("트릴로스탄", 1.0)]) if species == "dog" \
                    else rng.choice([("메티마졸", 0.5), ("베트메딘", 0.25)])
                rx.append(Prescription(drug=drug[0], dose_mg_per_kg=drug[1], frequency="BID", days=30, unit_price=1500, quantity=60))
            elif kind == "species_mismatch" and species == "cat":
                lines.append(LineItem(description=_wording(rng, "DHPPL 종합백신", line_variants), unit_price=_price(rng, "PRE-003", clinic.region, 1.0)))
            elif kind == "species_mismatch" and species == "dog":
                breed = rng.choice(["러시안 블루", "페르시안"])
            elif kind == "ineligible_items":
                lines.append(LineItem(description=rng.choice(["위생미용", "처방식 사료", "호텔 1박", "넥카라", "미용-위생미용", "처방사료 2kg", "호텔(1박)"]),
                                      unit_price=rng.choice([25000, 38000, 45000])))
            elif kind == "overdose" and [j for j, r in enumerate(rx) if resolve_drug(r.drug)[0] not in OVERDOSE_BLIND_SPOTS]:
                j = rng.choice([j for j, r in enumerate(rx) if resolve_drug(r.drug)[0] not in OVERDOSE_BLIND_SPOTS])
                rx[j] = rx[j].model_copy(update={"dose_mg_per_kg": round(rx[j].dose_mg_per_kg * 10, 3)})
            elif kind == "waiting_period" and name != "예방접종" and name != "위장관 이물":
                policy_start = visit - timedelta(days=rng.randint(3, 25))
            elif kind == "pre_policy":
                policy_start = visit + timedelta(days=rng.randint(5, 60))
            elif kind == "total_only_receipt" and factor <= 2 and not live:
                total = sum(li.total for li in lines) + sum(int(round(r.unit_price * r.quantity)) for r in rx)
                lines = [LineItem(description=rng.choice(["진료비 합계", "총 진료비", "진료비"]), unit_price=total)]
                rx = []
                total_only = True
                # A side generator, so the main stream (and every other claim of the batch) is unchanged.
                declared = random.Random(seed * 1_000_003 + i).random() >= UNDECLARED_TOTAL_ONLY_SHARE
            elif kind == "missing_dx" and name != "예방접종":
                diagnoses = []
            elif kind == "above_threshold_no_cert" and not live and name != "예방접종" and \
                    _over(_medical_amount(lines, rx), insurer_profile(insurer).get("dx_certificate")):
                omit_cert = True
            elif kind == "mixed_basket" and name != "예방접종" and lines:
                j = rng.randrange(len(lines))
                extra, price = rng.choice([("사료 포함", 38000), ("위생미용", 30000), ("호텔 1박", 45000)])
                text = f"{lines[j].description}({extra})" if extra.endswith("포함") else f"{lines[j].description}+{extra}"
                lines[j] = LineItem(description=text, quantity=1, unit_price=lines[j].total + price)
            elif kind != "duplicate":
                kind = None
            if kind and kind != "duplicate":
                labels.append(kind)
            elif kind == "duplicate":
                labels.append("__duplicate_source__")

        # Realistic receipt furniture: medical-waste fee and the occasional revisit discount.
        if not total_only and rng.random() < 0.3:
            lines.append(LineItem(description=rng.choice(["의료폐기물", "의료폐기물 처리비", "의료폐기물-처리비"]),
                                  unit_price=rng.choice([1000, 2000, 3000])))
        if not total_only and rng.random() < 0.06 and lines:
            subtotal = sum(li.total for li in lines)
            lines.append(LineItem(description=rng.choice(["할인(재방문)", "할인"]), unit_price=-int(round(subtotal * 0.05, -2)) or -1000))

        reg_no = f"410{rng.randint(10**11, 10**12 - 1)}" if registered else None
        submitted = visit + timedelta(days=rng.randint(0, 20))
        claim = Claim(
            claim_id=f"SYN-{as_of.year}-{i + 1:05d}",
            visit_date=visit,
            submitted_date=submitted,
            clinic=clinic,
            patient=Patient(patient_id=f"PET-{rng.randint(10000, 99999)}", species=species, breed=breed,
                            age_years=round(rng.uniform(0.5, 14), 1), weight_kg=weight, registration_no=reg_no,
                            neutered=rng.random() < 0.7),
            diagnoses=[],
            line_items=lines,
            prescriptions=rx,
        )
        claim = claim.model_copy(update={"intake_channel": channel})
        docs = _documents(rng, claim, insurer, omit_dx_cert=omit_cert, total_only=total_only, declared=declared)
        has_cert = any(d.doc_type == DocType.DX_CERT_STATUTORY for d in docs)
        billed = sum(li.total for li in lines) + sum(int(round(r.unit_price * r.quantity)) for r in rx)
        claim = claim.model_copy(update={
            "diagnoses": [_diagnosis(rng, t, visit, has_cert) for t in diagnoses],
            "documents": docs,
            "invoice_total": billed if (total_only or rng.random() < 0.6) else None,
        })
        policy = _policy(rng, i, policy_start, insurer)
        cases.append(SyntheticCase(claim, policy, [l for l in labels if l != "__duplicate_source__"]))
        if "__duplicate_source__" in labels:
            dup = claim.model_copy(update={"claim_id": claim.claim_id + "-R", "submitted_date": claim.submitted_date + timedelta(days=9)})
            cases.append(SyntheticCase(dup, policy, ["duplicate"]))
    return cases


def evaluate(cases: List[SyntheticCase]) -> dict:
    """Recall per anomaly type, false-alarm rate on clean claims, and the pend rate (reported separately)."""
    from .engine import adjudicate

    history: List[Claim] = []
    per_type = {a: {"injected": 0, "detected": 0} for a in ANOMALIES}
    clean = clean_flagged = clean_auto = clean_pend = 0
    decisions: Dict[str, int] = {}
    rule_hits: Dict[str, int] = {}
    pend_reasons: Dict[str, int] = {}
    siu_flags: Dict[str, int] = {}
    results = []
    for case in cases:
        res = adjudicate(case.claim, case.policy, history)
        history.append(case.claim)
        results.append((case, res))
        decisions[res.decision.value] = decisions.get(res.decision.value, 0) + 1
        fired = {f.rule for f in res.findings} | {f"pend.{p.code}" for p in res.pend_reasons} | {f"siu.{s.code}" for s in res.siu_flags}
        for r in {f.rule for f in res.findings}:
            rule_hits[r] = rule_hits.get(r, 0) + 1
        for p in res.pend_reasons:
            pend_reasons[p.code] = pend_reasons.get(p.code, 0) + 1
        for s in res.siu_flags:
            siu_flags[s.code] = siu_flags.get(s.code, 0) + 1
        if not case.labels:
            clean += 1
            if any(f.severity.value in ("warning", "critical") and f.category not in ("coverage", "documents") for f in res.findings):
                clean_flagged += 1
            if res.decision.value == "auto_approve":
                clean_auto += 1
            if res.decision.value == "pend":
                clean_pend += 1
        for label in case.labels:
            per_type[label]["injected"] += 1
            if any(r.startswith(p) for r in fired for p in DETECTED_BY[label]):
                per_type[label]["detected"] += 1
    n = len(cases) or 1
    return {
        "claims": len(cases),
        "clean_claims": clean,
        "clean_false_alarm_rate": round(clean_flagged / clean, 4) if clean else None,
        "clean_auto_approve_rate": round(clean_auto / clean, 4) if clean else None,
        "clean_pend_rate": round(clean_pend / clean, 4) if clean else None,
        "pend_rate": round(decisions.get("pend", 0) / n, 4),
        "recall_by_anomaly": {k: {**v, "recall": round(v["detected"] / v["injected"], 3) if v["injected"] else None} for k, v in per_type.items()},
        "decisions": decisions,
        "pend_reasons": dict(sorted(pend_reasons.items(), key=lambda kv: -kv[1])),
        "siu_flags": dict(sorted(siu_flags.items(), key=lambda kv: -kv[1])),
        "rule_hits": dict(sorted(rule_hits.items(), key=lambda kv: -kv[1])),
        "_results": results,
    }

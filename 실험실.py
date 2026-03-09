#!/usr/bin/env python3
"""
plumbs_output/*.jsonl → backend/data/converted/{drug}.jsonl 변환 스크립트

Claude API를 사용하여 raw monograph 텍스트를 structured JSON schema로 변환.
Usage:
  export CLAUDE_API_KEY=<your_claude_api_key>
  python3 실험실.py --test 10
  python3 실험실.py
  python3 실험실.py --api-key <your_claude_api_key>
"""

import json
import re
import asyncio
import argparse
import time
from pathlib import Path
from getpass import getpass

import anthropic
import os
from anthropic import AsyncAnthropic


def log(msg):
    print(msg, flush=True)

def extract_claude_text(response) -> str:
    """Claude Messages API 응답에서 텍스트 블록만 추출"""
    text_parts = []
    for block in getattr(response, "content", []) or []:
        if getattr(block, "type", None) != "text":
            continue
        text_parts.append(getattr(block, "text", ""))

    result = ''.join(text_parts).strip()
    if not result:
        raise ValueError("Empty Claude response content")
    return result

# ─── 설정 ───────────────────────────────────────────────
INPUT_DIR = Path("plumbs_output")
OUTPUT_DIR = Path("backend/data/converted")
ERROR_LOG = Path("conversion_errors.log")
MODEL = "claude-3-5-sonnet-20241022"
MAX_CONCURRENT = 1   # API rate limit 대응
MAX_RETRIES = 7
REQUEST_DELAY = 8    # 요청 간 최소 대기(초)

# ─── few-shot 예시 (Acepromazine) ───────────────────────
EXAMPLE_OUTPUT = """
{
  "id": "string — unique slug, snake_case e.g. 'meloxicam'",

  "drug_identity": {
    "name_ko": "string — Korean INN name e.g. '멜록시캄'",
    "name_en": "string — English INN name e.g. 'Meloxicam'",
    "class": "string — enum: NSAID | Corticosteroid | Antibiotic | Antiparasitic | Antifungal | Analgesic | Cardiac | Diuretic | Sedative | Antiemetic | GI Protectant | Anticonvulsant | Antidepressant | ACE Inhibitor | Bronchodilator | Immunosuppressant | Thyroid | Hormone | Antineoplastic Agent | Antiretroviral",
    "source": "string — enum: kr_vet | human_offlabel | foreign | unknown",
    "has_reversal": "boolean",
    "reversal_evidence": "string | null",
    "off_label_note": "string | null — only for human_offlabel source",
    "dosage_form": "string — enum: Tab | Inj | Cap | Susp | Drop | Oint | Topical | Ophthalmic",
    "available_strengths": [
      { "value": "float", "unit": "string — e.g. mg | mg/kg | IU/kg | mcg/kg | EA" }
    ]
  },

  "metabolism_and_clearance": {
    "primary_metabolic_organ": "string — enum: Liver | Kidney | Mixed | Unknown",
    "clearance_organ": "string — enum: Kidney | Liver | Biliary | Mixed",
    "renal_elimination_fraction": "float 0–1 — e.g. 0.15 means 15% renally eliminated",
    "cyp_profile": {
      "substrates": ["string — CYP enzyme e.g. 'CYP2C9'"],
      "inhibitors": ["string — CYP enzyme this drug inhibits"],
      "inducers": ["string — CYP enzyme this drug induces"],
      "pathway_evidence": "string | null — note on metabolic pathway"
    },
    "extra_information": "string | add dog & cats specific information in here"
  },

  "organ_burden_logic": {
    "note": "string — scoring methodology e.g. 'Score = sum of weights from triggered_keywords'",
    "dog": {
      "brain": {
        "calculated_score": "integer 0–100",
        "triggered_keywords": ["string — Paper's keyword that set this score"],
        "index": "integer — Paper's section index, -1 if not directly cited",
        "evidence": "string — Korean or English evidence note"
      },
      "blood": {
        "calculated_score": "integer 0–100",
        "triggered_keywords": ["string"],
        "index": "integer",
        "evidence": "string"
      },
      "kidney": {
        "calculated_score": "integer 0–100",
        "triggered_keywords": ["string"],
        "index": "integer",
        "evidence": "string"
      },
      "liver": {
        "calculated_score": "integer 0–100",
        "triggered_keywords": ["string"],
        "index": "integer",
        "evidence": "string"
      },
      "heart": {
        "calculated_score": "integer 0–100",
        "triggered_keywords": ["string"],
        "index": "integer",
        "evidence": "string"
      }
    },
    "cat": {
      "brain": {
        "calculated_score": "integer 0–100",
        "triggered_keywords": ["string"],
        "index": "integer",
        "evidence": "string"
      },
      "blood": {
        "calculated_score": "integer 0–100",
        "triggered_keywords": ["string"],
        "index": "integer",
        "evidence": "string"
      },
      "kidney": {
        "calculated_score": "integer 0–100",
        "triggered_keywords": ["string"],
        "index": "integer",
        "evidence": "string"
      },
      "liver": {
        "calculated_score": "integer 0–100",
        "triggered_keywords": ["string"],
        "index": "integer",
        "evidence": "string"
      },
      "heart": {
        "calculated_score": "integer 0–100",
        "triggered_keywords": ["string"],
        "index": "integer",
        "evidence": "string"
      }
    }
  },

  "timing_profile": {
    "onset_min": "integer — minutes to onset",
    "t_max_hr": "float — hours to peak plasma concentration",
    "half_life_hr": "float — elimination half-life in hours",
    "f_percent": "integer 0–100 — oral bioavailability %",
    "protein_binding_percent": "integer 0–100",
    "evidence": "string | null"
  },

  "drug_interactions": [
    {"note": "append more drug interactions as needed, each with drug name, severity (minor/moderate/major), mechanism keywords, and evidence note"},
    {
      "drug": "string — interacting drug name or class e.g. 'Corticosteroids'",
      "severity": "integer — 1=minor | 2=moderate | 3=critical/avoid",
      "keywords": ["string — mechanism keyword e.g. 'GI ulceration'"],
      "evidence": "string — English evidence note"
    },
    {
      "drug": "string — interacting drug name or class e.g. 'Corticosteroids'",
      "severity": "integer — 1=minor | 2=moderate | 3=critical/avoid",
      "keywords": ["string — mechanism keyword e.g. 'GI ulceration'"],
      "evidence": "string — English evidence note"
    } 
    
  ],

  "additive_risks": {
    "nephrotoxic": "boolean — additive renal load (triple whammy etc.)",
    "hepatotoxic": "boolean — additive hepatic load",
    "gi_ulcer": "boolean — additive GI ulceration risk",
    "bleeding": "boolean — additive bleeding risk",
    "sedation": "boolean — additive CNS sedation",
    "qt_prolongation": "boolean — additive QT interval risk"
  },

  "species_flags": {
    "species_contraindicated": ["string — e.g. 'cat_breed','dog_breed"],
    "mdr1_sensitive": "boolean — P-gp substrate, dangerous in MDR1-mutant breeds",
    "serotonin_syndrome_risk": "boolean",
    "electrolyte_effect": "string | null — e.g. 'k_depleting' | 'k_sparing'",
    "narrow_therapeutic_index": "boolean — TDM required",
    "washout_period_days": "integer — minimum days before switching (5 × half-life rule)"
  },

  "dosage_and_kinetics": {
    "dog": {
      "is_approved": "boolean — species-level regulatory approval",
      "dosage_list": [
        {
          "logic_type": "string — enum: linear | weight_band | fixed | max_capped",
          "context": "string — clinical indication e.g. 'Anti-inflammatory dose'",
          "value": "string — dose as string to support ranges e.g. '0.1 - 0.2'",
          "unit": "string — enum: mg/kg | mcg/kg | IU/kg | ml/kg | mg | EA",
          "route": "string — enum: PO | IV | SC | IM | Eye | Ear | Top | Inh",
          "frequency": "string — enum: SID | BID | TID | QID | q8h | q12h | Monthly | PRN",
          "max_dose_mg_kg": "float | null — safety ceiling",
          "evidence": "string | null <reference>"
        }
      ]
    },
    "cat": {
      "is_approved": "boolean",
      "dosage_list": [
        {
          "logic_type": "string",
          "context": "string",
          "value": "string",
          "unit": "string",
          "route": "string",
          "frequency": "string",
          "max_dose_mg_kg": "float | null",
          "evidence": "string | null"
        }
      ]
    }
  },

  "renal_dose_adjustment": {
    "creatinine_threshold_dog_mg_dL": "float | null — trigger creatinine for dogs",
    "creatinine_threshold_cat_mg_dL": "float | null — trigger creatinine for cats",
    "adjustment_type": "string — enum: reduce_dose | extend_interval | avoid | none",
    "adjustment_factor": "float 0–1 | null — multiplier e.g. 0.5 = half normal dose",
    "note": "string | null"
  },

  "hepatic_dose_adjustment": {
    "applies": "boolean — true only for NTI drugs with primary hepatic elimination",
    "alt_threshold_multiplier": "float | null — e.g. 3.0 = ALT > 3× upper normal triggers this",
    "adjustment_type": "string — enum: reduce_dose | monitor | avoid | none",
    "note": "string | null"
  },

  "contraindications": [
    {
      "condition": "string — condition name e.g. 'Renal disease'",
      "match_terms": ["string — EMR condition strings that auto-trigger this e.g. 'CKD'", "string — 'IRIS Stage'"],
      "severity": "string — enum: absolute | relative | caution",
      "action": "string — enum: contraindicated | reduce_dose | monitor | avoid",
      "lab_trigger": {
        "marker": "string | null — e.g. 'creatinine' | 'alt' | 'alp' | 'bun' | 'hct'",
        "threshold": "float | null",
        "unit": "string | null — e.g. 'mg/dL' | 'U/L' | '%'"
      }
    }
  ],

  "genetic_sensitivity": {
    "has_genetic_risk": "boolean",
    "affected_breeds": ["string — e.g. 'Shetland Sheepdog'"],
    "evidence": "string | null"
  },

  "effects_and_mechanisms": {
    "common_mechanism": "string — pharmacological mechanism of action",
    "common_extra_effects": ["string — known adverse effects"],
    "dog_mechanism": "string | null — dog-specific mechanism notes",
    "dog_extra_effects": ["string — dog-specific adverse effects"],
    "cat_mechanism": "string | null — cat-specific mechanism notes",
    "cat_extra_effects": ["string — cat-specific adverse effects"]
  },

  "species_notes": {
    "dog": "string — clinical note for dogs",
    "cat": "string — clinical note for cats"
  },

  "precautions": {
    "dog": {
      "status": "integer — 1=use with caution | 2=contraindicated",
      "evidence": "string"
    },
    "cat": {
      "status": "integer — 1=use with caution | 2=contraindicated",
      "evidence": "string"
    }
  },

  "storage_and_forms": {
    "storage": "string — storage conditions",
    "forms": ["string — available formulations"]
  },

  "section_1_2_10": {
    "highlights": "string — key clinical highlights (Korean preferred for EMR display)",
    "indications": "string — approved and off-label indications",
    "client_info": "string — owner-facing communication note"
  },

  "_data_quality": {
    "overall_confidence": "integer 0–100",
    "renal_adjustment_confidence": "string — enum: high | medium | low | none",
    "hepatic_adjustment_confidence": "string — enum: high | medium | low | none",
    "organ_burden_confidence": "string — enum: high | medium | low | none",
    "ddi_source": "string — enum: plumbs_direct | additive_class | cyp_derived | unknown"
  }
}
"""

# ─── System prompt ──────────────────────────────────────
SYSTEM_PROMPT = """You are a veterinary clinical pharmacologist and Korean medical translator.
Convert a raw Plumb's Veterinary Drug Handbook monograph into a single JSON object that matches the provided example schema exactly.

CRITICAL RULES:
1. Return exactly one valid JSON object. No markdown, no commentary, no code fences.
2. Follow the example output's top-level keys and nested structure exactly.
3. Keep every required section even when data is missing. Use type-appropriate defaults such as null, [], false, 0, or 'Unknown'.
4. All evidence, note, highlights, indications, client_info, species_notes, and other clinician-facing narrative fields must be written in Korean.
5. Keep controlled enum values, drug names, routes, frequencies, organ names, and CYP enzyme names in the format shown by the example schema.
6. Extract dosage values exactly as written in the source. Do not round, normalize away ranges, or invent missing doses.
7. dosage_and_kinetics.dog and dosage_and_kinetics.cat are mandatory. If a species has no stated dose, keep dosage_list as [] and preserve the species object.
8. organ_burden_logic.*.*.calculated_score must be an integer from 0 to 100. If the text does not support a score, use 0, empty triggered_keywords, index -1, and a short Korean evidence note.
9. Do not include placeholder example rows inside arrays. drug_interactions and contraindications must contain only actual extracted items or be empty arrays.
10. Do not hallucinate reversal agents, approval status, contraindications, dose adjustments, kinetics, genetic risks, washout periods, or interaction mechanisms.
11. Use _data_quality to reflect uncertainty when the monograph lacks support.
12. name_ko should be the standard Korean drug name when known; otherwise provide the most established Korean transliteration available from context."""

# ─── User prompt template ──────────────────────────────
USER_PROMPT_TEMPLATE = """Convert this monograph into the target JSON schema.

Requirements:
- Match the example output's structure exactly, including every top-level section.
- Use the example as a schema guide only, not as literal content.
- Preserve all enumerated field formats shown in the example.
- Return JSON only.

## Example Output Schema
{example}

## Drug name
{ingredient}

## Raw monograph
{raw_content}
"""

# ─── 핵심 함수들 ────────────────────────────────────────

def load_all_drugs():
    """plumbs_output/*.jsonl에서 모든 약물 로드"""
    drugs = []
    for f in sorted(INPUT_DIR.glob("*.jsonl"), key=lambda x: int(x.stem)):
        for line_num, line in enumerate(open(f, encoding="utf-8"), 1):
            line = line.strip()
            if not line:
                continue
            try:
                drugs.append(json.loads(line))
            except json.JSONDecodeError as e:
                log(f"  [SKIP] {f.name} line {line_num}: JSON 파싱 에러 - {e}")
    return drugs


def get_output_path(ingredient: str) -> Path:
    """약물명 → 출력 파일 경로 (알파벳 폴더 구조)"""
    safe_name = re.sub(r'[^\w\-]', '_', ingredient.lower()).strip('_')
    first_letter = ingredient[0].upper()
    if not first_letter.isalpha():
        first_letter = "_"
    folder = OUTPUT_DIR / first_letter
    folder.mkdir(parents=True, exist_ok=True)
    return folder / f"{safe_name}.jsonl"


def validate_result(data: dict, ingredient: str) -> list[str]:
    """변환 결과 유효성 검증. 문제가 있으면 에러 메시지 리스트 반환."""
    errors = []
    required_keys = [
        "id", "drug_identity", "metabolism_and_clearance",
        "organ_burden_logic", "timing_profile", "drug_interactions",
        "additive_risks", "species_flags", "dosage_and_kinetics",
        "renal_dose_adjustment", "hepatic_dose_adjustment",
        "contraindications", "genetic_sensitivity",
        "effects_and_mechanisms", "species_notes", "precautions",
        "storage_and_forms", "section_1_2_10", "_data_quality"
    ]
    for key in required_keys:
        if key not in data:
            errors.append(f"Missing top-level key: {key}")

    # dosage 검증
    dk = data.get("dosage_and_kinetics", {})
    has_any_dosage = False
    for species in ("dog", "cat"):
        sp = dk.get(species, {})
        if species not in dk:
            errors.append(f"Missing dosage_and_kinetics.{species}")
            continue

        dl = sp.get("dosage_list")
        if not isinstance(dl, list):
            errors.append(f"dosage_and_kinetics.{species}.dosage_list is not a list")
            continue

        if dl:
            has_any_dosage = True

    if not has_any_dosage:
        errors.append("dosage_list empty for both dog and cat")

    # organ score 범위 검증
    obl = data.get("organ_burden_logic", {})
    for species in ("dog", "cat"):
        sp = obl.get(species, {})
        for organ in ("brain", "blood", "kidney", "liver", "heart"):
            organ_data = sp.get(organ)
            if not isinstance(organ_data, dict):
                errors.append(f"organ_burden_logic.{species}.{organ} missing or not an object")
                continue

            score = organ_data.get("calculated_score")
            if not isinstance(score, int) or not (0 <= score <= 100):
                errors.append(
                    f"organ_burden_logic.{species}.{organ}.calculated_score = {score} (not int 0-100)"
                )

    return errors


async def convert_one(client: AsyncAnthropic, drug: dict, semaphore: asyncio.Semaphore) -> tuple[str, bool, str]:
  """단일 약물 변환. Returns (ingredient, success, message)"""
  ingredient = drug["ingredient"]
  output_path = get_output_path(ingredient)

  # 이미 변환됨 → 건너뛰기
  if output_path.exists():
    return (ingredient, True, "already exists")

  user_prompt = USER_PROMPT_TEMPLATE.format(
    example=EXAMPLE_OUTPUT,
    ingredient=ingredient,
    raw_content=drug["raw_content"][:40000],  # 컨텍스트 초과 방지
  )

  async with semaphore:
    for attempt in range(1, MAX_RETRIES + 1):
      rate_retries = 0

      while True:
        try:
          await asyncio.sleep(REQUEST_DELAY)
          response = await client.messages.create(
            model=MODEL,
            max_tokens=16384,
            system=SYSTEM_PROMPT,
            messages=[
              {"role": "user", "content": user_prompt},
            ],
            temperature=0,
          )
          break
        except anthropic.RateLimitError:
          rate_retries += 1
          wait = min(rate_retries * 30, 300)
          log(f"  [RATE] {ingredient}: rate limited, waiting {wait}s... (rate retry {rate_retries})")
          await asyncio.sleep(wait)

      try:
        raw_text = extract_claude_text(response)

        if raw_text.startswith("```"):
          raw_text = re.sub(r'^```(?:json)?\s*', '', raw_text)
          raw_text = re.sub(r'\s*```$', '', raw_text)

        data = json.loads(raw_text)

        validation_errors = validate_result(data, ingredient)
        if validation_errors:
          warn_msg = "; ".join(validation_errors)
          log(f"  [WARN] {ingredient}: {warn_msg}")

        with open(output_path, 'w', encoding='utf-8') as f:
          json.dump(data, f, ensure_ascii=False, indent=2)

        log(f"  [OK] {ingredient}")
        return (ingredient, True, "converted")

      except (json.JSONDecodeError, ValueError) as e:
        if attempt == MAX_RETRIES:
          return (ingredient, False, f"Parse error: {e}")
        log(f"  [RETRY] {ingredient}: JSON parse error, attempt {attempt}/{MAX_RETRIES}")
        await asyncio.sleep(5 * attempt)

      except anthropic.APIError as e:
        if attempt == MAX_RETRIES:
          return (ingredient, False, f"API error: {e}")
        await asyncio.sleep(2 ** attempt)

  return (ingredient, False, "max retries exceeded")


def resolve_api_key(cli_api_key: str | None) -> str:
  """CLI 인자 우선, 없으면 환경변수, 둘 다 없으면 프롬프트에서 입력받는다."""
  if cli_api_key:
    return cli_api_key.strip()

  env_api_key = os.environ.get("CLAUDE_API_KEY") or os.environ.get("ANTHROPIC_API_KEY")
  if env_api_key:
    return env_api_key.strip()

  entered_api_key = getpass("Anthropic API key: ").strip()
  if not entered_api_key:
    raise ValueError(
      "Anthropic API key가 필요합니다. --api-key 인자 또는 CLAUDE_API_KEY/ANTHROPIC_API_KEY 환경변수를 사용하세요."
    )
  return entered_api_key


async def main(api_key: str, model: str, test_count: int | None = None):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    log("소스 데이터 로드 중...")
    drugs = load_all_drugs()
    log(f"총 {len(drugs)}개 약물 로드됨\n")

    if test_count:
        drugs = drugs[:test_count]
        log(f"테스트 모드: 처음 {test_count}개만 변환\n")

    global MODEL
    MODEL = model

    client = AsyncAnthropic(api_key=api_key)
    semaphore = asyncio.Semaphore(MAX_CONCURRENT)

    start_time = time.time()
    tasks = [convert_one(client, drug, semaphore) for drug in drugs]
    results = await asyncio.gather(*tasks)

    # 결과 집계
    success = [r for r in results if r[1]]
    failed = [r for r in results if not r[1]]
    skipped = [r for r in results if r[1] and r[2] == "already exists"]
    converted = [r for r in results if r[1] and r[2] == "converted"]

    elapsed = time.time() - start_time

    log(f"\n{'='*60}")
    log(f"완료! ({elapsed:.1f}초)")
    log(f"  성공: {len(success)}개 (새로 변환: {len(converted)}, 기존: {len(skipped)})")
    log(f"  실패: {len(failed)}개")

    if failed:
        log(f"\n실패 목록:")
        with open(ERROR_LOG, 'w', encoding='utf-8') as f:
            for ingredient, _, msg in failed:
                line = f"  {ingredient}: {msg}"
                log(line)
                f.write(line + '\n')
        log(f"\n에러 로그: {ERROR_LOG}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--api-key", type=str, default=None, help="Anthropic API key")
    parser.add_argument("--model", type=str, default=MODEL, help=f"사용할 모델명 (기본값: {MODEL})")
    parser.add_argument("--test", type=int, default=None, help="테스트할 약물 수 (예: --test 10)")
    args = parser.parse_args()

    api_key = resolve_api_key(args.api_key)
    asyncio.run(main(api_key=api_key, model=args.model, test_count=args.test))

# GROUP A Filtering Report: Prescription Dogs Drugs

## Summary
✅ **Successfully filtered: 1,062 prescription drugs (동물용의약품)**

| Metric | Count |
|--------|-------|
| **Total Products Processed** | 3,161 |
| **Prescription Drugs (GROUP A)** | 1,062 |
| **Quasi Drugs Filtered Out** | 2,099 |
| **Output File Size** | 4.5 MB |
| **Input File** | `dog_drugs_only_raw.jsonl` |
| **Output File** | `backend/data/dog_drugs_prescription_only.jsonl` |

---

## Filtering Methodology

### PRIMARY FILTER (First Level)
```
동물용의약품 (Chemical Pharmaceutical)  ✓ KEEP
동물용의약외품 (Non-Pharmaceutical)      ✗ FILTER OUT
생물의약품 (Biological/Vaccines)        ✗ FILTER OUT (not in scope)
```

**Examples Filtered Out:**
- ❌ 조인트앤본 컨트롤 → classified as `동물용의약외품` (supplement)
- ❌ 헬스 컨트롤 → classified as `동물용의약외품` (vitamin)
- ❌ 다이제스티브 컨트롤 → classified as `동물용의약외품` (probiotic)
- ❌ 힘백 광견병 생독백신 → classified as `생물의약품` (vaccine)

---

### SECONDARY FILTERS (Validation)

#### Filter 2A: Ingredient Analysis
- **Rejects products with >5 supplement-only ingredients** without active pharmaceutical compounds
- Supplements detected: 비타민, 칼슘, 아연, 철, 마그네슘, 프로바이오틱, 생균 등
- **Example filtered:** 이뮨 가디언 → Contains Bacillus, vitamins, minerals only

#### Filter 2B: Efficacy Claims Validation
- **Requires evidence of disease treatment** (not just health maintenance)
- Active drug keywords required: 항생제, 구충, 감염, 질병, 치료, 폐렴, 장염 등
- Quasi-drug keywords excluded: 보충, 영양, 건강유지, 예방(일반)

---

## Sample Products Kept (GROUP A)

| Product | Company | Type |
|---------|---------|------|
| 골든펜다 | (주)우성양행 | Dewormer (Fenbendazole) |
| 설프림액(수출용) | (주)우성양행 | Antibiotic (Sulfamethoxazole/Trimethoprim) |
| 펫-아이 산(타일로신타르타르산염) | (주)우성양행 | Antibiotic (Tylosin Tartrate) |
| 바이렉스 주 | 대한뉴팜(주) | Digestive Aid (Menbuton) |
| 디에치 풀비신 과립 | 대한뉴팜(주) | Antifungal (Griseofulvin) |
| 엔로신 100주 | 대한뉴팜(주) | Antibiotic (Enrofloxacin) |
| 하트필락스(수출용) | 대한뉴팜(주) | Parasite Prevention (Ivermectin) |

---

## Top 10 Manufacturers in GROUP A

1. (주)이엘티사이언스 - 61 products
2. 한국엘랑코동물약품(주) - 56 products
3. (주)대성미생물연구소 - 46 products
4. (주)이글벳 - 43 products
5. (주)한동 - 41 products
6. (주)삼양애니팜 - 41 products
7. 녹십자수의약품(주) - 37 products
8. 제이에스코리아 - 35 products
9. (주)성원 - 34 products
10. (주)삼우메디안 - 34 products

---

## Filtering Accuracy

### Multi-Level Validation Strategy
✅ Primary classification check (품목정보)
✅ Ingredient composition analysis (>5 supplement indicator)
✅ Efficacy claim validation (disease treatment vs supplement)
✅ Active pharmaceutical ingredient verification

### False Positive Prevention
- Checked efficacy text for treatment vs maintenance language
- Validated ingredient lists for pharmaceutical vs supplement composition
- Used consistent keyword matching across all 3,161 records

---

## Output File Location
```
/workspaces/FullStackDemoPractice/backend/data/dog_drugs_prescription_only.jsonl
```

**Format:** JSONL (one JSON object per line)
- Same schema as input
- All 1,062 prescription drugs preserved
- Ready for backend integration

---

## Animal Target Analysis

### Overview
✅ **100% of drugs have identifiable target animals**
- 1,062 drugs analyzed
- 1,060 drugs are multi-species (99.8%)
- Only 2 single-species drugs

### Distribution by Animal Type

| Animal | Count | Percentage | Use Case |
|--------|-------|-----------|----------|
| **Cattle** | 1,062 | 19.9% | Livestock, dairy, beef |
| **Dog** | 1,021 | 19.1% | Companion, working dogs |
| **Sheep** | 710 | 13.3% | Wool, meat production |
| **Horse** | 680 | 12.7% | Equine, sport, work |
| **Cat** | 452 | 8.5% | Companion cats |
| **Pig** | 439 | 8.2% | Pork production |
| **Dog (Canine)** | 288 | 5.4% | Canine-specific formulations |
| **Calf** | 194 | 3.6% | Young cattle |
| **Chicken** | 142 | 2.7% | Poultry |
| **Piglet** | 131 | 2.5% | Young pigs |
| **Goat** | 74 | 1.4% | Dairy, meat goats |
| **Foal** | 55 | 1.0% | Young horses |
| **Pet Dog** | 43 | 0.8% | Pet-specific formulations |
| **Pet** | 17 | 0.3% | Generic pets |
| **Rabbit** | 12 | 0.2% | Laboratory, pet |
| **Turkey** | 9 | 0.2% | Poultry |
| **Duck** | 6 | 0.1% | Poultry |
| **Deer** | 4 | 0.1% | Exotic, game |

### Top Target Animals

**Top 3 Target Animals:**
1. **Cattle (1,062 drugs)** - Most drugs are livestock-focused (dairy, beef operations)
2. **Dogs (1,021 drugs)** - Companion and working dogs are major market
3. **Sheep (710 drugs)** - Significant coverage for wool/meat industry

### Market Segmentation

**By Category:**
- **Livestock Focus:** Cattle, Pigs, Sheep, Horses (61.2% collective)
- **Companion Animals:** Dogs, Cats (27.6% collective)
- **Poultry:** Chickens, Turkeys, Ducks (3.0% collective)
- **Other:** Rabbits, Deer, etc. (0.5% collective)

### Sample Products by Animal

**For Dogs:**
- 펫-아이 산 (Tylosin Tartrate eye drops)
- 하트필락스 (Heartworm prevention)
- 엔로신 100주 (Enrofloxacin injection)
- 카디벤단 정 (Pimobendan for heart disease)

**For Cattle:**
- 골든펜다 (Fenbendazole dewormer)
- 설프림액 (Sulfamethoxazole/Trimethoprim)
- 엔로신 100주 (Respiratory infection treatment)
- 바이렉스 주 (Digestive aid)

**For Horses:**
- 스코피린 주 (Scopolamine for colic)
- 부스칸 에스 주 (Scopolamine/Dipyrone for pain)
- 엔로신 50주 (Enrofloxacin for infection)

**For Cats:**
- 엔로신 100주 (Antibiotic injection)
- 덱사주 (Dexamethasone for inflammation)
- 프라벤-피 (Broad-spectrum dewormer)

---

## Next Steps

1. **Backend Integration:** Load `backend/data/dog_drugs_prescription_only.jsonl` into your database
2. **Data Validation:** Cross-check with your requirements
3. **Animal-Based Filtering:** Use target animal data for DUR (Drug Utilization Review) system
4. **Optional:** Run similar filter for GROUP B (quasi-drugs) if needed

---

## Files Generated

| File | Purpose |
|------|---------|
| `backend/data/dog_drugs_prescription_only.jsonl` | Filtered prescription drugs (1,062 records) |
| `animal_analysis.json` | Animal distribution statistics |
| `scripts/filter_prescription_drugs.py` | Filtering script for reproducibility |
| `scripts/analyze_target_animals.py` | Animal analysis script |
| `FILTERING_REPORT.md` | This comprehensive report |


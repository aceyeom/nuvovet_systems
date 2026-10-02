# Data provenance and licensing status

Last reviewed: 2026-10-02. Treat this file as the source of truth for what may ship to a customer.

| Data | Location | Origin | Status |
|---|---|---|---|
| Legacy drug records (862) | `backend/data/converted/**/*.jsonl` | LLM conversion (`convert_drugs.yml`) of compendium text; 645 records name Plumb's Veterinary Drugs as source (`_data_quality.ddi_source`); 0 records have a human reviewer (`_extraction_metadata.reviewer`) | **Do not distribute commercially.** Plumb's EULA prohibits copying, derivative works and AI/ML use (plumbs.com/eula-updated). Replace via clean-room rebuild. |
| Korean vet product registry extracts | `backend/data/AZ트/` | Public QIA (농림축산검역본부) 동물용의약품 product pages | Public government data. OK to use with attribution. Re-pull from source for production. |
| PMC reference chunks | `runs/reference_chunks/` | PubMed Central search + LLM relevance screening | Bibliographic metadata, OK. Abstract/full-text reuse depends on each article's licence. |
| Therapeutic-class vocabulary | `backend/claims/data/therapeutic_classes.json` | NuvoVet-authored classification | Owned. Needs DVM review. |
| Korean brand/ingredient aliases (190) | `backend/claims/data/kr_drug_aliases.json` | NuvoVet-curated from Korean product labelling (factual identifiers) | Owned. Spot-check against medi.qia.go.kr / nedrug.mfds.go.kr. |
| Clinical rules | `backend/claims/data/clinical_rules.json` | NuvoVet-authored; each rule cites peer-reviewed literature (verified on PubMed, DOIs inline) or a regulatory label | Owned. Thresholds marked heuristic need DVM sign-off. |
| Procedure / diagnosis codebooks | `backend/claims/data/procedure_codes.json`, `diagnosis_codes.json` | NuvoVet-authored seed codes with Korean synonyms; `mafra_standard_ref` reserved for mapping to MAFRA 「동물 진료의 권장 표준」 | Owned. Map to the MAFRA table when ingested. |
| Price benchmarks | inside `procedure_codes.json` | Seed estimates, except the initial-consultation fee (MAFRA 2025 survey mean ₩10,520) | **Estimates.** Replace with the MAFRA survey, the Dec-2026 per-clinic disclosure and partner claims history. |
| Demo claims | `frontend/src/data/claimsDemoSnapshot.json` | `backend/claims/synthetic.py` (seeded generator) | Synthetic. Clinic names are "샘플동물병원 NN". |

## Clean-room rebuild plan for drug knowledge

1. **Freeze.** No new features may read compendium-derived fields. The claims engine reads them only for dose references and labels every such finding (`legacy compendium-derived record`).
2. **Sources.** QIA approved labelling (용법·용량, 효능·효과) for Korean vet products, FDA/EMA labels for approved vet drugs, MFDS labels for human drugs used off-label, and primary literature via PubMed.
3. **Process.** Have the LLM extract facts from those sources only, with a citation for every field. A DVM pharmacologist reviews the top 150 drugs by claim frequency first.
4. **Exit criterion.** Delete `backend/data/converted/` once claims-engine dose checks read only the rebuilt store.

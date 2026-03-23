# AZT Data SQL Integration and Normalization Plan

## Purpose

This document explains the normalization rules, ingestion stages, data quality constraints, and schema considerations required before integrating the AZT dataset into NuvoVet's SQL layer.

The main conclusion is straightforward.

- The AZT dataset is not currently in a form that can be inserted directly into SQL as structured clinical data.
- The current runtime does not yet operate on a fully normalized drug schema. It reads `full_data` JSONB records from the PostgreSQL `drugs` table.
- The architecture documents, however, assume a normalized model built around `products`, `product_variants`, `product_components`, `substances`, `dosing_rules`, and related clinical tables.
- Because of that gap, AZT integration should be designed as a multi-stage pipeline: `raw ingest -> section parse -> canonical normalization -> clinical review -> production merge`.

The goal of this document is to treat AZT as a Korean regulatory and product-label data source, not as a simple import file, and to define a safe path for bringing it into SQL.

## Current State Summary

### 1. Actual Runtime Structure

Today, the backend reads `drug_id` and `full_data` from the `drugs` table and builds the application cache from those records. In practice, this means the running system is still closer to a JSONB-backed drug store than to a fully normalized relational drug schema.

This has three implications.

- If AZT had to be loaded immediately, the fastest path would be to generate `drugs.full_data` style JSONB records.
- Long term, the system should still move toward the normalized SQL model described in the architecture docs.
- Therefore, AZT integration must consider both a short-term compatibility layer and a long-term normalized schema.

### 2. Target Architecture

The design documents assume the following layers.

- `products`: prescribable product families
- `product_variants`: SKU-level records such as strength, package, and license number
- `product_components`: mappings for active ingredients in combination products
- `substances`: the canonical active ingredient master
- `substance_synonyms`: Korean, English, Latin, salt-form, and spelling variants
- `dosing_rules`: species-, route-, indication-, and dose-specific rules
- `contraindications`, `ddi_pairs`, `renal_dose_adjustments`, and other normalized clinical tables for the DUR engine

This is the correct long-term destination for AZT integration. The problem is that the raw AZT source does not naturally arrive in this shape.

### 3. What the AZT Cleaned File Really Is

Despite its name, `dog_drugs_cleaned.jsonl` is not a clinically normalized dataset. Each row is still mostly shaped like this.

- `index`
- `product_name`
- `raw_content`
- `collected_at`

In other words, "cleaned" here means a cleaner document collection, not a ready-to-use set of ingredient, route, species, and dose objects.

This is the most important point in the entire document.

AZT integration is not a JSONL import problem. It is a Korean regulatory document parsing problem.

## Structural Characteristics of AZT Data

### 1. It Is Product-Centered Data

AZT is organized around product labels, not substances.

- The same substance appears under multiple product names.
- The same product family appears as multiple strength variants.
- Export labels, domestic labels, formulation changes, and salt-form differences can all be mixed together.

If this data is loaded directly into the substance master, duplication and conflicts are inevitable.

### 2. Many Different Entity Types Are Mixed in One Document

A single document can contain all of the following at once.

- basic product information
- approval and license information
- manufacturer information
- ingredient and composition data
- indications
- dosage and administration instructions
- warnings and precautions
- storage conditions
- packaging information
- withdrawal periods

In SQL, these belong to different tables and different business responsibilities.

### 3. Korean Free Text and Table-Like Content Are Mixed Together

AZT text often combines:

- continuous prose paragraphs
- species-specific subheadings
- table-like aligned text
- Korean text with English names in parentheses
- ingredient names followed by potency, notes, or basis text
- excipient lists with no usable numeric amount

This is not the kind of content that can be reliably parsed with one regex pass.

### 4. Clinically Different Product Categories Are Mixed Together

AZT includes more than standard prescription drugs.

- antibiotics
- antifungals
- anti-inflammatory drugs
- vitamin and mineral preparations
- feed additive products
- probiotics
- vaccines and biologics
- supportive care products
- companion animal products and food-animal products

If every row is pushed through the same `products -> dosing_rules` workflow, data quality will collapse.

## Why Direct Loading Is Risky

### 1. Active Ingredients and Excipients Are Not Cleanly Separated

In injections, powders, liquids, and similar label formats, the ingredient section often includes active ingredients together with preservatives, solvents, flavoring agents, carriers, or other inactive materials.

That creates several problems.

- Not every `원료약품 및 분량` entry is clinically active.
- `적량` is not a numeric amount.
- Expressions such as potency-based labels, `Mn로서`, `Zn로서`, or `Pyrantel로서 57mg` change what the actual clinical amount means.
- Units such as CFU, IU, %, mg, g, and mL appear together.

Recommended rule:

- `product_components` should contain only clinically meaningful active ingredients.
- Excipients, preservatives, and vehicles should be stored separately or preserved as evidence JSON, but treated as inactive for the default DUR engine.
- A role field such as `is_primary_active` or `component_role` is needed.

Recommended component roles:

- `active`
- `co_active`
- `preservative`
- `vehicle`
- `excipient`
- `flavoring`
- `unknown`

### 2. Ingredient Naming Is Not Consistent

AZT contains major name drift.

- Korean and English names appear together.
- Salt forms are sometimes present and sometimes omitted.
- INN naming and finished-product naming often differ.
- Spacing and hyphenation are inconsistent.
- Some entries exist only in English.
- Some lines expose both the salt and the base, such as `피란텔파모산염(Pyrantel pamoate, Pyrantel로서 57mg)`.

Recommended rule:

- `substances` should store the canonical ingredient.
- Salt form should be stored as synonym metadata or in a separate variant-name layer when needed.
- The raw label text should never be discarded.

Recommended naming layers:

1. raw ingredient name
2. normalized display name
3. canonical substance name
4. optional salt/base relationship

Example:

- raw: `테르비나핀염산염`
- display: `테르비나핀염산염`
- canonical: `terbinafine`
- form: `hydrochloride`

### 3. Product vs Variant Boundaries Matter

Many AZT entries imply multiple variants inside what looks like one product family.

Common examples:

- the same product in 50-unit and 100-unit forms
- the same formulation for small dogs and medium dogs
- the same label with only package-size differences
- the same product name with different concentrations

Recommended rule:

- Clinical identity should be grouped by `active ingredient combination + route + base dosage form`.
- Strength, package, license number, export name, and similar differences should live in `product_variants`.
- Even if names are similar, different routes should be separate `products` rows.

### 4. Route Information Is Often Buried in Text

In AZT, route is frequently hidden in the dosage instructions rather than given as a clean field.

Typical patterns include:

- `피하주사`
- `근육 또는 정맥주사`
- `경구투여`
- `음수 또는 사료에 혼합`
- `피하 또는 근육주사`
- `정맥, 근육 및 피하주사`

The main problem is that one document may contain more than one route.

Recommended rule:

- Route must be normalized to a controlled code.
- If one product supports multiple routes, either split it into route-specific products or maintain a `product_multi_routes` structure and expand downstream.
- The source sentence for the route should be preserved as evidence.

Recommended route values:

- `oral`
- `sc`
- `im`
- `iv`
- `topical`
- `otic`
- `ophthalmic`
- `in_feed`
- `in_water`
- `mixed_route`

`in_feed` and `in_water` do not behave like standard companion-animal prescription routes, so they should be treated separately.

### 5. Dosing Expressions Are Extremely Diverse

The hardest part of AZT normalization is dose parsing.

Real examples include:

- `5mg per kg body weight`
- `0.25mL per 10kg body weight`
- `1~2mL per animal`
- `1~2kg per ton of feed`
- `100mL diluted into 200L of drinking water`
- `1 tablet`
- `1/2 tablet`
- `once monthly`
- `every 24 hours`
- `for 3-7 days`
- `until symptoms improve`
- `2 hours before surgery`

Because of that, one field like `dose_mg_per_kg` is not enough.

Recommended dosing types:

- `mg_per_kg`
- `mcg_per_kg`
- `ml_per_kg`
- `g_per_kg`
- `ml_per_animal`
- `g_per_animal`
- `tablet_count`
- `volume_fixed`
- `iu_based`
- `cfu_based`
- `feed_based`
- `water_dilution_based`
- `per_body_weight_band`
- `procedure_timing_based`

Recommended supporting fields:

- `dose_min`
- `dose_max`
- `dose_unit`
- `dose_denominator`
- `frequency_text`
- `frequency_hours`
- `times_per_day`
- `duration_min_days`
- `duration_max_days`
- `duration_text`
- `requires_dilution`
- `dilution_text`
- `weight_band_min_kg`
- `weight_band_max_kg`
- `administration_notes`

### 6. Species Information Affects Both Approval and Dosing

AZT expresses species information in two different ways.

- species approved for the product
- species where dosing rules actually branch differently

Examples include:

- `dog, cat`
- `cattle, horse, pig, dog, cat`
- age or stage terms such as calf, foal, and piglet

Recommended rule:

- `products.approved_species` should store the approval scope.
- life stage should be separated from species.
- dosing is safest when stored at the `species + life_stage + route + indication` level.

Recommended species values:

- `dog`
- `cat`
- `cattle`
- `calf`
- `horse`
- `foal`
- `pig`
- `piglet`
- `sheep`
- `goat`
- `poultry`
- `chicken`
- `turkey`
- `unknown`

Terms like calf, foal, and piglet should not be forced into a single species column without stage handling.

### 7. Indications Mix Clinical Disease Terms and Marketing Claims

AZT efficacy sections do not always give clean disease names.

They may include:

- clear disease names
- symptom groups
- prevention language
- supportive-care language
- productivity claims
- nutritional claims
- general statements such as improved gut function

For DUR and search behavior, this creates a key question: what should count as a true clinical indication?

Recommended rule:

- Separate disease entities from functional or marketing claims.
- Store normalized indications separately from raw claims.
- Do not force supportive products or feed additives into the same disease ontology as prescription therapeutics.

Recommended indication classes:

- `treatment_indication`
- `prevention_indication`
- `supportive_care`
- `nutritional_support`
- `productivity_claim`
- `unknown_claim`

### 8. Warning Sections Contain Multiple Clinical Domains

The warning section often mixes all of the following.

- contraindications
- adverse effects
- drug interactions
- pregnancy and lactation warnings
- administration precautions
- storage precautions
- handler safety notes
- withdrawal periods

If all of that is stored in one raw text column, downstream clinical logic becomes much less useful.

Recommended decomposition:

- `contraindications`
- `adverse_effects`
- `drug_interactions`
- `pregnancy_lactation_notes`
- `administration_precautions`
- `handler_safety_notes`
- `withdrawal_periods`
- `storage_conditions`

### 9. Withdrawal Periods Need Their Own Regulatory Model

For food-animal products, withdrawal is clinically and legally important.

Common patterns include:

- `cattle: 20 days, milk: 4 days`
- `pig: 28 days`
- `do not use in lactating cattle`
- `do not use in laying hens`
- `none`

Recommended rule:

- Withdrawal is not a normal contraindication. It is regulatory data.
- It should be stored by species and by commodity such as meat, milk, or egg.
- `prohibited` and `0 days` must not be treated as the same meaning.

Recommended structure:

- `withdrawal_rules`
  - `product_id`
  - `species`
  - `commodity_type` (`meat`, `milk`, `egg`)
  - `withdrawal_days`
  - `is_prohibited`
  - `note_raw`

### 10. Search Normalization Is Required for Korean Data

Korean product data needs an extra normalization layer for search and de-duplication.

Important issues include:

- optional English text inside parentheses
- spacing differences
- dosage-form suffixes such as `주`, `정`, `산`, `액`, `백신`
- qualifiers such as export-only, pet-only, or prescription-only labels
- full-width vs half-width punctuation
- mixed Korean and English case variation

Recommended search keys:

- `name_raw`
- `name_display`
- `name_normalized_ko`
- `name_normalized_ascii`
- `manufacturer_normalized`
- `license_number_normalized`

Recommended normalization rules:

- generate a version with parentheses removed
- generate a version with spaces removed
- split dosage-form suffixes into separate fields
- split qualifiers such as export-only into separate flags
- normalize English case consistently

## SQL Loading Strategy

### Guiding Principle: Do Not Load AZT Directly Into Production Tables

AZT should always pass through staging.

Recommended stages:

1. raw landing
2. section splitting
3. entity parsing
4. canonical normalization
5. review and conflict resolution
6. production merge

### Stage 1. Raw Landing Tables

Recommended table:

#### `azt_raw_entries`

- `id`
- `source_index`
- `product_name_raw`
- `raw_content`
- `collected_at`
- `source_file`
- `content_hash`
- `ingested_at`
- `parse_status`

Purpose:

- preserve the original text
- allow re-parsing
- support parser-version upgrades
- maintain an audit trail between source documents and production rows

Recommended table:

#### `azt_parse_runs`

- `id`
- `raw_entry_id`
- `parser_version`
- `run_at`
- `status`
- `error_message`
- `confidence_score`

Purpose:

- track which parser version produced which result

### Stage 2. Section-Level Parse Tables

Recommended tables:

- `azt_parsed_basic_info`
- `azt_parsed_ingredients`
- `azt_parsed_indications`
- `azt_parsed_dosing`
- `azt_parsed_warnings`
- `azt_parsed_storage`
- `azt_parsed_packaging`
- `azt_parsed_withdrawals`

At this stage, the goal is not to force the data into the production schema yet. The goal is to structure the raw sections.

For example, `azt_parsed_ingredients` only needs to reach this level.

- `ingredient_name_raw`
- `ingredient_name_en_raw`
- `amount_raw`
- `amount_value`
- `amount_unit_raw`
- `standard_raw`
- `remark_raw`
- `component_role_guess`

### Stage 3. Canonical Normalization Tables

This is where parsed content maps into the target architecture.

Primary merge targets:

- `substances`
- `substance_synonyms`
- `products`
- `product_variants`
- `product_components`
- `product_multi_routes`
- `dosing_rules`
- `contraindications`
- `ddi_pairs`
- `lab_test_interactions`
- `therapeutic_classes`
- `withdrawal_rules` or equivalent

### Stage 4. Review Queue

Human review must be triggered automatically for uncertain cases.

Example review-queue triggers:

- failure to separate active ingredients from excipients
- uncertainty in salt/base canonicalization
- more than one route with no clear primary route
- inability to classify dose type
- ambiguous species or life-stage boundaries
- unclear whether a phrase is a disease indication or a marketing claim
- low fuzzy-match confidence against existing substances or products
- withdrawal text that does not resolve to a usable numeric rule

## Recommended Normalization Rules

### Rule 1. Split Clinical Product Identity From Marketing Modifiers

Separate the following when parsing product names:

- base product name
- dosage-form suffix
- export-only status
- pet-only or prescription-only label text
- English alias

Example:

- `카디벤단 정(피모벤단)`
  - base product name: `카디벤단`
  - dosage form marker: `정`
  - active hint in parentheses: `피모벤단`

### Rule 2. Store Salt Form Separately From the Canonical Substance

Examples:

- `덱사메타손디나트륨인산염`
  - canonical substance: `dexamethasone`
  - salt/form: `disodium phosphate`

- `아목시실린수화물`
  - canonical substance: `amoxicillin`
  - form: `hydrate`

Without this separation, DDI mapping and therapeutic-class mapping will accumulate duplicates.

### Rule 3. Separate Strength From Concentration

The same number can mean very different things.

- 100mg per tablet
- 100mg per mL
- 100g per kg

Required split fields:

- amount numeric
- amount unit
- denominator numeric if present
- denominator unit or basis

Examples:

- `1밀리리터 중 200 MG`
  - `strength_value: 200`
  - `strength_unit: mg`
  - `strength_per: per_ml`

- `1정(170mg) 중 피로콕시브 57 MG`
  - `active_amount_value: 57`
  - `active_amount_unit: mg`
  - `per: per_tablet`
  - `gross_tablet_weight_mg: 170`

### Rule 4. Store Approval and Regulatory Metadata at the Variant Level

The following fields usually belong closer to the variant than to the substance or product family.

- approval date
- license information
- manufacturer
- cancellation status
- prescription-only status
- packaging unit
- storage method

These should live in `product_variants` or a variant-linked regulatory table.

### Rule 5. Treat `적량` as a Qualitative Amount, Not as Missing Data

`적량` does not mean there is no amount. It means the amount is not being expressed as a usable numeric quantity.

Recommended storage:

- `amount_value = null`
- `amount_qualifier = 'q.s.'`
- `amount_raw = '적량'`

### Rule 6. Separate Feed and Water Dosing From Standard Prescription Dosing

Examples:

- `1~2kg per ton of feed`
- `100mL diluted into 200L of water`

These expressions do not behave like body-weight-based companion-animal dosing and should not be mixed with ordinary prescription rules without a strong type system.

Recommended options:

- keep a strong `dosing_type` field inside `dosing_rules`, or
- create a separate `feed_dosing_rules` table

Operationally, a separate table or explicit type boundary is safer.

### Rule 7. Add Category Gates for Vaccines, Biologics, and Supportive Products

Examples:

- vaccines
- probiotics
- immune enhancers
- vitamin complexes
- nutritional powders

Many of these products do not connect directly to the core DUR engine.

Recommended category values:

- `pharmaceutical`
- `biologic`
- `nutraceutical`
- `feed_additive`
- `supportive_product`
- `out_of_scope`

This should be managed in `products.substance_category` or an equivalent field.

## Recommended SQL Extensions

### 1. Additional Tables Worth Adding to the Current Design

#### `withdrawal_rules`

This is needed to separate food-animal regulatory data cleanly.

#### `product_regulatory_flags`

Recommended columns:

- `product_variant_id`
- `is_prescription_only`
- `is_export_only`
- `is_pet_only`
- `is_food_animal_allowed`
- `is_layer_prohibited`
- `is_lactating_prohibited`
- `regulatory_note_raw`

#### `ingredient_name_resolution_log`

Canonicalization should be traceable. Otherwise it becomes very hard to investigate naming-quality problems later.

### 2. Metadata Needed on Production Rows

Every important production row should carry at least:

- `source_system`
- `source_record_id`
- `source_text_excerpt`
- `normalization_confidence`
- `review_status`
- `reviewed_by`
- `reviewed_at`

If the normalized row loses its source evidence, correction costs rise quickly.

## Important AZT Sample Cases

### Case A. Single-Ingredient Injection Product

Example: Enrosin 100 Injection

Characteristics:

- has a clear per-mL ingredient amount
- contains species-specific route branches
- may branch by disease severity in the dosing section
- includes withdrawal periods
- includes interactions and contraindications

Recommended loading strategy:

- `substances`: enrofloxacin
- `products`: consider route-specific separation such as `sc` and `im`
- `product_variants`: 100 mg/mL, manufacturer, license number, packaging
- `dosing_rules`: multiple rows by species + route + severity/indication
- `withdrawal_rules`: cattle meat, milk, pig meat
- `contraindications` and `ddi_pairs`: parsed separately from warning content

### Case B. Fixed-Volume or Mixed-Route Companion Product

Examples: Dexa Injection, Scopyrin Injection

Characteristics:

- uses fixed-per-animal dosing such as `1~2mL per animal`
- supports multiple routes such as `SC or IM`
- targets small animals such as dogs and cats

Recommended loading strategy:

- `dosing_type = ml_per_animal`
- allow multiple routes or split into route-specific products
- split rows by species where needed
- do not force these records into mg/kg conversion when the label does not support it

### Case C. Tablet Products With Weight-Band Dispensing

Examples: Cardibendan tablets, Prococs tablets

Characteristics:

- the label gives a mg/kg principle
- the practical dosing table uses weight bands and whole/half tablet counts

Recommended loading strategy:

- keep both the principle dose and the dispensing table
- store the mg/kg principle in `dosing_rules`
- add `weight_band_dosing_rules` or preserve the dispensing table as structured evidence

### Case D. Feed Additives or Functional Support Products

Examples: Immune Guardian, Daehan Biotin 100

Characteristics:

- combines CFU, IU, minerals, or nutritional components
- doses per ton of feed
- often positioned for productivity, immunity, or nutrition rather than disease treatment

Recommended loading strategy:

- `substance_category = feed_additive` or `nutraceutical`
- do not treat these as standard prescription drugs in the core DUR engine
- manage them in a separate catalog or expose them only in limited search contexts

### Case E. Combination Product With Export-Label Expansion

Example: DM Flo Injection

Characteristics:

- contains multiple active ingredients
- includes extra efficacy and dosing language for export labels
- mixes domestic pig labeling with export information for cattle, sheep, or dogs

Recommended loading strategy:

- store domestic approved indications separately from export-label extensions
- add `jurisdiction_scope` or `label_scope`
- require multiple `product_components` rows
- never compress all of this into one flattened production row

## Recommended Pipeline Design

### Step 0. Preserve the Original Text

The original AZT text should never be overwritten by parsed output.

### Step 1. Split the Document Into Sections

Minimum section split:

- basic information
- ingredients and composition
- indications
- dosage and administration
- warnings and precautions
- appearance / manufacturing / storage / packaging

### Step 2. Extract Entities

Targets to extract:

- product name
- English name
- manufacturer
- approval date
- license number
- cancellation status
- prescription-only flag
- ingredient list
- species
- route
- dosing fragments
- contraindication fragments
- interaction fragments
- withdrawal fragments

### Step 3. Canonical Mapping

Map the extracted fragments into controlled structures:

- ingredient -> substance
- dosage-form text -> canonical dosage form
- route phrase -> canonical route
- species phrase -> canonical species or life stage
- indication phrase -> ontology candidate

### Step 4. Confidence Scoring

Example confidence levels:

- high: clear numeric values, units, species, and route
- medium: usable text exists, but some ambiguity remains
- low: table parsing failed, context is unclear, or active vs excipient is uncertain

### Step 5. Human Review

Low-confidence records and category-sensitive products should be reviewed first.

### Step 6. Production Merge

Upsert rules must be explicit.

Example natural keys:

- `substances`: canonical name
- `products`: canonical product family + route + category
- `product_variants`: product_id + normalized strength + manufacturer + license number

## PostgreSQL Implementation Considerations

### 1. Encoding and Collation

- Database encoding must be UTF-8.
- Korean does not have case-folding issues in the same way English does, but mixed-language fields still need normalized search keys.
- Fuzzy search should index both raw names and normalized keys.

### 2. Numeric Types

- The schema must support mg, mcg, IU, CFU, %, g, and mL, so numeric-capable types are required.
- Ingestion should strip thousands separators before parsing numbers.
- Vaccine expressions such as `10^3.5 EID50` may not resolve into ordinary numeric storage, so raw preservation is essential.

### 3. Preserve Source Evidence

If only normalized values are stored and the source text is discarded, future validation becomes much harder.

Minimum recommendation:

- `source_text_excerpt` on production rows
- `raw_section_text` on parsed section rows
- full `raw_content` on source-level rows

### 4. Limit JSONB to Raw and Evidence Layers

JSONB is not the problem by itself. The problem is leaving core business entities only in JSONB.

That causes predictable issues:

- de-duplication becomes harder
- clinical queries become more complex
- route/species/dose rule engines become slower
- review tooling becomes harder to build

Recommended direction:

- allow JSONB for raw and parsed evidence
- prefer relational normalization for products, substances, components, dosing, and withdrawal rules

## Operating Policy Recommendations

### 1. AZT Should Not Be Treated as the Only Source of Truth

AZT is strong for product labels, approval data, ingredients, packaging, storage, and dosage instructions. It is not enough on its own for deep clinical reasoning.

Recommended responsibility split:

- AZT: product, approval, ingredients, dosing, regulatory, packaging, storage
- converted clinical dataset: deep clinical data for the DUR engine
- manual curation: synonym correction, salt mapping, and category correction

### 2. Join AZT and Existing Data at the Substance Layer

The safest integration point is `substances`.

- AZT should focus on product-to-substance resolution.
- the existing converted dataset should focus on substance-to-clinical knowledge.

This keeps product data and clinical intelligence cleanly separated.

### 3. Separate Short-Term and Long-Term Goals

Short-term goals:

- load AZT safely into raw and staging layers
- produce parsed candidates for key companion-animal products
- build a bridge into the current JSONB runtime if needed

Long-term goals:

- complete the normalized model
- enable route/species/dose-aware SQL queries
- establish a stable review workflow
- promote AZT into an authoritative product master source

## Priority Execution Plan

### P0. Must Do First

- create raw landing tables
- build a section parser
- implement active-vs-excipient separation rules in the ingredient parser
- define standard values for route, species, and dosing type
- design the review queue

### P1. Initial Product Master Build

- prioritize companion-animal products first
- build `products`, `product_variants`, and `product_components`
- build `withdrawal_rules` and `product_regulatory_flags`
- build substance synonym mappings

### P2. Clinical Integration

- connect AZT products to the existing substance master
- normalize `dosing_rules`
- partially automate contraindication and interaction extraction
- build a bridge to the current `drugs.full_data` runtime model

## Final Recommendation

The safest approach to AZT integration is to follow these rules.

1. Do not load AZT directly into production SQL tables.
2. Build a raw and staging layer first.
3. Parse and separate active ingredients, dosage form, route, species, dose, and regulatory data.
4. Keep products and substances separate, and keep variants separate from regulatory metadata.
5. Do not treat feed additives, biologics, and nutraceuticals as ordinary prescription drugs.
6. Store withdrawal rules and export-label content as a separate regulatory layer.
7. Preserve both the Korean source text and the normalized search keys.
8. Design an explicit bridge between the current JSONB runtime and the long-term normalized model.

Operationally, AZT should be treated as a product-master source that complements the existing converted clinical dataset, not as a replacement for it. The most realistic design is a dual structure in which:

- AZT owns `product / variant / regulatory` data
- the existing converted dataset owns `substance / clinical intelligence` data

This is the design that best fits the current codebase, the existing database architecture, and the actual form of the AZT source data.
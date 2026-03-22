-- Stage-2 deprecation prep queries for legacy fields
-- Goal: safely remove _data_quality.ddi_source and source_file after consumers migrate.

-- 1) Legacy field population status in drugs.full_data JSON
SELECT
  COUNT(*) AS total_drugs,
  COUNT(*) FILTER (WHERE full_data->'_data_quality'->>'ddi_source' IS NOT NULL) AS drugs_with_legacy_ddi_source,
  COUNT(*) FILTER (WHERE full_data->>'source_file' IS NOT NULL) AS drugs_with_legacy_source_file
FROM drugs;

-- 2) Distinct legacy ddi_source values
SELECT
  COALESCE(NULLIF(full_data->'_data_quality'->>'ddi_source', ''), 'NULL_OR_EMPTY') AS ddi_source,
  COUNT(*) AS row_count
FROM drugs
GROUP BY 1
ORDER BY row_count DESC;

-- 3) New split-table readiness: references coverage check
SELECT
  COUNT(DISTINCT drug_id) AS referenced_drug_count,
  COUNT(*) AS reference_rows
FROM drug_references;

-- 4) Legacy vs new aggregate consistency spot-check
WITH refs AS (
  SELECT drug_id, COUNT(*) AS ref_count
  FROM drug_references
  GROUP BY drug_id
)
SELECT
  d.drug_id,
  COALESCE((d.full_data->'_data_quality'->>'pmc_reference_count')::int, 0) AS json_ref_count,
  COALESCE(r.ref_count, 0) AS table_ref_count,
  d.full_data->'_data_quality'->>'ddi_source' AS legacy_ddi_source
FROM drugs d
LEFT JOIN refs r ON r.drug_id = d.drug_id
WHERE COALESCE((d.full_data->'_data_quality'->>'pmc_reference_count')::int, 0) <> COALESCE(r.ref_count, 0)
ORDER BY d.drug_id
LIMIT 200;

-- 5) Candidate rows where legacy fields are already removable
-- Criteria: has split references and mapper can infer ddiSource without legacy fields.
SELECT
  d.drug_id,
  d.full_data->'_data_quality'->>'ddi_source' AS legacy_ddi_source,
  COUNT(r.*) AS ref_count
FROM drugs d
LEFT JOIN drug_references r ON r.drug_id = d.drug_id
GROUP BY d.drug_id, d.full_data->'_data_quality'->>'ddi_source'
HAVING COUNT(r.*) > 0
ORDER BY ref_count DESC
LIMIT 200;

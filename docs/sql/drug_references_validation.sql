-- drug_references validation queries
-- Usage example:
--   psql "$DB_INTERNAL_URL" -f docs/sql/drug_references_validation.sql

-- 1) Basic row counts
SELECT COUNT(*) AS drugs_count FROM drugs;
SELECT COUNT(*) AS drug_references_count FROM drug_references;
SELECT COUNT(DISTINCT drug_id) AS referenced_drug_count FROM drug_references;

-- 2) Coverage ratio: what fraction of drugs have at least one reference
SELECT
  ROUND(
    100.0 * COUNT(DISTINCT r.drug_id)::numeric / NULLIF((SELECT COUNT(*) FROM drugs), 0),
    2
  ) AS coverage_percent
FROM drug_references r;

-- 3) Top drugs by reference count
SELECT
  r.drug_id,
  d.name_ko,
  COUNT(*) AS ref_count,
  ROUND(AVG(r.if_score)::numeric, 3) AS avg_if_score,
  MAX(r.relevance_score) AS max_relevance
FROM drug_references r
LEFT JOIN drugs d ON d.drug_id = r.drug_id
GROUP BY r.drug_id, d.name_ko
ORDER BY ref_count DESC, avg_if_score DESC NULLS LAST
LIMIT 30;

-- 4) Potential quality issues
-- 4-a) orphan references (drug_id missing in drugs)
SELECT r.drug_id, COUNT(*) AS orphan_rows
FROM drug_references r
LEFT JOIN drugs d ON d.drug_id = r.drug_id
WHERE d.drug_id IS NULL
GROUP BY r.drug_id
ORDER BY orphan_rows DESC;

-- 4-b) missing critical fields
SELECT
  COUNT(*) FILTER (WHERE pmc_id IS NULL OR pmc_id = '') AS missing_pmc_id,
  COUNT(*) FILTER (WHERE title IS NULL OR title = '') AS missing_title,
  COUNT(*) FILTER (WHERE url IS NULL OR url = '') AS missing_url,
  COUNT(*) FILTER (WHERE relevance_score IS NULL) AS missing_relevance,
  COUNT(*) FILTER (WHERE if_score IS NULL) AS missing_if_score
FROM drug_references;

-- 4-c) invalid score ranges (expected 0-100 for relevance)
SELECT *
FROM drug_references
WHERE relevance_score IS NOT NULL
  AND (relevance_score < 0 OR relevance_score > 100)
ORDER BY relevance_score DESC;

-- 5) Cross-check with drugs.full_data._data_quality aggregate fields
WITH ref_agg AS (
  SELECT
    drug_id,
    COUNT(*) AS ref_count,
    AVG(if_score) AS avg_if_score
  FROM drug_references
  GROUP BY drug_id
),
json_agg AS (
  SELECT
    d.drug_id,
    COALESCE((d.full_data->'_data_quality'->>'pmc_reference_count')::int, 0) AS json_ref_count,
    (d.full_data->'_data_quality'->>'average_if_score')::double precision AS json_avg_if
  FROM drugs d
)
SELECT
  j.drug_id,
  j.json_ref_count,
  COALESCE(r.ref_count, 0) AS table_ref_count,
  j.json_avg_if,
  r.avg_if_score AS table_avg_if
FROM json_agg j
LEFT JOIN ref_agg r ON r.drug_id = j.drug_id
WHERE j.json_ref_count <> COALESCE(r.ref_count, 0)
   OR (
      j.json_avg_if IS DISTINCT FROM r.avg_if_score
      AND NOT (j.json_avg_if IS NULL AND r.avg_if_score IS NULL)
   )
ORDER BY j.drug_id
LIMIT 200;

-- 6) Representative sample rows
SELECT
  drug_id, pmc_id, relevance_score, if_score, title, url
FROM drug_references
ORDER BY inserted_at DESC
LIMIT 50;

-- =====================================================================
-- MIGRATION 002 — Live obsolescence calculation
--
-- WHY: the original design stored obsolescence_status, risk_score and
-- lifecycle_stage as fixed columns, calculated once when a file was
-- imported. Those values go stale the moment the calendar moves on: an
-- asset imported as "GREEN, 13 months of support left" is silently still
-- GREEN two months later, when it should be YELLOW.
--
-- This migration adds a view that derives all of those values from
-- CURRENT_DATE every time it is queried, so the dashboards are always
-- correct no matter when the data was imported.
--
-- Run this once against your database, after database_schema.sql.
-- =====================================================================

-- Drop first so this migration can be re-run safely: CREATE OR REPLACE VIEW
-- refuses to change a view's column list, and dropping avoids blocking the
-- ALTER TABLE statements below.
DROP VIEW IF EXISTS v_assets_live;

-- Estimated replacement cost is kept separate from purchase_price so that
-- a real, known acquisition cost is never confused with an estimate.
ALTER TABLE assets ADD COLUMN IF NOT EXISTS estimated_replacement_cost DECIMAL(12, 2);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS cost_is_estimated BOOLEAN DEFAULT TRUE;

-- Which import a row came from, so history is meaningful.
ALTER TABLE assets ADD COLUMN IF NOT EXISTS import_id INTEGER;

CREATE VIEW v_assets_live AS
SELECT
  a.*,

  -- Days remaining on manufacturer support (negative = already expired)
  (a.end_of_support - CURRENT_DATE) AS days_until_eos,

  -- ---------------------------------------------------------------
  -- OBSOLESCENCE CLASSIFICATION (per BIAT DSI specification)
  --   GREEN   support valid ( > 12 months remaining )
  --   YELLOW  end of support in less than 12 months
  --   ORANGE  end of support in less than 6 months
  --   RED     support expired
  --   UNKNOWN no end-of-support date on record
  -- ---------------------------------------------------------------
  CASE
    WHEN a.end_of_support IS NULL THEN 'UNKNOWN'
    WHEN a.end_of_support < CURRENT_DATE THEN 'RED'
    WHEN a.end_of_support < CURRENT_DATE + INTERVAL '6 months' THEN 'ORANGE'
    WHEN a.end_of_support < CURRENT_DATE + INTERVAL '12 months' THEN 'YELLOW'
    ELSE 'GREEN'
  END AS status_live,

  -- ---------------------------------------------------------------
  -- RISK SCORE (0-100), additive so every score is explainable:
  --   time urgency   0-60  how soon support runs out
  --   criticality    0-40  business impact if it fails
  -- A score is therefore always "urgency + criticality", and the two
  -- components can be shown separately to justify any number.
  -- ---------------------------------------------------------------
  (
    CASE
      WHEN a.end_of_support IS NULL THEN 0
      WHEN a.end_of_support < CURRENT_DATE THEN 60
      WHEN a.end_of_support < CURRENT_DATE + INTERVAL '3 months' THEN 50
      WHEN a.end_of_support < CURRENT_DATE + INTERVAL '6 months' THEN 40
      WHEN a.end_of_support < CURRENT_DATE + INTERVAL '12 months' THEN 25
      WHEN a.end_of_support < CURRENT_DATE + INTERVAL '24 months' THEN 10
      ELSE 0
    END
    +
    CASE LOWER(COALESCE(a.criticality, ''))
      WHEN 'critical' THEN 40
      WHEN 'critique' THEN 40
      WHEN 'high'     THEN 28
      WHEN 'élevée'   THEN 28
      WHEN 'elevee'   THEN 28
      WHEN 'medium'   THEN 15
      WHEN 'moyen'    THEN 15
      WHEN 'moyenne'  THEN 15
      ELSE 5
    END
  ) AS risk_score_live,

  -- Time and criticality components exposed separately so the UI can
  -- show exactly how a risk score was arrived at.
  CASE
    WHEN a.end_of_support IS NULL THEN 0
    WHEN a.end_of_support < CURRENT_DATE THEN 60
    WHEN a.end_of_support < CURRENT_DATE + INTERVAL '3 months' THEN 50
    WHEN a.end_of_support < CURRENT_DATE + INTERVAL '6 months' THEN 40
    WHEN a.end_of_support < CURRENT_DATE + INTERVAL '12 months' THEN 25
    WHEN a.end_of_support < CURRENT_DATE + INTERVAL '24 months' THEN 10
    ELSE 0
  END AS risk_time_component,

  CASE LOWER(COALESCE(a.criticality, ''))
    WHEN 'critical' THEN 40 WHEN 'critique' THEN 40
    WHEN 'high' THEN 28 WHEN 'élevée' THEN 28 WHEN 'elevee' THEN 28
    WHEN 'medium' THEN 15 WHEN 'moyen' THEN 15 WHEN 'moyenne' THEN 15
    ELSE 5
  END AS risk_criticality_component,

  -- ---------------------------------------------------------------
  -- LIFECYCLE STAGE — the six stages of the BIAT asset lifecycle:
  -- Exploitation -> Maintenance -> Fin de support constructeur ->
  -- Obsolescence -> Remplacement -> Sortie du patrimoine
  -- ---------------------------------------------------------------
  CASE
    WHEN LOWER(COALESCE(a.status, '')) IN ('hors service', 'retired', 'décommissionné')
      THEN 'Sortie du patrimoine'
    WHEN a.replacement_date IS NOT NULL AND a.replacement_date <= CURRENT_DATE
      THEN 'Remplacement'
    WHEN a.end_of_support IS NULL THEN 'Exploitation'
    WHEN a.end_of_support < CURRENT_DATE THEN 'Obsolescence'
    WHEN a.end_of_support < CURRENT_DATE + INTERVAL '6 months'
      THEN 'Fin de support constructeur'
    WHEN a.end_of_support < CURRENT_DATE + INTERVAL '12 months' THEN 'Maintenance'
    ELSE 'Exploitation'
  END AS lifecycle_stage_live,

  -- At risk = support gone or nearly gone AND the asset matters.
  -- (Applied identically to imported and seeded data.)
  (
    a.end_of_support IS NOT NULL
    AND a.end_of_support < CURRENT_DATE + INTERVAL '6 months'
    AND LOWER(COALESCE(a.criticality, '')) IN ('critical', 'critique', 'high', 'élevée', 'elevee')
  ) AS is_at_risk_live,

  -- Requires replacement = support has already expired, or expires within
  -- 3 months on a business-critical asset.
  (
    a.end_of_support IS NOT NULL
    AND (
      a.end_of_support < CURRENT_DATE
      OR (
        a.end_of_support < CURRENT_DATE + INTERVAL '3 months'
        AND LOWER(COALESCE(a.criticality, '')) IN ('critical', 'critique')
      )
    )
  ) AS requires_replacement_live,

  -- Budget planning year/quarter, driven by when support actually ends
  -- rather than by an arbitrary offset.
  EXTRACT(YEAR FROM COALESCE(a.replacement_date, a.end_of_support))::INT AS plan_year,
  EXTRACT(QUARTER FROM COALESCE(a.replacement_date, a.end_of_support))::INT AS plan_quarter

FROM assets a
WHERE COALESCE(a.is_deprecated, FALSE) = FALSE;

-- =====================================================================
-- MIGRATION 003 — Colonnes supplémentaires
--
-- POURQUOI : jusqu'ici, une colonne dont l'intitulé n'était pas reconnu
-- était ignorée silencieusement à l'import. Le chargement fonctionnait,
-- mais le contenu de cette colonne était perdu.
--
-- Désormais, toute colonne non reconnue est conservée telle quelle dans
-- `extra_attributes`, et affichée dans la fiche détaillée de l'actif.
-- La BIAT peut donc enrichir ses extractions sans perte d'information et
-- sans modification de l'application.
--
-- À exécuter après 002_live_calculations.sql.
-- =====================================================================

ALTER TABLE assets ADD COLUMN IF NOT EXISTS extra_attributes JSONB;

COMMENT ON COLUMN assets.extra_attributes IS
  'Colonnes du fichier source non reconnues par le mapping standard, conservées telles quelles.';

-- Index GIN : permet de rechercher sur ces attributs si le besoin apparaît.
CREATE INDEX IF NOT EXISTS idx_assets_extra_attributes
  ON assets USING GIN (extra_attributes);

-- La vue doit être recréée : son "a.*" a été figé à la création et
-- n'inclurait pas la nouvelle colonne.
DROP VIEW IF EXISTS v_assets_live;

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

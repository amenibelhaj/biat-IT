/*
 * BIAT IT Asset Lifecycle & Obsolescence Management — API
 *
 * All dashboard endpoints read from the view `v_assets_live`, which
 * recalculates obsolescence status, risk score and lifecycle stage from
 * CURRENT_DATE on every query. Nothing time-sensitive is ever served
 * from a value frozen at import time.
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const db = require('./db');
const { importExcelAssets } = require('./importHandler');
const { getCatalog } = require('./lib/costCatalog');

const app = express();
const PORT = process.env.PORT || 5000;

// In production set FRONTEND_URL to the deployed frontend so only it may
// call this API. Unset (local development), any origin is accepted.
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((o) => o.trim())
  : true;

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls', '.csv'].includes(ext)) cb(null, true);
    else cb(new Error('Only Excel (.xlsx, .xls) or CSV files are accepted'));
  }
});

/** Wrap an async route so rejected promises become 500s instead of hanging. */
const route = (handler) => (req, res) => {
  Promise.resolve(handler(req, res)).catch((err) => {
    console.error(`${req.method} ${req.path} failed:`, err.message);
    res.status(500).json({ error: err.message });
  });
};

// =====================================================================
// HEALTH
// =====================================================================
app.get('/api/health', route(async (req, res) => {
  const result = await db.query('SELECT COUNT(*)::int AS assets FROM assets');
  res.json({
    status: 'OK',
    database: 'connected',
    assets: result.rows[0].assets,
    server_date: new Date().toISOString().split('T')[0]
  });
}));

// =====================================================================
// REFERENCE — the cost assumptions behind every estimated figure.
// Exposed so the interface can show exactly where its numbers come from.
// =====================================================================
app.get('/api/reference/cost-catalog', (req, res) => res.json(getCatalog()));

// =====================================================================
// IMPORT
//   ?mode=replace  (default) clear the inventory, then load the file
//   ?mode=merge              add to / update the existing inventory
// =====================================================================
app.post('/api/import/excel', upload.single('file'), route(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const mode = req.query.mode === 'merge' ? 'merge' : 'replace';
  try {
    const result = await importExcelAssets(
      req.file.path, req.file.originalname, req.file.size, mode
    );
    res.json({
      success: true,
      mode,
      imported: result.imported,
      updated: result.updated,
      skipped: result.skipped,
      total: result.total,
      errors: result.errors,
      warnings: result.warnings,
      message: `${result.imported} added, ${result.updated} updated, ${result.skipped} skipped out of ${result.total} rows`
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  } finally {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
  }
}));

app.get('/api/import/history', route(async (req, res) => {
  const result = await db.query(`
    SELECT id, original_filename, file_size, total_rows, imported_rows,
           failed_rows, errors, import_date
    FROM import_history
    ORDER BY import_date DESC
    LIMIT 50
  `);
  res.json(result.rows);
}));

app.get('/api/import/history/:id', route(async (req, res) => {
  const result = await db.query('SELECT * FROM import_history WHERE id = $1', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Import not found' });
  res.json(result.rows[0]);
}));

// =====================================================================
// ASSETS — inventory with optional filtering
// =====================================================================
app.get('/api/assets', route(async (req, res) => {
  const { site, status, criticality, obsolescence, type, search } = req.query;
  const where = [];
  const params = [];

  if (site)         { params.push(site);         where.push(`site = $${params.length}`); }
  if (status)       { params.push(status);       where.push(`status = $${params.length}`); }
  if (criticality)  { params.push(criticality);  where.push(`criticality = $${params.length}`); }
  if (obsolescence) { params.push(obsolescence); where.push(`status_live = $${params.length}`); }
  if (type)         { params.push(type);         where.push(`type = $${params.length}`); }
  if (search) {
    params.push(`%${search}%`);
    where.push(`(name ILIKE $${params.length} OR inventory_code ILIKE $${params.length}
                 OR ip_address ILIKE $${params.length} OR model ILIKE $${params.length})`);
  }

  const result = await db.query(`
    SELECT * FROM v_assets_live
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY risk_score_live DESC, end_of_support ASC NULLS LAST
  `, params);
  res.json(result.rows);
}));

/** Distinct values, for populating the inventory filter dropdowns. */
app.get('/api/assets/filters', route(async (req, res) => {
  const result = await db.query(`
    SELECT
      ARRAY(SELECT DISTINCT site FROM v_assets_live WHERE site IS NOT NULL ORDER BY site) AS sites,
      ARRAY(SELECT DISTINCT type FROM v_assets_live WHERE type IS NOT NULL ORDER BY type) AS types,
      ARRAY(SELECT DISTINCT status FROM v_assets_live WHERE status IS NOT NULL ORDER BY status) AS statuses,
      ARRAY(SELECT DISTINCT criticality FROM v_assets_live WHERE criticality IS NOT NULL ORDER BY criticality) AS criticalities
  `);
  res.json(result.rows[0]);
}));

// =====================================================================
// EXECUTIVE DASHBOARD
// =====================================================================
app.get('/api/strategic/dashboard/executive', route(async (req, res) => {
  const summary = await db.query(`
    SELECT
      COUNT(*)::int AS total_assets,
      COUNT(*) FILTER (WHERE status_live = 'RED')::int     AS red_count,
      COUNT(*) FILTER (WHERE status_live = 'ORANGE')::int  AS orange_count,
      COUNT(*) FILTER (WHERE status_live = 'YELLOW')::int  AS yellow_count,
      COUNT(*) FILTER (WHERE status_live = 'GREEN')::int   AS green_count,
      COUNT(*) FILTER (WHERE status_live = 'UNKNOWN')::int AS unknown_count,
      COUNT(*) FILTER (WHERE is_at_risk_live)::int          AS at_risk_count,
      COUNT(*) FILTER (WHERE requires_replacement_live)::int AS needs_replacement_count,
      COALESCE(SUM(estimated_replacement_cost), 0)::numeric AS total_replacement_exposure,
      COALESCE(SUM(estimated_replacement_cost)
               FILTER (WHERE requires_replacement_live), 0)::numeric AS immediate_budget_required,
      COALESCE(ROUND(AVG(risk_score_live), 1), 0)::numeric  AS avg_risk_score,
      COUNT(*) FILTER (WHERE cost_is_estimated)::int        AS estimated_cost_rows
    FROM v_assets_live
  `);

  const byType = await db.query(`
    SELECT type,
           COUNT(*)::int AS count,
           COUNT(*) FILTER (WHERE status_live = 'RED')::int AS red_count,
           COUNT(*) FILTER (WHERE is_at_risk_live)::int     AS at_risk,
           COALESCE(SUM(estimated_replacement_cost), 0)::numeric AS value
    FROM v_assets_live
    GROUP BY type
    ORDER BY at_risk DESC, count DESC
  `);

  const bySite = await db.query(`
    SELECT site,
           COUNT(*)::int AS count,
           COUNT(*) FILTER (WHERE status_live = 'RED')::int AS red_count,
           COALESCE(ROUND(AVG(risk_score_live), 1), 0)::numeric AS avg_risk
    FROM v_assets_live
    GROUP BY site
    ORDER BY red_count DESC, count DESC
    LIMIT 12
  `);

  const topAtRisk = await db.query(`
    SELECT id, inventory_code, name, type, site, criticality, status_live,
           risk_score_live, risk_time_component, risk_criticality_component,
           end_of_support, days_until_eos, estimated_replacement_cost, cost_is_estimated
    FROM v_assets_live
    WHERE risk_score_live > 0
    ORDER BY risk_score_live DESC, end_of_support ASC NULLS LAST
    LIMIT 20
  `);

  res.json({
    summary: summary.rows[0] || {},
    by_type: byType.rows,
    by_site: bySite.rows,
    top_at_risk_assets: topAtRisk.rows
  });
}));

// =====================================================================
// RISK HEAT MAP — type x criticality, with the worst status per cell
// =====================================================================
app.get('/api/strategic/dashboard/risk-heatmap', route(async (req, res) => {
  const result = await db.query(`
    SELECT type, criticality,
           COUNT(*)::int AS count,
           COUNT(*) FILTER (WHERE status_live = 'RED')::int    AS red,
           COUNT(*) FILTER (WHERE status_live = 'ORANGE')::int AS orange,
           COUNT(*) FILTER (WHERE status_live = 'YELLOW')::int AS yellow,
           COUNT(*) FILTER (WHERE status_live = 'GREEN')::int  AS green,
           COALESCE(ROUND(AVG(risk_score_live), 0), 0)::int    AS avg_risk_score,
           COALESCE(SUM(estimated_replacement_cost), 0)::numeric AS total_value
    FROM v_assets_live
    GROUP BY type, criticality
    ORDER BY type, criticality
  `);
  res.json(result.rows);
}));

// =====================================================================
// BUDGET FORECAST — multi-year renewal plan, by year and quarter
// =====================================================================
app.get('/api/strategic/dashboard/budget-forecast', route(async (req, res) => {
  const byYear = await db.query(`
    SELECT plan_year AS year,
           COUNT(*)::int AS count,
           COALESCE(SUM(estimated_replacement_cost), 0)::numeric AS cost,
           COUNT(*) FILTER (WHERE criticality IN ('Critical','Critique'))::int AS critical_count
    FROM v_assets_live
    WHERE plan_year IS NOT NULL
    GROUP BY plan_year
    ORDER BY plan_year
  `);

  const byYearType = await db.query(`
    SELECT plan_year AS year, type,
           COUNT(*)::int AS count,
           COALESCE(SUM(estimated_replacement_cost), 0)::numeric AS cost
    FROM v_assets_live
    WHERE plan_year IS NOT NULL
    GROUP BY plan_year, type
    ORDER BY plan_year, type
  `);

  const overdue = await db.query(`
    SELECT COUNT(*)::int AS count,
           COALESCE(SUM(estimated_replacement_cost), 0)::numeric AS cost
    FROM v_assets_live
    WHERE end_of_support < CURRENT_DATE
  `);

  res.json({
    by_year: byYear.rows,
    by_year_type: byYearType.rows,
    overdue: overdue.rows[0],
    currency: 'TND',
    note: 'Costs are estimates from the published replacement-cost catalogue.'
  });
}));

// =====================================================================
// REPLACEMENT ROADMAP — month by month over the next 36 months
// =====================================================================
app.get('/api/strategic/dashboard/replacement-roadmap', route(async (req, res) => {
  const result = await db.query(`
    SELECT TO_CHAR(DATE_TRUNC('month', COALESCE(replacement_date, end_of_support)), 'YYYY-MM') AS month,
           COUNT(*)::int AS count,
           COUNT(*) FILTER (WHERE criticality IN ('Critical','Critique'))::int AS critical_count,
           COUNT(*) FILTER (WHERE criticality IN ('High','Élevée'))::int      AS high_count,
           COALESCE(SUM(estimated_replacement_cost), 0)::numeric AS total_value
    FROM v_assets_live
    WHERE COALESCE(replacement_date, end_of_support) IS NOT NULL
      AND COALESCE(replacement_date, end_of_support) >= CURRENT_DATE - INTERVAL '12 months'
      AND COALESCE(replacement_date, end_of_support) <= CURRENT_DATE + INTERVAL '36 months'
    GROUP BY 1
    ORDER BY 1
  `);
  res.json(result.rows);
}));

// =====================================================================
// LIFECYCLE ANALYSIS — distribution across the six BIAT stages
// =====================================================================
app.get('/api/strategic/dashboard/lifecycle-analysis', route(async (req, res) => {
  const result = await db.query(`
    SELECT lifecycle_stage_live AS lifecycle_stage,
           COUNT(*)::int AS count,
           COALESCE(SUM(estimated_replacement_cost), 0)::numeric AS total_value,
           COALESCE(ROUND(AVG(risk_score_live), 1), 0)::numeric  AS avg_risk_score
    FROM v_assets_live
    GROUP BY lifecycle_stage_live
  `);

  // Always return all six stages, in order, so the chart never has holes.
  const ORDER = [
    'Exploitation', 'Maintenance', 'Fin de support constructeur',
    'Obsolescence', 'Remplacement', 'Sortie du patrimoine'
  ];
  const found = new Map(result.rows.map((r) => [r.lifecycle_stage, r]));
  res.json(ORDER.map((stage) => found.get(stage) || {
    lifecycle_stage: stage, count: 0, total_value: 0, avg_risk_score: 0
  }));
}));

// =====================================================================
// FINANCIAL SUMMARY — by cost centre / budget code
// =====================================================================
app.get('/api/strategic/dashboard/financial-summary', route(async (req, res) => {
  const byBudget = await db.query(`
    SELECT COALESCE(budget_code, 'NON AFFECTÉ') AS cost_center,
           COUNT(*)::int AS asset_count,
           COALESCE(SUM(estimated_replacement_cost), 0)::numeric AS total_value,
           COALESCE(ROUND(AVG(estimated_replacement_cost), 0), 0)::numeric AS avg_value,
           COALESCE(SUM(estimated_replacement_cost)
                    FILTER (WHERE requires_replacement_live), 0)::numeric AS replacement_budget_needed
    FROM v_assets_live
    GROUP BY 1
    ORDER BY replacement_budget_needed DESC, total_value DESC
  `);

  const byType = await db.query(`
    SELECT type,
           COUNT(*)::int AS asset_count,
           COALESCE(SUM(estimated_replacement_cost), 0)::numeric AS total_value,
           COALESCE(SUM(estimated_replacement_cost)
                    FILTER (WHERE requires_replacement_live), 0)::numeric AS replacement_budget_needed
    FROM v_assets_live
    GROUP BY type
    ORDER BY total_value DESC
  `);

  const totals = await db.query(`
    SELECT COALESCE(SUM(estimated_replacement_cost), 0)::numeric AS portfolio_value,
           COALESCE(SUM(purchase_price), 0)::numeric AS known_acquisition_value,
           COUNT(*) FILTER (WHERE purchase_price IS NOT NULL)::int AS rows_with_real_price,
           COUNT(*)::int AS total_rows
    FROM v_assets_live
  `);

  res.json({
    by_cost_center: byBudget.rows,
    by_type: byType.rows,
    totals: totals.rows[0],
    currency: 'TND'
  });
}));

app.listen(PORT, () => {
  console.log(`\n  BIAT IT Asset Management API`);
  console.log(`  Listening on http://localhost:${PORT}`);
  console.log(`  Health check: http://localhost:${PORT}/api/health\n`);
});

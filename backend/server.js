const express = require('express');
const cors = require('cors');
const db = require('./db');
const { importExcelAssets } = require('./importHandler');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Create uploads folder
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const upload = multer({ 
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls', '.csv'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel/CSV files allowed'));
    }
  }
});

// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// ===== IMPORT =====
app.post('/api/import/excel', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const result = await importExcelAssets(req.file.path);
    fs.unlinkSync(req.file.path);
    res.json({
      success: true,
      imported: result.imported,
      total: result.total,
      errors: result.errors,
      message: `Successfully imported ${result.imported}/${result.total} assets`
    });
  } catch (err) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(400).json({ error: err.message });
  }
});

// ===== GET ALL ASSETS =====
app.get('/api/assets', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM assets ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== EXECUTIVE DASHBOARD =====
app.get('/api/strategic/dashboard/executive', async (req, res) => {
  try {
    // Summary stats
    const summary = await db.query(`
      SELECT 
        COUNT(*) as total_assets,
        COALESCE(SUM(CASE WHEN obsolescence_status = 'RED' THEN 1 ELSE 0 END), 0) as red_count,
        COALESCE(SUM(CASE WHEN obsolescence_status = 'ORANGE' THEN 1 ELSE 0 END), 0) as orange_count,
        COALESCE(SUM(CASE WHEN obsolescence_status = 'YELLOW' THEN 1 ELSE 0 END), 0) as yellow_count,
        COALESCE(SUM(CASE WHEN obsolescence_status = 'GREEN' THEN 1 ELSE 0 END), 0) as green_count,
        COALESCE(SUM(CASE WHEN is_at_risk = true THEN 1 ELSE 0 END), 0) as at_risk_count,
        COALESCE(SUM(CASE WHEN requires_replacement = true THEN 1 ELSE 0 END), 0) as needs_replacement_count,
        COALESCE(SUM(purchase_price), 0) as total_asset_value
      FROM assets
    `);

    // At-risk by type
    const at_risk_by_type = await db.query(`
      SELECT type, COUNT(*) as count, COALESCE(SUM(purchase_price), 0) as value
      FROM assets
      WHERE is_at_risk = true
      GROUP BY type
      ORDER BY count DESC
    `);

    // Top 20 at-risk assets
    const top_at_risk = await db.query(`
      SELECT id, inventory_code, name, type, site, criticality, obsolescence_status, 
             risk_score, end_of_support, purchase_price
      FROM assets
      WHERE is_at_risk = true
      ORDER BY risk_score DESC
      LIMIT 20
    `);

    res.json({
      summary: summary.rows[0] || {},
      at_risk_by_type: at_risk_by_type.rows || [],
      top_at_risk_assets: top_at_risk.rows || []
    });
  } catch (err) {
    console.error('Executive error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== RISK HEATMAP =====
app.get('/api/strategic/dashboard/risk-heatmap', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT type, criticality, obsolescence_status, COUNT(*) as count, 
             COALESCE(SUM(purchase_price), 0) as total_value, 
             COALESCE(AVG(risk_score), 0) as avg_risk_score
      FROM assets
      GROUP BY type, criticality, obsolescence_status
      ORDER BY type, criticality, obsolescence_status
    `);
    res.json(result.rows || []);
  } catch (err) {
    console.error('Risk heatmap error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== BUDGET FORECAST =====
app.get('/api/strategic/dashboard/budget-forecast', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        TO_CHAR(replacement_date, 'YYYY-Q') as quarter,
        type,
        COUNT(*) as count,
        COALESCE(SUM(purchase_price), 0) as estimated_replacement_cost
      FROM assets
      WHERE replacement_date IS NOT NULL
      GROUP BY quarter, type
      ORDER BY quarter, type
    `);
    res.json(result.rows || []);
  } catch (err) {
    console.error('Budget forecast error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== REPLACEMENT ROADMAP =====
app.get('/api/strategic/dashboard/replacement-roadmap', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        TO_CHAR(replacement_date, 'YYYY-MM') as month,
        COUNT(*) as count,
        COALESCE(SUM(CASE WHEN criticality IN ('Critical', 'Critique') THEN 1 ELSE 0 END), 0) as critical_count,
        COALESCE(SUM(CASE WHEN criticality IN ('High', 'Élevée') THEN 1 ELSE 0 END), 0) as high_count,
        COALESCE(SUM(purchase_price), 0) as total_value
      FROM assets
      WHERE replacement_date IS NOT NULL
      GROUP BY month
      ORDER BY month
    `);
    res.json(result.rows || []);
  } catch (err) {
    console.error('Replacement roadmap error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== LIFECYCLE ANALYSIS =====
app.get('/api/strategic/dashboard/lifecycle-analysis', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        lifecycle_stage,
        COUNT(*) as count,
        COALESCE(SUM(purchase_price), 0) as total_value,
        COALESCE(AVG(risk_score), 0) as avg_risk_score
      FROM assets
      GROUP BY lifecycle_stage
      ORDER BY lifecycle_stage
    `);
    res.json(result.rows || []);
  } catch (err) {
    console.error('Lifecycle analysis error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== FINANCIAL SUMMARY =====
app.get('/api/strategic/dashboard/financial-summary', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        budget_code as cost_center,
        type,
        COUNT(*) as asset_count,
        COALESCE(SUM(purchase_price), 0) as total_value,
        COALESCE(AVG(purchase_price), 0) as avg_value,
        COALESCE(SUM(CASE WHEN requires_replacement = true THEN purchase_price ELSE 0 END), 0) as replacement_budget_needed
      FROM assets
      GROUP BY budget_code, type
      ORDER BY budget_code, type
    `);
    res.json(result.rows || []);
  } catch (err) {
    console.error('Financial summary error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`✓ Health: http://localhost:${PORT}/api/health`);
  console.log(`✓ Assets: http://localhost:${PORT}/api/assets`);
  console.log(`✓ Executive: http://localhost:${PORT}/api/strategic/dashboard/executive\n`);
});

// ===== IMPORT HISTORY =====
app.get('/api/import/history', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, original_filename, file_size, total_rows, imported_rows, failed_rows, 
             errors, import_date
      FROM import_history
      ORDER BY import_date DESC
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/import/history/:id', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM import_history WHERE id = $1
    `, [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

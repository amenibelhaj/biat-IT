-- BIAT IT ASSET LIFECYCLE & OBSOLESCENCE MANAGEMENT SYSTEM
-- Complete schema per RADHIA requirements

-- =====================
-- ORGANIZATIONS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  type VARCHAR(50), -- 'client', 'supplier', 'internal'
  contact_email VARCHAR(100),
  contact_phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- OS FAMILIES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS os_families (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50), -- 'OS', 'Database', 'Security', 'Networking'
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- COST CENTERS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS cost_centers (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  department VARCHAR(100),
  budget_owner VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- IMPORT HISTORY TABLE
-- =====================
CREATE TABLE IF NOT EXISTS import_history (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255),
  original_filename VARCHAR(255),
  file_size INTEGER,
  total_rows INTEGER,
  imported_rows INTEGER,
  failed_rows INTEGER,
  errors TEXT[],
  import_date TIMESTAMP DEFAULT NOW()
);

-- =====================
-- ASSETS TABLE (MAIN)
-- =====================
CREATE TABLE IF NOT EXISTS assets (
  -- Identifiers
  id SERIAL PRIMARY KEY,
  inventory_code VARCHAR(100) UNIQUE NOT NULL,
  
  -- General Information
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100), -- 'Server', 'Firewall', 'Switch', 'Router', 'Storage', 'Access Point', etc.
  description TEXT,
  
  -- Location & Organization
  site VARCHAR(100),
  organization_id INTEGER REFERENCES organizations(id),
  
  -- Hardware Details
  brand VARCHAR(100),
  model VARCHAR(100),
  serial_number VARCHAR(100),
  ip_address VARCHAR(50),
  
  -- Status & Criticality
  status VARCHAR(50), -- 'Production', 'Test', 'Secours', 'Hors service'
  criticality VARCHAR(50), -- 'Critical', 'High', 'Medium', 'Low'
  
  -- Technical Information
  os_version VARCHAR(100),
  os_family_id INTEGER REFERENCES os_families(id),
  
  -- Suppliers & Clients
  supplier_id INTEGER REFERENCES organizations(id),
  client_id INTEGER REFERENCES organizations(id),
  
  -- ==================
  -- LIFECYCLE DATES
  -- ==================
  
  -- Acquisition & Deployment
  acquisition_date DATE,
  production_start_date DATE,
  
  -- Support Lifecycle
  warranty_end_date DATE,
  end_of_maintenance DATE,
  end_of_sales DATE,
  end_of_support DATE,
  end_of_software_support DATE,
  
  -- Planned Replacement
  replacement_date DATE,
  
  -- ==================
  -- FINANCIAL DATA
  -- ==================
  purchase_price DECIMAL(12, 2),
  depreciation_duration INTEGER, -- months
  cost_center_id INTEGER REFERENCES cost_centers(id),
  budget_code VARCHAR(50),
  
  -- ==================
  -- LIFECYCLE & RISK
  -- ==================
  
  -- Lifecycle Stage: Exploitation -> Maintenance -> End of Support -> Obsolescence -> Replacement -> Sortie Patrimoine
  lifecycle_stage VARCHAR(50) DEFAULT 'Exploitation',
  
  -- Obsolescence Status (auto-calculated)
  obsolescence_status VARCHAR(20), -- 'GREEN', 'YELLOW', 'ORANGE', 'RED'
  days_until_end_of_support INTEGER, -- calculated field
  risk_score INTEGER, -- 0-100 (auto-calculated based on EoS + criticality)
  
  -- Flags
  is_at_risk BOOLEAN DEFAULT FALSE,
  requires_replacement BOOLEAN DEFAULT FALSE,
  is_deprecated BOOLEAN DEFAULT FALSE,
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  
  -- Notes
  notes TEXT
);

-- =====================
-- REPLACEMENT PLAN TABLE
-- =====================
CREATE TABLE IF NOT EXISTS replacement_plans (
  id SERIAL PRIMARY KEY,
  asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  planned_replacement_date DATE NOT NULL,
  estimated_cost DECIMAL(12, 2),
  replacement_vendor_id INTEGER REFERENCES organizations(id),
  priority VARCHAR(50), -- 'Critical', 'High', 'Medium', 'Low'
  status VARCHAR(50), -- 'Planned', 'Approved', 'In Progress', 'Completed'
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- INDEXES
-- =====================
CREATE INDEX IF NOT EXISTS idx_assets_inventory_code ON assets(inventory_code);
CREATE INDEX IF NOT EXISTS idx_assets_end_of_support ON assets(end_of_support);
CREATE INDEX IF NOT EXISTS idx_assets_obsolescence_status ON assets(obsolescence_status);
CREATE INDEX IF NOT EXISTS idx_assets_lifecycle_stage ON assets(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_assets_site ON assets(site);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);
CREATE INDEX IF NOT EXISTS idx_assets_criticality ON assets(criticality);
CREATE INDEX IF NOT EXISTS idx_assets_is_at_risk ON assets(is_at_risk);
CREATE INDEX IF NOT EXISTS idx_assets_requires_replacement ON assets(requires_replacement);
CREATE INDEX IF NOT EXISTS idx_replacement_plans_asset_id ON replacement_plans(asset_id);
CREATE INDEX IF NOT EXISTS idx_replacement_plans_status ON replacement_plans(status);

-- =====================
-- VIEWS FOR REPORTING
-- =====================

-- Dashboard Summary View
CREATE OR REPLACE VIEW v_dashboard_summary AS
SELECT 
  COUNT(*) as total_assets,
  SUM(CASE WHEN obsolescence_status = 'RED' THEN 1 ELSE 0 END) as red_count,
  SUM(CASE WHEN obsolescence_status = 'ORANGE' THEN 1 ELSE 0 END) as orange_count,
  SUM(CASE WHEN obsolescence_status = 'YELLOW' THEN 1 ELSE 0 END) as yellow_count,
  SUM(CASE WHEN obsolescence_status = 'GREEN' THEN 1 ELSE 0 END) as green_count,
  SUM(CASE WHEN is_at_risk = TRUE THEN 1 ELSE 0 END) as at_risk_count,
  SUM(CASE WHEN requires_replacement = TRUE THEN 1 ELSE 0 END) as needs_replacement_count
FROM assets
WHERE is_deprecated = FALSE;

-- Risk Analysis View
CREATE OR REPLACE VIEW v_risk_analysis AS
SELECT 
  a.id,
  a.inventory_code,
  a.name,
  a.type,
  a.site,
  a.criticality,
  a.obsolescence_status,
  a.risk_score,
  a.end_of_support,
  a.days_until_end_of_support,
  o.name as organization,
  cc.name as cost_center
FROM assets a
LEFT JOIN organizations o ON a.organization_id = o.id
LEFT JOIN cost_centers cc ON a.cost_center_id = cc.id
WHERE a.is_at_risk = TRUE
ORDER BY a.risk_score DESC, a.end_of_support ASC;

-- Financial Summary View
CREATE OR REPLACE VIEW v_financial_summary AS
SELECT 
  a.type,
  COUNT(*) as asset_count,
  SUM(a.purchase_price) as total_purchase_value,
  AVG(a.purchase_price) as avg_purchase_price,
  cc.name as cost_center,
  SUM(CASE WHEN a.requires_replacement THEN a.purchase_price ELSE 0 END) as replacement_budget_needed
FROM assets a
LEFT JOIN cost_centers cc ON a.cost_center_id = cc.id
WHERE a.is_deprecated = FALSE
GROUP BY a.type, cc.name;

-- Replacement Roadmap View (Next 36 months)
CREATE OR REPLACE VIEW v_replacement_roadmap AS
SELECT 
  DATE_TRUNC('quarter', a.end_of_support)::DATE as quarter,
  a.type,
  COUNT(*) as assets_expiring,
  SUM(a.purchase_price) as estimated_replacement_cost,
  a.criticality
FROM assets a
WHERE a.end_of_support > NOW() 
  AND a.end_of_support < NOW() + INTERVAL '36 months'
  AND a.is_deprecated = FALSE
GROUP BY DATE_TRUNC('quarter', a.end_of_support), a.type, a.criticality
ORDER BY quarter ASC;

-- Lifecycle Distribution View
CREATE OR REPLACE VIEW v_lifecycle_distribution AS
SELECT 
  a.lifecycle_stage,
  COUNT(*) as count,
  SUM(a.purchase_price) as total_value
FROM assets a
WHERE a.is_deprecated = FALSE
GROUP BY a.lifecycle_stage
ORDER BY a.lifecycle_stage;

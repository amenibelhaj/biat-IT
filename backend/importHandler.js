const xlsx = require('xlsx');
const db = require('./db');

async function importExcelAssets(filePath, originalFilename, fileSize) {
  try {
    console.log(`\n📖 Reading Excel file: ${originalFilename}`);
    
    const workbook = xlsx.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(worksheet);

    console.log(`✓ Read ${data.length} rows from Excel`);

    if (data.length === 0) {
      throw new Error('Excel file is empty');
    }

    await db.query('TRUNCATE TABLE assets RESTART IDENTITY CASCADE');
    console.log('✓ Cleared old asset data');

    let imported = 0;
    let errors = [];

    for (const [idx, row] of data.entries()) {
      try {
        const asset = {
          inventory_code: row['Numéro Asset'] || `AUTO-${idx}`,
          name: row['Nom'] || 'Unknown',
          type: row['Description'] || 'Unknown',
          site: row['Site->Nom'] || 'Unknown',
          brand: row['Marque->Nom'] || 'Unknown',
          model: row['Modèle->Nom'] || 'Unknown',
          serial_number: row['Numéro de série'] || 'N/A',
          ip_address: row['IP'] || null,
          status: normalizeStatus(row['Statut'] || 'en service'),
          criticality: normalizeCriticality(row['Criticité'] || 'Medium'),
          os_version: null,
          acquisition_date: parseDate(row['Date d\'achat']),
          production_start_date: parseDate(row['Date de mise en production']),
          warranty_end_date: parseDate(row['Date de fin de garantie']),
          end_of_sales: parseDate(row['end-of-sales']),
          end_of_maintenance: parseDate(row['end-of-maintenance']),
          end_of_support: parseDate(row['end-of-support']),
          end_of_software_support: null,
          purchase_price: getPriceByType(row['Description']) || 0,
          depreciation_duration: 36,
          budget_code: 'GENERAL'
        };

        if (!asset.end_of_support) {
          throw new Error('Missing End of Support date');
        }

        // Calculate obsolescence
        const eosDate = new Date(asset.end_of_support);
        const today = new Date();
        const daysUntilEos = Math.floor((eosDate - today) / (1000 * 60 * 60 * 24));

        let obsolescenceStatus = 'GREEN';
        if (daysUntilEos < 0) obsolescenceStatus = 'RED';
        else if (daysUntilEos < 180) obsolescenceStatus = 'ORANGE';
        else if (daysUntilEos < 365) obsolescenceStatus = 'YELLOW';

        // AUTO-CALCULATE replacement_date based on obsolescence
        let replacementDate = null;
        const today2 = new Date();
        
        if (obsolescenceStatus === 'RED') {
          const nextMonth = new Date(today2.getFullYear(), today2.getMonth() + 1, 1);
          replacementDate = nextMonth.toISOString().split('T')[0];
        } else if (obsolescenceStatus === 'ORANGE') {
          const in3Months = new Date(today2.getFullYear(), today2.getMonth() + 4, 1);
          replacementDate = in3Months.toISOString().split('T')[0];
        } else if (obsolescenceStatus === 'YELLOW') {
          const in9Months = new Date(today2.getFullYear(), today2.getMonth() + 9, 1);
          replacementDate = in9Months.toISOString().split('T')[0];
        } else {
          const in2Years = new Date(today2.getFullYear() + 2, today2.getMonth(), 1);
          replacementDate = in2Years.toISOString().split('T')[0];
        }

        // Calculate lifecycle stage
        let lifecycleStage = 'Exploitation';
        if (obsolescenceStatus === 'RED') lifecycleStage = 'Obsolescence';
        else if (obsolescenceStatus === 'ORANGE') lifecycleStage = 'End of Support';
        else if (obsolescenceStatus === 'YELLOW') lifecycleStage = 'Maintenance';

        // Calculate risk score
        let riskScore = 10;
        if (daysUntilEos < 0) riskScore = 100;
        else if (daysUntilEos < 30) riskScore = 90;
        else if (daysUntilEos < 90) riskScore = 75;
        else if (daysUntilEos < 180) riskScore = 50;
        else if (daysUntilEos < 365) riskScore = 25;

        const criticalityMap = {
          'critique': 2.0, 'Critical': 2.0,
          'Élevée': 1.5, 'High': 1.5,
          'Moyen': 1.0, 'Medium': 1.0,
          'Faible': 0.5, 'Low': 0.5
        };

        const multiplier = criticalityMap[asset.criticality] || 1.0;
        riskScore = Math.min(100, riskScore * multiplier);

        const isAtRisk = (obsolescenceStatus === 'RED' || obsolescenceStatus === 'ORANGE') 
          && (asset.criticality === 'Critical' || asset.criticality === 'Critique');

        const requiresReplacement = obsolescenceStatus === 'RED';

        // Insert
        await db.query(
          `INSERT INTO assets 
           (inventory_code, name, type, site, brand, model, serial_number, ip_address,
            status, criticality, os_version, acquisition_date, production_start_date, 
            warranty_end_date, end_of_maintenance, end_of_sales, end_of_support, 
            end_of_software_support, replacement_date, purchase_price, depreciation_duration, budget_code,
            lifecycle_stage, obsolescence_status, days_until_end_of_support, risk_score,
            is_at_risk, requires_replacement, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, NOW(), NOW())`,
          [
            asset.inventory_code, asset.name, asset.type, asset.site, asset.brand, asset.model,
            asset.serial_number, asset.ip_address, asset.status, asset.criticality, asset.os_version,
            asset.acquisition_date, asset.production_start_date, asset.warranty_end_date,
            asset.end_of_maintenance, asset.end_of_sales, asset.end_of_support, asset.end_of_software_support,
            replacementDate, asset.purchase_price, asset.depreciation_duration,
            asset.budget_code, lifecycleStage, obsolescenceStatus, daysUntilEos,
            Math.round(riskScore), isAtRisk, requiresReplacement
          ]
        );

        imported++;
        console.log(`  ✓ Row ${idx + 1}: ${asset.name} (${obsolescenceStatus}) → ${replacementDate}`);
      } catch (err) {
        errors.push(`Row ${idx + 1}: ${err.message}`);
      }
    }

    const historyResult = await db.query(
      `INSERT INTO import_history 
       (filename, original_filename, file_size, total_rows, imported_rows, failed_rows, errors, import_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id`,
      [
        `import-${Date.now()}.xlsx`,
        originalFilename,
        fileSize,
        data.length,
        imported,
        errors.length,
        errors.length > 0 ? errors : null
      ]
    );

    console.log(`\n✅ Import complete: ${imported}/${data.length} assets\n`);
    return { imported, errors, total: data.length };
  } catch (err) {
    console.error('❌ Import failed:', err.message);
    throw new Error(`Failed to import Excel: ${err.message}`);
  }
}

function normalizeStatus(status) {
  const map = {
    'en service': 'Production',
    'production': 'Production',
    'test': 'Test',
    'secours': 'Secours'
  };
  return map[status.toLowerCase().trim()] || 'Production';
}

function normalizeCriticality(crit) {
  const map = {
    'critique': 'Critical',
    'critical': 'Critical',
    'élevée': 'High',
    'high': 'High',
    'moyen': 'Medium',
    'medium': 'Medium',
    'faible': 'Low'
  };
  return map[crit.toLowerCase().trim()] || 'Medium';
}

function parseDate(dateStr) {
  if (!dateStr || dateStr === 'N/A' || dateStr === '') return null;
  try {
    if (typeof dateStr === 'number') {
      if (dateStr > 1900 && dateStr < 2100) return `${dateStr}-01-01`;
      const date = new Date((dateStr - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    const parsed = new Date(String(dateStr).trim());
    return isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0];
  } catch (err) {
    return null;
  }
}

function getPriceByType(desc) {
  if (!desc) return 0;
  const type = desc.toLowerCase();
  const prices = {
    'routeur': 15000,
    'switch': 8000,
    'firewall': 20000,
    'access point': 5000,
    'load balancer': 18000
  };
  for (const [key, price] of Object.entries(prices)) {
    if (type.includes(key)) return price;
  }
  return 10000;
}

module.exports = { importExcelAssets };

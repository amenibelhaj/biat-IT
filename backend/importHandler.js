const xlsx = require('xlsx');
const db = require('./db');

async function importExcelAssets(filePath) {
  try {
    console.log(`\n📖 Reading Excel file: ${filePath}`);
    
    const workbook = xlsx.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(worksheet);

    console.log(`✓ Read ${data.length} rows from Excel`);

    if (data.length === 0) {
      throw new Error('Excel file is empty');
    }

    // Clear old data
    await db.query('TRUNCATE TABLE assets RESTART IDENTITY CASCADE');
    console.log('✓ Cleared old asset data');

    let imported = 0;
    let errors = [];

    for (const [idx, row] of data.entries()) {
      try {
        // Map columns - support BOTH formats (standard and RADHIA's format)
        const asset = {
          inventory_code: row['Numéro Asset'] || row['Code inventaire'] || row['Inventory Code'] || `AUTO-${idx}`,
          name: row['Nom'] || row['Nom de l\'équipement'] || row['Equipment Name'] || 'Unknown',
          type: row['Description'] || row['Type d\'actif'] || row['Asset Type'] || 'Unknown',
          site: row['Site->Nom'] || row['Site d\'implantation'] || row['Site'] || 'Unknown',
          brand: row['Marque->Nom'] || row['Constructeur'] || row['Brand'] || 'Unknown',
          model: row['Modèle->Nom'] || row['Modèle'] || row['Model'] || 'Unknown',
          serial_number: row['Numéro de série'] || row['Serial Number'] || 'N/A',
          ip_address: row['IP'] || row['Adresse IP'] || row['IP Address'] || null,
          status: row['Statut'] || row['Status'] || 'en service',
          criticality: row['Criticité'] || row['Criticality'] || 'Medium',
          os_version: row['Version IOS'] || row['OS Version'] || null,
          acquisition_date: parseDate(row['Date d\'achat'] || row['Acquisition Date']),
          production_start_date: parseDate(row['Date de mise en production'] || row['Production Start Date']),
          warranty_end_date: parseDate(row['Date de fin de garantie'] || row['Warranty End Date']),
          end_of_sales: parseDate(row['end-of-sales'] || row['Date End of Sale'] || row['End of Sales']),
          end_of_maintenance: parseDate(row['end-of-maintenance'] || row['Date fin de maintenance'] || row['End of Maintenance']),
          end_of_support: parseDate(row['end-of-support'] || row['Fin de support constructeur'] || row['End of Support']),
          end_of_software_support: parseDate(row['Fin de support logiciel'] || row['End of Software Support']),
          replacement_date: parseDate(row['Date prévisionnelle de remplacement'] || row['Planned Replacement Date']),
          purchase_price: parsePrice(row['Date d\'achat']) || 0,
          depreciation_duration: 36,
          budget_code: row['Organisation->Nom organisation'] || row['Centre de coût'] || row['Budget'] || 'GENERAL'
        };

        // CRITICAL: Validate End of Support
        if (!asset.end_of_support) {
          throw new Error('Missing End of Support date');
        }

        // Calculate obsolescence status
        const eosDate = new Date(asset.end_of_support);
        const today = new Date();
        const daysUntilEos = Math.floor((eosDate - today) / (1000 * 60 * 60 * 24));

        let obsolescenceStatus = 'GREEN';
        if (daysUntilEos < 0) obsolescenceStatus = 'RED';
        else if (daysUntilEos < 180) obsolescenceStatus = 'ORANGE';
        else if (daysUntilEos < 365) obsolescenceStatus = 'YELLOW';

        // Lifecycle stage
        let lifecycleStage = 'Exploitation';
        if (obsolescenceStatus === 'RED') lifecycleStage = 'Obsolescence';
        else if (obsolescenceStatus === 'ORANGE') lifecycleStage = 'End of Support';
        else if (obsolescenceStatus === 'YELLOW') lifecycleStage = 'Maintenance';

        // Risk score
        let riskScore = 10;
        if (daysUntilEos < 0) riskScore = 100;
        else if (daysUntilEos < 30) riskScore = 90;
        else if (daysUntilEos < 90) riskScore = 75;
        else if (daysUntilEos < 180) riskScore = 50;
        else if (daysUntilEos < 365) riskScore = 25;

        // Criticality multiplier
        const criticalityMap = {
          'critique': 2.0, 'Critical': 2.0, 'Critique': 2.0,
          'Élevée': 1.5, 'High': 1.5,
          'Moyen': 1.0, 'Medium': 1.0,
          'Faible': 0.5, 'Low': 0.5
        };

        const multiplier = criticalityMap[asset.criticality] || 1.0;
        riskScore = Math.min(100, riskScore * multiplier);

        // Normalize criticality for consistency
        let normalizedCriticality = asset.criticality;
        if (asset.criticality === 'critique') normalizedCriticality = 'Critical';
        if (asset.criticality === 'Élevée') normalizedCriticality = 'High';
        if (asset.criticality === 'Moyen') normalizedCriticality = 'Medium';
        if (asset.criticality === 'Faible') normalizedCriticality = 'Low';

        const isAtRisk = (obsolescenceStatus === 'RED' || obsolescenceStatus === 'ORANGE') 
          && (normalizedCriticality === 'Critical' || normalizedCriticality === 'High');

        const requiresReplacement = obsolescenceStatus === 'RED' 
          || (daysUntilEos < 90 && normalizedCriticality === 'Critical');

        // Insert into database
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
            asset.serial_number, asset.ip_address, asset.status, normalizedCriticality, asset.os_version,
            asset.acquisition_date, asset.production_start_date, asset.warranty_end_date,
            asset.end_of_maintenance, asset.end_of_sales, asset.end_of_support, asset.end_of_software_support,
            asset.replacement_date, asset.purchase_price, asset.depreciation_duration,
            asset.budget_code, lifecycleStage, obsolescenceStatus, daysUntilEos,
            Math.round(riskScore), isAtRisk, requiresReplacement
          ]
        );

        imported++;
        console.log(`  ✓ Row ${idx + 1}: ${asset.name} (${obsolescenceStatus}) - ${daysUntilEos} days`);
      } catch (err) {
        errors.push(`Row ${idx + 1}: ${err.message}`);
        console.log(`  ✗ Row ${idx + 1}: ${err.message}`);
      }
    }

    console.log(`\n✅ Import complete: ${imported}/${data.length} assets imported\n`);
    return { imported, errors, total: data.length };
  } catch (err) {
    console.error('❌ Import failed:', err.message);
    throw new Error(`Failed to import Excel: ${err.message}`);
  }
}

function parseDate(dateStr) {
  if (!dateStr || dateStr === 'N/A' || dateStr === '') return null;
  
  try {
    // Handle Excel serial numbers
    if (typeof dateStr === 'number') {
      const date = new Date((dateStr - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    
    // Handle string dates
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) return null;
    
    return parsed.toISOString().split('T')[0];
  } catch (err) {
    return null;
  }
}

function parsePrice(val) {
  if (!val || val === 'N/A') return 0;
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
}

module.exports = { importExcelAssets };

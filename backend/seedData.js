/*
 * Demo data.
 *
 * The BIAT network extract contains only routers and switches, and only
 * RED and GREEN statuses — which leaves several dashboards looking
 * sparse. This seed adds a spread of equipment across all families,
 * criticalities and obsolescence bands so the analysis screens can be
 * demonstrated in full.
 *
 * End-of-support dates are expressed RELATIVE TO TODAY, so the demo
 * always shows a realistic mix no matter when it is run.
 *
 *   node seedData.js           add demo assets to whatever is there
 *   node seedData.js --reset   clear the inventory first
 */

const db = require('./db');
const { estimateReplacementCost } = require('./lib/costCatalog');

/** A date `months` from today, as YYYY-MM-DD. Negative = in the past. */
function monthsFromNow(months) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

//  eosMonths: months until end of manufacturer support (negative = expired)
const DEMO_ASSETS = [
  // --- Expired support (RED) ---
  { name: 'SRV-CORE-BANKING-01', type: 'Server', desc: 'Serveur', site: 'Siège Tunis', brand: 'Dell', model: 'PowerEdge R730', crit: 'Critical', eosMonths: -22, budget: 'DSI-INFRA', os: 'Windows Server 2012 R2' },
  { name: 'FW-PERIMETRE-01', type: 'Firewall', desc: 'Firewall', site: 'Siège Tunis', brand: 'Cisco', model: 'ASA 5525-X', crit: 'Critical', eosMonths: -9, budget: 'DSI-SECURITE', os: 'ASA 9.8' },
  { name: 'SW-AGENCE-SFAX-03', type: 'Switch', desc: 'Switch', site: 'Agence Sfax', brand: 'Cisco', model: 'Catalyst 2960', crit: 'Medium', eosMonths: -31, budget: 'DSI-RESEAU', os: 'IOS 15.0' },

  // --- Under 6 months (ORANGE) ---
  { name: 'SRV-MESSAGERIE-01', type: 'Server', desc: 'Serveur', site: 'Siège Tunis', brand: 'HP', model: 'ProLiant DL380 Gen9', crit: 'Critical', eosMonths: 3, budget: 'DSI-INFRA', os: 'Windows Server 2016' },
  { name: 'RTR-WAN-ARIANA-01', type: 'Router', desc: 'Routeur', site: 'Agence Ariana', brand: 'Cisco', model: 'ISR 4331', crit: 'High', eosMonths: 5, budget: 'DSI-RESEAU', os: 'IOS-XE 16.9' },
  { name: 'LB-FRONTAL-01', type: 'Load Balancer', desc: 'Load Balancer', site: 'Siège Tunis', brand: 'F5', model: 'BIG-IP i2800', crit: 'Critical', eosMonths: 4, budget: 'DSI-INFRA', os: 'TMOS 14.1' },

  // --- Under 12 months (YELLOW) ---
  { name: 'SAN-PRODUCTION-01', type: 'Storage', desc: 'Stockage SAN', site: 'Siège Tunis', brand: 'NetApp', model: 'FAS2750', crit: 'Critical', eosMonths: 9, budget: 'DSI-INFRA', os: 'ONTAP 9.7' },
  { name: 'SW-DISTRIB-CORE-02', type: 'Switch', desc: 'Switch', site: 'Siège Tunis', brand: 'Cisco', model: 'Catalyst 3850', crit: 'High', eosMonths: 11, budget: 'DSI-RESEAU', os: 'IOS-XE 16.12' },
  { name: 'AP-WIFI-SIEGE-12', type: 'Access Point', desc: 'Access Point WIFI', site: 'Siège Tunis', brand: 'Cisco', model: 'Aironet 2802i', crit: 'Low', eosMonths: 8, budget: 'DSI-RESEAU', os: 'IOS 8.10' },

  // --- Comfortably supported (GREEN) ---
  { name: 'SRV-VIRTUALISATION-04', type: 'Server', desc: 'Serveur', site: 'Site secours Ben Arous', brand: 'Dell', model: 'PowerEdge R760', crit: 'Critical', eosMonths: 46, budget: 'DSI-INFRA', os: 'VMware ESXi 8.0' },
  { name: 'FW-DATACENTER-02', type: 'Firewall', desc: 'Firewall', site: 'Site secours Ben Arous', brand: 'Fortinet', model: 'FortiGate 600F', crit: 'Critical', eosMonths: 52, budget: 'DSI-SECURITE', os: 'FortiOS 7.4' },
  { name: 'SW-ACCES-SOUSSE-05', type: 'Switch', desc: 'Switch', site: 'Agence Sousse', brand: 'Huawei', model: 'S5731-H', crit: 'Medium', eosMonths: 38, budget: 'DSI-RESEAU', os: 'VRP V200R021' },
  { name: 'NAS-ARCHIVAGE-01', type: 'Storage', desc: 'Stockage NAS', site: 'Site secours Ben Arous', brand: 'Synology', model: 'RS4021xs+', crit: 'Medium', eosMonths: 41, budget: 'DSI-INFRA', os: 'DSM 7.2' },
  { name: 'RTR-INTERCO-01', type: 'Router', desc: 'Routeur', site: 'Siège Tunis', brand: 'Cisco', model: 'ISR 4451', crit: 'High', eosMonths: 29, budget: 'DSI-RESEAU', os: 'IOS-XE 17.6' },

  // --- Retired from the estate ---
  { name: 'SRV-LEGACY-FICHIER-01', type: 'Server', desc: 'Serveur', site: 'Siège Tunis', brand: 'IBM', model: 'System x3650 M4', crit: 'Low', eosMonths: -48, budget: 'DSI-INFRA', os: 'Windows Server 2008', status: 'Hors service' }
];

async function seed() {
  const reset = process.argv.includes('--reset');
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    if (reset) {
      await client.query('DELETE FROM assets');
      console.log('  Inventory cleared.');
    }

    let n = 0;
    for (const [i, a] of DEMO_ASSETS.entries()) {
      const estimate = estimateReplacementCost(a.desc);
      const eos = monthsFromNow(a.eosMonths);

      await client.query(`
        INSERT INTO assets (
          inventory_code, name, type, description, site, brand, model,
          serial_number, ip_address, status, criticality, os_version,
          acquisition_date, production_start_date, warranty_end_date,
          end_of_sales, end_of_maintenance, end_of_support,
          estimated_replacement_cost, cost_is_estimated, budget_code,
          created_at, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,NOW(),NOW()
        )
        ON CONFLICT (inventory_code) DO UPDATE SET
          end_of_support = EXCLUDED.end_of_support,
          end_of_maintenance = EXCLUDED.end_of_maintenance,
          end_of_sales = EXCLUDED.end_of_sales,
          estimated_replacement_cost = EXCLUDED.estimated_replacement_cost,
          updated_at = NOW()
      `, [
        `DEMO-${String(i + 1).padStart(3, '0')}`,
        a.name, a.type, a.desc, a.site, a.brand, a.model,
        `SN-DEMO-${1000 + i}`,
        `10.${10 + (i % 6)}.${i}.${10 + i}`,
        a.status || 'Production',
        a.crit,
        a.os,
        monthsFromNow(a.eosMonths - 72),   // acquired ~6 years before EoS
        monthsFromNow(a.eosMonths - 70),
        monthsFromNow(a.eosMonths - 24),   // warranty ends 2 years before EoS
        monthsFromNow(a.eosMonths - 60),   // end of sale
        monthsFromNow(a.eosMonths - 12),   // end of maintenance
        eos,
        estimate.cost,
        true,
        a.budget
      ]);
      n++;
    }

    await client.query('COMMIT');
    console.log(`  ${n} demo assets loaded.`);
    console.log('  Obsolescence status is derived live from these dates by v_assets_live.');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('  Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

seed();

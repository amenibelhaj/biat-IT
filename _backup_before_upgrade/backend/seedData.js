const db = require('./db');

const mockAssets = [
  {
    inventory_code: 'AST-001',
    name: 'Server-Prod-01',
    type: 'Server',
    site: 'Tunis',
    brand: 'Dell',
    model: 'PowerEdge R750',
    serial_number: 'DELL-SN001',
    ip_address: '192.168.1.100',
    status: 'Production',
    criticality: 'Critical',
    os_version: 'Windows Server 2019',
    os_family_id: null,
    supplier_id: null,
    client_id: null,
    acquisition_date: '2021-10-13',
    production_start_date: '2021-10-13',
    warranty_end_date: '2025-10-13',
    end_of_maintenance: '2026-09-13',
    end_of_sales: '2023-01-01',
    end_of_support: '2026-10-13',
    end_of_software_support: null,
    replacement_date: '2026-12-01',
    purchase_price: 5000,
    depreciation_duration: 36,
    cost_center_id: null,
    budget_code: 'IT-001',
    lifecycle_stage: 'Exploitation',
    notes: 'Production server - monitor closely'
  },
  {
    inventory_code: 'AST-002',
    name: 'Firewall-Tunis-01',
    type: 'Firewall',
    site: 'Tunis',
    brand: 'Cisco',
    model: 'ASA 5520',
    serial_number: 'CISCO-FW001',
    ip_address: '10.0.0.1',
    status: 'Production',
    criticality: 'Critical',
    os_version: 'IOS 9.6',
    os_family_id: null,
    supplier_id: null,
    client_id: null,
    acquisition_date: '2021-11-01',
    production_start_date: '2021-11-01',
    warranty_end_date: '2025-11-01',
    end_of_maintenance: '2026-10-01',
    end_of_sales: '2022-06-01',
    end_of_support: '2026-11-01',
    end_of_software_support: null,
    replacement_date: '2027-01-01',
    purchase_price: 8000,
    depreciation_duration: 36,
    cost_center_id: null,
    budget_code: 'SECURITY-001',
    lifecycle_stage: 'Exploitation',
    notes: 'Core network security - CRITICAL'
  },
  {
    inventory_code: 'AST-003',
    name: 'Switch-Layer3-01',
    type: 'Switch',
    site: 'Ariana',
    brand: 'Cisco',
    model: 'Catalyst 3850',
    serial_number: 'CISCO-SW001',
    ip_address: '10.0.0.2',
    status: 'Production',
    criticality: 'High',
    os_version: 'IOS 16.12',
    os_family_id: null,
    supplier_id: null,
    client_id: null,
    acquisition_date: '2020-06-01',
    production_start_date: '2020-06-01',
    warranty_end_date: '2024-06-01',
    end_of_maintenance: '2025-05-01',
    end_of_sales: '2021-01-01',
    end_of_support: '2025-06-01',
    end_of_software_support: null,
    replacement_date: '2025-08-01',
    purchase_price: 6000,
    depreciation_duration: 36,
    cost_center_id: null,
    budget_code: 'NETWORK-001',
    lifecycle_stage: 'Maintenance',
    notes: 'Aging - plan replacement'
  },
  {
    inventory_code: 'AST-004',
    name: 'LoadBalancer-01',
    type: 'Load Balancer',
    site: 'Tunis',
    brand: 'F5',
    model: 'BIG-IP 3900',
    serial_number: 'F5-LB001',
    ip_address: '10.0.0.3',
    status: 'Production',
    criticality: 'Critical',
    os_version: '13.1',
    os_family_id: null,
    supplier_id: null,
    client_id: null,
    acquisition_date: '2022-05-01',
    production_start_date: '2022-05-01',
    warranty_end_date: '2026-05-01',
    end_of_maintenance: '2027-04-01',
    end_of_sales: '2023-05-01',
    end_of_support: '2027-05-01',
    end_of_software_support: null,
    replacement_date: null,
    purchase_price: 12000,
    depreciation_duration: 36,
    cost_center_id: null,
    budget_code: 'IT-002',
    lifecycle_stage: 'Exploitation',
    notes: 'New - good condition'
  },
  {
    inventory_code: 'AST-005',
    name: 'Storage-SAN-01',
    type: 'Storage',
    site: 'Tunis',
    brand: 'NetApp',
    model: 'FAS2720',
    serial_number: 'NETAPP-ST001',
    ip_address: '10.0.0.4',
    status: 'Production',
    criticality: 'Critical',
    os_version: 'ONTAP 9.8',
    os_family_id: null,
    supplier_id: null,
    client_id: null,
    acquisition_date: '2022-12-31',
    production_start_date: '2022-12-31',
    warranty_end_date: '2026-12-31',
    end_of_maintenance: '2027-11-30',
    end_of_sales: '2023-12-31',
    end_of_support: '2027-12-31',
    end_of_software_support: null,
    replacement_date: null,
    purchase_price: 15000,
    depreciation_duration: 36,
    cost_center_id: null,
    budget_code: 'STORAGE-001',
    lifecycle_stage: 'Exploitation',
    notes: 'Critical data storage'
  },
  {
    inventory_code: 'AST-006',
    name: 'AccessPoint-WiFi-01',
    type: 'Access Point',
    site: 'Tunis',
    brand: 'Cisco',
    model: 'Catalyst 9120',
    serial_number: 'CISCO-AP001',
    ip_address: '10.1.1.1',
    status: 'Production',
    criticality: 'Medium',
    os_version: 'IOS XE 17.3',
    os_family_id: null,
    supplier_id: null,
    client_id: null,
    acquisition_date: '2023-01-15',
    production_start_date: '2023-01-15',
    warranty_end_date: '2027-01-15',
    end_of_maintenance: '2027-12-15',
    end_of_sales: '2024-01-15',
    end_of_support: '2028-01-15',
    end_of_software_support: null,
    replacement_date: null,
    purchase_price: 2000,
    depreciation_duration: 24,
    cost_center_id: null,
    budget_code: 'NETWORK-002',
    lifecycle_stage: 'Exploitation',
    notes: 'Wireless access - new'
  },
  {
    inventory_code: 'AST-007',
    name: 'Router-Edge-01',
    type: 'Router',
    site: 'Tunis',
    brand: 'Cisco',
    model: 'ASR 1001',
    serial_number: 'CISCO-RT001',
    ip_address: '10.0.0.5',
    status: 'Production',
    criticality: 'Critical',
    os_version: 'IOS XE 17.6',
    os_family_id: null,
    supplier_id: null,
    client_id: null,
    acquisition_date: '2019-12-31',
    production_start_date: '2019-12-31',
    warranty_end_date: '2023-12-31',
    end_of_maintenance: '2024-11-30',
    end_of_sales: '2021-12-31',
    end_of_support: '2024-12-31',
    end_of_software_support: null,
    replacement_date: '2025-02-01',
    purchase_price: 7000,
    depreciation_duration: 36,
    cost_center_id: null,
    budget_code: 'NETWORK-003',
    lifecycle_stage: 'End of Support',
    notes: 'URGENT - End of support expired! Replace immediately.'
  },
  {
    inventory_code: 'AST-008',
    name: 'DB-Server-01',
    type: 'Server',
    site: 'Tunis',
    brand: 'HP',
    model: 'ProLiant DL380 Gen10',
    serial_number: 'HP-DB001',
    ip_address: '192.168.2.100',
    status: 'Production',
    criticality: 'Critical',
    os_version: 'Red Hat EL 8',
    os_family_id: null,
    supplier_id: null,
    client_id: null,
    acquisition_date: '2024-05-30',
    production_start_date: '2024-05-30',
    warranty_end_date: '2028-05-30',
    end_of_maintenance: '2029-04-30',
    end_of_sales: '2024-05-30',
    end_of_support: '2029-05-30',
    end_of_software_support: null,
    replacement_date: null,
    purchase_price: 10000,
    depreciation_duration: 36,
    cost_center_id: null,
    budget_code: 'DATABASE-001',
    lifecycle_stage: 'Exploitation',
    notes: 'Database server - good condition'
  },
  {
    inventory_code: 'AST-009',
    name: 'Exchange-Server-01',
    type: 'Server',
    site: 'Ariana',
    brand: 'Dell',
    model: 'PowerEdge R640',
    serial_number: 'DELL-EX001',
    ip_address: '192.168.3.100',
    status: 'Production',
    criticality: 'Critical',
    os_version: 'Windows Server 2016',
    os_family_id: null,
    supplier_id: null,
    client_id: null,
    acquisition_date: '2022-01-13',
    production_start_date: '2022-01-13',
    warranty_end_date: '2026-01-13',
    end_of_maintenance: '2026-12-13',
    end_of_sales: '2022-01-13',
    end_of_support: '2027-01-13',
    end_of_software_support: null,
    replacement_date: '2027-06-01',
    purchase_price: 9000,
    depreciation_duration: 36,
    cost_center_id: null,
    budget_code: 'MESSAGING-001',
    lifecycle_stage: 'Exploitation',
    notes: 'Email server - monitor'
  },
  {
    inventory_code: 'AST-010',
    name: 'VoIP-Gateway-01',
    type: 'Gateway',
    site: 'Tunis',
    brand: 'Cisco',
    model: 'Catalyst 8200',
    serial_number: 'CISCO-VG001',
    ip_address: '10.0.0.6',
    status: 'Production',
    criticality: 'High',
    os_version: 'IOS XE 17.1',
    os_family_id: null,
    supplier_id: null,
    client_id: null,
    acquisition_date: '2021-03-15',
    production_start_date: '2021-03-15',
    warranty_end_date: '2025-03-15',
    end_of_maintenance: '2026-02-15',
    end_of_sales: '2022-03-15',
    end_of_support: '2026-03-15',
    end_of_software_support: null,
    replacement_date: '2026-06-01',
    purchase_price: 4500,
    depreciation_duration: 36,
    cost_center_id: null,
    budget_code: 'TELECOM-001',
    lifecycle_stage: 'Maintenance',
    notes: 'VoIP infrastructure'
  }
];

async function seedData() {
  try {
    console.log('Seeding database with strategic asset data...');
    
    for (const asset of mockAssets) {
      // Calculate lifecycle stage and obsolescence status
      const eosDate = new Date(asset.end_of_support);
      const today = new Date();
      const daysUntilEos = Math.floor((eosDate - today) / (1000 * 60 * 60 * 24));
      
      let obsolescenceStatus = 'GREEN';
      if (daysUntilEos < 0) obsolescenceStatus = 'RED';
      else if (daysUntilEos < 180) obsolescenceStatus = 'ORANGE';
      else if (daysUntilEos < 365) obsolescenceStatus = 'YELLOW';
      
      // Calculate risk score
      let riskScore = 10;
      if (daysUntilEos < 0) riskScore = 100;
      else if (daysUntilEos < 30) riskScore = 90;
      else if (daysUntilEos < 90) riskScore = 75;
      else if (daysUntilEos < 180) riskScore = 50;
      else if (daysUntilEos < 365) riskScore = 25;
      
      const criticalityMultiplier = {
        'Critical': 2.0,
        'High': 1.5,
        'Medium': 1.0,
        'Low': 0.5
      };
      
      riskScore = Math.min(100, riskScore * (criticalityMultiplier[asset.criticality] || 1.0));
      
      // Determine if at risk
      const isAtRisk = (obsolescenceStatus === 'RED' || obsolescenceStatus === 'ORANGE') 
        && (asset.criticality === 'Critical' || asset.criticality === 'High');
      
      // Determine if requires replacement
      const requiresReplacement = obsolescenceStatus === 'RED' 
        || (daysUntilEos < 90 && asset.criticality === 'Critical');
      
      await db.query(
        `INSERT INTO assets 
         (inventory_code, name, type, site, brand, model, serial_number, ip_address,
          status, criticality, os_version, os_family_id, supplier_id, client_id,
          acquisition_date, production_start_date, warranty_end_date, end_of_maintenance,
          end_of_sales, end_of_support, end_of_software_support, replacement_date,
          purchase_price, depreciation_duration, cost_center_id, budget_code,
          lifecycle_stage, obsolescence_status, days_until_end_of_support, risk_score,
          is_at_risk, requires_replacement, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
                 $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33)`,
        [
          asset.inventory_code, asset.name, asset.type, asset.site, asset.brand, asset.model, 
          asset.serial_number, asset.ip_address, asset.status, asset.criticality, asset.os_version,
          asset.os_family_id, asset.supplier_id, asset.client_id, asset.acquisition_date,
          asset.production_start_date, asset.warranty_end_date, asset.end_of_maintenance,
          asset.end_of_sales, asset.end_of_support, asset.end_of_software_support, asset.replacement_date,
          asset.purchase_price, asset.depreciation_duration, asset.cost_center_id, asset.budget_code,
          asset.lifecycle_stage, obsolescenceStatus, daysUntilEos, Math.round(riskScore),
          isAtRisk, requiresReplacement, asset.notes
        ]
      );
    }
    
    console.log('✓ Seed data inserted successfully!');
    console.log(`✓ ${mockAssets.length} strategic assets loaded`);
    process.exit(0);
  } catch (err) {
    console.error('✗ Error seeding data:', err);
    process.exit(1);
  }
}

seedData();

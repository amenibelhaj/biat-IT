import React, { useState, useEffect } from 'react';
import '../styles/AssetInventory.css';

export default function AssetInventory() {
  const [assets, setAssets] = useState([]);
  const [filteredAssets, setFilteredAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [filters, setFilters] = useState({
    site: '',
    status: '',
    criticality: '',
    obsolescence: ''
  });

  useEffect(() => {
    loadAssets();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, assets]);

  const loadAssets = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/assets');
      const data = await response.json();
      setAssets(data);
      setFilteredAssets(data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load assets:', err);
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = assets;

    if (filters.site) {
      filtered = filtered.filter(a => a.site === filters.site);
    }
    if (filters.status) {
      filtered = filtered.filter(a => a.status === filters.status);
    }
    if (filters.criticality) {
      filtered = filtered.filter(a => a.criticality === filters.criticality);
    }
    if (filters.obsolescence) {
      filtered = filtered.filter(a => a.obsolescence_status === filters.obsolescence);
    }

    setFilteredAssets(filtered);
  };

  const getStatusColor = (status) => {
    const colors = {
      'Production': '#26de81',
      'Test': '#ffd93d',
      'Secours': '#ffa502',
      'Hors service': '#ff4757'
    };
    return colors[status] || '#ccc';
  };

  const getObsolescenceColor = (status) => {
    const colors = {
      'GREEN': '#26de81',
      'YELLOW': '#ffd93d',
      'ORANGE': '#ffa502',
      'RED': '#ff4757'
    };
    return colors[status] || '#ccc';
  };

  const getObsolescenceIcon = (status) => {
    const icons = {
      'GREEN': '🟢',
      'YELLOW': '🟡',
      'ORANGE': '🟠',
      'RED': '🔴'
    };
    return icons[status] || '⚪';
  };

  if (loading) return <div className="loading">Loading assets...</div>;

  const sites = [...new Set(assets.map(a => a.site))];
  const statuses = [...new Set(assets.map(a => a.status))];
  const criticalities = [...new Set(assets.map(a => a.criticality))];
  const obsolescences = ['RED', 'ORANGE', 'YELLOW', 'GREEN'];

  return (
    <div className="asset-inventory">
      <h2>📦 IT Asset Inventory</h2>
      <p className="subtitle">Complete list of all IT assets with lifecycle and obsolescence status</p>

      {/* FILTERS */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Site:</label>
          <select 
            value={filters.site} 
            onChange={(e) => setFilters({...filters, site: e.target.value})}
          >
            <option value="">All Sites</option>
            {sites.map(site => <option key={site} value={site}>{site}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label>Status:</label>
          <select 
            value={filters.status} 
            onChange={(e) => setFilters({...filters, status: e.target.value})}
          >
            <option value="">All Status</option>
            {statuses.map(status => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label>Criticality:</label>
          <select 
            value={filters.criticality} 
            onChange={(e) => setFilters({...filters, criticality: e.target.value})}
          >
            <option value="">All Criticalities</option>
            {criticalities.map(crit => <option key={crit} value={crit}>{crit}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label>Obsolescence:</label>
          <select 
            value={filters.obsolescence} 
            onChange={(e) => setFilters({...filters, obsolescence: e.target.value})}
          >
            <option value="">All Levels</option>
            {obsolescences.map(obs => <option key={obs} value={obs}>{getObsolescenceIcon(obs)} {obs}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <button onClick={() => setFilters({site: '', status: '', criticality: '', obsolescence: ''})}>
            Clear Filters
          </button>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="summary">
        <span>Total Assets: <strong>{filteredAssets.length}</strong></span>
        <span>🔴 RED: <strong>{filteredAssets.filter(a => a.obsolescence_status === 'RED').length}</strong></span>
        <span>🟠 ORANGE: <strong>{filteredAssets.filter(a => a.obsolescence_status === 'ORANGE').length}</strong></span>
        <span>🟡 YELLOW: <strong>{filteredAssets.filter(a => a.obsolescence_status === 'YELLOW').length}</strong></span>
        <span>🟢 GREEN: <strong>{filteredAssets.filter(a => a.obsolescence_status === 'GREEN').length}</strong></span>
      </div>

      {/* TABLE */}
      <div className="table-container">
        <table className="assets-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Equipment Name</th>
              <th>Type</th>
              <th>Site</th>
              <th>Brand / Model</th>
              <th>Serial #</th>
              <th>IP Address</th>
              <th>Status</th>
              <th>Criticality</th>
              <th>End of Support</th>
              <th>Obsolescence</th>
              <th>Lifecycle</th>
              <th>Risk Score</th>
              <th>Price</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredAssets.map(asset => (
              <tr key={asset.id} className={`risk-${asset.obsolescence_status.toLowerCase()}`}>
                <td className="code">{asset.inventory_code}</td>
                <td className="name"><strong>{asset.name}</strong></td>
                <td>{asset.type}</td>
                <td>{asset.site}</td>
                <td>{asset.brand} {asset.model}</td>
                <td className="serial">{asset.serial_number}</td>
                <td className="ip">{asset.ip_address || 'N/A'}</td>
                <td>
                  <span className="status-badge" style={{background: getStatusColor(asset.status)}}>
                    {asset.status}
                  </span>
                </td>
                <td>
                  <span className="criticality-badge">
                    {asset.criticality === 'Critical' || asset.criticality === 'Critique' ? '🔴' : ''}
                    {asset.criticality === 'High' || asset.criticality === 'Élevée' ? '🟠' : ''}
                    {asset.criticality === 'Medium' || asset.criticality === 'Moyen' ? '🟡' : ''}
                    {asset.criticality === 'Low' || asset.criticality === 'Faible' ? '🟢' : ''}
                    {asset.criticality}
                  </span>
                </td>
                <td className="date">
                  {new Date(asset.end_of_support).toLocaleDateString()}
                </td>
                <td className="obsolescence">
                  <span 
                    className="obs-badge"
                    style={{
                      background: getObsolescenceColor(asset.obsolescence_status),
                      color: asset.obsolescence_status === 'YELLOW' ? '#333' : 'white'
                    }}
                  >
                    {getObsolescenceIcon(asset.obsolescence_status)} {asset.obsolescence_status}
                  </span>
                </td>
                <td className="lifecycle">
                  {asset.lifecycle_stage}
                </td>
                <td className="risk">
                  <span className={`risk-${Math.round(asset.risk_score / 25)}`}>
                    {Math.round(asset.risk_score)}
                  </span>
                </td>
                <td className="price">${asset.purchase_price}</td>
                <td>
                  <button className="details-btn" onClick={() => setSelectedAsset(asset)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ASSET DETAIL MODAL */}
      {selectedAsset && (
        <div className="modal-overlay" onClick={() => setSelectedAsset(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedAsset(null)}>✕</button>
            
            <h2>{selectedAsset.name}</h2>
            <p className="code">Code: {selectedAsset.inventory_code}</p>

            <div className="detail-section">
              <h3>📌 General Information</h3>
              <div className="detail-grid">
                <div><strong>Type:</strong> {selectedAsset.type}</div>
                <div><strong>Brand:</strong> {selectedAsset.brand}</div>
                <div><strong>Model:</strong> {selectedAsset.model}</div>
                <div><strong>Serial Number:</strong> {selectedAsset.serial_number}</div>
                <div><strong>Site:</strong> {selectedAsset.site}</div>
                <div><strong>IP Address:</strong> {selectedAsset.ip_address || 'N/A'}</div>
              </div>
            </div>

            <div className="detail-section">
              <h3>🔧 Technical Information</h3>
              <div className="detail-grid">
                <div><strong>Status:</strong> {selectedAsset.status}</div>
                <div><strong>Criticality:</strong> {selectedAsset.criticality}</div>
                <div><strong>OS Version:</strong> {selectedAsset.os_version || 'N/A'}</div>
              </div>
            </div>

            <div className="detail-section">
              <h3>💰 Financial Information</h3>
              <div className="detail-grid">
                <div><strong>Purchase Price:</strong> ${selectedAsset.purchase_price}</div>
                <div><strong>Acquisition Date:</strong> {new Date(selectedAsset.acquisition_date).toLocaleDateString()}</div>
                <div><strong>Depreciation Duration:</strong> {selectedAsset.depreciation_duration} months</div>
                <div><strong>Budget Code:</strong> {selectedAsset.budget_code}</div>
              </div>
            </div>

            <div className="detail-section">
              <h3>📅 Lifecycle & Obsolescence</h3>
              <div className="detail-grid">
                <div><strong>Production Start:</strong> {new Date(selectedAsset.production_start_date).toLocaleDateString()}</div>
                <div><strong>Warranty End:</strong> {new Date(selectedAsset.warranty_end_date).toLocaleDateString()}</div>
                <div><strong>End of Sales:</strong> {selectedAsset.end_of_sales ? new Date(selectedAsset.end_of_sales).toLocaleDateString() : 'N/A'}</div>
                <div><strong>End of Maintenance:</strong> {selectedAsset.end_of_maintenance ? new Date(selectedAsset.end_of_maintenance).toLocaleDateString() : 'N/A'}</div>
                <div><strong>End of Support:</strong> {new Date(selectedAsset.end_of_support).toLocaleDateString()}</div>
                <div><strong>End of Software Support:</strong> {selectedAsset.end_of_software_support ? new Date(selectedAsset.end_of_software_support).toLocaleDateString() : 'N/A'}</div>
                <div><strong>Planned Replacement:</strong> {selectedAsset.replacement_date ? new Date(selectedAsset.replacement_date).toLocaleDateString() : 'N/A'}</div>
              </div>
            </div>

            <div className="detail-section alert">
              <h3>🔍 Analysis</h3>
              <div className="analysis">
                <div className="analysis-item">
                  <span>Obsolescence Status:</span>
                  <span 
                    className="badge"
                    style={{
                      background: getObsolescenceColor(selectedAsset.obsolescence_status),
                      color: selectedAsset.obsolescence_status === 'YELLOW' ? '#333' : 'white'
                    }}
                  >
                    {getObsolescenceIcon(selectedAsset.obsolescence_status)} {selectedAsset.obsolescence_status}
                  </span>
                </div>
                <div className="analysis-item">
                  <span>Lifecycle Stage:</span>
                  <span className="badge">{selectedAsset.lifecycle_stage}</span>
                </div>
                <div className="analysis-item">
                  <span>Risk Score:</span>
                  <span className="badge">{Math.round(selectedAsset.risk_score)}/100</span>
                </div>
                <div className="analysis-item">
                  <span>Days Until End of Support:</span>
                  <span className="badge">{selectedAsset.days_until_end_of_support}</span>
                </div>
                <div className="analysis-item">
                  <span>At Risk:</span>
                  <span className="badge">{selectedAsset.is_at_risk ? '⚠️ YES' : '✓ No'}</span>
                </div>
                <div className="analysis-item">
                  <span>Requires Replacement:</span>
                  <span className="badge">{selectedAsset.requires_replacement ? '🔄 YES' : '✓ No'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

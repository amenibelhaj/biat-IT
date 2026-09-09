// src/components/AssetList.js
import React, { useState, useEffect } from 'react';
import { assetService } from '../services/api';
import './AssetList.css';

function formatDate(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function getObsolescenceStatus(endOfSupport) {
  if (!endOfSupport) return { label: '?', emoji: '?' };
  
  const today = new Date();
  const eos = new Date(endOfSupport);
  const daysRemaining = Math.floor((eos - today) / (1000 * 60 * 60 * 24));
  
  if (daysRemaining < 0) return { label: 'RED', emoji: '🔴' };
  if (daysRemaining < 180) return { label: 'ORANGE', emoji: '🟠' };
  if (daysRemaining < 365) return { label: 'YELLOW', emoji: '🟡' };
  return { label: 'GREEN', emoji: '🟢' };
}

export default function AssetList() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    type: '',
    site: '',
    status: '',
    criticality: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [uniqueValues, setUniqueValues] = useState({
    types: [],
    sites: [],
    statuses: [],
    criticalities: []
  });

  useEffect(() => {
    loadAssets();
  }, [filters]);

  const loadAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await assetService.getAssets(filters);
      setAssets(response.data.data || []);

      // Extract unique values for filters
      if (response.data.data && response.data.data.length > 0) {
        const types = [...new Set(response.data.data.map(a => a.type))].filter(Boolean);
        const sites = [...new Set(response.data.data.map(a => a.site))].filter(Boolean);
        const statuses = [...new Set(response.data.data.map(a => a.status))].filter(Boolean);
        const criticalities = [...new Set(response.data.data.map(a => a.criticality))].filter(Boolean);
        
        setUniqueValues({ types, sites, statuses, criticalities });
      }
    } catch (err) {
      console.error('Error loading assets:', err);
      setError('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const filteredAssets = assets.filter(asset =>
    (asset.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     asset.ip_address?.includes(searchTerm) ||
     asset.serial_number?.toLowerCase().includes(searchTerm.toLowerCase())) || false
  );

  if (loading) return <div className="loading">Loading assets...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="asset-list">
      <h2>Asset Inventory</h2>

      {/* Search and Filters */}
      <div className="controls">
        <input
          type="text"
          className="search-input"
          placeholder="Search by name, IP, or serial..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select name="type" value={filters.type} onChange={handleFilterChange}>
          <option value="">All Types</option>
          {uniqueValues.types.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        <select name="site" value={filters.site} onChange={handleFilterChange}>
          <option value="">All Sites</option>
          {uniqueValues.sites.map(site => (
            <option key={site} value={site}>{site}</option>
          ))}
        </select>

        <select name="status" value={filters.status} onChange={handleFilterChange}>
          <option value="">All Status</option>
          {uniqueValues.statuses.map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>

        <select name="criticality" value={filters.criticality} onChange={handleFilterChange}>
          <option value="">All Criticality</option>
          {uniqueValues.criticalities.map(crit => (
            <option key={crit} value={crit}>{crit}</option>
          ))}
        </select>
      </div>

      {/* Assets Table */}
      <div className="table-container">
        {filteredAssets.length === 0 ? (
          <div className="no-results">No assets found</div>
        ) : (
          <table className="assets-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Site</th>
                <th>Status</th>
                <th>Criticality</th>
                <th>IP Address</th>
                <th>EoS Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map(asset => {
                const obsStatus = getObsolescenceStatus(asset.end_of_support);
                return (
                  <tr key={asset.id}>
                    <td className="name">{asset.name}</td>
                    <td>{asset.type}</td>
                    <td>{asset.site}</td>
                    <td>{asset.status}</td>
                    <td className={`criticality ${asset.criticality?.toLowerCase()}`}>
                      {asset.criticality}
                    </td>
                    <td className="ip">{asset.ip_address}</td>
                    <td>{formatDate(asset.end_of_support)}</td>
                    <td className={`obsolescence ${obsStatus.label.toLowerCase()}`}>
                      {obsStatus.emoji} {obsStatus.label}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="summary">
        Showing {filteredAssets.length} of {assets.length} assets
      </div>
    </div>
  );
}

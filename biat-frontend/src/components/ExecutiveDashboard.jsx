import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/ExecutiveDashboard.css';

export default function ExecutiveDashboard() {
  const { formatCurrency } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/strategic/dashboard/executive`);
      const result = await response.json();
      setData(result);
      setLoading(false);
    } catch (err) {
      console.error('Error:', err);
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">📊 Loading Executive Dashboard...</div>;
  if (!data || !data.summary) return <div className="error">No data available</div>;

  const { summary } = data;

  return (
    <div className="executive-dashboard">
      <h2>📊 Executive Summary</h2>
      <p className="subtitle">Strategic overview of IT asset portfolio</p>
      
      <div className="kpi-section">
        <div className="kpi-card total">
          <div className="kpi-icon">📦</div>
          <div className="kpi-number">{summary.total_assets || 0}</div>
          <div className="kpi-label">Total Assets</div>
        </div>

        <div className="kpi-card red">
          <div className="kpi-icon">🔴</div>
          <div className="kpi-number">{summary.red_count || 0}</div>
          <div className="kpi-label">END OF SUPPORT EXPIRED</div>
          <div className="kpi-action">⚠️ URGENT ACTION</div>
        </div>

        <div className="kpi-card orange">
          <div className="kpi-icon">🟠</div>
          <div className="kpi-number">{summary.orange_count || 0}</div>
          <div className="kpi-label">SUPPORT ENDS IN 6 MONTHS</div>
          <div className="kpi-action">Order Now</div>
        </div>

        <div className="kpi-card yellow">
          <div className="kpi-icon">🟡</div>
          <div className="kpi-number">{summary.yellow_count || 0}</div>
          <div className="kpi-label">SUPPORT 6-12 MONTHS</div>
          <div className="kpi-action">Plan Q2/Q3</div>
        </div>

        <div className="kpi-card green">
          <div className="kpi-icon">🟢</div>
          <div className="kpi-number">{summary.green_count || 0}</div>
          <div className="kpi-label">HEALTHY ASSETS</div>
          <div className="kpi-action">Monitor</div>
        </div>

        <div className="kpi-card at-risk">
          <div className="kpi-icon">⚠️</div>
          <div className="kpi-number">{summary.at_risk_count || 0}</div>
          <div className="kpi-label">CRITICAL AT RISK</div>
        </div>

        <div className="kpi-card replacement">
          <div className="kpi-icon">🔄</div>
          <div className="kpi-number">{summary.needs_replacement_count || 0}</div>
          <div className="kpi-label">Need Replacement</div>
        </div>

        <div className="kpi-card financial">
          <div className="kpi-icon">💰</div>
          <div className="kpi-number">{formatCurrency(summary.total_asset_value || 0)}</div>
          <div className="kpi-label">Total Asset Value</div>
          <div className="kpi-subtitle">Tunisian Dinar</div>
        </div>
      </div>

      {data.top_at_risk_assets && data.top_at_risk_assets.length > 0 && (
        <div className="at-risk-table-section">
          <h3>🚨 Top At-Risk Assets</h3>
          <div className="table-container">
            <table className="at-risk-table">
              <thead>
                <tr>
                  <th>Equipment</th>
                  <th>Type</th>
                  <th>Site</th>
                  <th>Criticality</th>
                  <th>Status</th>
                  <th>End of Support</th>
                  <th>Risk Score</th>
                  <th>Value (TND)</th>
                </tr>
              </thead>
              <tbody>
                {data.top_at_risk_assets.slice(0, 20).map(asset => (
                  <tr key={asset.id}>
                    <td><strong>{asset.name}</strong></td>
                    <td>{asset.type}</td>
                    <td>{asset.site}</td>
                    <td>
                      <span className={`criticality-${asset.criticality.toLowerCase()}`}>
                        {asset.criticality}
                      </span>
                    </td>
                    <td>
                      <span className={`status-${asset.obsolescence_status.toLowerCase()}`}>
                        {asset.obsolescence_status}
                      </span>
                    </td>
                    <td>{new Date(asset.end_of_support).toLocaleDateString()}</td>
                    <td><strong>{Math.round(asset.risk_score)}</strong></td>
                    <td>{formatCurrency(asset.purchase_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

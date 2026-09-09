import React, { useState, useEffect } from 'react';
import '../styles/ExecutiveDashboard.css';

export default function ExecutiveDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/strategic/dashboard/executive')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading...</div>;
  if (!data) return <div className="error">No data</div>;

  const s = data.summary;
  return (
    <div className="executive-dashboard">
      <h2>Executive Summary</h2>
      <div className="kpi-section">
        <div className="kpi-card total"><div className="kpi-icon">📦</div><div className="kpi-number">{s.total_assets}</div><div className="kpi-label">Total</div></div>
        <div className="kpi-card red"><div className="kpi-icon">🔴</div><div className="kpi-number">{s.red_count || 0}</div><div className="kpi-label">RED</div></div>
        <div className="kpi-card orange"><div className="kpi-icon">🟠</div><div className="kpi-number">{s.orange_count || 0}</div><div className="kpi-label">ORANGE</div></div>
        <div className="kpi-card yellow"><div className="kpi-icon">🟡</div><div className="kpi-number">{s.yellow_count || 0}</div><div className="kpi-label">YELLOW</div></div>
        <div className="kpi-card green"><div className="kpi-icon">🟢</div><div className="kpi-number">{s.green_count || 0}</div><div className="kpi-label">GREEN</div></div>
        <div className="kpi-card at-risk"><div className="kpi-icon">⚠️</div><div className="kpi-number">{s.at_risk_count || 0}</div><div className="kpi-label">At Risk</div></div>
        <div className="kpi-card replacement"><div className="kpi-icon">🔄</div><div className="kpi-number">{s.needs_replacement_count || 0}</div><div className="kpi-label">Replace</div></div>
        <div className="kpi-card financial"><div className="kpi-icon">💰</div><div className="kpi-number">${(s.total_asset_value / 1000).toFixed(0)}K</div><div className="kpi-label">Value</div></div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import '../styles/FinancialSummary.css';

export default function FinancialSummary() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/strategic/dashboard/financial-summary')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading financial summary...</div>;

  const totalValue = data.reduce((sum, d) => sum + (d.total_value || 0), 0);
  const totalAssets = data.reduce((sum, d) => sum + (d.asset_count || 0), 0);
  const totalReplacement = data.reduce((sum, d) => sum + (d.replacement_budget_needed || 0), 0);

  return (
    <div className="financial-summary">
      <h2>Financial Summary</h2>
      <div className="summary-cards">
        <div className="summary-card">
          <div className="icon">💰</div>
          <div className="label">Total Asset Value</div>
          <div className="value">${(totalValue / 1000).toFixed(0)}K</div>
        </div>
        <div className="summary-card">
          <div className="icon">📦</div>
          <div className="label">Total Assets</div>
          <div className="value">{totalAssets}</div>
        </div>
        <div className="summary-card">
          <div className="icon">🔄</div>
          <div className="label">Replacement Budget</div>
          <div className="value">${(totalReplacement / 1000).toFixed(0)}K</div>
        </div>
      </div>
    </div>
  );
}

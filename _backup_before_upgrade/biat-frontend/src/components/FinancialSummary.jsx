import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/FinancialSummary.css';

export default function FinancialSummary() {
  const { formatCurrency } = useLanguage();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/strategic/dashboard/financial-summary`);
      const result = await response.json();
      setData(Array.isArray(result) ? result : []);
      setLoading(false);
    } catch (err) {
      console.error('Error:', err);
      setData([]);
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">💼 Loading Financial Summary...</div>;

  const totalValue = data.reduce((sum, item) => sum + parseFloat(item.total_value || 0), 0);
  const totalReplacement = data.reduce((sum, item) => sum + parseFloat(item.replacement_budget_needed || 0), 0);
  const totalAssets = data.reduce((sum, item) => sum + parseInt(item.asset_count || 0), 0);

  return (
    <div className="financial-summary">
      <h2>💼 Financial Summary</h2>
      <p className="subtitle">Asset value and replacement budget forecast (in Tunisian Dinars)</p>

      <div className="financial-cards">
        <div className="fin-card">
          <div className="fin-icon">💰</div>
          <div className="fin-label">Total Asset Value</div>
          <div className="fin-amount">{formatCurrency(totalValue)}</div>
        </div>

        <div className="fin-card warning">
          <div className="fin-icon">⚠️</div>
          <div className="fin-label">Replacement Budget Needed</div>
          <div className="fin-amount">{formatCurrency(totalReplacement)}</div>
          <div className="fin-subtitle">For obsolete/at-risk assets</div>
        </div>

        <div className="fin-card">
          <div className="fin-icon">📊</div>
          <div className="fin-label">Total Assets</div>
          <div className="fin-amount">{totalAssets}</div>
        </div>

        <div className="fin-card">
          <div className="fin-icon">📈</div>
          <div className="fin-label">Replacement %</div>
          <div className="fin-amount">
            {totalValue > 0 ? ((totalReplacement / totalValue) * 100).toFixed(1) : 0}%
          </div>
        </div>
      </div>

      <div className="budget-table-section">
        <h3>📋 Breakdown by Cost Center & Type</h3>
        <div className="table-container">
          <table className="budget-table">
            <thead>
              <tr>
                <th>Cost Center</th>
                <th>Asset Type</th>
                <th>Count</th>
                <th>Total Value (TND)</th>
                <th>Avg Value (TND)</th>
                <th>Replacement Budget (TND)</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => (
                <tr key={idx}>
                  <td><strong>{item.cost_center || 'GENERAL'}</strong></td>
                  <td>{item.type}</td>
                  <td className="number">{item.asset_count}</td>
                  <td className="amount">{formatCurrency(item.total_value || 0)}</td>
                  <td className="amount">{formatCurrency(item.avg_value || 0)}</td>
                  <td className="amount warning">
                    <strong>{formatCurrency(item.replacement_budget_needed || 0)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="note">
        <strong>📌 Note:</strong> All financial values are displayed in Tunisian Dinars (د.ت) at the rate of 1 USD = 3.1 TND
      </div>
    </div>
  );
}

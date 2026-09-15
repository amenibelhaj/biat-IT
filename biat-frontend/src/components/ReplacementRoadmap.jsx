import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/ReplacementRoadmap.css';

export default function ReplacementRoadmap() {
  const { formatCurrency } = useLanguage();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/strategic/dashboard/replacement-roadmap`);
      const result = await response.json();
      console.log('Roadmap data:', result);
      setData(Array.isArray(result) ? result : []);
      setLoading(false);
    } catch (err) {
      console.error('Error:', err);
      setData([]);
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">📅 Loading Replacement Roadmap...</div>;

  const months = data.sort((a, b) => a.month.localeCompare(b.month));
  const totalAssets = months.reduce((sum, m) => sum + parseInt(m.count || 0), 0);
  const totalBudget = months.reduce((sum, m) => sum + parseFloat(m.total_value || 0), 0);

  return (
    <div className="replacement-roadmap">
      <h2>📅 Replacement Roadmap (24 Months)</h2>
      <p className="subtitle">Monthly replacement timeline in Tunisian Dinars</p>

      <div className="roadmap-summary">
        <div className="summary-card">
          <span>Total Assets Planned</span>
          <strong>{totalAssets}</strong>
        </div>
        <div className="summary-card warning">
          <span>Total Budget Required</span>
          <strong>{formatCurrency(totalBudget)}</strong>
        </div>
      </div>

      {months.length === 0 ? (
        <div className="no-data">No replacement dates scheduled</div>
      ) : (
        <div className="timeline">
          <h3>📋 Monthly Replacement Timeline</h3>
          {months.map((month, idx) => (
            <div key={idx} className="month-block">
              <div className="month-header">
                <span className="month-label">{month.month}</span>
                <span className="month-stats">
                  {month.count} items
                </span>
                <span className="month-budget">
                  {formatCurrency(month.total_value || 0)}
                </span>
              </div>
              <div className="month-breakdown">
                {month.critical_count > 0 && (
                  <div className="item">
                    <span className="label">🔴 Critical:</span>
                    <span className="value">{month.critical_count}</span>
                  </div>
                )}
                {month.high_count > 0 && (
                  <div className="item">
                    <span className="label">🟠 High:</span>
                    <span className="value">{month.high_count}</span>
                  </div>
                )}
                {month.count > (month.critical_count + month.high_count) && (
                  <div className="item">
                    <span className="label">🟡 Other:</span>
                    <span className="value">{month.count - (month.critical_count + month.high_count)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="note">
        <strong>📌 Note:</strong> All amounts in Tunisian Dinars (د.ت) - 1 USD = 3.1 TND
      </div>
    </div>
  );
}

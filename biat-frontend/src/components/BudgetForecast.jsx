import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/BudgetForecast.css';

export default function BudgetForecast() {
  const { formatCurrency } = useLanguage();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/strategic/dashboard/budget-forecast');
      const result = await response.json();
      setData(Array.isArray(result) ? result : []);
      setLoading(false);
    } catch (err) {
      console.error('Error:', err);
      setData([]);
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">💰 Loading Budget Forecast...</div>;

  const groupedByQuarter = {};
  data.forEach(item => {
    if (!groupedByQuarter[item.quarter]) {
      groupedByQuarter[item.quarter] = { total: 0, types: [] };
    }
    groupedByQuarter[item.quarter].total += parseFloat(item.estimated_replacement_cost || 0);
    groupedByQuarter[item.quarter].types.push(item);
  });

  const quarters = Object.keys(groupedByQuarter).sort();
  const totalBudget = quarters.reduce((sum, q) => sum + groupedByQuarter[q].total, 0);

  return (
    <div className="budget-forecast">
      <h2>💰 Budget Forecast (3-Year Projection)</h2>
      <p className="subtitle">Replacement cost forecast by quarter in Tunisian Dinars</p>

      <div className="forecast-summary">
        <div className="summary-card">
          <span>Total 3-Year Budget</span>
          <strong>{formatCurrency(totalBudget)}</strong>
        </div>
        <div className="summary-card">
          <span>Quarters Covered</span>
          <strong>{quarters.length}</strong>
        </div>
        <div className="summary-card">
          <span>Average per Quarter</span>
          <strong>{formatCurrency(quarters.length > 0 ? totalBudget / quarters.length : 0)}</strong>
        </div>
      </div>

      {quarters.length === 0 ? (
        <div className="no-data">No budget data available</div>
      ) : (
        <div className="timeline">
          {quarters.map(quarter => (
            <div key={quarter} className="quarter-block">
              <div className="quarter-header">
                <h4>{quarter}</h4>
                <div className="quarter-total">{formatCurrency(groupedByQuarter[quarter].total)}</div>
              </div>
              <div className="quarter-types">
                {groupedByQuarter[quarter].types.map((item, idx) => (
                  <div key={idx} className="type-item">
                    <span className="type-name">{item.type}</span>
                    <span className="type-cost">{formatCurrency(item.estimated_replacement_cost || 0)}</span>
                  </div>
                ))}
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

import React, { useState, useEffect } from 'react';
import '../styles/BudgetForecast.css';

export default function BudgetForecast() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/strategic/dashboard/budget-forecast')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading budget forecast...</div>;

  const byQuarter = {};
  data.forEach(item => {
    if (!byQuarter[item.quarter]) byQuarter[item.quarter] = [];
    byQuarter[item.quarter].push(item);
  });

  const quarters = Object.keys(byQuarter).sort();
  const total = data.reduce((sum, d) => sum + (d.estimated_replacement_cost || 0), 0);

  return (
    <div className="budget-forecast">
      <h2>3-Year Budget Forecast</h2>
      <div className="summary-cards">
        <div className="summary-card">
          <div className="label">Total 3-Year Budget</div>
          <div className="value">${(total / 1000).toFixed(0)}K</div>
        </div>
        <div className="summary-card">
          <div className="label">Average per Quarter</div>
          <div className="value">${(total / (quarters.length || 1) / 1000).toFixed(0)}K</div>
        </div>
      </div>
      <div className="section">
        <h3>Quarterly Timeline</h3>
        <div className="timeline">
          {quarters.map(q => {
            const cost = byQuarter[q].reduce((s, d) => s + (d.estimated_replacement_cost || 0), 0);
            return (
              <div key={q} className="quarter-block">
                <div className="quarter-label">{q}</div>
                <div className="quarter-bar">
                  <div className="bar">${(cost / 1000).toFixed(0)}K</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

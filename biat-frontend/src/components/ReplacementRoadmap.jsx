import React, { useState, useEffect } from 'react';
import '../styles/ReplacementRoadmap.css';

export default function ReplacementRoadmap() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/strategic/dashboard/replacement-roadmap')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading replacement roadmap...</div>;

  const total = data.reduce((sum, d) => sum + d.count, 0);
  const budget = data.reduce((sum, d) => sum + (d.total_value || 0), 0);

  return (
    <div className="replacement-roadmap">
      <h2>Replacement Roadmap (24 Months)</h2>
      <div className="roadmap-summary">
        <div className="summary-item">
          <div className="label">Total Assets Planned</div>
          <div className="value">{total}</div>
        </div>
        <div className="summary-item">
          <div className="label">Total Budget Required</div>
          <div className="value">${(budget / 1000).toFixed(0)}K</div>
        </div>
      </div>
      <div className="section">
        <h3>Monthly Replacement Timeline</h3>
        <div className="gantt-chart">
          {data.map((item, idx) => (
            <div key={idx} className="gantt-row">
              <div className="month-label">{item.month}</div>
              <div className="gantt-bar">{item.count} items - ${(item.total_value / 1000).toFixed(0)}K</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import '../styles/RiskHeatMap.css';

export default function RiskHeatMap() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/strategic/dashboard/risk-heatmap`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading risk analysis...</div>;

  const types = [...new Set(data.map(d => d.type))];
  const criticalities = ['Critical', 'High', 'Medium', 'Low'];
  const statuses = ['RED', 'ORANGE', 'YELLOW', 'GREEN'];
  const colors = { 'RED': '#ff4757', 'ORANGE': '#ffa502', 'YELLOW': '#ffd93d', 'GREEN': '#6bcf7f' };

  return (
    <div className="risk-heatmap">
      <h2>Risk Heat Map Analysis</h2>
      <div className="heatmap-section">
        {types.map(type => (
          <div key={type} className="type-group">
            <h3>{type}</h3>
            <table className="heatmap-table">
              <thead>
                <tr>
                  <th>Criticality</th>
                  {statuses.map(s => <th key={s}>{s}</th>)}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {criticalities.map(crit => {
                  const critData = data.filter(d => d.type === type && d.criticality === crit);
                  return (
                    <tr key={crit}>
                      <td className="criticality">{crit}</td>
                      {statuses.map(status => {
                        const item = critData.find(d => d.obsolescence_status === status);
                        return (
                          <td key={status} className="cell" style={{ background: item ? colors[status] : '#f0f0f0', color: item && status === 'YELLOW' ? '#333' : '#fff' }}>
                            <div className="cell-count">{item ? item.count : 0}</div>
                          </td>
                        );
                      })}
                      <td className="total">{critData.reduce((s, d) => s + d.count, 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

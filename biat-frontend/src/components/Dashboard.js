
import React, { useState, useEffect } from 'react';
import { dashboardService } from '../services/api';
import './Dashboard.css';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [byType, setByType] = useState([]);
  const [bySite, setBySite] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [summaryRes, typeRes, siteRes] = await Promise.all([
        dashboardService.getSummary(),
        dashboardService.getByType(),
        dashboardService.getBySite()
      ]);
      
      setSummary(summaryRes.data);
      setByType(typeRes.data || []);
      setBySite(siteRes.data || []);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!summary) return <div className="error">No data available</div>;

  return (
    <div className="dashboard">
      <h2>Asset Management Dashboard</h2>

      <div className="kpi-section">
        <div className="kpi-card total">
          <div className="kpi-number">{summary.total}</div>
          <div className="kpi-label">Total Assets</div>
        </div>

        <div className="kpi-card green">
          <div className="kpi-number">🟢 {summary.green || 0}</div>
          <div className="kpi-label">Valid (over 12m)</div>
        </div>

        <div className="kpi-card yellow">
          <div className="kpi-number">🟡 {summary.yellow || 0}</div>
          <div className="kpi-label">Warning (6-12m)</div>
        </div>

        <div className="kpi-card orange">
          <div className="kpi-number">🟠 {summary.orange || 0}</div>
          <div className="kpi-label">At Risk (under 6m)</div>
        </div>

        <div className="kpi-card red">
          <div className="kpi-number">🔴 {summary.red || 0}</div>
          <div className="kpi-label">Expired</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Assets by Type</h3>
          <div className="chart">
            {byType.map((item, idx) => (
              <div key={idx} className="chart-item">
                <span className="label">{item.type}</span>
                <div className="bar-container">
                  <div 
                    className="bar"
                    style={{ width: `${(item.count / Math.max(...byType.map(x => x.count), 1)) * 100}%` }}
                  >
                    {item.count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <h3>Assets by Site</h3>
          <div className="chart">
            {bySite.map((item, idx) => (
              <div key={idx} className="chart-item">
                <span className="label">{item.site}</span>
                <div className="bar-container">
                  <div 
                    className="bar"
                    style={{ width: `${(item.count / Math.max(...bySite.map(x => x.count), 1)) * 100}%` }}
                  >
                    {item.count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

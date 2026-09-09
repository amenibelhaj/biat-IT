import React, { useState, useEffect } from 'react';
import '../styles/LifecycleAnalysis.css';

export default function LifecycleAnalysis() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/strategic/dashboard/lifecycle-analysis')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading lifecycle analysis...</div>;

  const stages = [
    { name: 'Exploitation', icon: '🚀', color: '#6bcf7f' },
    { name: 'Maintenance', icon: '🔧', color: '#ffd93d' },
    { name: 'End of Support', icon: '⚠️', color: '#ffa502' },
    { name: 'Obsolescence', icon: '💀', color: '#ff4757' },
    { name: 'Replacement', icon: '🔄', color: '#9370db' }
  ];

  return (
    <div className="lifecycle-analysis">
      <h2>Asset Lifecycle Analysis</h2>
      <div className="lifecycle-flow">
        <div className="flow-header">
          <h3>Asset Lifecycle Progression</h3>
        </div>
        <div className="flow-stages">
          {stages.map(stage => {
            const item = data.find(d => d.lifecycle_stage === stage.name);
            return (
              <div key={stage.name} className="stage-block">
                <div className="stage-header" style={{ background: stage.color }}>
                  <div className="stage-icon">{stage.icon}</div>
                  <div className="stage-name">{stage.name}</div>
                </div>
                <div className="stage-content">
                  <div className="stat">
                    <div className="label">Assets</div>
                    <div className="value">{item ? item.count : 0}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

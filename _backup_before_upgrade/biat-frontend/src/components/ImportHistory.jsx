import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import '../styles/ImportHistory.css';

export default function ImportHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImport, setSelectedImport] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/import/history`);
      const data = await response.json();
      
      console.log('History data:', data);
      
      // Handle both array and single object responses
      if (Array.isArray(data)) {
        setHistory(data);
      } else if (data && typeof data === 'object') {
        setHistory([data]);
      } else {
        setHistory([]);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Failed to load history:', err);
      setError(err.message);
      setHistory([]);
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">📊 Loading import history...</div>;

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">
          <span>❌ Error loading history:</span>
          <p>{error}</p>
          <button onClick={loadHistory}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="import-history">
      <h2>📁 Import History</h2>
      <p className="subtitle">Archive of all uploaded Excel/CSV files</p>

      {history.length === 0 ? (
        <div className="no-data">
          <p>📭 No imports yet</p>
          <p>Upload your first Excel/CSV file in the <strong>📥 Import</strong> tab to get started!</p>
        </div>
      ) : (
        <div className="history-table-container">
          <table className="history-table">
            <thead>
              <tr>
                <th>File Name</th>
                <th>Import Date</th>
                <th>Total Rows</th>
                <th>Imported</th>
                <th>Failed</th>
                <th>File Size</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {history.map((imp, idx) => (
                <tr key={imp.id || idx} className={imp.failed_rows > 0 ? 'has-errors' : 'success'}>
                  <td className="filename">📄 {imp.original_filename}</td>
                  <td className="date">
                    {new Date(imp.import_date).toLocaleString()}
                  </td>
                  <td className="number">{imp.total_rows}</td>
                  <td className="number success">
                    <span className="badge green">✓ {imp.imported_rows}</span>
                  </td>
                  <td className="number error">
                    {imp.failed_rows > 0 ? (
                      <span className="badge red">✗ {imp.failed_rows}</span>
                    ) : (
                      <span className="badge gray">— 0</span>
                    )}
                  </td>
                  <td className="size">
                    {imp.file_size ? `${(imp.file_size / 1024).toFixed(2)} KB` : 'N/A'}
                  </td>
                  <td className="status">
                    {imp.failed_rows === 0 ? (
                      <span className="status-badge success">✅ Complete</span>
                    ) : (
                      <span className="status-badge partial">⚠️ Partial</span>
                    )}
                  </td>
                  <td className="action">
                    <button 
                      className="details-btn"
                      onClick={() => setSelectedImport(imp)}
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedImport && (
        <div className="modal-overlay" onClick={() => setSelectedImport(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedImport(null)}>✕</button>
            
            <h3>📋 Import Details</h3>
            
            <div className="detail-section">
              <h4>File Information</h4>
              <div className="detail-row">
                <span className="label">File Name:</span>
                <span className="value">{selectedImport.original_filename}</span>
              </div>
              <div className="detail-row">
                <span className="label">Import Date:</span>
                <span className="value">{new Date(selectedImport.import_date).toLocaleString()}</span>
              </div>
              <div className="detail-row">
                <span className="label">File Size:</span>
                <span className="value">
                  {selectedImport.file_size ? `${(selectedImport.file_size / 1024).toFixed(2)} KB` : 'N/A'}
                </span>
              </div>
            </div>

            <div className="detail-section">
              <h4>Import Statistics</h4>
              <div className="stats-grid">
                <div className="stat">
                  <div className="stat-number">{selectedImport.total_rows}</div>
                  <div className="stat-label">Total Rows</div>
                </div>
                <div className="stat success">
                  <div className="stat-number">{selectedImport.imported_rows}</div>
                  <div className="stat-label">Imported</div>
                </div>
                <div className="stat error">
                  <div className="stat-number">{selectedImport.failed_rows}</div>
                  <div className="stat-label">Failed</div>
                </div>
                <div className="stat">
                  <div className="stat-number">
                    {selectedImport.imported_rows > 0 
                      ? ((selectedImport.imported_rows / selectedImport.total_rows) * 100).toFixed(0)
                      : 0
                    }%
                  </div>
                  <div className="stat-label">Success Rate</div>
                </div>
              </div>
            </div>

            {selectedImport.errors && Array.isArray(selectedImport.errors) && selectedImport.errors.length > 0 && (
              <div className="detail-section error-section">
                <h4>⚠️ Errors ({selectedImport.errors.length})</h4>
                <ul className="error-list">
                  {selectedImport.errors.slice(0, 10).map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                  {selectedImport.errors.length > 10 && (
                    <li>... and {selectedImport.errors.length - 10} more errors</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import '../styles/Import.css';

export default function Import() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop().toLowerCase();
      if (['xlsx', 'xls', 'csv'].includes(ext)) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('Please select an Excel (.xlsx, .xls) or CSV file');
        setFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log('📤 Uploading file:', file.name);
      
      const response = await fetch('http://localhost:5000/api/import/excel', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Upload failed');
      } else {
        console.log('✅ Import successful:', data);
        setResult(data);
        setFile(null);
        document.getElementById('fileInput').value = '';
        
        // Wait 2 seconds then hard refresh to reload ALL data
        setTimeout(() => {
          console.log('🔄 Refreshing page to reload all data...');
          window.location.reload();
        }, 2000);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="import-container">
      <h2>📥 Import Assets from Excel</h2>
      <p className="subtitle">Upload your complete asset inventory Excel file to populate the system with automatic obsolescence analysis</p>

      <div className="import-section">
        <div className="upload-box">
          <div className="upload-icon">📄</div>
          <h3>Select Excel File</h3>
          <p>Supported formats: .xlsx, .xls, .csv</p>
          
          <input
            id="fileInput"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="file-input"
          />
          
          {file && (
            <div className="file-selected">
              <span>✓ {file.name}</span>
              <span className="file-size">({(file.size / 1024).toFixed(2)} KB)</span>
            </div>
          )}
        </div>

        <button 
          onClick={handleUpload}
          disabled={!file || uploading}
          className="upload-button"
        >
          {uploading ? '⏳ Uploading & Analyzing...' : '🚀 Upload & Import'}
        </button>
      </div>

      {error && (
        <div className="alert error">
          <span>❌ Error</span>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="alert success">
          <span>✅ Success!</span>
          <div className="result-details">
            <p><strong>Imported:</strong> {result.imported} / {result.total} assets</p>
            {result.errors && result.errors.length > 0 && (
              <div className="errors">
                <strong>Errors ({result.errors.length}):</strong>
                <ul>
                  {result.errors.slice(0, 5).map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                  {result.errors.length > 5 && <li>... and {result.errors.length - 5} more</li>}
                </ul>
              </div>
            )}
            <p className="refresh-message">📊 Page will refresh to show imported data with automatic obsolescence analysis...</p>
          </div>
        </div>
      )}

      <div className="template-section">
        <h3>📋 REQUIRED Excel Columns (Complete List)</h3>
        <p><strong>⚠️ Important:</strong> Your Excel file MUST have ALL these columns. Column order doesn't matter, but names must match exactly (French or English).</p>
        
        <div className="columns-grid">
          <div className="column-item required">
            <strong>📌 General Information</strong>
            <ul>
              <li>Nom / Equipment Name</li>
              <li>Type d'actif / Asset Type</li>
              <li>Site / Site Location</li>
              <li>Marque->Nom / Brand</li>
              <li>Modèle->Nom / Model</li>
              <li>Numéro de série / Serial Number</li>
            </ul>
          </div>

          <div className="column-item required">
            <strong>🔧 Technical Information</strong>
            <ul>
              <li>IP / IP Address</li>
              <li>Statut / Status</li>
              <li>Criticité / Criticality</li>
              <li>Description / Type</li>
            </ul>
          </div>

          <div className="column-item required">
            <strong>📅 Lifecycle Dates (CRITICAL!)</strong>
            <ul>
              <li>end-of-support ⭐</li>
              <li>end-of-maintenance</li>
              <li>end-of-sales</li>
              <li>Date de mise en production</li>
            </ul>
          </div>

          <div className="column-item required">
            <strong>💰 Financial</strong>
            <ul>
              <li>Date d'achat / Acquisition Date</li>
              <li>Organisation->Nom organisation</li>
              <li>Budget Code</li>
            </ul>
          </div>
        </div>

        <div className="status-info">
          <h3>📋 Status Values</h3>
          <p>Use one of these in the Status column:</p>
          <div className="status-values">
            <span>Production / en service</span>
            <span>Secours</span>
            <span>Test</span>
            <span>Hors service</span>
          </div>
        </div>

        <div className="criticality-info">
          <h3>🎯 Criticality Values</h3>
          <p>Use one of these in the Criticality column:</p>
          <div className="criticality-values">
            <span>Critical / Critique</span>
            <span>High / Élevée</span>
            <span>Medium / Moyen</span>
            <span>Low / Faible</span>
          </div>
        </div>

        <div className="dates-info">
          <h3>📆 Date Format</h3>
          <p>All dates must be: <strong>YYYY-MM-DD</strong></p>
          <p>Example: 2026-10-13</p>
        </div>

        <div className="obscolescence-info">
          <h3>🔍 Automatic Obsolescence Calculation</h3>
          <p>Based on "End of Support" date:</p>
          <table className="obscolescence-table">
            <tbody>
              <tr><td>🟢 GREEN</td><td>Support valid (more than 12 months)</td></tr>
              <tr><td>🟡 YELLOW</td><td>Support ends in 6-12 months</td></tr>
              <tr><td>🟠 ORANGE</td><td>Support ends in less than 6 months</td></tr>
              <tr><td>🔴 RED</td><td>Support has already expired</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

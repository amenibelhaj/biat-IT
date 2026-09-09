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
      const response = await fetch('http://localhost:5000/api/import/excel', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Upload failed');
      } else {
        setResult(data);
        setFile(null);
        document.getElementById('fileInput').value = '';
        
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (err) {
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
          {uploading ? 'Uploading & Analyzing...' : '🚀 Upload & Import'}
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
            {result.errors.length > 0 && (
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
            <p className="refresh-message">Page will refresh to show imported data with automatic obsolescence analysis...</p>
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
              <li>Inventory Code / Code inventaire</li>
              <li>Equipment Name / Nom de l'équipement</li>
              <li>Asset Type / Type d'actif</li>
              <li>Site / Site d'implantation</li>
              <li>Brand / Constructeur</li>
              <li>Model / Modèle</li>
              <li>Serial Number / Numéro de série</li>
              <li>Supplier / Fournisseur</li>
              <li>Organization / Organisation</li>
            </ul>
          </div>

          <div className="column-item required">
            <strong>🔧 Technical Information</strong>
            <ul>
              <li>IP Address / Adresse IP</li>
              <li>Status / Statut</li>
              <li>Criticality / Criticité</li>
              <li>OS Version / Version IOS</li>
              <li>OS Family / Famille OS</li>
            </ul>
          </div>

          <div className="column-item required">
            <strong>💰 Financial Information</strong>
            <ul>
              <li>Acquisition Date / Date d'acquisition</li>
              <li>Purchase Price / Prix d'achat</li>
              <li>Depreciation Duration / Durée d'amortissement</li>
              <li>Cost Center / Centre de coût</li>
              <li>Budget Code / Code budget</li>
            </ul>
          </div>

          <div className="column-item required">
            <strong>📅 Lifecycle Dates (CRITICAL!)</strong>
            <ul>
              <li>Production Start Date / Date mise en production</li>
              <li>Warranty End Date / Fin de garantie</li>
              <li>End of Sales / Date End of Sale</li>
              <li>End of Maintenance / Date fin de maintenance</li>
              <li>End of Support / Fin de support constructeur ⭐</li>
              <li>End of Software Support / Fin de support logiciel</li>
              <li>Planned Replacement Date / Date prévisionnelle de remplacement</li>
            </ul>
          </div>
        </div>

        <div className="status-info">
          <h3>📋 Status Values</h3>
          <p>Use one of these in the Status column:</p>
          <div className="status-values">
            <span>Production</span>
            <span>Secours</span>
            <span>Test</span>
            <span>Hors service</span>
          </div>
        </div>

        <div className="criticality-info">
          <h3>🎯 Criticality Values</h3>
          <p>Use one of these in the Criticality column:</p>
          <div className="criticality-values">
            <span>Critical</span>
            <span>High</span>
            <span>Medium</span>
            <span>Low</span>
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

import React, { useState } from 'react';
import './App.css';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import Import from './components/Import';
import AssetInventory from './components/AssetInventory';
import ExecutiveDashboard from './components/ExecutiveDashboard';
import RiskHeatMap from './components/RiskHeatMap';
import BudgetForecast from './components/BudgetForecast';
import ReplacementRoadmap from './components/ReplacementRoadmap';
import LifecycleAnalysis from './components/LifecycleAnalysis';
import FinancialSummary from './components/FinancialSummary';

function AppContent() {
  const [page, setPage] = useState('import');
  const { language, setLanguage, currency, setCurrency, t } = useLanguage();

  return (
    <div className="App">
      <header className="header">
        <div className="header-content">
          <h1>🏦 BIAT IT ASSET LIFECYCLE MANAGEMENT</h1>
          <p className="subtitle">Strategic Analysis & Obsolescence Management</p>
          
          <div className="lang-currency">
            <select value={language} onChange={e => setLanguage(e.target.value)}>
              <option value="en">🌐 English</option>
              <option value="fr">🌐 Français</option>
            </select>
            <select value={currency} onChange={e => setCurrency(e.target.value)}>
              <option value="USD">💵 USD</option>
              <option value="TND">💱 TND (د.ت)</option>
            </select>
          </div>

          <nav className="nav">
            <button className={page === 'import' ? 'active' : ''} onClick={() => setPage('import')}>
              📥 Import
            </button>
            <button className={page === 'inventory' ? 'active' : ''} onClick={() => setPage('inventory')}>
              📦 Inventory
            </button>
            <button className={page === 'executive' ? 'active' : ''} onClick={() => setPage('executive')}>
              📊 Executive
            </button>
            <button className={page === 'risk' ? 'active' : ''} onClick={() => setPage('risk')}>
              🔥 Risk Map
            </button>
            <button className={page === 'budget' ? 'active' : ''} onClick={() => setPage('budget')}>
              💰 Budget
            </button>
            <button className={page === 'roadmap' ? 'active' : ''} onClick={() => setPage('roadmap')}>
              📅 Roadmap
            </button>
            <button className={page === 'lifecycle' ? 'active' : ''} onClick={() => setPage('lifecycle')}>
              🔄 Lifecycle
            </button>
            <button className={page === 'financial' ? 'active' : ''} onClick={() => setPage('financial')}>
              💼 Financial
            </button>
          </nav>
        </div>
      </header>

      <main className="main-content">
        {page === 'import' && <Import />}
        {page === 'inventory' && <AssetInventory />}
        {page === 'executive' && <ExecutiveDashboard />}
        {page === 'risk' && <RiskHeatMap />}
        {page === 'budget' && <BudgetForecast />}
        {page === 'roadmap' && <ReplacementRoadmap />}
        {page === 'lifecycle' && <LifecycleAnalysis />}
        {page === 'financial' && <FinancialSummary />}
      </main>
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

export default App;

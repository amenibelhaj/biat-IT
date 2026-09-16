import React, { useState } from 'react';
import './theme.css';
import './App.css';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';

import Import from './components/Import';
import ImportHistory from './components/ImportHistory';
import AssetInventory from './components/AssetInventory';
import ExecutiveDashboard from './components/ExecutiveDashboard';
import RiskHeatMap from './components/RiskHeatMap';
import BudgetForecast from './components/BudgetForecast';
import ReplacementRoadmap from './components/ReplacementRoadmap';
import LifecycleAnalysis from './components/LifecycleAnalysis';
import FinancialSummary from './components/FinancialSummary';

const SECTIONS = [
  {
    group: 'Pilotage',
    items: [
      { id: 'executive', key: 'nav.executive', Component: ExecutiveDashboard },
      { id: 'risk',      key: 'nav.risk',      Component: RiskHeatMap },
      { id: 'lifecycle', key: 'nav.lifecycle', Component: LifecycleAnalysis }
    ]
  },
  {
    group: 'Planification',
    items: [
      { id: 'roadmap',   key: 'nav.roadmap',   Component: ReplacementRoadmap },
      { id: 'budget',    key: 'nav.budget',    Component: BudgetForecast },
      { id: 'financial', key: 'nav.financial', Component: FinancialSummary }
    ]
  },
  {
    group: 'Données',
    items: [
      { id: 'inventory', key: 'nav.inventory', Component: AssetInventory },
      { id: 'import',    key: 'nav.import',    Component: Import },
      { id: 'history',   key: 'nav.history',   Component: ImportHistory }
    ]
  }
];

const ALL_ITEMS = SECTIONS.flatMap((s) => s.items);

function AppContent() {
  const [page, setPage] = useState('executive');
  const { language, setLanguage, currency, setCurrency, t } = useLanguage();

  const active = ALL_ITEMS.find((i) => i.id === page) || ALL_ITEMS[0];
  const ActiveComponent = active.Component;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <img
            src={`${process.env.PUBLIC_URL}/biat-logo.png`}
            alt="BIAT Innovation & Technology"
          />
        </div>
        <div className="brand-caption">
          <div className="brand-title">Gestion des actifs IT</div>
          <div className="brand-sub">DSI — Cycle de vie & obsolescence</div>
        </div>

        <nav className="side-nav">
          {SECTIONS.map((section) => (
            <div className="nav-group" key={section.group}>
              <div className="nav-group-label">{section.group}</div>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  className={page === item.id ? 'nav-item active' : 'nav-item'}
                  onClick={() => setPage(item.id)}
                >
                  {t(item.key)}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="side-foot">
          <select
            className="input"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label="Langue"
          >
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
          <select
            className="input"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            aria-label="Devise"
          >
            <option value="TND">Dinar (DT)</option>
            <option value="USD">Dollar ($)</option>
          </select>
        </div>
      </aside>

      <main className="content">
        <ActiveComponent />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

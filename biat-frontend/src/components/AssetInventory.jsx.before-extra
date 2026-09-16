import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Panel, StatusBadge, RiskPill, Loading, EmptyState, ErrorState, fmtDate, fmtInt
} from './ui';

const EMPTY_FILTERS = { site: '', type: '', status: '', criticality: '', obsolescence: '', search: '' };

export default function AssetInventory() {
  const { formatCurrency, t } = useLanguage();
  const [assets, setAssets] = useState([]);
  const [options, setOptions] = useState({ sites: [], types: [], statuses: [], criticalities: [] });
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selected, setSelected] = useState(null);
  const [state, setState] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/assets/filters`)
      .then((r) => r.json())
      .then((d) => setOptions({
        sites: d.sites || [], types: d.types || [],
        statuses: d.statuses || [], criticalities: d.criticalities || []
      }))
      .catch(() => { /* filters are a convenience; failure is not fatal */ });
  }, []);

  const load = useCallback(() => {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) qs.append(k, v); });
    setState('loading');
    fetch(`${API_BASE_URL}/assets?${qs.toString()}`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => { setAssets(Array.isArray(d) ? d : []); setState('ready'); })
      .catch((e) => { setError(e.message); setState('error'); });
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(load, filters.search ? 300 : 0); // debounce typing
    return () => clearTimeout(timer);
  }, [load, filters.search]);

  const exportCsv = () => {
    const cols = ['inventory_code', 'name', 'type', 'site', 'brand', 'model', 'ip_address',
                  'status', 'criticality', 'end_of_support', 'status_live', 'risk_score_live',
                  'estimated_replacement_cost'];
    const escape = (v) => `"${String(v === null || v === undefined ? '' : v).replace(/"/g, '""')}"`;
    const csv = [cols.join(','), ...assets.map((a) => cols.map((c) => escape(a[c])).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventaire-biat-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (state === 'error') return <ErrorState error={error} />;

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Inventaire des actifs</h1>
        <p className="page-subtitle">
          {state === 'ready' ? `${fmtInt(assets.length)} actif(s) affiché(s)` : t('common.loading')}
        </p>
      </div>

      <Panel>
        <div className="field-row">
          <input
            className="input grow"
            placeholder="Rechercher un nom, code, IP ou modèle…"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <select className="input" value={filters.obsolescence}
                  onChange={(e) => setFilters({ ...filters, obsolescence: e.target.value })}>
            <option value="">Tous les statuts d'obsolescence</option>
            <option value="RED">Support expiré</option>
            <option value="ORANGE">Fin de support &lt; 6 mois</option>
            <option value="YELLOW">Fin de support &lt; 12 mois</option>
            <option value="GREEN">Support valide</option>
            <option value="UNKNOWN">Date inconnue</option>
          </select>
          <select className="input" value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="">Toutes les familles</option>
            {options.types.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select className="input" value={filters.site}
                  onChange={(e) => setFilters({ ...filters, site: e.target.value })}>
            <option value="">Tous les sites</option>
            {options.sites.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select className="input" value={filters.criticality}
                  onChange={(e) => setFilters({ ...filters, criticality: e.target.value })}>
            <option value="">Toutes criticités</option>
            {options.criticalities.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <button className="btn ghost" onClick={() => setFilters(EMPTY_FILTERS)}>Réinitialiser</button>
          <button className="btn primary" onClick={exportCsv} disabled={!assets.length}>Exporter CSV</button>
        </div>
      </Panel>

      <div style={{ height: 16 }} />

      <Panel tight>
        {state === 'loading' ? <Loading /> : !assets.length ? (
          <EmptyState
            title="Aucun actif ne correspond"
            text="Modifiez les filtres, ou importez un fichier d'inventaire depuis l'onglet Import."
          />
        ) : (
          <div className="table-wrap" style={{ maxHeight: '62vh', overflowY: 'auto' }}>
            <table className="data">
              <thead>
                <tr>
                  <th>Équipement</th>
                  <th>Type</th>
                  <th>Site</th>
                  <th>Marque / Modèle</th>
                  <th>IP</th>
                  <th>Criticité</th>
                  <th>Obsolescence</th>
                  <th>Fin de support</th>
                  <th className="right">Risque</th>
                  <th className="right">Coût est.</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => (
                  <tr key={a.id} onClick={() => setSelected(a)} style={{ cursor: 'pointer' }}>
                    <td className="strong">{a.name}</td>
                    <td>{a.type}</td>
                    <td>{a.site}</td>
                    <td>{[a.brand, a.model].filter(Boolean).join(' ') || '—'}</td>
                    <td className="mono">{a.ip_address || '—'}</td>
                    <td><span className={`chip ${String(a.criticality).toLowerCase()}`}>{a.criticality}</span></td>
                    <td><StatusBadge status={a.status_live} label={t(`status.${a.status_live}`)} /></td>
                    <td className="mono">{fmtDate(a.end_of_support)}</td>
                    <td className="right"><RiskPill score={a.risk_score_live} /></td>
                    <td className="right num">{formatCurrency(a.estimated_replacement_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(11,37,69,.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20, zIndex: 50
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="panel"
            style={{ maxWidth: 680, width: '100%', maxHeight: '86vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}
          >
            <div className="panel-head">
              <div>
                <div className="section-title">{selected.name}</div>
                <div className="section-sub">{selected.inventory_code}</div>
              </div>
              <button className="btn ghost" onClick={() => setSelected(null)}>Fermer</button>
            </div>
            <div className="panel-body">
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <StatusBadge status={selected.status_live} label={t(`status.${selected.status_live}`)} />
                <span className={`chip ${String(selected.criticality).toLowerCase()}`}>{selected.criticality}</span>
                <RiskPill score={selected.risk_score_live} />
              </div>

              <table className="data">
                <tbody>
                  <tr><td>Type</td><td className="strong">{selected.type}</td></tr>
                  <tr><td>Site</td><td className="strong">{selected.site}</td></tr>
                  <tr><td>Marque / Modèle</td><td className="strong">{[selected.brand, selected.model].filter(Boolean).join(' ') || '—'}</td></tr>
                  <tr><td>Numéro de série</td><td className="strong mono">{selected.serial_number || '—'}</td></tr>
                  <tr><td>Adresse IP</td><td className="strong mono">{selected.ip_address || '—'}</td></tr>
                  <tr><td>Statut d'exploitation</td><td className="strong">{selected.status}</td></tr>
                  <tr><td>Version OS / IOS</td><td className="strong">{selected.os_version || '—'}</td></tr>
                  <tr><td>Mise en production</td><td className="strong">{fmtDate(selected.production_start_date)}</td></tr>
                  <tr><td>Fin de garantie</td><td className="strong">{fmtDate(selected.warranty_end_date)}</td></tr>
                  <tr><td>Fin de commercialisation</td><td className="strong">{fmtDate(selected.end_of_sales)}</td></tr>
                  <tr><td>Fin de maintenance</td><td className="strong">{fmtDate(selected.end_of_maintenance)}</td></tr>
                  <tr><td>Fin de support constructeur</td><td className="strong">{fmtDate(selected.end_of_support)}</td></tr>
                  <tr><td>Étape du cycle de vie</td><td className="strong">{selected.lifecycle_stage_live}</td></tr>
                  <tr>
                    <td>Score de risque</td>
                    <td className="strong">
                      {Math.round(Number(selected.risk_score_live))} / 100
                      <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>
                        {' '}(échéance {selected.risk_time_component} + criticité {selected.risk_criticality_component})
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>Coût de remplacement</td>
                    <td className="strong">
                      {formatCurrency(selected.estimated_replacement_cost)}
                      {selected.cost_is_estimated && (
                        <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}> (estimé)</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

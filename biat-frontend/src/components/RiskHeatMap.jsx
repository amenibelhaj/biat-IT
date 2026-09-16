import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { useLanguage } from '../contexts/LanguageContext';
import { Panel, Loading, EmptyState, ErrorState, fmtInt } from './ui';

const CRITICALITIES = ['Critical', 'High', 'Medium', 'Low'];
const CRIT_LABELS = { Critical: 'Critique', High: 'Élevée', Medium: 'Moyenne', Low: 'Faible' };

/**
 * A cell's colour reflects the average risk score of the assets in it,
 * on a single continuous scale. This is more informative than colouring
 * by obsolescence status alone, because it combines how soon support
 * ends with how much the equipment matters.
 */
function cellStyle(score, count) {
  if (!count) return { background: 'var(--surface-2)', color: 'var(--ink-3)' };
  const s = Number(score) || 0;
  if (s >= 75) return { background: '#c2312d', color: '#fff' };
  if (s >= 55) return { background: '#e06c5a', color: '#fff' };
  if (s >= 40) return { background: '#d97706', color: '#fff' };
  if (s >= 25) return { background: '#e8c14f', color: '#3d3000' };
  if (s >= 12) return { background: '#a9cfb5', color: '#173d29' };
  return { background: '#d8ecdf', color: '#1c7c54' };
}

export default function RiskHeatMap() {
  const { formatCurrency, t } = useLanguage();
  const [rows, setRows] = useState([]);
  const [state, setState] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE_URL}/strategic/dashboard/risk-heatmap`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => { if (!cancelled) { setRows(Array.isArray(d) ? d : []); setState('ready'); } })
      .catch((e) => { if (!cancelled) { setError(e.message); setState('error'); } });
    return () => { cancelled = true; };
  }, []);

  if (state === 'loading') return <Loading />;
  if (state === 'error') return <ErrorState error={error} />;
  if (!rows.length) return <EmptyState title={t('common.noData')} text={t('common.importFirst')} />;

  const types = [...new Set(rows.map((r) => r.type))].sort();
  const cell = (type, crit) => rows.find((r) => r.type === type && r.criticality === crit);

  const worst = rows
    .filter((r) => Number(r.avg_risk_score) >= 55)
    .sort((a, b) => Number(b.avg_risk_score) - Number(a.avg_risk_score));

  const grandTotal = rows.reduce((sum, r) => sum + Number(r.count), 0);

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Cartographie des risques</h1>
        <p className="page-subtitle">
          Croisement famille d'équipement × criticité métier — {fmtInt(grandTotal)} actifs
        </p>
      </div>

      {worst.length > 0 && (
        <div className="notice warn">
          <div>
            <b>{worst.length} combinaison(s) à risque élevé.</b>{' '}
            {worst.slice(0, 3).map((w) => `${w.type} / ${CRIT_LABELS[w.criticality] || w.criticality}`).join(', ')}
            {worst.length > 3 ? ` et ${worst.length - 3} autre(s)` : ''} —
            à traiter en priorité dans le plan de renouvellement.
          </div>
        </div>
      )}

      <Panel
        title="Matrice de risque"
        subtitle="Chaque case indique le nombre d'actifs et leur score de risque moyen (0-100)"
      >
        <div className="table-wrap">
          <table className="data heat">
            <thead>
              <tr>
                <th style={{ minWidth: 130 }}>Famille</th>
                {CRITICALITIES.map((c) => (
                  <th key={c} style={{ textAlign: 'center' }}>{CRIT_LABELS[c]}</th>
                ))}
                <th className="right">Total</th>
                <th className="right">Exposition</th>
              </tr>
            </thead>
            <tbody>
              {types.map((type) => {
                const typeRows = rows.filter((r) => r.type === type);
                const totalCount = typeRows.reduce((s, r) => s + Number(r.count), 0);
                const totalValue = typeRows.reduce((s, r) => s + Number(r.total_value), 0);
                return (
                  <tr key={type}>
                    <td className="strong">{type}</td>
                    {CRITICALITIES.map((crit) => {
                      const c = cell(type, crit);
                      const count = c ? Number(c.count) : 0;
                      const score = c ? Number(c.avg_risk_score) : 0;
                      const style = cellStyle(score, count);
                      return (
                        <td key={crit} style={{ padding: 5, textAlign: 'center' }}>
                          <div style={{
                            ...style,
                            borderRadius: 'var(--r-sm)',
                            padding: '9px 4px',
                            lineHeight: 1.25
                          }}>
                            <div className="num" style={{ fontSize: 16, fontWeight: 660 }}>{count || '—'}</div>
                            {count > 0 && (
                              <div style={{ fontSize: 10.5, opacity: .9 }}>risque {Math.round(score)}</div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="right num strong">{totalCount}</td>
                    <td className="right num">{formatCurrency(totalValue)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Score de risque&nbsp;:</span>
          {[
            ['0-11', '#d8ecdf', '#1c7c54'],
            ['12-24', '#a9cfb5', '#173d29'],
            ['25-39', '#e8c14f', '#3d3000'],
            ['40-54', '#d97706', '#fff'],
            ['55-74', '#e06c5a', '#fff'],
            ['75-100', '#c2312d', '#fff']
          ].map(([label, bg, fg]) => (
            <span key={label} style={{
              background: bg, color: fg, padding: '2.5px 10px',
              borderRadius: 100, fontSize: 11, fontWeight: 600
            }}>{label}</span>
          ))}
        </div>
      </Panel>

      <div style={{ height: 16 }} />

      <Panel
        title="Méthode de calcul"
        subtitle="Le score est additif, pour que chaque valeur puisse être justifiée"
      >
        <div className="grid grid-2">
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 620, marginBottom: 8 }}>
              Urgence de l'échéance — 0 à 60 points
            </div>
            <table className="data">
              <tbody>
                <tr><td>Support déjà expiré</td><td className="right strong">60</td></tr>
                <tr><td>Fin de support &lt; 3 mois</td><td className="right strong">50</td></tr>
                <tr><td>Fin de support &lt; 6 mois</td><td className="right strong">40</td></tr>
                <tr><td>Fin de support &lt; 12 mois</td><td className="right strong">25</td></tr>
                <tr><td>Fin de support &lt; 24 mois</td><td className="right strong">10</td></tr>
                <tr><td>Au-delà</td><td className="right strong">0</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 620, marginBottom: 8 }}>
              Criticité métier — 0 à 40 points
            </div>
            <table className="data">
              <tbody>
                <tr><td>Critique</td><td className="right strong">40</td></tr>
                <tr><td>Élevée</td><td className="right strong">28</td></tr>
                <tr><td>Moyenne</td><td className="right strong">15</td></tr>
                <tr><td>Faible</td><td className="right strong">5</td></tr>
              </tbody>
            </table>
            <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 10 }}>
              Un routeur critique dont le support a expiré obtient donc 60 + 40 = 100,
              tandis qu'un switch de criticité moyenne à 10 mois obtient 25 + 15 = 40.
            </p>
          </div>
        </div>
      </Panel>
    </>
  );
}

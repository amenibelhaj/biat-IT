import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { API_BASE_URL } from '../config';
import { useLanguage } from '../contexts/LanguageContext';
import { Panel, Kpi, Loading, ErrorState, ChartTooltip, fmtInt } from './ui';

/* The six stages of the BIAT IT asset lifecycle, in order. */
const STAGES = [
  { name: 'Exploitation',                color: '#1c7c54', desc: "En production, support constructeur valide" },
  { name: 'Maintenance',                 color: '#b59000', desc: 'Fin de support dans moins de 12 mois' },
  { name: 'Fin de support constructeur', color: '#d97706', desc: 'Fin de support dans moins de 6 mois' },
  { name: 'Obsolescence',                color: '#c2312d', desc: 'Support constructeur expiré' },
  { name: 'Remplacement',                color: '#6b5b95', desc: 'Remplacement engagé' },
  { name: 'Sortie du patrimoine',        color: '#6b7280', desc: 'Retiré du parc' }
];

export default function LifecycleAnalysis() {
  const { formatCurrency, formatCompact } = useLanguage();
  const [rows, setRows] = useState([]);
  const [state, setState] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE_URL}/strategic/dashboard/lifecycle-analysis`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => { if (!cancelled) { setRows(Array.isArray(d) ? d : []); setState('ready'); } })
      .catch((e) => { if (!cancelled) { setError(e.message); setState('error'); } });
    return () => { cancelled = true; };
  }, []);

  if (state === 'loading') return <Loading />;
  if (state === 'error') return <ErrorState error={error} />;

  const byStage = STAGES.map((s) => {
    const found = rows.find((r) => r.lifecycle_stage === s.name);
    return {
      ...s,
      shortName: s.name.length > 18 ? s.name.split(' ')[0] : s.name,
      count: found ? Number(found.count) : 0,
      value: found ? Number(found.total_value) : 0,
      risk: found ? Number(found.avg_risk_score) : 0
    };
  });

  const total = byStage.reduce((s, r) => s + r.count, 0);
  const endOfLife = byStage[3].count + byStage[4].count;

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Analyse du cycle de vie</h1>
        <p className="page-subtitle">
          Répartition du parc sur les six étapes du cycle de vie des actifs IT
        </p>
      </div>

      <div className="kpi-row">
        <Kpi tone="navy"  label="Parc suivi"         value={fmtInt(total)} />
        <Kpi tone="green" label="En exploitation"    value={fmtInt(byStage[0].count)}
             note={total ? `${Math.round((byStage[0].count / total) * 100)} % du parc` : null} />
        <Kpi tone="red"   label="En obsolescence"    value={fmtInt(byStage[3].count)}
             note={total ? `${Math.round((byStage[3].count / total) * 100)} % du parc` : null} />
        <Kpi tone="orange"label="Fin de vie engagée" value={fmtInt(endOfLife)} note="obsolescence + remplacement" />
        <Kpi tone="accent"label="Valeur suivie"      value={formatCompact(byStage.reduce((s, r) => s + r.value, 0))} />
      </div>

      {/* Visual pipeline of the six stages */}
      <Panel title="Chaîne du cycle de vie" subtitle="Exploitation → Maintenance → Fin de support → Obsolescence → Remplacement → Sortie">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {byStage.map((s, i) => (
            <div key={s.name} style={{
              flex: '1 1 150px',
              minWidth: 150,
              border: '1px solid var(--line)',
              borderTop: `3px solid ${s.color}`,
              borderRadius: 'var(--r-sm)',
              padding: '12px 13px',
              background: s.count > 0 ? 'var(--surface)' : 'var(--surface-2)',
              opacity: s.count > 0 ? 1 : 0.62
            }}>
              <div style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 650, letterSpacing: '.05em' }}>
                ÉTAPE {i + 1}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 620, marginTop: 4, lineHeight: 1.3 }}>{s.name}</div>
              <div className="num" style={{ fontSize: 24, fontWeight: 660, color: s.color, marginTop: 8 }}>
                {s.count}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4, lineHeight: 1.35 }}>
                {s.desc}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <div style={{ height: 16 }} />

      <div className="grid grid-2">
        <Panel title="Volume par étape">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byStage} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--ink-3)' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis
                type="category" dataKey="shortName" width={104}
                tick={{ fontSize: 11, fill: 'var(--ink-2)' }} tickLine={false} axisLine={false}
              />
              <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={<ChartTooltip formatter={(v) => `${v} actifs`} />} />
              <Bar dataKey="count" name="Actifs" radius={[0, 3, 3, 0]} maxBarSize={26}>
                {byStage.map((s) => <Cell key={s.name} fill={s.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Exposition financière par étape">
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Étape</th>
                  <th className="right">Actifs</th>
                  <th className="right">Risque moyen</th>
                  <th className="right">Valeur</th>
                </tr>
              </thead>
              <tbody>
                {byStage.map((s) => (
                  <tr key={s.name}>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                        <span className="legend-swatch" style={{ background: s.color }} />
                        {s.name}
                      </span>
                    </td>
                    <td className="right num">{s.count}</td>
                    <td className="right num">{s.count ? Math.round(s.risk) : '—'}</td>
                    <td className="right num">{s.count ? formatCurrency(s.value) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}

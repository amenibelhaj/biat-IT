import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { API_BASE_URL } from '../config';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Panel, Kpi, Loading, EmptyState, ErrorState, ChartTooltip,
  EstimateNotice, fmtInt
} from './ui';

export default function BudgetForecast() {
  const { formatCurrency, formatCompact, t } = useLanguage();
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE_URL}/strategic/dashboard/budget-forecast`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => { if (!cancelled) { setData(d); setState('ready'); } })
      .catch((e) => { if (!cancelled) { setError(e.message); setState('error'); } });
    return () => { cancelled = true; };
  }, []);

  if (state === 'loading') return <Loading />;
  if (state === 'error') return <ErrorState error={error} />;

  const byYear = (data.by_year || []).map((r) => ({
    year: String(r.year),
    cost: Number(r.cost),
    count: Number(r.count),
    critical: Number(r.critical_count)
  }));

  if (!byYear.length) return <EmptyState title={t('common.noData')} text={t('common.importFirst')} />;

  const currentYear = new Date().getFullYear();
  const totalCost = byYear.reduce((s, r) => s + r.cost, 0);
  const overdue = data.overdue || {};
  const peak = byYear.reduce((a, b) => (b.cost > a.cost ? b : a), byYear[0]);

  // Equipment families present, for the stacked composition table
  const types = [...new Set((data.by_year_type || []).map((r) => r.type))];

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Prévision budgétaire pluriannuelle</h1>
        <p className="page-subtitle">
          Besoin de renouvellement réparti par exercice, selon la fin de support constructeur
        </p>
      </div>

      <EstimateNotice />

      <div className="kpi-row">
        <Kpi tone="navy"   label="Besoin total"      value={formatCompact(totalCost)} note={`${fmtInt(byYear.reduce((s, r) => s + r.count, 0))} actifs`} />
        <Kpi tone="red"    label="Retard à rattraper" value={formatCompact(overdue.cost)} note={`${fmtInt(overdue.count)} actifs déjà hors support`} />
        <Kpi tone="orange" label={`Exercice le plus chargé`} value={peak.year} note={formatCurrency(peak.cost)} />
        <Kpi tone="accent" label="Exercices couverts" value={fmtInt(byYear.length)} note={`${byYear[0].year} – ${byYear[byYear.length - 1].year}`} />
      </div>

      <Panel
        title="Besoin budgétaire par exercice"
        subtitle="Les exercices passés correspondent à des équipements dont le renouvellement est en retard"
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={byYear} margin={{ top: 8, right: 10, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 12, fill: 'var(--ink-3)' }} tickLine={false} axisLine={{ stroke: 'var(--line)' }} />
            <YAxis
              tick={{ fontSize: 11.5, fill: 'var(--ink-3)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatCompact(v)}
              width={72}
            />
            <Tooltip
              cursor={{ fill: 'var(--surface-2)' }}
              content={<ChartTooltip formatter={(v, name) => (name === 'Budget' ? formatCurrency(v) : v)} />}
            />
            <Bar dataKey="cost" name="Budget" radius={[3, 3, 0, 0]} maxBarSize={64}>
              {byYear.map((entry) => (
                <Cell
                  key={entry.year}
                  fill={Number(entry.year) < currentYear ? '#c2312d'
                      : Number(entry.year) === currentYear ? '#d97706'
                      : '#1b3f6e'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--ink-2)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="legend-swatch" style={{ background: '#c2312d' }} />En retard
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="legend-swatch" style={{ background: '#d97706' }} />Exercice en cours
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="legend-swatch" style={{ background: '#1b3f6e' }} />À planifier
          </span>
        </div>
      </Panel>

      <div style={{ height: 16 }} />

      <Panel title="Détail par exercice et famille d'équipement">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Exercice</th>
                {types.map((tp) => <th key={tp} className="right">{tp}</th>)}
                <th className="right">Actifs</th>
                <th className="right">Dont critiques</th>
                <th className="right">Budget</th>
              </tr>
            </thead>
            <tbody>
              {byYear.map((y) => (
                <tr key={y.year}>
                  <td className="strong">
                    {y.year}
                    {Number(y.year) < currentYear && (
                      <span className="chip critical" style={{ marginLeft: 8 }}>retard</span>
                    )}
                  </td>
                  {types.map((tp) => {
                    const match = (data.by_year_type || []).find(
                      (r) => String(r.year) === y.year && r.type === tp
                    );
                    return (
                      <td key={tp} className="right num">
                        {match ? formatCurrency(match.cost) : '—'}
                      </td>
                    );
                  })}
                  <td className="right num">{y.count}</td>
                  <td className="right num">{y.critical}</td>
                  <td className="right num strong">{formatCurrency(y.cost)}</td>
                </tr>
              ))}
              <tr style={{ background: 'var(--surface-2)' }}>
                <td className="strong">Total</td>
                {types.map((tp) => {
                  const sum = (data.by_year_type || [])
                    .filter((r) => r.type === tp)
                    .reduce((s, r) => s + Number(r.cost), 0);
                  return <td key={tp} className="right num strong">{formatCurrency(sum)}</td>;
                })}
                <td className="right num strong">{byYear.reduce((s, r) => s + r.count, 0)}</td>
                <td className="right num strong">{byYear.reduce((s, r) => s + r.critical, 0)}</td>
                <td className="right num strong">{formatCurrency(totalCost)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

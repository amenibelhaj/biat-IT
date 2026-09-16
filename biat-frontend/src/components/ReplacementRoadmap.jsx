import React, { useState, useEffect } from 'react';
import {
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { API_BASE_URL } from '../config';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Panel, Kpi, Loading, EmptyState, ErrorState, ChartTooltip, Legend, fmtInt
} from './ui';

const MONTH_LABELS = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];

function labelForMonth(ym) {
  const [y, m] = String(ym).split('-');
  return `${MONTH_LABELS[Number(m) - 1] || m} ${String(y).slice(2)}`;
}

export default function ReplacementRoadmap() {
  const { formatCurrency, formatCompact, t } = useLanguage();
  const [rows, setRows] = useState([]);
  const [state, setState] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE_URL}/strategic/dashboard/replacement-roadmap`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => { if (!cancelled) { setRows(Array.isArray(d) ? d : []); setState('ready'); } })
      .catch((e) => { if (!cancelled) { setError(e.message); setState('error'); } });
    return () => { cancelled = true; };
  }, []);

  if (state === 'loading') return <Loading />;
  if (state === 'error') return <ErrorState error={error} />;
  if (!rows.length) return <EmptyState title={t('common.noData')} text={t('common.importFirst')} />;

  const nowKey = new Date().toISOString().slice(0, 7);

  let running = 0;
  const chartData = rows.map((r) => {
    running += Number(r.total_value);
    return {
      month: r.month,
      label: labelForMonth(r.month),
      count: Number(r.count),
      critical: Number(r.critical_count),
      value: Number(r.total_value),
      cumulative: running,
      past: r.month < nowKey
    };
  });

  const past = chartData.filter((d) => d.past);
  const future = chartData.filter((d) => !d.past);
  const next12 = future.slice(0, 12);

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Plan de renouvellement</h1>
        <p className="page-subtitle">
          Échéancier mensuel sur 36 mois, avec cumul budgétaire
        </p>
      </div>

      <div className="kpi-row">
        <Kpi tone="red"    label="En retard"        value={fmtInt(past.reduce((s, d) => s + d.count, 0))}
             note={formatCurrency(past.reduce((s, d) => s + d.value, 0))} />
        <Kpi tone="orange" label="12 prochains mois" value={fmtInt(next12.reduce((s, d) => s + d.count, 0))}
             note={formatCurrency(next12.reduce((s, d) => s + d.value, 0))} />
        <Kpi tone="navy"   label="Total planifié"    value={fmtInt(chartData.reduce((s, d) => s + d.count, 0))}
             note={`sur ${chartData.length} mois`} />
        <Kpi tone="accent" label="Cumul budgétaire"  value={formatCompact(running)} note="fin de période" />
      </div>

      <Panel
        title="Échéancier de remplacement"
        subtitle="Barres : nombre d'actifs par mois — Surface : budget cumulé"
      >
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10.5, fill: 'var(--ink-3)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--line)' }}
              interval="preserveStartEnd"
              minTickGap={14}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: 'var(--ink-3)' }}
              tickLine={false} axisLine={false} allowDecimals={false}
              width={34}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: 'var(--ink-3)' }}
              tickLine={false} axisLine={false}
              tickFormatter={(v) => formatCompact(v)}
              width={70}
            />
            <Tooltip
              cursor={{ fill: 'var(--surface-2)' }}
              content={<ChartTooltip formatter={(v, name) =>
                (name === 'Budget cumulé' ? formatCurrency(v) : `${v} actifs`)} />}
            />
            <ReferenceLine
              yAxisId="left"
              x={chartData.find((d) => !d.past)?.label}
              stroke="var(--st-red)"
              strokeDasharray="4 3"
              label={{ value: "aujourd'hui", position: 'top', fontSize: 10, fill: 'var(--st-red)' }}
            />
            <Area
              yAxisId="right" type="monotone" dataKey="cumulative" name="Budget cumulé"
              stroke="#0a7ea4" strokeWidth={2} fill="#0a7ea4" fillOpacity={0.10}
            />
            <Bar yAxisId="left" dataKey="count" name="Actifs" fill="#1b3f6e" radius={[2, 2, 0, 0]} maxBarSize={26} />
            <Bar yAxisId="left" dataKey="critical" name="Dont critiques" fill="#c2312d" radius={[2, 2, 0, 0]} maxBarSize={26} />
          </ComposedChart>
        </ResponsiveContainer>
        <div style={{ marginTop: 10 }}>
          <Legend items={[
            { label: 'Actifs à remplacer', color: '#1b3f6e' },
            { label: 'Dont critiques', color: '#c2312d' },
            { label: 'Budget cumulé', color: '#0a7ea4' }
          ]} />
        </div>
      </Panel>

      <div style={{ height: 16 }} />

      <Panel title="Détail mensuel">
        <div className="table-wrap" style={{ maxHeight: 420, overflowY: 'auto' }}>
          <table className="data">
            <thead>
              <tr>
                <th>Mois</th>
                <th className="right">Actifs</th>
                <th className="right">Critiques</th>
                <th className="right">Budget</th>
                <th className="right">Cumul</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((d) => (
                <tr key={d.month} style={d.past ? { background: 'var(--st-red-bg)' } : undefined}>
                  <td className="strong mono">
                    {d.month}
                    {d.past && <span className="chip critical" style={{ marginLeft: 8 }}>retard</span>}
                  </td>
                  <td className="right num">{d.count}</td>
                  <td className="right num">{d.critical}</td>
                  <td className="right num">{formatCurrency(d.value)}</td>
                  <td className="right num strong">{formatCurrency(d.cumulative)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

import React, { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import { API_BASE_URL } from '../config';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Panel, Kpi, StatusBadge, RiskPill, Loading, EmptyState, ErrorState,
  ChartTooltip, Legend, EstimateNotice, STATUS_COLORS, fmtDate, fmtInt
} from './ui';

export default function ExecutiveDashboard() {
  const { formatCurrency, formatCompact, t } = useLanguage();
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE_URL}/strategic/dashboard/executive`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => { if (!cancelled) { setData(d); setState('ready'); } })
      .catch((e) => { if (!cancelled) { setError(e.message); setState('error'); } });
    return () => { cancelled = true; };
  }, []);

  if (state === 'loading') return <Loading />;
  if (state === 'error') return <ErrorState error={error} />;

  const s = data.summary || {};
  const total = Number(s.total_assets) || 0;
  if (!total) {
    return <EmptyState title={t('common.noData')} text={t('common.importFirst')} />;
  }

  const statusData = [
    { key: 'RED',    name: t('status.RED'),    value: Number(s.red_count) || 0 },
    { key: 'ORANGE', name: t('status.ORANGE'), value: Number(s.orange_count) || 0 },
    { key: 'YELLOW', name: t('status.YELLOW'), value: Number(s.yellow_count) || 0 },
    { key: 'GREEN',  name: t('status.GREEN'),  value: Number(s.green_count) || 0 },
    { key: 'UNKNOWN',name: t('status.UNKNOWN'),value: Number(s.unknown_count) || 0 }
  ].filter((d) => d.value > 0);

  const typeData = (data.by_type || []).map((r) => ({
    type: r.type,
    total: Number(r.count),
    expired: Number(r.red_count)
  }));

  const redShare = total ? Math.round((Number(s.red_count) / total) * 100) : 0;

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Synthèse de direction</h1>
        <p className="page-subtitle">
          Position consolidée du parc IT au {new Date().toLocaleDateString('fr-FR')} — {fmtInt(total)} actifs suivis
        </p>
      </div>

      {Number(s.red_count) > 0 && (
        <div className="notice alert">
          <div>
            <b>{fmtInt(s.red_count)} actif(s) hors support constructeur</b> ({redShare} % du parc).
            Ces équipements ne reçoivent plus de correctifs de sécurité et représentent
            un risque de conformité bancaire immédiat. Budget de régularisation estimé :
            <b> {formatCurrency(s.immediate_budget_required)}</b>.
          </div>
        </div>
      )}

      <div className="kpi-row">
        <Kpi tone="navy"  label="Parc total"           value={fmtInt(total)} note="actifs sous suivi" />
        <Kpi tone="red"   label="Support expiré"       value={fmtInt(s.red_count)}    note={`${redShare} % du parc`} />
        <Kpi tone="orange"label="Échéance < 6 mois"    value={fmtInt(s.orange_count)} note="commande à lancer" />
        <Kpi tone="yellow"label="Échéance < 12 mois"   value={fmtInt(s.yellow_count)} note="à budgéter" />
        <Kpi tone="green" label="Support valide"       value={fmtInt(s.green_count)}  note="surveillance simple" />
        <Kpi tone="accent"label="Exposition totale"    value={formatCompact(s.total_replacement_exposure)} note="coût de remplacement estimé" />
      </div>

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <Panel
          title="Répartition par niveau d'obsolescence"
          subtitle="Classification automatique selon la date de fin de support constructeur"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <ResponsiveContainer width="55%" height={230} minWidth={200}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%" cy="50%"
                  innerRadius={52}
                  outerRadius={88}
                  paddingAngle={2}
                  stroke="#fff"
                  strokeWidth={2}
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip formatter={(v) => `${v} actifs`} />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, minWidth: 170 }}>
              {statusData.map((d) => (
                <div key={d.key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '7px 0', borderBottom: '1px solid var(--line)'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                    <span className="legend-swatch" style={{ background: STATUS_COLORS[d.key] }} />
                    {d.name}
                  </span>
                  <b className="num" style={{ fontSize: 13 }}>{d.value}</b>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel
          title="Parc par famille d'équipement"
          subtitle="Volume total et part hors support"
        >
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={typeData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="type" tick={{ fontSize: 11.5, fill: 'var(--ink-3)' }} tickLine={false} axisLine={{ stroke: 'var(--line)' }} />
              <YAxis tick={{ fontSize: 11.5, fill: 'var(--ink-3)' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-2)' }} />
              <Bar dataKey="total"   name="Parc total"    fill="#1b3f6e" radius={[3, 3, 0, 0]} maxBarSize={44} />
              <Bar dataKey="expired" name="Hors support" fill="#c2312d" radius={[3, 3, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 10 }}>
            <Legend items={[
              { label: 'Parc total', color: '#1b3f6e' },
              { label: 'Hors support', color: '#c2312d' }
            ]} />
          </div>
        </Panel>
      </div>

      <Panel
        title="Actifs prioritaires"
        subtitle="Classés par score de risque — urgence de l'échéance (0-60) + criticité métier (0-40)"
      >
        {Number(s.estimated_cost_rows) > 0 && <EstimateNotice rows={Number(s.estimated_cost_rows)} />}
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Équipement</th>
                <th>Type</th>
                <th>Site</th>
                <th>Criticité</th>
                <th>Statut</th>
                <th>Fin de support</th>
                <th className="right">Échéance</th>
                <th className="right">Risque</th>
                <th className="right">Coût est.</th>
              </tr>
            </thead>
            <tbody>
              {(data.top_at_risk_assets || []).map((a) => {
                const days = a.days_until_eos === null ? null : Number(a.days_until_eos);
                return (
                  <tr key={a.id}>
                    <td className="strong">{a.name}</td>
                    <td>{a.type}</td>
                    <td>{a.site}</td>
                    <td>
                      <span className={`chip ${String(a.criticality).toLowerCase()}`}>{a.criticality}</span>
                    </td>
                    <td><StatusBadge status={a.status_live} label={t(`status.${a.status_live}`)} /></td>
                    <td className="mono">{fmtDate(a.end_of_support)}</td>
                    <td className="right num" style={{ color: days !== null && days < 0 ? 'var(--st-red)' : 'inherit' }}>
                      {days === null ? '—' : days < 0 ? `${Math.abs(days)} j dépassé` : `${days} j`}
                    </td>
                    <td className="right">
                      <RiskPill score={a.risk_score_live} />
                    </td>
                    <td className="right num">{formatCurrency(a.estimated_replacement_cost)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

/*
 * Shared presentation pieces used by every dashboard, so that KPI cards,
 * badges, panels and empty states look and behave identically throughout.
 */

import React from 'react';

/** Obsolescence colours — must match the tokens in theme.css. */
export const STATUS_COLORS = {
  RED: '#c2312d',
  ORANGE: '#d97706',
  YELLOW: '#b59000',
  GREEN: '#1c7c54',
  UNKNOWN: '#6b7280'
};

export const STATUS_LABELS_FR = {
  RED: 'Support expiré',
  ORANGE: 'Fin de support < 6 mois',
  YELLOW: 'Fin de support < 12 mois',
  GREEN: 'Support valide',
  UNKNOWN: 'Date inconnue'
};

export const CHART_PALETTE = [
  '#1b3f6e', '#0a7ea4', '#1c7c54', '#b59000',
  '#d97706', '#c2312d', '#6b5b95', '#4a7c8c'
];

export function Panel({ title, subtitle, actions, children, tight }) {
  return (
    <section className="panel">
      {(title || actions) && (
        <div className="panel-head">
          <div>
            {title && <div className="section-title">{title}</div>}
            {subtitle && <div className="section-sub">{subtitle}</div>}
          </div>
          {actions}
        </div>
      )}
      <div className={tight ? 'panel-body tight' : 'panel-body'}>{children}</div>
    </section>
  );
}

export function Kpi({ label, value, note, tone }) {
  return (
    <div className={tone ? `kpi ${tone}` : 'kpi'}>
      <div className="kpi-label">{label}</div>
      <div className={typeof value === 'string' && value.length > 9 ? 'kpi-value sm' : 'kpi-value'}>
        {value}
      </div>
      {note && <div className="kpi-note">{note}</div>}
    </div>
  );
}

export function StatusBadge({ status, label }) {
  const key = (status || 'UNKNOWN').toUpperCase();
  return <span className={`badge ${key.toLowerCase()}`}>{label || key}</span>;
}

export function RiskPill({ score }) {
  const n = Number(score) || 0;
  const sev = n >= 75 ? 4 : n >= 50 ? 3 : n >= 25 ? 2 : 1;
  return <span className={`risk sev-${sev}`}>{Math.round(n)}</span>;
}

export function Loading({ text = 'Chargement…' }) {
  return (
    <div className="state">
      <div className="spinner" />
      <div className="state-text">{text}</div>
    </div>
  );
}

export function EmptyState({ title, text }) {
  return (
    <div className="state">
      <div className="state-title">{title}</div>
      {text && <div className="state-text">{text}</div>}
    </div>
  );
}

export function ErrorState({ error }) {
  return (
    <div className="state">
      <div className="state-title">Impossible de charger les données</div>
      <div className="state-text">
        {String(error)}<br />
        Vérifiez que le serveur est démarré et que la base contient des données.
      </div>
    </div>
  );
}

/**
 * Shown wherever a figure is derived from the estimated-cost catalogue
 * rather than from a real purchase price. Being explicit about this is
 * what makes the financial numbers defensible.
 */
export function EstimateNotice({ rows }) {
  return (
    <div className="notice info">
      <div>
        <b>Coûts estimés.</b> Le fichier source ne contient pas de prix d'achat.
        {typeof rows === 'number' && rows > 0
          ? ` Les ${rows} actifs sont valorisés `
          : ' Les montants proviennent '}
        d'après le catalogue de coûts de remplacement publié (onglet Import → Hypothèses de coût).
        Ces valeurs servent à hiérarchiser les priorités, non à engager un budget :
        remplacez-les par les coûts réels d'acquisition BIAT avant tout arbitrage.
      </div>
    </div>
  );
}

/** Recharts tooltip rendered with the application's own styling. */
export function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="chart-tip">
      {label !== undefined && <div className="tip-label">{label}</div>}
      {payload.map((entry, i) => (
        <div className="tip-row" key={i}>
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span>{formatter ? formatter(entry.value, entry.name) : entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function Legend({ items }) {
  return (
    <div className="legend">
      {items.map((it) => (
        <div className="legend-item" key={it.label}>
          <span className="legend-swatch" style={{ background: it.color }} />
          {it.label}
        </div>
      ))}
    </div>
  );
}

/** Format an ISO date for display; returns a dash when absent. */
export function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Compact integer formatting with thin spaces, e.g. 419 000 */
export function fmtInt(value) {
  return (Number(value) || 0).toLocaleString('fr-FR');
}

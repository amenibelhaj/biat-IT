import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { Panel, Loading, EmptyState, ErrorState, fmtInt } from './ui';

function fmtDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function fmtSize(bytes) {
  const n = Number(bytes) || 0;
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} Mo`;
  if (n >= 1024) return `${Math.round(n / 1024)} Ko`;
  return `${n} o`;
}

export default function ImportHistory() {
  const [history, setHistory] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [state, setState] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE_URL}/import/history`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => { if (!cancelled) { setHistory(Array.isArray(d) ? d : []); setState('ready'); } })
      .catch((e) => { if (!cancelled) { setError(e.message); setState('error'); } });
    return () => { cancelled = true; };
  }, []);

  if (state === 'loading') return <Loading />;
  if (state === 'error') return <ErrorState error={error} />;

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Historique des imports</h1>
        <p className="page-subtitle">
          Traçabilité des chargements de données — {fmtInt(history.length)} opération(s)
        </p>
      </div>

      <Panel tight>
        {!history.length ? (
          <EmptyState
            title="Aucun import enregistré"
            text="L'historique se remplit dès le premier fichier chargé depuis l'onglet Import."
          />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Fichier</th>
                  <th className="right">Taille</th>
                  <th className="right">Lignes</th>
                  <th className="right">Chargées</th>
                  <th className="right">Rejetées</th>
                  <th className="right">Taux</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => {
                  const total = Number(h.total_rows) || 0;
                  const ok = Number(h.imported_rows) || 0;
                  const failed = Number(h.failed_rows) || 0;
                  const rate = total ? Math.round((ok / total) * 100) : 0;
                  const hasErrors = h.errors && h.errors.length > 0;
                  return (
                    <React.Fragment key={h.id}>
                      <tr
                        onClick={() => hasErrors && setExpanded(expanded === h.id ? null : h.id)}
                        style={{ cursor: hasErrors ? 'pointer' : 'default' }}
                      >
                        <td className="mono">{fmtDateTime(h.import_date)}</td>
                        <td className="strong">
                          {h.original_filename}
                          {hasErrors && (
                            <span className="chip critical" style={{ marginLeft: 8 }}>
                              {h.errors.length} erreur(s)
                            </span>
                          )}
                        </td>
                        <td className="right num">{fmtSize(h.file_size)}</td>
                        <td className="right num">{total}</td>
                        <td className="right num" style={{ color: 'var(--st-green)' }}>{ok}</td>
                        <td className="right num" style={{ color: failed ? 'var(--st-red)' : 'inherit' }}>
                          {failed || '—'}
                        </td>
                        <td className="right">
                          <span className={`risk ${rate === 100 ? 'sev-1' : rate >= 80 ? 'sev-2' : 'sev-4'}`}>
                            {rate}%
                          </span>
                        </td>
                      </tr>
                      {expanded === h.id && hasErrors && (
                        <tr>
                          <td colSpan={7} style={{ background: 'var(--surface-2)' }}>
                            <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                              <b>Lignes rejetées</b>
                              <ul style={{ margin: '7px 0 0 18px' }}>
                                {h.errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}
                                {h.errors.length > 20 && <li>… et {h.errors.length - 20} autre(s)</li>}
                              </ul>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

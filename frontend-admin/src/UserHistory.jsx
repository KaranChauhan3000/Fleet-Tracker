import { useState, useEffect } from 'react';
import { userApi as api, fmt, fmtDate } from './api.js';
import { useToast } from './Toast.jsx';
import { Fuel, ChevronLeft, ChevronRight, TrendingUp, Gauge, Zap } from 'lucide-react';

const LIMIT = 10;

export default function History({ onBack }) {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadLogs(page); }, [page]);

  async function loadLogs(p) {
    setLoading(true);
    try {
      const res = await api.get(`/user/fuel-logs?page=${p}&limit=${LIMIT}`);
      setLogs(res.data || []);
      setTotal(res.total || 0);
    } catch (err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  // Efficiency colour helper: green if good, amber if ok, red if poor
  function effColor(eff) {
    if (eff == null) return 'var(--text-muted)';
    if (eff >= 8) return 'var(--success)';
    if (eff >= 5) return 'var(--warning)';
    return 'var(--danger)';
  }

  return (
    <div className="page-wrapper page-enter">
      <div className="page-header">
        <button onClick={onBack} style={{ background: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 600 }}>
          <ChevronLeft size={18} /> Back
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <h1 style={{ fontSize: 17, fontWeight: 700 }}>Fuel History</h1>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{total} total entries</p>
        </div>
        <div style={{ width: 60 }} />
      </div>

      <div className="page-content">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <div className="spinner" style={{ width: 28, height: 28 }} />
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <Fuel size={40} className="empty-icon" />
            <p className="empty-title">No fuel entries yet</p>
            <p className="empty-desc">Start logging fuel fills to see history here</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {logs.map((log) => (
                <div key={log.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 38, height: 38, background: 'var(--accent-dim)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Fuel size={17} color="var(--accent-light)" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <p style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 14 }}>{log.vehiclePlate}</p>
                        <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--success)' }}>₹{fmt(log.totalCost, 0)}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(log.filledAt)}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmt(log.litres, 2)}L @ ₹{fmt(log.costPerLitre, 2)}/L</p>
                      </div>
                    </div>
                  </div>

                  {/* Details row */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1, background: 'var(--bg-elevated)', borderRadius: 8, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Gauge size={13} color="var(--text-muted)" />
                      <div>
                        <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>ODOMETER</p>
                        <p style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{log.odometer?.toLocaleString()} km</p>
                      </div>
                    </div>
                    {log.kmDriven != null && (
                      <div style={{ flex: 1, background: 'var(--bg-elevated)', borderRadius: 8, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <TrendingUp size={13} color="var(--warning)" />
                        <div>
                          <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>KM DRIVEN</p>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--warning)' }}>{fmt(log.kmDriven, 0)} km</p>
                        </div>
                      </div>
                    )}
                    {/* ✅ Fixed: efficiency is stored as km/L — label and value now match */}
                    {log.efficiency != null && log.efficiency > 0 && (
                      <div style={{ flex: 1, background: 'var(--bg-elevated)', borderRadius: 8, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Zap size={13} color={effColor(log.efficiency)} />
                        <div>
                          <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>MILEAGE</p>
                          <p style={{ fontSize: 13, fontWeight: 700, color: effColor(log.efficiency) }}>{fmt(log.efficiency, 1)} km/L</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {log.fuelStation && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', paddingTop: 2, borderTop: '1px solid var(--border)' }}>📍 {log.fuelStation}</p>
                  )}
                  {log.notes && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>"{log.notes}"</p>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="pagination">
              <span className="pagination-info">Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}</span>
              <div className="pagination-btns">
                <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p = i + 1;
                  if (totalPages > 5) {
                    if (page <= 3) p = i + 1;
                    else if (page >= totalPages - 2) p = totalPages - 4 + i;
                    else p = page - 2 + i;
                  }
                  return (
                    <button key={p} className={`pagination-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                  );
                })}
                <button className="pagination-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

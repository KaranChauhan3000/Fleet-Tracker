import { useState, useEffect, useCallback } from 'react';
import { api, fmt, fmtRs, fmtDate, fmtDT, MONTH_OPTS } from './api.js';
import { useToast } from './Toast.jsx';
import {
  Search, X, ChevronLeft, ChevronRight, Fuel,
  Calendar, Filter, BarChart2, TrendingUp, TrendingDown,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';

function Pagination({ page, total, limit, onChange }) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
      <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{total} total</span>
      <button className="icon-btn" onClick={() => onChange(page - 1)} disabled={page <= 1}><ChevronLeft size={14} /></button>
      {Array.from({ length: Math.min(7, Math.ceil(total / limit)) }, (_, i) => {
        let p = i + 1;
        if (pages > 7 && page > 4) { p = page - 3 + i; if (p > pages) return null; }
        return <button key={p} className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onChange(p)} style={{ minWidth: 30, padding: '4px 8px' }}>{p}</button>;
      })}
      <button className="icon-btn" onClick={() => onChange(page + 1)} disabled={page >= pages}><ChevronRight size={14} /></button>
    </div>
  );
}

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-2)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <p style={{ color: 'var(--text-3)', marginBottom: 4 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color, fontWeight: 600 }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// FUEL LOGS
// ═════════════════════════════════════════════════════════════════════════════
export function FuelLogsView() {
  const [data,      setData]      = useState([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [companies, setCompanies] = useState([]);
  const [cFilter,   setCFilter]   = useState('');
  const [from,      setFrom]      = useState('');
  const [to,        setTo]        = useState('');
  const [loading,   setLoading]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let qs = `?page=${page}&limit=20`;
      if (cFilter) qs += '&companyId=' + cFilter;
      if (from)    qs += '&from=' + from;
      if (to)      qs += '&to=' + to;
      const r = await api.get('/superadmin/fuel-logs' + qs);
      setData(r.data); setTotal(r.total);
    } catch {}
    finally { setLoading(false); }
  }, [page, cFilter, from, to]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [cFilter, from, to]);
  useEffect(() => {
    api.get('/superadmin/companies?limit=100').then(r => setCompanies(r.data || [])).catch(() => {});
  }, []);

  return (
    <div className="content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900 }}>Fuel Logs</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>{total.toLocaleString()} entries across all companies</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <select className="field-input" style={{ width: 200 }} value={cFilter} onChange={e => setCFilter(e.target.value)}>
          <option value="">All Companies</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px' }}>
          <Calendar size={13} color="var(--text-3)" />
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: 13, padding: '8px 0' }} />
          <span style={{ color: 'var(--text-3)', fontSize: 12 }}>—</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: 13, padding: '8px 0' }} />
        </div>
        {(cFilter || from || to) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setCFilter(''); setFrom(''); setTo(''); }}>
            <X size={13} /> Clear
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr><th>Company</th><th>Driver</th><th>Vehicle</th><th>Fuel Type</th>
                <th style={{ textAlign: 'right' }}>Litres</th>
                <th style={{ textAlign: 'right' }}>Rate</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'right' }}>Odometer</th>
                <th>Station</th><th>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? <tr><td colSpan={10} style={{ textAlign: 'center', padding: 32 }}><div className="spin-ring" style={{ margin: '0 auto' }} /></td></tr>
                : data.length === 0
                ? <tr><td colSpan={10} style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)' }}>No fuel logs found</td></tr>
                : data.map(l => (
                  <tr key={l.id}>
                    <td style={{ maxWidth: 120 }}><p style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>{l.companyName}</p></td>
                    <td>
                      <p style={{ fontSize: 13, fontWeight: 600 }}>{l.userName}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{l.userEmpId}</p>
                    </td>
                    <td><span className="chip chip-amber" style={{ fontFamily: 'var(--mono)' }}>{l.vehiclePlate}</span></td>
                    <td><span className="chip chip-default">{l.fuelType}</span></td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12 }}>{fmt(l.litres)} L</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12 }}>₹{fmt(l.costPerLitre)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--green-l)', fontWeight: 700 }}>{fmtRs(l.totalCost)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-3)' }}>{l.odometer ? l.odometer.toLocaleString() + ' km' : '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-2)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.fuelStation || '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{fmtDate(l.filledAt)}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 20px' }}>
          <Pagination page={page} total={total} limit={20} onChange={setPage} />
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// REPORTS — Monthly comparison + summary
// ═════════════════════════════════════════════════════════════════════════════
export function Reports({ admin }) {
  const toast = useToast();
  const months = MONTH_OPTS();
  const [cmp,      setCmp]      = useState({ m1: months[months.length - 2]?.value, m2: months[months.length - 1]?.value, companyId: '' });
  const [cmpData,  setCmpData]  = useState(null);
  const [cmpLoad,  setCmpLoad]  = useState(false);
  const [sum,      setSum]      = useState({ from: '', to: '', companyId: '' });
  const [sumData,  setSumData]  = useState(null);
  const [sumLoad,  setSumLoad]  = useState(false);
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    api.get('/superadmin/companies?limit=100').then(r => setCompanies(r.data || [])).catch(() => {});
  }, []);

  async function loadComparison() {
    if (!cmp.m1 || !cmp.m2) return;
    setCmpLoad(true);
    try {
      let qs = `?month1=${cmp.m1}&month2=${cmp.m2}`;
      if (cmp.companyId) qs += '&companyId=' + cmp.companyId;
      const d = await api.get('/superadmin/reports/monthly-comparison' + qs);
      setCmpData(d);
    } catch (err) { toast(err.message, 'error'); }
    finally { setCmpLoad(false); }
  }

  async function loadSummary() {
    if (!sum.from || !sum.to) { toast('Select a date range', 'error'); return; }
    setSumLoad(true);
    try {
      let qs = `?from=${sum.from}&to=${sum.to}`;
      if (sum.companyId) qs += '&companyId=' + sum.companyId;
      const d = await api.get('/superadmin/reports/summary' + qs);
      setSumData(d);
    } catch (err) { toast(err.message, 'error'); }
    finally { setSumLoad(false); }
  }

  const delta = (a, b) => {
    if (!b || b === 0) return null;
    const p = Math.round(((a - b) / b) * 100);
    return <span style={{ fontSize: 11, fontWeight: 700, color: p >= 0 ? 'var(--green-l)' : 'var(--red-l)', marginLeft: 6 }}>
      {p >= 0 ? '▲' : '▼'} {Math.abs(p)}%
    </span>;
  };

  return (
    <div className="content" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 900 }}>Reports</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>Month-over-month comparisons and custom period summaries</p>
      </div>

      {/* ── Monthly Comparison ─────────────────────────────────────── */}
      <div className="card">
        <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Monthly Comparison</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <div className="field" style={{ margin: 0 }}>
            <label className="field-lbl">Month 1</label>
            <select className="field-input" value={cmp.m1} onChange={e => setCmp(c => ({ ...c, m1: e.target.value }))}>
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label className="field-lbl">Month 2</label>
            <select className="field-input" value={cmp.m2} onChange={e => setCmp(c => ({ ...c, m2: e.target.value }))}>
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label className="field-lbl">Company (optional)</label>
            <select className="field-input" style={{ width: 180 }} value={cmp.companyId} onChange={e => setCmp(c => ({ ...c, companyId: e.target.value }))}>
              <option value="">All Companies</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <button className="btn btn-primary btn-sm" onClick={loadComparison} disabled={cmpLoad}>
              {cmpLoad ? <><span className="spin-ring" style={{ borderTopColor: '#fff' }} />&nbsp;Loading…</> : <><BarChart2 size={13} /> Compare</>}
            </button>
          </div>
        </div>

        {cmpData && (() => {
          const m1 = cmpData.month1; const m2 = cmpData.month2;
          const rows = [
            { label: 'Total Fills',    a: m1.totalFills,       b: m2.totalFills,       fmt: v => v.toLocaleString() },
            { label: 'Total Litres',   a: m1.totalLitres,      b: m2.totalLitres,      fmt: v => fmt(v, 1) + ' L' },
            { label: 'Total Spend',    a: m1.totalCost,        b: m2.totalCost,        fmt: v => fmtRs(v) },
            { label: 'Avg ₹/Litre',    a: m1.avgCostPerLitre,  b: m2.avgCostPerLitre,  fmt: v => fmtRs(v) },
            { label: 'Active Vehicles',a: m1.activeVehicles,   b: m2.activeVehicles,   fmt: v => v.toLocaleString() },
            { label: 'Active Drivers', a: m1.activeUsers,      b: m2.activeUsers,      fmt: v => v.toLocaleString() },
          ];
          const barData = [
            { name: 'Fills',   [m1.label]: m1.totalFills,   [m2.label]: m2.totalFills   },
            { name: 'Litres',  [m1.label]: m1.totalLitres,  [m2.label]: m2.totalLitres  },
          ];
          return (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                {rows.map(r => (
                  <div key={r.label} style={{ background: 'var(--bg-2)', borderRadius: 10, padding: '12px 14px' }}>
                    <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>{r.label}</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--accent-l)' }}>{r.fmt(r.a)}</p>
                      {delta(r.a, r.b)}
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>vs {r.fmt(r.b)}</p>
                  </div>
                ))}
              </div>
              <div className="g2">
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: 'var(--text-2)' }}>Fills Comparison</p>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={[{ name: 'Fills', [m1.label]: m1.totalFills, [m2.label]: m2.totalFills }]} margin={{ left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#3D5A80' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#3D5A80' }} tickLine={false} axisLine={false} />
                      <Tooltip content={<ChartTip />} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey={m1.label} fill="#3B82F6" radius={[4,4,0,0]} />
                      <Bar dataKey={m2.label} fill="#FCD34D" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: 'var(--text-2)' }}>Litres Comparison</p>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={[{ name: 'Litres', [m1.label]: m1.totalLitres, [m2.label]: m2.totalLitres }]} margin={{ left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#3D5A80' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#3D5A80' }} tickLine={false} axisLine={false} />
                      <Tooltip content={<ChartTip />} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey={m1.label} fill="#34D399" radius={[4,4,0,0]} />
                      <Bar dataKey={m2.label} fill="#C4B5FD" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          );
        })()}
      </div>

      {/* ── Period Summary ─────────────────────────────────────────── */}
      <div className="card">
        <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Period Summary</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <div className="field" style={{ margin: 0 }}>
            <label className="field-lbl">From</label>
            <input type="date" className="field-input" value={sum.from} onChange={e => setSum(s => ({ ...s, from: e.target.value }))} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label className="field-lbl">To</label>
            <input type="date" className="field-input" value={sum.to} onChange={e => setSum(s => ({ ...s, to: e.target.value }))} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label className="field-lbl">Company (optional)</label>
            <select className="field-input" style={{ width: 180 }} value={sum.companyId} onChange={e => setSum(s => ({ ...s, companyId: e.target.value }))}>
              <option value="">All Companies</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <button className="btn btn-primary btn-sm" onClick={loadSummary} disabled={sumLoad}>
              {sumLoad ? <><span className="spin-ring" style={{ borderTopColor: '#fff' }} />&nbsp;Loading…</> : 'Generate Report'}
            </button>
          </div>
        </div>

        {sumData && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Total Fills',  val: sumData.summary.totalFills?.toLocaleString(),                            color: 'var(--accent-l)' },
                { label: 'Total Litres', val: fmt(sumData.summary.totalLitres, 1) + ' L',                               color: 'var(--amber-l)' },
                { label: 'Total Spend',  val: fmtRs(sumData.summary.totalCost),                                         color: 'var(--green-l)' },
                { label: 'Avg Eff.',     val: sumData.summary.avgEff ? fmt(sumData.summary.avgEff, 2) + ' km/L' : '—',  color: 'var(--purple-l)' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--bg-2)', borderRadius: 10, padding: '12px 14px' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>{s.label}</p>
                  <p style={{ fontSize: 18, fontWeight: 900, fontFamily: 'var(--mono)', color: s.color }}>{s.val}</p>
                </div>
              ))}
            </div>

            {/* Daily trend chart */}
            {sumData.dailyTrend?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: 'var(--text-2)' }}>Daily Spend Trend</p>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={sumData.dailyTrend.map(d => ({ date: d._id.slice(5), cost: Math.round(d.totalCost), fills: d.fills }))} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#3D5A80' }} tickLine={false} axisLine={false} interval={Math.floor(sumData.dailyTrend.length / 8)} />
                    <YAxis tick={{ fontSize: 9, fill: '#3D5A80' }} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTip />} />
                    <Line type="monotone" dataKey="cost" name="Spend (₹)" stroke="#34D399" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="fills" name="Fills" stroke="#3B82F6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="g3">
              {/* Top Companies */}
              {sumData.byCompany?.length > 0 && (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 10 }}>Top Companies by Spend</p>
                  {sumData.byCompany.slice(0, 5).map((c, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                      <p style={{ color: 'var(--text-2)' }}>{c.companyName}</p>
                      <p style={{ fontFamily: 'var(--mono)', color: 'var(--green-l)', fontWeight: 700 }}>{fmtRs(c.totalCost)}</p>
                    </div>
                  ))}
                </div>
              )}
              {/* Top Vehicles */}
              {sumData.byVehicle?.length > 0 && (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 10 }}>Top Vehicles by Cost</p>
                  {sumData.byVehicle.slice(0, 5).map((v, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                      <span className="chip chip-amber" style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{v.plateNumber}</span>
                      <p style={{ fontFamily: 'var(--mono)', color: 'var(--amber-l)', fontWeight: 700 }}>{fmtRs(v.totalCost)}</p>
                    </div>
                  ))}
                </div>
              )}
              {/* Top Drivers */}
              {sumData.byUser?.length > 0 && (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 10 }}>Top Drivers by Cost</p>
                  {sumData.byUser.slice(0, 5).map((u, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                      <p style={{ color: 'var(--text-2)' }}>{u.userName}</p>
                      <p style={{ fontFamily: 'var(--mono)', color: 'var(--purple-l)', fontWeight: 700 }}>{fmtRs(u.totalCost)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

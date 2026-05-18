import { useState, useEffect } from 'react';
import { api, fmt, fmtRs, MONTH_OPTS } from './api.js';
import { useToast } from './Toast.jsx';
import {
  BarChart2, Calendar, Download, TrendingUp, TrendingDown, Minus,
  Fuel, Car, Users, IndianRupee, Gauge, MapPin, Zap, Activity,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtMonth(ym) {
  if (!ym) return '—';
  const [y, m] = ym.split('-');
  return MONTH_NAMES[parseInt(m) - 1] + ' ' + y;
}

function Delta({ va, vb, inverse = false }) {
  if (va == null || vb == null || va === 0) return null;
  const pct = ((vb - va) / Math.abs(va)) * 100;
  const up = pct > 0;
  // inverse = true means "up is bad" (e.g. cost)
  const good = inverse ? !up : up;
  const color = Math.abs(pct) < 0.5 ? 'var(--text-muted)' : good ? 'var(--success)' : 'var(--danger)';
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color, display: 'flex', alignItems: 'center', gap: 2 }}>
      {Math.abs(pct) < 0.5
        ? <Minus size={9} />
        : up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

// Visual bar showing value as % of max between two values
function Bar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height: 5, borderRadius: 3, background: 'var(--bg-elevated)', overflow: 'hidden', marginTop: 4 }}>
      <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Reports({ admin }) {
  const toast = useToast();
  const [tab, setTab] = useState('compare');

  return (
    <div className="page-wrapper page-enter">
      <div className="page-header">
        <div style={{ width: 32, height: 32, background: 'var(--success-dim)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BarChart2 size={16} color="var(--success)" />
        </div>
        <p style={{ fontSize: 15, fontWeight: 800 }}>Reports</p>
      </div>

      <div className="page-content">
        <div className="tab-bar">
          <button className={`tab ${tab === 'compare' ? 'active' : ''}`} onClick={() => setTab('compare')}>Month Compare</button>
          <button className={`tab ${tab === 'range' ? 'active' : ''}`} onClick={() => setTab('range')}>Date Range</button>
        </div>
        {tab === 'compare'
          ? <MonthCompare admin={admin} toast={toast} />
          : <DateRangeReport admin={admin} toast={toast} />}
      </div>
    </div>
  );
}

// ── Month Compare ─────────────────────────────────────────────────────────────
function MonthCompare({ admin, toast }) {
  const opts = MONTH_OPTS();
  // Default: previous month (A) vs current month (B)
  const [m1, setM1] = useState(opts[opts.length - 2]?.value || '');
  const [m2, setM2] = useState(opts[opts.length - 1]?.value || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Auto-load on first render with the default prev vs current
  useEffect(() => {
    if (m1 && m2) load(m1, m2);
  }, []);

  async function load(month1 = m1, month2 = m2) {
    if (!month1 || !month2) { toast('Select both months', 'error'); return; }
    if (month1 === month2) { toast('Select two different months', 'error'); return; }
    setLoading(true);
    try {
      const res = await api.get(`/admin/reports/monthly-comparison?month1=${month1}&month2=${month2}`);
      setData(res);
    } catch (err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  }

  function handleM1(v) { setM1(v); setData(null); }
  function handleM2(v) { setM2(v); setData(null); }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Month selectors */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="input-group">
          <label className="input-label">Month A</label>
          <select className="input-field" value={m1} onChange={e => handleM1(e.target.value)}>
            {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="input-group">
          <label className="input-label">Month B</label>
          <select className="input-field" value={m2} onChange={e => handleM2(e.target.value)}>
            {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <button className="btn btn-primary" onClick={() => load()} disabled={loading}>
        {loading ? <><span className="spinner" />Loading...</> : <><BarChart2 size={14} />Compare Months</>}
      </button>

      {loading && !data && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
          <span className="spinner" style={{ width: 28, height: 28 }} />
        </div>
      )}

      {data && (
        <>
          <CompareCards data={data} />
          <CompareTable data={data} />
          <button className="btn btn-ghost" onClick={() => printReport(data, admin, 'compare', { m1, m2 })}>
            <Download size={14} /> Export PDF Report
          </button>
        </>
      )}
    </div>
  );
}

// ── Side-by-side stat cards for the two months ────────────────────────────────
function CompareCards({ data }) {
  const { month1: a, month2: b } = data;

  const cards = [
    {
      icon: <IndianRupee size={13} />, label: 'Total Fuel Spend',
      va: a.totalCost, vb: b.totalCost,
      fmtV: v => fmtRs(v), inverse: true, color: 'var(--warning)',
    },
    {
      icon: <Fuel size={13} />, label: 'Total Fills',
      va: a.totalFills, vb: b.totalFills,
      fmtV: v => v, inverse: false, color: 'var(--accent-light)',
    },
    {
      icon: <Fuel size={13} />, label: 'Litres Filled',
      va: a.totalLitres, vb: b.totalLitres,
      fmtV: v => fmt(v, 1) + 'L', inverse: true, color: 'var(--accent-light)',
    },
    {
      icon: <IndianRupee size={13} />, label: 'Avg ₹ / Litre',
      va: a.avgCostPerLitre, vb: b.avgCostPerLitre,
      fmtV: v => '₹' + fmt(v, 2), inverse: true, color: 'var(--danger)',
    },
    {
      icon: <Gauge size={13} />, label: 'Avg Efficiency',
      va: a.avgEfficiency, vb: b.avgEfficiency,
      fmtV: v => v ? fmt(v, 2) + ' km/L' : '—', inverse: false, color: 'var(--success)',
    },
    {
      icon: <MapPin size={13} />, label: 'KM Driven',
      va: a.totalKm, vb: b.totalKm,
      fmtV: v => v ? fmt(v, 0) + ' km' : '—', inverse: false, color: 'var(--success)',
    },
    {
      icon: <IndianRupee size={13} />, label: 'Cost / KM',
      va: a.costPerKm, vb: b.costPerKm,
      fmtV: v => v ? '₹' + fmt(v, 2) : '—', inverse: true, color: 'var(--danger)',
    },
    {
      icon: <Car size={13} />, label: 'Active Vehicles',
      va: a.activeVehicles, vb: b.activeVehicles,
      fmtV: v => v, inverse: false, color: '#A78BFA',
    },
    {
      icon: <Users size={13} />, label: 'Active Drivers',
      va: a.activeUsers, vb: b.activeUsers,
      fmtV: v => v, inverse: false, color: '#A78BFA',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingLeft: 2 }}>
        {[data.month1.label, data.month2.label].map((m, i) => (
          <div key={m} style={{ textAlign: 'center', fontSize: 11, fontWeight: 800,
            color: i === 0 ? 'var(--accent-light)' : 'var(--warning)',
            background: i === 0 ? 'var(--accent-dim)' : 'rgba(234,179,8,0.12)',
            border: `1px solid ${i === 0 ? 'rgba(14,165,233,0.2)' : 'rgba(234,179,8,0.2)'}`,
            borderRadius: 8, padding: '6px 10px',
          }}>
            {fmtMonth(m)}
          </div>
        ))}
      </div>

      {cards.map(({ icon, label, va, vb, fmtV, inverse, color }) => {
        const maxVal = Math.max(va || 0, vb || 0);
        return (
          <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)', marginBottom: 8 }}>
              <span style={{ color }}>{icon}</span>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[{ v: va, idx: 0 }, { v: vb, idx: 1 }].map(({ v, idx }) => (
                <div key={idx}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                      {v != null ? fmtV(v) : '—'}
                    </p>
                    {idx === 1 && <Delta va={va} vb={vb} inverse={inverse} />}
                  </div>
                  <Bar value={v || 0} max={maxVal} color={idx === 0 ? 'var(--accent-light)' : 'var(--warning)'} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Compact compare table (below the cards, good for PDF too) ─────────────────
function CompareTable({ data }) {
  const { month1: a, month2: b } = data;
  const rows = [
    { label: 'Total Fills',      va: a.totalFills,       vb: b.totalFills,       fmtV: v => v,                   inverse: false },
    { label: 'Total Litres',     va: a.totalLitres,      vb: b.totalLitres,      fmtV: v => fmt(v,1)+'L',        inverse: false },
    { label: 'Total Spend',      va: a.totalCost,        vb: b.totalCost,        fmtV: v => fmtRs(v),            inverse: true  },
    { label: 'Avg ₹/Litre',     va: a.avgCostPerLitre,  vb: b.avgCostPerLitre,  fmtV: v => '₹'+fmt(v,2),       inverse: true  },
    { label: 'Avg km/L',        va: a.avgEfficiency,    vb: b.avgEfficiency,    fmtV: v => v?fmt(v,2):'—',      inverse: false },
    { label: 'KM Driven',       va: a.totalKm,          vb: b.totalKm,          fmtV: v => v?fmt(v,0)+' km':'—', inverse: false },
    { label: 'Cost / KM',       va: a.costPerKm,        vb: b.costPerKm,        fmtV: v => v?'₹'+fmt(v,2):'—', inverse: true  },
    { label: 'Active Vehicles', va: a.activeVehicles,   vb: b.activeVehicles,   fmtV: v => v,                   inverse: false },
    { label: 'Active Drivers',  va: a.activeUsers,      vb: b.activeUsers,      fmtV: v => v,                   inverse: false },
  ];

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', background: 'var(--bg-elevated)', padding: '8px 12px', gap: 8 }}>
        <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Metric</p>
        <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent-light)', textAlign: 'center' }}>{fmtMonth(data.month1.label)}</p>
        <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--warning)', textAlign: 'center' }}>{fmtMonth(data.month2.label)}</p>
      </div>
      {rows.map(({ label, va, vb, fmtV, inverse }) => (
        <div key={label} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', padding: '10px 12px', gap: 8, borderTop: '1px solid var(--border)', alignItems: 'center' }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</p>
          <p style={{ fontSize: 13, fontWeight: 700, textAlign: 'center', color: 'var(--text-primary)' }}>{va != null ? fmtV(va) : '—'}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{vb != null ? fmtV(vb) : '—'}</p>
            <Delta va={va} vb={vb} inverse={inverse} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Date Range Report ─────────────────────────────────────────────────────────
function DateRangeReport({ admin, toast }) {
  const today = new Date().toISOString().split('T')[0];
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const lastYearStart = new Date(new Date().getFullYear() - 1, 0, 1).toISOString().split('T')[0];
  const lastYearEnd = new Date(new Date().getFullYear() - 1, 11, 31).toISOString().split('T')[0];

  const [from, setFrom] = useState(yearStart);
  const [to, setTo] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!from || !to) { toast('Select date range', 'error'); return; }
    setLoading(true);
    try {
      const res = await api.get(`/admin/reports/summary?from=${from}&to=${to}`);
      setData(res);
    } catch (err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  }

  const presets = [
    { label: 'This Month', from: monthStart, to: today },
    { label: 'This Year',  from: yearStart,  to: today },
    { label: `Year ${new Date().getFullYear() - 1}`, from: lastYearStart, to: lastYearEnd },
    { label: 'Last 30 Days', from: new Date(Date.now() - 30*86400000).toISOString().split('T')[0], to: today },
    { label: 'Last 90 Days', from: new Date(Date.now() - 90*86400000).toISOString().split('T')[0], to: today },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Date inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="input-group">
          <label className="input-label">From Date</label>
          <input className="input-field" type="date" value={from} onChange={e => setFrom(e.target.value)} max={to} />
        </div>
        <div className="input-group">
          <label className="input-label">To Date</label>
          <input className="input-field" type="date" value={to} onChange={e => setTo(e.target.value)} min={from} />
        </div>
      </div>

      {/* Presets */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {presets.map(p => (
          <button key={p.label} onClick={() => { setFrom(p.from); setTo(p.to); setData(null); }}
            style={{ padding: '5px 11px', borderRadius: 20, background: 'var(--bg-elevated)', border: '1px solid var(--border)', fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>
            {p.label}
          </button>
        ))}
      </div>

      <button className="btn btn-primary" onClick={load} disabled={loading}>
        {loading ? <><span className="spinner" />Loading...</> : <><Calendar size={14} />Generate Report</>}
      </button>

      {loading && !data && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
          <span className="spinner" style={{ width: 28, height: 28 }} />
        </div>
      )}

      {data && (
        <>
          {/* ── Summary stat cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
            <SumCard icon={Fuel}          color="var(--warning)"      label="Total Fills"       value={data.summary?.totalFills ?? 0} />
            <SumCard icon={IndianRupee}   color="var(--success)"      label="Total Spend"       value={fmtRs(data.summary?.totalCost)} />
            <SumCard icon={Fuel}          color="var(--accent-light)"  label="Litres Filled"    value={fmt(data.summary?.totalLitres, 1) + 'L'} />
            <SumCard icon={Gauge}         color="#A78BFA"              label="Avg Efficiency"    value={data.summary?.avgEff ? fmt(data.summary.avgEff, 1) + ' km/L' : '—'} />
          </div>

          {/* ── Daily Trend ── */}
          {data.dailyTrend?.length > 0 && (
            <div>
              <p className="section-title" style={{ marginBottom: 10 }}>Daily Spend Trend</p>
              <DailyTrend trend={data.dailyTrend} />
            </div>
          )}

          {/* ── By Vehicle ── */}
          {data.byVehicle?.length > 0 && (
            <div>
              <p className="section-title" style={{ marginBottom: 8 }}>By Vehicle</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {data.byVehicle.map((v, i) => {
                  const maxCost = data.byVehicle[0]?.totalCost || 1;
                  return (
                    <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 13px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <span style={{ fontSize: 12, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#A78BFA', background: 'var(--purple-dim)', borderRadius: 4, padding: '1px 6px' }}>
                              {v.plateNumber}
                            </span>
                            {v.make && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{v.make} {v.model}</span>}
                          </div>
                          <div style={{ display: 'flex', gap: 10, marginTop: 5, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.fills} fills</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmt(v.totalLitres, 1)}L</span>
                            {v.avgEfficiency > 0 && (
                              <span style={{ fontSize: 11, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Gauge size={10} />{fmt(v.avgEfficiency, 1)} km/L
                              </span>
                            )}
                          </div>
                        </div>
                        <p style={{ fontWeight: 800, color: 'var(--warning)', fontSize: 15 }}>{fmtRs(v.totalCost)}</p>
                      </div>
                      <Bar value={v.totalCost} max={maxCost} color="var(--warning)" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── By User ── */}
          {data.byUser?.length > 0 && (
            <div>
              <p className="section-title" style={{ marginBottom: 8 }}>By Driver</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {data.byUser.map((u, i) => {
                  const maxCost = data.byUser[0]?.totalCost || 1;
                  return (
                    <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 13px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: 13 }}>{u.userName}</p>
                          <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.fills} fills</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmt(u.totalLitres, 1)}L</span>
                          </div>
                        </div>
                        <p style={{ fontWeight: 800, color: 'var(--success)', fontSize: 15 }}>{fmtRs(u.totalCost)}</p>
                      </div>
                      <Bar value={u.totalCost} max={maxCost} color="var(--success)" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button className="btn btn-ghost" onClick={() => printReport(data, admin, 'range', { from, to })}>
            <Download size={14} /> Export PDF Report
          </button>
        </>
      )}
    </div>
  );
}

// ── Daily Trend Bar Chart ─────────────────────────────────────────────────────
function DailyTrend({ trend }) {
  const maxCost = Math.max(...trend.map(d => d.totalCost), 1);
  // Show at most 31 bars; if more, group by week
  const display = trend.slice(-31);

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 60, overflowX: 'auto' }}>
        {display.map((d, i) => {
          const h = Math.max(4, (d.totalCost / maxCost) * 60);
          const date = new Date(d._id);
          const label = (date.getDate() === 1 || i === 0)
            ? MONTH_NAMES[date.getMonth()].slice(0, 3) + ' ' + date.getDate()
            : String(date.getDate());
          return (
            <div key={d._id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: '1 0 auto', minWidth: 18 }}
              title={`${d._id}: ${fmtRs(d.totalCost)} · ${d.fills} fills`}>
              <div style={{ width: '70%', height: h, background: 'var(--accent-light)', borderRadius: '3px 3px 0 0', opacity: 0.85 }} />
              {(i === 0 || i === Math.floor(display.length / 2) || i === display.length - 1 || date.getDate() === 1) && (
                <p style={{ fontSize: 8, color: 'var(--text-muted)', whiteSpace: 'nowrap', transform: 'rotate(-35deg)', transformOrigin: 'top center', marginTop: 6 }}>
                  {label}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 18, textAlign: 'right' }}>
        {trend.length} day{trend.length !== 1 ? 's' : ''} · hover bar for details
      </p>
    </div>
  );
}

// ── Summary card ──────────────────────────────────────────────────────────────
function SumCard({ icon: Icon, color, label, value }) {
  const colorRgb = color.includes('warning') ? '234,179,8'
    : color.includes('success') ? '34,197,94'
    : color.includes('accent') ? '14,165,233'
    : '139,92,246';
  return (
    <div className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 34, height: 34, background: `rgba(${colorRgb},0.12)`, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={16} color={color} />
      </div>
      <div>
        <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
        <p style={{ fontSize: 17, fontWeight: 800, marginTop: 1, color: 'var(--text-primary)' }}>{value}</p>
      </div>
    </div>
  );
}

// ── PDF Export ────────────────────────────────────────────────────────────────
function printReport(data, admin, type, params) {
  const fmt2 = (n, d = 2) => n == null || isNaN(n) ? '—' : Number(n).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtRs2 = n => n == null ? '—' : '₹' + fmt2(n, 0);
  const now = new Date().toLocaleString('en-IN');

  let body = '';

  if (type === 'compare') {
    const { month1: a, month2: b } = data;
    body = `
      <h2 style="color:#F97316;margin-bottom:4px">Monthly Comparison Report</h2>
      <p style="color:#888;font-size:12px;margin-bottom:20px">${fmtMonth(params.m1)} vs ${fmtMonth(params.m2)}</p>
      <table>
        <thead><tr><th>Metric</th><th>${fmtMonth(params.m1)}</th><th>${fmtMonth(params.m2)}</th><th>Change</th></tr></thead>
        <tbody>
          ${[
            ['Total Fills',      a.totalFills,      b.totalFills,      v => v,                true  ],
            ['Total Litres',     a.totalLitres,     b.totalLitres,     v => fmt2(v,1)+'L',   false ],
            ['Total Spend',      a.totalCost,       b.totalCost,       v => fmtRs2(v),        true  ],
            ['Avg ₹/Litre',     a.avgCostPerLitre, b.avgCostPerLitre, v => '₹'+fmt2(v,2),   true  ],
            ['Avg km/L',        a.avgEfficiency,   b.avgEfficiency,   v => v?fmt2(v,2):'—', false ],
            ['KM Driven',       a.totalKm,         b.totalKm,         v => v?fmt2(v,0)+' km':'—', false],
            ['Cost / KM',       a.costPerKm,       b.costPerKm,       v => v?'₹'+fmt2(v,2):'—', true],
            ['Active Vehicles', a.activeVehicles,  b.activeVehicles,  v => v,                false ],
            ['Active Drivers',  a.activeUsers,     b.activeUsers,     v => v,                false ],
          ].map(([l, va, vb, f, invt]) => {
            const diff = va && vb && va !== 0 ? (((vb - va) / Math.abs(va)) * 100).toFixed(1) : null;
            const good = diff ? (invt ? parseFloat(diff) < 0 : parseFloat(diff) > 0) : null;
            const color = diff ? (good ? '#16A34A' : '#DC2626') : '#888';
            return `<tr><td>${l}</td><td>${va != null ? f(va) : '—'}</td><td>${vb != null ? f(vb) : '—'}</td><td style="color:${color};font-weight:700">${diff ? (parseFloat(diff) > 0 ? '+' : '') + diff + '%' : '—'}</td></tr>`;
          }).join('')}
        </tbody>
      </table>`;
  } else {
    const s = data.summary || {};
    body = `
      <h2 style="color:#F97316;margin-bottom:4px">Fleet Report — ${params.from} to ${params.to}</h2>
      <p style="color:#888;font-size:12px;margin-bottom:20px">Generated for ${admin?.companyName || ''}</p>
      <h3>Summary</h3>
      <table>
        <thead><tr><th>Metric</th><th>Value</th></tr></thead>
        <tbody>
          <tr><td>Total Fills</td><td>${s.totalFills ?? 0}</td></tr>
          <tr><td>Total Litres</td><td>${fmt2(s.totalLitres, 1)}L</td></tr>
          <tr><td>Total Spend</td><td>${fmtRs2(s.totalCost)}</td></tr>
          <tr><td>Avg Efficiency</td><td>${s.avgEff ? fmt2(s.avgEff, 2) + ' km/L' : '—'}</td></tr>
        </tbody>
      </table>
      ${data.byVehicle?.length ? `
        <h3 style="margin-top:20px">By Vehicle (Top 20)</h3>
        <table><thead><tr><th>Plate</th><th>Make/Model</th><th>Fills</th><th>Litres</th><th>Avg km/L</th><th>Total Spend</th></tr></thead>
        <tbody>${data.byVehicle.map(v => `<tr><td>${v.plateNumber}</td><td>${(v.make||'')+' '+(v.model||'')}</td><td>${v.fills}</td><td>${fmt2(v.totalLitres,1)}L</td><td>${v.avgEfficiency?fmt2(v.avgEfficiency,2)+'km/L':'—'}</td><td>${fmtRs2(v.totalCost)}</td></tr>`).join('')}
        </tbody></table>` : ''}
      ${data.byUser?.length ? `
        <h3 style="margin-top:20px">By Driver (Top 20)</h3>
        <table><thead><tr><th>Name</th><th>Fills</th><th>Litres</th><th>Total Spend</th></tr></thead>
        <tbody>${data.byUser.map(u => `<tr><td>${u.userName}</td><td>${u.fills}</td><td>${fmt2(u.totalLitres,1)}L</td><td>${fmtRs2(u.totalCost)}</td></tr>`).join('')}
        </tbody></table>` : ''}
      ${data.dailyTrend?.length ? `
        <h3 style="margin-top:20px">Daily Trend</h3>
        <table><thead><tr><th>Date</th><th>Fills</th><th>Litres</th><th>Spend</th></tr></thead>
        <tbody>${data.dailyTrend.map(d => `<tr><td>${d._id}</td><td>${d.fills}</td><td>${fmt2(d.litres,1)}L</td><td>${fmtRs2(d.totalCost)}</td></tr>`).join('')}
        </tbody></table>` : ''}
    `;
  }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Fleet Report</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: 'Segoe UI',Arial,sans-serif; font-size: 13px; color: #1a1a2e; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #F97316; padding-bottom:12px; margin-bottom:20px; }
    .logo { font-size:22px; font-weight:900; color:#F97316; letter-spacing:-0.02em; }
    h3 { font-size:14px; color:#F97316; margin:16px 0 8px; font-weight:700; border-bottom:1px solid #e5e7eb; padding-bottom:4px; }
    table { width:100%; border-collapse:collapse; font-size:12px; }
    th { background:#fff7ed; color:#c2410c; font-weight:700; padding:8px 10px; text-align:left; border-bottom:2px solid #fed7aa; font-size:11px; text-transform:uppercase; letter-spacing:0.04em; }
    td { padding:8px 10px; border-bottom:1px solid #f1f5f9; }
    tr:nth-child(even) td { background:#fafafa; }
    .footer { margin-top:24px; font-size:10px; color:#aaa; text-align:center; border-top:1px solid #e5e7eb; padding-top:10px; }
  </style></head><body>
  <div class="header">
    <div><div class="logo">⛽ Fleet Tracker</div><div style="font-size:12px;color:#555;margin-top:3px">${admin?.companyName || ''} · Admin Report</div></div>
    <div style="font-size:11px;color:#888;text-align:right">Generated: ${now}<br/>Admin: ${admin?.name || ''}</div>
  </div>
  ${body}
  <div class="footer">Fleet Tracker v3.0 · Confidential — for authorised personnel only.</div>
  </body></html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 600);
}

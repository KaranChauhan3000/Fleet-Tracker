// ExpenseBreakdown.jsx
// Full-page detailed breakdown of monthly expenses (fuel, challans, services)

// Opened when admin taps "Breakdown" on the dashboard banner.

import { useState, useEffect } from 'react';
import { api, fmt, fmtDT } from './api.js';
import { useToast } from './Toast.jsx';
import {
  ArrowLeft, Fuel, Receipt, Wrench, IndianRupee,
  TrendingUp, Car, ChevronDown, ChevronUp, RefreshCw,
} from 'lucide-react';

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Pill badge ────────────────────────────────────────────────────
function Pill({ color, label, value, pct }) {
  const cfg = {
    fuel:     { bg:'var(--success-dim)',  border:'rgba(22,163,74,0.25)',   text:'var(--success)',  icon:'⛽' },
    challans: { bg:'var(--danger-dim)',   border:'rgba(220,38,38,0.25)',   text:'var(--danger)',   icon:'📋' },
    services: { bg:'var(--accent-dim)',   border:'rgba(249,115,22,0.25)',  text:'var(--accent)',   icon:'🔧' },
    emi:      { bg:'var(--warning-dim)',  border:'rgba(217,119,6,0.25)',   text:'var(--warning)',  icon:'💳' },
  }[color] || {};

  return (
    <div style={{
      flex: 1, padding: '10px 12px', borderRadius: 12,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:4 }}>
        <span style={{ fontSize:13 }}>{cfg.icon}</span>
        <span style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</span>
      </div>
      <p style={{ fontSize:16, fontWeight:900, color: cfg.text, letterSpacing:'-0.02em' }}>₹{fmt(value, 0)}</p>
      <p style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', marginTop:2 }}>{pct}% of total</p>
    </div>
  );
}

// ── Mini bar chart (daily trend) ──────────────────────────────────
function DailyBar({ dailyTrend }) {
  if (!dailyTrend?.length) return null;
  const max = Math.max(...dailyTrend.map(d => d.cost), 1);
  const hasData = dailyTrend.some(d => d.cost > 0);
  if (!hasData) return (
    <p style={{ fontSize:11, color:'var(--text-muted)', textAlign:'center', padding:'12px 0' }}>No fuel entries this month</p>
  );

  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:2, height:52, padding:'0 2px' }}>
      {dailyTrend.map(d => (
        <div key={d.day} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
          <div
            title={`Day ${d.day}: ₹${fmt(d.cost, 0)}`}
            style={{
              width:'100%', minHeight: d.cost > 0 ? 3 : 1,
              height: d.cost > 0 ? `${Math.max(4, Math.round((d.cost / max) * 44))}px` : '1px',
              borderRadius: 2,
              background: d.cost > 0 ? 'var(--success)' : 'var(--bg-elevated)',
              opacity: d.cost > 0 ? 0.85 : 0.3,
              transition: 'height 0.4s ease',
            }}
          />
          {(d.day === 1 || d.day % 7 === 1 || d.day === dailyTrend.length) && (
            <span style={{ fontSize:7, color:'var(--text-muted)', fontWeight:600 }}>{d.day}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Per-vehicle accordion row ─────────────────────────────────────
function VehicleRow({ v, grandTotal }) {
  const [open, setOpen] = useState(false);
  const sharePct = grandTotal > 0 ? ((v.total / grandTotal) * 100).toFixed(1) : '0';
  const barW     = grandTotal > 0 ? Math.max(4, Math.round((v.total / grandTotal) * 100)) : 0;

  return (
    <div style={{
      borderRadius: 12, border: '1px solid var(--border)',
      background: 'var(--bg-card)', overflow: 'hidden',
      transition: 'box-shadow 0.15s',
    }}>
      {/* Header row */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '11px 13px', display:'flex', alignItems:'center',
          gap: 10, background: 'transparent', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {/* Plate badge */}
        <div style={{
          background: 'var(--bg-elevated)', borderRadius: 7, padding: '4px 8px',
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 800,
          color: 'var(--accent)', flexShrink: 0, letterSpacing: '0.04em',
        }}>
          {v.plateNumber}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {v.make} {v.model}
          </p>
          {/* Share bar */}
          <div style={{ marginTop: 4, height: 3, borderRadius: 2, background: 'var(--bg-elevated)' }}>
            <div style={{ height: '100%', width: `${barW}%`, borderRadius: 2, background: 'var(--accent)' }} />
          </div>
        </div>

        <div style={{ textAlign:'right', flexShrink: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-primary)', letterSpacing:'-0.02em' }}>
            ₹{fmt(v.total, 0)}
          </p>
          <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', marginTop:1 }}>{sharePct}%</p>
        </div>

        {open ? <ChevronUp size={13} color="var(--text-muted)" /> : <ChevronDown size={13} color="var(--text-muted)" />}
      </button>

      {/* Expanded detail */}
      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '10px 13px 12px', display:'flex', flexDirection:'column', gap: 8 }}>
          {/* Fuel */}
          {v.fuel.total > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
              <Fuel size={12} color="var(--success)" />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>Fuel</p>
                <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop:1 }}>
                  {v.fuel.fills} fill{v.fuel.fills !== 1 ? 's' : ''} · {fmt(v.fuel.litres, 1)}L
                  {v.fuel.km > 0 ? ` · ${fmt(v.fuel.km, 0)} km` : ''}
                  {v.fuel.avgKmpl ? ` · ${v.fuel.avgKmpl} km/L` : ''}
                </p>
              </div>
              <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--success)' }}>₹{fmt(v.fuel.total, 0)}</p>
            </div>
          )}
          {/* Challans */}
          {v.challans.total > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
              <Receipt size={12} color="var(--danger)" />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>Challans</p>
                <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop:1 }}>
                  {v.challans.count} challan{v.challans.count !== 1 ? 's' : ''}
                </p>
              </div>
              <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--danger)' }}>₹{fmt(v.challans.total, 0)}</p>
            </div>
          )}
          {/* Services */}
          {v.services.total > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
              <Wrench size={12} color="var(--accent)" />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>Services</p>
                <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop:1 }}>
                  {v.services.count} service{v.services.count !== 1 ? 's' : ''}
                </p>
              </div>
              <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)' }}>₹{fmt(v.services.total, 0)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Log entry list (challans / services) ──────────────────────────
function EntryList({ entries, type }) {
  const [showAll, setShowAll] = useState(false);
  if (!entries?.length) return (
    <p style={{ fontSize:11, color:'var(--text-muted)', textAlign:'center', padding:'10px 0' }}>
      No {type} this month
    </p>
  );

  const visible = showAll ? entries : entries.slice(0, 4);
  const isChallan = type === 'challans';

  return (
    <div style={{ display:'flex', flexDirection:'column', gap: 6 }}>
      {visible.map(e => (
        <div key={e.id} style={{
          display:'flex', alignItems:'center', gap: 8,
          padding: '8px 11px', borderRadius: 10,
          background: isChallan ? 'var(--danger-dim)' : 'var(--accent-dim)',
          border: `1px solid ${isChallan ? 'rgba(220,38,38,0.15)' : 'rgba(249,115,22,0.15)'}`,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize:11, fontWeight:800, fontFamily:'var(--font-mono)', color: isChallan ? 'var(--danger)' : 'var(--accent)' }}>
              {e.plateNumber}
            </p>
            <p style={{ fontSize:9, color:'var(--text-muted)', marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {isChallan ? (e.offence || 'Challan') : (e.serviceType || 'Service')}
              {isChallan && e.status === 'paid' ? ' · ✓ paid' : ''}
            </p>
          </div>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <p style={{ fontSize:12, fontWeight:800, color: isChallan ? 'var(--danger)' : 'var(--accent)' }}>
              ₹{fmt(isChallan ? e.amount : e.cost, 0)}
            </p>
            <p style={{ fontSize:8, color:'var(--text-muted)', marginTop:1 }}>
              {new Date(isChallan ? e.issuedAt : e.servicedAt).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
            </p>
          </div>
        </div>
      ))}
      {entries.length > 4 && (
        <button
          onClick={() => setShowAll(s => !s)}
          style={{ fontSize:11, fontWeight:700, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', padding:'4px 0', textAlign:'center' }}
        >
          {showAll ? 'Show less' : `Show ${entries.length - 4} more`}
        </button>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────
export default function ExpenseBreakdown({ year, month, onBack }) {
  const toast = useToast();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState('overview'); // overview | vehicles | challans | services

  const monthLabel = `${MONTH_NAMES[month]} ${year}`;

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(`/admin/expense-breakdown?year=${year}&month=${month}`);
      setData(res);
    } catch (err) {
      toast('Failed to load breakdown: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [year, month]);

  const s = data?.summary || {};

  // Donut-style percentage ring (pure CSS)
  function Ring({ pct, color, size = 56 }) {
    const r = (size / 2) - 5;
    const circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth={5} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition:'stroke-dasharray 0.6s ease' }}
        />
      </svg>
    );
  }

  return (
    <div className="page-wrapper page-enter">
      {/* Header */}
      <div className="page-header" style={{ justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button className="btn-icon" onClick={onBack}><ArrowLeft size={16} /></button>
          <div>
            <p style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>
              Expense Breakdown
            </p>
            <p style={{ fontSize:15, fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.01em' }}>
              {monthLabel}
            </p>
          </div>
        </div>
        <button className="btn-icon" onClick={load} title="Refresh">
          <RefreshCw size={14} style={loading ? { animation:'spin 1s linear infinite' } : {}} />
        </button>
      </div>

      <div className="page-content">
        {loading && !data ? (
          <div style={{ display:'flex', justifyContent:'center', paddingTop: 60 }}>
            <span className="spinner" style={{ width: 28, height: 28 }} />
          </div>
        ) : !data ? (
          <p style={{ textAlign:'center', color:'var(--text-muted)', paddingTop: 40, fontSize:13 }}>
            Failed to load. Pull to refresh.
          </p>
        ) : (
          <>
            {/* ── Grand total banner ─────────────────────────────── */}
            <div style={{
              background: 'var(--accent)', borderRadius: 'var(--radius)',
              padding: '16px', textAlign:'center', position:'relative', overflow:'hidden',
            }}>
              <div style={{ position:'absolute', right:-24, top:-24, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,0.07)', pointerEvents:'none' }} />
              <p style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.80)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                Total Spend — {monthLabel}
              </p>
              <p style={{ fontSize:32, fontWeight:900, color:'#fff', letterSpacing:'-0.04em', marginTop:4, lineHeight:1 }}>
                ₹{fmt(s.grandTotal ?? 0, 0)}
              </p>
              <p style={{ fontSize:10, color:'rgba(255,255,255,0.65)', marginTop:6 }}>
                Across {data.byVehicle?.length || 0} vehicle{data.byVehicle?.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* ── 3 category pills ──────────────────────────────── */}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <Pill color="fuel"     label="Fuel"     value={s.fuel     ?? 0} pct={s.fuelPct     ?? 0} />
              <Pill color="challans" label="Challans" value={s.challans ?? 0} pct={s.challanPct  ?? 0} />
              <Pill color="services" label="Services" value={s.services ?? 0} pct={s.servicePct  ?? 0} />
              {(s.emi ?? 0) > 0 && (
                <Pill color="emi" label="EMIs" value={s.emi ?? 0} pct={s.emiPct ?? 0} />
              )}
            </div>

            {/* ── Category split rings ───────────────────────────── */}
            {s.grandTotal > 0 && (
              <div style={{
                display:'flex', justifyContent:'space-around', alignItems:'center',
                background:'var(--bg-card)', borderRadius: 'var(--radius)',
                border:'1px solid var(--border)', padding:'14px 8px',
              }}>
                {[
                  { label:'Fuel',     color:'var(--success)', pct: s.fuelPct    ?? 0, value: s.fuel     ?? 0 },
                  { label:'Challans', color:'var(--danger)',  pct: s.challanPct ?? 0, value: s.challans ?? 0 },
                  { label:'Services', color:'var(--accent)',  pct: s.servicePct ?? 0, value: s.services ?? 0 },
                ].map(({ label, color, pct, value }) => (
                  <div key={label} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                    <div style={{ position:'relative', width:56, height:56 }}>
                      <Ring pct={pct} color={color} size={56} />
                      <span style={{
                        position:'absolute', inset:0, display:'flex', alignItems:'center',
                        justifyContent:'center', fontSize:11, fontWeight:900, color,
                      }}>{pct}%</span>
                    </div>
                    <p style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</p>
                    <p style={{ fontSize:11, fontWeight:800, color:'var(--text-primary)' }}>₹{fmt(value, 0)}</p>
                  </div>
                ))}
              </div>
            )}

            {/* ── Tabs ──────────────────────────────────────────── */}
            <div style={{ display:'flex', gap:6, background:'var(--bg-elevated)', borderRadius:12, padding:4 }}>
              {[
                { id:'overview',  label:'Overview'  },
                { id:'vehicles',  label:'Vehicles'  },
                { id:'challans',  label:'Challans'  },
                { id:'services',  label:'Services'  },
                { id:'emis',      label:'EMIs'      },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    flex: 1, padding: '7px 0', borderRadius: 9, border:'none', cursor:'pointer',
                    fontSize: 11, fontWeight: 700,
                    background: tab === t.id ? 'var(--bg-card)' : 'transparent',
                    color: tab === t.id ? 'var(--accent)' : 'var(--text-muted)',
                    boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── Overview tab ─────────────────────────────────── */}
            {tab === 'overview' && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {/* Daily fuel trend */}
                <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'12px 14px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
                    <TrendingUp size={13} color="var(--success)" />
                    <p style={{ fontSize:12, fontWeight:800, color:'var(--text-primary)' }}>Daily Fuel Spend</p>
                    <span style={{ marginLeft:'auto', fontSize:9, color:'var(--text-muted)', fontWeight:600 }}>{monthLabel}</span>
                  </div>
                  <DailyBar dailyTrend={data.dailyTrend} />
                </div>

                {/* Top 3 vehicles by spend */}
                {data.byVehicle?.length > 0 && (
                  <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'12px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
                      <Car size={13} color="var(--accent)" />
                      <p style={{ fontSize:12, fontWeight:800, color:'var(--text-primary)' }}>Top Vehicles by Spend</p>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                      {data.byVehicle.slice(0, 3).map((v, i) => {
                        const barW = s.grandTotal > 0 ? Math.max(4, Math.round((v.total / s.grandTotal) * 100)) : 0;
                        return (
                          <div key={v.vehicleId}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                              <span style={{ fontSize:11, fontWeight:800, fontFamily:'var(--font-mono)', color:'var(--accent)' }}>
                                {i+1}. {v.plateNumber}
                              </span>
                              <span style={{ fontSize:11, fontWeight:800, color:'var(--text-primary)' }}>₹{fmt(v.total, 0)}</span>
                            </div>
                            <div style={{ height:4, borderRadius:2, background:'var(--bg-elevated)' }}>
                              <div style={{ height:'100%', width:`${barW}%`, borderRadius:2, background:'var(--accent)', transition:'width 0.5s ease' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {data.byVehicle.length > 3 && (
                      <button onClick={() => setTab('vehicles')} style={{ fontSize:11, fontWeight:700, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', padding:'8px 0 0', width:'100%', textAlign:'center' }}>
                        View all {data.byVehicle.length} vehicles →
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Vehicles tab ─────────────────────────────────── */}
            {tab === 'vehicles' && (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {data.byVehicle?.length === 0 ? (
                  <p style={{ textAlign:'center', color:'var(--text-muted)', padding:'20px 0', fontSize:12 }}>No vehicle activity this month</p>
                ) : (
                  data.byVehicle.map(v => (
                    <VehicleRow key={v.vehicleId} v={v} grandTotal={s.grandTotal ?? 0} />
                  ))
                )}
              </div>
            )}

            {/* ── Challans tab ─────────────────────────────────── */}
            {tab === 'challans' && (
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <p style={{ fontSize:12, fontWeight:800, color:'var(--text-primary)' }}>
                    Challans paid this month
                  </p>
                  <span style={{ fontSize:11, fontWeight:800, color:'var(--danger)' }}>
                    ₹{fmt(s.challans ?? 0, 0)} total
                  </span>
                </div>
                {data.challanEntries?.length === 0 ? (
                  <p style={{ fontSize:11, color:'var(--text-muted)', textAlign:'center', padding:'10px 0' }}>No challans paid this month</p>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {data.challanEntries.map(e => (
                      <div key={String(e.id)} style={{
                        display:'flex', alignItems:'center', gap:8,
                        padding:'8px 11px', borderRadius:10,
                        background:'var(--danger-dim)',
                        border:'1px solid rgba(220,38,38,0.15)',
                      }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontSize:11, fontWeight:800, fontFamily:'var(--font-mono)', color:'var(--danger)' }}>{e.plateNumber}</p>
                          <p style={{ fontSize:9, color:'var(--text-muted)', marginTop:1 }}>
                            {e.offence || 'Challan'}
                            {e.issuedAt ? ` · issued ${new Date(e.issuedAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'2-digit' })}` : ''}
                          </p>
                        </div>
                        <div style={{ textAlign:'right', flexShrink:0 }}>
                          <p style={{ fontSize:12, fontWeight:800, color:'var(--danger)' }}>₹{fmt(e.amount, 0)}</p>
                          <p style={{ fontSize:8, color:'var(--text-muted)', marginTop:1 }}>
                            paid {new Date(e.paidAt).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Services tab ─────────────────────────────────── */}
            {tab === 'services' && (
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <p style={{ fontSize:12, fontWeight:800, color:'var(--text-primary)' }}>
                    Services this month
                  </p>
                  <span style={{ fontSize:11, fontWeight:800, color:'var(--accent)' }}>
                    ₹{fmt(s.services ?? 0, 0)} total
                  </span>
                </div>
                <EntryList entries={data.serviceEntries} type="services" />
              </div>
            )}

            {/* ── EMIs tab ─────────────────────────────────────── */}
            {tab === 'emis' && (
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <p style={{ fontSize:12, fontWeight:800, color:'var(--text-primary)' }}>
                    EMIs approved this month
                  </p>
                  <span style={{ fontSize:11, fontWeight:800, color:'var(--accent)' }}>
                    ₹{fmt(s.emi ?? 0, 0)} total
                  </span>
                </div>
                {!data.emiEntries?.length ? (
                  <p style={{ fontSize:11, color:'var(--text-muted)', textAlign:'center', padding:'10px 0' }}>No EMI payments approved this month</p>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {data.emiEntries.map(e => (
                      <div key={String(e.id)} style={{
                        display:'flex', alignItems:'center', gap:8,
                        padding:'8px 11px', borderRadius:10,
                        background:'var(--accent-dim)',
                        border:'1px solid rgba(249,115,22,0.15)',
                      }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontSize:11, fontWeight:800, fontFamily:'var(--font-mono)', color:'var(--accent)' }}>{e.plateNumber}</p>
                          <p style={{ fontSize:9, color:'var(--text-muted)', marginTop:1 }}>{e.lenderName} · EMI</p>
                        </div>
                        <div style={{ textAlign:'right', flexShrink:0 }}>
                          <p style={{ fontSize:12, fontWeight:800, color:'var(--accent)' }}>₹{fmt(e.amount, 0)}</p>
                          <p style={{ fontSize:8, color:'var(--text-muted)', marginTop:1 }}>
                            {new Date(e.paidAt).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
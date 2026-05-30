import { useState, useEffect } from 'react';
import { api, fmt, fmtRs, fmtDate, fmtShort, clearAuth } from './api.js';
import { useToast } from './Toast.jsx';
import {
  Building2, Users, Truck, Fuel, RefreshCw, TrendingUp, TrendingDown,
  ArrowUpRight, IndianRupee, BarChart3,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      <p className="chart-tip-label">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="chart-tip-row">
          <span className="chart-tip-dot" style={{ background: p.color }} />
          <span style={{ color:'var(--text-2)' }}>{p.name}:</span>
          <span style={{ fontFamily:'var(--mono)', fontWeight:600, color: p.color }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function Delta({ v }) {
  if (v == null) return null;
  const up = v >= 0;
  return (
    <span className={`delta ${up ? 'delta-up' : 'delta-dn'}`}>
      {up ? <TrendingUp size={9} strokeWidth={2.5} /> : <TrendingDown size={9} strokeWidth={2.5} />}
      {up ? '+' : ''}{v}%
    </span>
  );
}

function KPI({ label, value, sub, color, growth, onClick }) {
  return (
    <div className="card card-link" onClick={onClick} style={{ display:'flex', flexDirection:'column', gap:12, cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <p className="lbl" style={{ marginTop:0 }}>{label}</p>
        {growth != null && <Delta v={growth} />}
      </div>
      <p className="num-xl" style={{ color }}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {sub && <p className="sublbl">{sub}</p>}
    </div>
  );
}

function HealthBar({ label, val, total, color }) {
  const pct = total > 0 ? Math.round((val / total) * 100) : 0;
  return (
    <div style={{ padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, alignItems:'center' }}>
        <span style={{ fontSize:12, color:'var(--text-2)' }}>{label}</span>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:12, fontFamily:'var(--mono)', fontWeight:600, color }}>{val.toLocaleString()}</span>
          <span style={{ fontSize:11, color:'var(--text-4)' }}>{pct}%</span>
        </div>
      </div>
      <div className="progress">
        <div className="progress-fill" style={{ width:`${pct}%`, background:color, opacity:0.8 }} />
      </div>
    </div>
  );
}

export default function Dashboard({ onNavigate }) {
  const toast = useToast();
  const [stats,   setStats]   = useState(null);
  const [ov,      setOv]      = useState(null);
  const [chart,   setChart]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); const iv = setInterval(poll, 30000); return () => clearInterval(iv); }, []);

  async function load() {
    setLoading(true);
    try {
      const [s, o, c] = await Promise.all([
        api.get('/superadmin/stats'),
        api.get('/superadmin/analytics/overview'),
        api.get('/superadmin/analytics/registrations?range=14'),
      ]);
      setStats(s); setOv(o);
      setChart((c.data || []).map(d => ({
        ...d,
        label: new Date(d.date).toLocaleDateString('en-IN', { day:'numeric', month:'short' }),
      })));
    } catch (err) {
      if (err.message?.includes('401')) { clearAuth(); window.location.reload(); }
    } finally { setLoading(false); }
  }

  async function poll() {
    try {
      const [s, o] = await Promise.all([api.get('/superadmin/stats'), api.get('/superadmin/analytics/overview')]);
      setStats(s); setOv(o);
    } catch {}
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', gap:10, flexDirection:'column' }}>
      <div className="spin-ring spin-ring-lg" />
      <p style={{ fontSize:12, color:'var(--text-3)' }}>Loading…</p>
    </div>
  );

  const s = stats || {};
  const o = ov || {};

  return (
    <div className="content fade-in" style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <p className="page-title">Dashboard</p>
          <p className="page-sub">Platform overview — all companies</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}>
          <RefreshCw size={12} strokeWidth={2} /> Refresh
        </button>
      </div>

      {/* Today strip */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'12px 18px', display:'flex', alignItems:'center', gap:0, overflow:'hidden' }}>
        <div style={{ paddingRight:18, borderRight:'1px solid var(--border)', marginRight:18 }}>
          <p style={{ fontSize:10, fontWeight:600, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Today</p>
          <p style={{ fontSize:11, color:'var(--text-3)' }}>{new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}</p>
        </div>
        {[
          { label:'New Users',    val: o.today?.users     ?? 0, color:'var(--blue-l)'   },
          { label:'New Vehicles', val: o.today?.vehicles  ?? 0, color:'var(--amber-l)'  },
          { label:'New Companies',val: o.today?.companies ?? 0, color:'var(--purple-l)' },
          { label:'New Admins',   val: o.today?.admins    ?? 0, color:'var(--green-l)'  },
        ].map((item, i, arr) => (
          <div key={item.label} style={{ flex:1, paddingLeft: i===0?0:18, borderLeft: i===0?'none':'1px solid var(--border)', marginLeft: i===0?0:0 }}>
            <p className="num-lg" style={{ color:item.color }}>{item.val}</p>
            <p style={{ fontSize:11, color:'var(--text-3)', marginTop:3 }}>{item.label}</p>
          </div>
        ))}
      </div>

      {/* KPI row */}
      <div className="g4">
        <KPI label="Companies" value={s.totals?.companies ?? 0} sub={`${s.active?.companies ?? 0} active`}
          color="var(--blue-l)"   growth={o.growth?.companies} onClick={() => onNavigate('companies')} />
        <KPI label="Admins"    value={s.totals?.admins    ?? 0} sub={`${s.active?.admins ?? 0} active`}
          color="var(--green-l)"  growth={null}               onClick={() => onNavigate('admins')} />
        <KPI label="Drivers"   value={s.totals?.users     ?? 0} sub={`${s.active?.users ?? 0} active`}
          color="var(--purple-l)" growth={o.growth?.users}    onClick={() => onNavigate('users')} />
        <KPI label="Vehicles"  value={s.totals?.vehicles  ?? 0} sub="all companies"
          color="var(--amber-l)"  growth={o.growth?.vehicles} onClick={() => onNavigate('vehicles')} />
      </div>

      {/* Finance row */}
      <div className="g3">
        <div style={{ background:'var(--blue)', borderRadius:12, padding:20, gridColumn:'span 1' }}>
          <p style={{ fontSize:11, color:'rgba(255,255,255,0.5)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.07em' }}>Total Platform Spend</p>
          <p className="num-xl" style={{ color:'#fff', marginTop:10 }}>{fmtRs(s.financial?.totalSpend)}</p>
          <p style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginTop:6 }}>{fmt(s.financial?.totalLitres, 0)} litres total</p>
        </div>
        <div className="card">
          <p className="lbl">Total Fuel Entries</p>
          <p className="num-xl" style={{ color:'var(--amber-l)', marginTop:10 }}>{(s.totals?.fuelLogs ?? 0).toLocaleString()}</p>
          <p className="sublbl" style={{ marginTop:6 }}>across all companies</p>
        </div>
        <div className="card">
          <p className="lbl">Average ₹ / Litre</p>
          <p className="num-xl" style={{ color:'var(--green-l)', marginTop:10 }}>
            {s.financial?.totalLitres && s.financial?.totalSpend
              ? fmtRs(s.financial.totalSpend / s.financial.totalLitres)
              : '—'}
          </p>
          <p className="sublbl" style={{ marginTop:6 }}>platform average</p>
        </div>
      </div>

      {/* Chart + Health */}
      <div className="g2" style={{ alignItems:'start' }}>
        {/* 14-day trend */}
        <div className="card">
          <div className="section-header">
            <div>
              <p className="section-title">Registration Trend</p>
              <p className="section-sub">Last 14 days</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('analytics')}>
              Analytics <ArrowUpRight size={11} strokeWidth={2} />
            </button>
          </div>
          {chart.length > 0
            ? <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chart} margin={{ top:0, right:0, left:-24, bottom:0 }}>
                  <defs>
                    <linearGradient id="gu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b6ff0" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b6ff0" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="label" tick={{ fontSize:10, fill:'var(--text-4)' }} tickLine={false} axisLine={false} interval={2} />
                  <YAxis tick={{ fontSize:10, fill:'var(--text-4)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="users"    name="Drivers"   stroke="#7aa0f7" strokeWidth={1.5} fill="url(#gu)" dot={false} />
                  <Area type="monotone" dataKey="vehicles" name="Vehicles"  stroke="#fcd34d" strokeWidth={1.5} fill="url(#gv)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            : <div className="empty"><p>No data yet</p></div>
          }
        </div>

        {/* Platform Health */}
        <div className="card">
          <div className="section-header">
            <p className="section-title">Platform Health</p>
          </div>
          <HealthBar label="Active Companies" val={s.active?.companies ?? 0} total={s.totals?.companies ?? 0} color="var(--blue-l)" />
          <HealthBar label="Active Admins"    val={s.active?.admins    ?? 0} total={s.totals?.admins    ?? 0} color="var(--green-l)" />
          <HealthBar label="Active Drivers"   val={s.active?.users     ?? 0} total={s.totals?.users     ?? 0} color="var(--purple-l)" />
          <div style={{ paddingTop:14, marginTop:4 }}>
            <p style={{ fontSize:11, color:'var(--text-4)', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.07em', fontWeight:600 }}>This Week</p>
            {[
              { label:'Drivers Registered',  val: o.week?.users,     color:'var(--blue-l)'   },
              { label:'Vehicles Added',       val: o.week?.vehicles,  color:'var(--amber-l)'  },
              { label:'Companies Joined',     val: o.week?.companies, color:'var(--purple-l)' },
            ].map(r => (
              <div key={r.label} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:12, color:'var(--text-2)' }}>{r.label}</span>
                <span className="num-sm" style={{ color:r.color }}>{r.val ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent fuel logs */}
      {s.recentLogs?.length > 0 && (
        <div className="card" style={{ padding:0 }}>
          <div style={{ padding:'16px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <p className="section-title">Recent Fuel Entries</p>
              <p className="section-sub">Latest fills across all companies</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('fuellogs')}>View all <ArrowUpRight size={11} /></button>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Company</th><th>Driver</th><th>Vehicle</th>
                  <th style={{ textAlign:'right' }}>Litres</th>
                  <th style={{ textAlign:'right' }}>Cost</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {s.recentLogs.map(l => (
                  <tr key={l.id}>
                    <td style={{ color:'var(--text-2)', fontSize:12, maxWidth:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.companyName}</td>
                    <td style={{ fontSize:13, fontWeight:500 }}>{l.userName}</td>
                    <td><span className="chip chip-amber" style={{ fontFamily:'var(--mono)', fontSize:11 }}>{l.vehiclePlate}</span></td>
                    <td style={{ textAlign:'right', fontFamily:'var(--mono)', fontSize:12, color:'var(--text-2)' }}>{fmt(l.litres)} L</td>
                    <td style={{ textAlign:'right', fontFamily:'var(--mono)', fontSize:12, color:'var(--green-l)', fontWeight:600 }}>{fmtRs(l.totalCost)}</td>
                    <td style={{ fontSize:11, color:'var(--text-3)' }}>{fmtShort(l.filledAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

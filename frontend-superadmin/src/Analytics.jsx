import { useState, useEffect, useCallback } from 'react';
import { api, fmtDate, fmtRs, fmt } from './api.js';
import { RefreshCw, TrendingUp, TrendingDown, AlertTriangle, CreditCard } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      <p className="chart-tip-label">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="chart-tip-row">
          <span className="chart-tip-dot" style={{ background:p.color }} />
          <span style={{ color:'var(--text-2)' }}>{p.name}:</span>
          <span style={{ fontFamily:'var(--mono)', fontWeight:600, color:p.color }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, growth, color }) {
  const up = growth >= 0;
  return (
    <div className="card card-sm">
      <p className="lbl" style={{ marginBottom:8 }}>{label}</p>
      <p className="num-lg" style={{ color }}>{value ?? 0}</p>
      {growth != null && (
        <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:6 }}>
          <span className={`delta ${up ? 'delta-up' : 'delta-dn'}`}>
            {up ? <TrendingUp size={9} strokeWidth={2.5} /> : <TrendingDown size={9} strokeWidth={2.5} />}
            {up ? '+' : ''}{growth}% vs last month
          </span>
        </div>
      )}
    </div>
  );
}

const RANGE_OPTS = [{ v:'7', l:'7D' }, { v:'30', l:'30D' }, { v:'60', l:'60D' }, { v:'90', l:'90D' }];
const FUEL_COLORS  = { Diesel:'#fcd34d', Petrol:'#7aa0f7', CNG:'#6ee7b7', Electric:'#c4b5fd', Other:'#4a5878' };
const STATUS_COLORS = { active:'#6ee7b7', inactive:'#4a5878', maintenance:'#fcd34d' };

export default function Analytics() {
  const [range,  setRange]  = useState('30');
  const [ts,     setTs]     = useState([]);
  const [ov,     setOv]     = useState(null);
  const [mem,    setMem]    = useState(null);
  const [vb,     setVb]     = useState(null);
  const [loading,setLoading]= useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, t, m, v] = await Promise.all([
        api.get('/superadmin/analytics/overview'),
        api.get(`/superadmin/analytics/registrations?range=${range}`),
        api.get('/superadmin/analytics/membership'),
        api.get('/superadmin/analytics/vehicle-breakdown'),
      ]);
      setOv(o);
      setTs((t.data || []).map(d => ({
        ...d, label: new Date(d.date).toLocaleDateString('en-IN', { day:'numeric', month:'short' }),
      })));
      setMem(m); setVb(v);
    } catch {}
    finally { setLoading(false); }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const o = ov || {}; const m = mem || {};

  return (
    <div className="content fade-in" style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <p className="page-title">Analytics</p>
          <p className="page-sub">Registration trends, growth, and vehicle breakdown</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={12} className={loading ? 'spin' : ''} strokeWidth={2} /> Refresh
        </button>
      </div>

      {/* Today / This Week / This Month */}
      {['Today','This Week','This Month'].map((period, pi) => {
        const src = [o.today, o.week, o.month][pi];
        return (
          <div key={period}>
            <p style={{ fontSize:11, fontWeight:600, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>{period}</p>
            <div className="g4">
              <StatCard label="Users"     value={src?.users}     color="var(--blue-l)"   growth={pi===2?o.growth?.users:null} />
              <StatCard label="Vehicles"  value={src?.vehicles}  color="var(--amber-l)"  growth={pi===2?o.growth?.vehicles:null} />
              <StatCard label="Companies" value={src?.companies} color="var(--purple-l)" growth={pi===2?o.growth?.companies:null} />
              {pi===0 && <StatCard label="Admins" value={src?.admins} color="var(--green-l)" growth={null} />}
              {pi!==0 && <div />}
            </div>
          </div>
        );
      })}

      {/* Registration trend */}
      <div className="card">
        <div className="section-header">
          <div>
            <p className="section-title">Registration Trend</p>
            <p className="section-sub">Daily new registrations</p>
          </div>
          <div className="tabs">
            {RANGE_OPTS.map(opt => (
              <button key={opt.v} className={`tab${range===opt.v?' active':''}`} onClick={() => setRange(opt.v)}>{opt.l}</button>
            ))}
          </div>
        </div>
        {loading
          ? <div style={{ height:240, display:'flex', alignItems:'center', justifyContent:'center' }}><div className="spin-ring" /></div>
          : <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={ts} margin={{ top:0, right:0, left:-22, bottom:0 }}>
                <defs>
                  {[['gu','#3b6ff0'],['gv','#f59e0b'],['gc','#8b5cf6']].map(([id, c]) => (
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={c} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={c} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="label" tick={{ fontSize:10, fill:'var(--text-4)' }} tickLine={false} axisLine={false}
                  interval={Math.max(0, Math.floor(ts.length/10)-1)} />
                <YAxis tick={{ fontSize:10, fill:'var(--text-4)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTip />} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize:11, paddingTop:12 }} />
                <Area type="monotone" dataKey="users"     name="Drivers"   stroke="#7aa0f7" strokeWidth={1.5} fill="url(#gu)" dot={false} />
                <Area type="monotone" dataKey="vehicles"  name="Vehicles"  stroke="#fcd34d" strokeWidth={1.5} fill="url(#gv)" dot={false} />
                <Area type="monotone" dataKey="companies" name="Companies" stroke="#c4b5fd" strokeWidth={1.5} fill="url(#gc)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
        }
      </div>

      {/* Vehicle breakdown */}
      {vb && (
        <div className="g2">
          <div className="card">
            <div className="section-header"><p className="section-title">By Fuel Type</p></div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={vb.byFuelType} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" nameKey="name">
                  {vb.byFuelType.map(e => <Cell key={e.name} fill={FUEL_COLORS[e.name] || '#4a5878'} />)}
                </Pie>
                <Tooltip contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border-2)', borderRadius:6, fontSize:12 }} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize:11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <div className="section-header"><p className="section-title">By Status</p></div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={vb.byStatus} margin={{ top:0, right:0, left:-20, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" tick={{ fontSize:11, fill:'var(--text-4)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize:10, fill:'var(--text-4)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border-2)', borderRadius:6, fontSize:12 }} />
                <Bar dataKey="value" name="Vehicles" radius={[3,3,0,0]}>
                  {vb.byStatus.map(e => <Cell key={e.name} fill={STATUS_COLORS[e.name] || '#4a5878'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Membership summary */}
      {m.totals && (
        <>
          <div>
            <p style={{ fontSize:11, fontWeight:600, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>Membership Breakdown</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
              {[
                { label:'Total Companies',   val:m.totals.total,        color:'var(--text-2)' },
                { label:'Active Plans',       val:m.totals.withPlan,     color:'var(--green-l)' },
                { label:'Monthly',            val:m.totals.monthly,      color:'var(--blue-l)' },
                { label:'Yearly',             val:m.totals.yearly,       color:'var(--purple-l)' },
                { label:'No Plan',            val:m.totals.withoutPlan,  color:'var(--text-4)' },
                { label:'Expiring (30d)',      val:m.totals.expiringSoon, color:'var(--amber-l)' },
                { label:'Expired',            val:m.totals.expired,      color:'var(--red-l)' },
                { label:'Limit Requests',     val:m.totals.pendingReqs,  color:'var(--amber-l)' },
              ].map(r => (
                <div key={r.label} className="card card-sm">
                  <p className="num-md" style={{ color:r.color }}>{r.val ?? 0}</p>
                  <p className="sublbl" style={{ marginTop:4 }}>{r.label}</p>
                </div>
              ))}
            </div>
          </div>

          {m.expiringSoon?.length > 0 && (
            <div className="card">
              <div className="section-header">
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <AlertTriangle size={14} strokeWidth={2} color="var(--amber-l)" />
                  <p className="section-title">Expiring Soon</p>
                  <span className="chip chip-amber">{m.expiringSoon.length}</span>
                </div>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table className="tbl">
                  <thead><tr><th>Company</th><th>Plan</th><th>Vehicle Limit</th><th>Expires</th></tr></thead>
                  <tbody>
                    {m.expiringSoon.map(c => (
                      <tr key={c.id}>
                        <td style={{ fontWeight:500 }}>{c.name}</td>
                        <td><span className="chip chip-blue">{c.plan}</span></td>
                        <td style={{ fontFamily:'var(--mono)' }}>{c.vehicleLimit}</td>
                        <td style={{ color:'var(--amber-l)', fontSize:12 }}>{fmtDate(c.expiresAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

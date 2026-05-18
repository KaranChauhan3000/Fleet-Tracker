import { useState, useEffect } from 'react';
import { api, fmt, fmtRs, MONTH_OPTS } from './api.js';
import { useToast } from './Toast.jsx';
import { Bell, Clock, Copy, Check, RefreshCw, BarChart2, Calendar, Download, TrendingUp, TrendingDown, Minus, Users, Car, Fuel, IndianRupee, Building2 } from 'lucide-react';

// ── OTP Panel ─────────────────────────────────────────────────────
export function OtpPanel() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); const iv = setInterval(load, 8000); return () => clearInterval(iv); }, []);
  useEffect(() => { load(); }, [page]);

  async function load() {
    try {
      const r = await api.get(`/superadmin/otp-requests?page=${page}&limit=20`);
      setRows(r.data || []); setTotal(r.total || 0);
    } catch(err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  }

  return (
    <div className="content">
      <div className="section-header">
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Bell size={18} color="var(--amber-l)" />
          <div>
            <h2 className="section-title">OTP Requests</h2>
            <p className="section-sub">{total} pending · auto-refreshes every 8s</p>
          </div>
          <span className="dot-live" />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={13} /> Refresh</button>
      </div>

      <div style={{ background:'var(--amber-d)', border:'1px solid rgba(217,119,6,0.25)', borderRadius:10, padding:'12px 16px', marginBottom:20, fontSize:13, color:'var(--amber-l)', display:'flex', gap:10 }}>
        <Bell size={16} style={{ flexShrink:0, marginTop:1 }} />
        <div>
          <p style={{ fontWeight:700, marginBottom:2 }}>How OTP Login Works</p>
          <p style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.5 }}>
            When an Admin or User requests an OTP to login, it appears here in real-time. You call or message the person and give them their 6-digit code.
            Codes expire after <strong style={{ color:'var(--amber-l)' }}>10 minutes</strong>.
          </p>
        </div>
      </div>

      {loading ? <div style={{ textAlign:'center', padding:40 }}><span className="spinner" style={{ width:28, height:28 }} /></div>
        : rows.length === 0 ? (
          <div className="empty" style={{ padding:'60px 0' }}>
            <Bell size={40} style={{ opacity:0.15 }} />
            <p style={{ fontWeight:600 }}>No pending OTP requests</p>
            <p style={{ fontSize:13 }}>New requests will appear here automatically</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {rows.map(otp => <OtpRow key={otp.id} otp={otp} toast={toast} />)}
          </div>
        )}
    </div>
  );
}

function OtpRow({ otp, toast }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(otp.otpCode).then(() => {
      setCopied(true); toast(`OTP for ${otp.entityName} copied!`, 'success');
      setTimeout(() => setCopied(false), 2000);
    });
  }
  const expiresIn = Math.max(0, Math.round((new Date(otp.expiresAt) - Date.now()) / 1000 / 60));
  const pct = Math.max(0, ((new Date(otp.expiresAt) - Date.now()) / (10 * 60 * 1000)) * 100);

  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-2)', borderRadius:12, padding:'16px 20px', display:'flex', alignItems:'center', gap:20 }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:6 }}>
          <p style={{ fontSize:16, fontWeight:800 }}>{otp.entityName}</p>
          <span className={`badge ${otp.role === 'admin' ? 'badge-blue' : 'badge-purple'}`}>{otp.role}</span>
          <span style={{ fontSize:12, color:'var(--text-3)' }}>{otp.companyName}</span>
        </div>
        <p style={{ fontSize:13, color:'var(--text-2)', marginBottom:8 }}>📞 {otp.phone}</p>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ flex:1, height:4, background:'var(--bg-2)', borderRadius:2, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${pct}%`, background: pct > 50 ? 'var(--green)' : pct > 20 ? 'var(--amber)' : 'var(--red)', borderRadius:2, transition:'width 1s' }} />
          </div>
          <p style={{ fontSize:11, color:'var(--text-3)', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:4 }}>
            <Clock size={10} /> {expiresIn} min left
          </p>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8, flexShrink:0 }}>
        <div style={{ fontFamily:'var(--mono)', fontSize:28, fontWeight:900, color:'var(--amber-l)', background:'var(--amber-d)', border:'1px solid rgba(217,119,6,0.25)', borderRadius:10, padding:'8px 16px', letterSpacing:'0.2em' }}>
          {otp.otpCode}
        </div>
        <button className="btn btn-ghost btn-sm" style={{ gap:5 }} onClick={copy}>
          {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy Code</>}
        </button>
      </div>
    </div>
  );
}

// ── Reports ───────────────────────────────────────────────────────
export function Reports({ admin }) {
  const toast = useToast();
  const [tab, setTab] = useState('compare');

  return (
    <div className="content">
      <div className="section-header">
        <div><h2 className="section-title">Reports & Analytics</h2><p className="section-sub">Cross-company insights · A4 PDF export</p></div>
      </div>
      <div className="tabs">
        <button className={`tab-btn ${tab==='compare'?'active':''}`} onClick={()=>setTab('compare')}>Month Comparison</button>
        <button className={`tab-btn ${tab==='range'?'active':''}`} onClick={()=>setTab('range')}>Date Range</button>
      </div>
      {tab === 'compare' ? <MonthCompare toast={toast} admin={admin} /> : <DateRange toast={toast} admin={admin} />}
    </div>
  );
}

function MonthCompare({ toast, admin }) {
  const opts = MONTH_OPTS();
  const [m1, setM1] = useState(opts[1]?.value||'');
  const [m2, setM2] = useState(opts[0]?.value||'');
  const [cid, setCid] = useState('');
  const [companies, setCompanies] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get('/superadmin/companies?page=1&limit=200').then(r => setCompanies(r.data||[])).catch(() => {}); }, []);

  async function load() {
    if (!m1||!m2||m1===m2) { toast('Select two different months','error'); return; }
    setLoading(true);
    try {
      const q = new URLSearchParams({ month1:m1, month2:m2 });
      if (cid) q.set('companyId', cid);
      const r = await api.get(`/superadmin/reports/monthly-comparison?${q}`);
      setData(r);
    } catch(err) { toast(err.message,'error'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:12, alignItems:'end' }}>
        <div className="form-row">
          <label className="form-label">Month A</label>
          <select className="form-input" value={m1} onChange={e=>setM1(e.target.value)}>
            {opts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label className="form-label">Month B</label>
          <select className="form-input" value={m2} onChange={e=>setM2(e.target.value)}>
            {opts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label className="form-label">Filter by Company</label>
          <select className="form-input" value={cid} onChange={e=>setCid(e.target.value)}>
            <option value="">All Companies</option>
            {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={load} disabled={loading}>
          {loading?<><span className="spinner"/>Loading...</>:<><BarChart2 size={13}/>Compare</>}
        </button>
      </div>

      {data && (
        <>
          <CompareTable data={data} />
          <button className="btn btn-ghost btn-sm" style={{ alignSelf:'flex-start' }} onClick={()=>printSAReport(data,'compare',{m1,m2},admin)}>
            <Download size={13}/> Export PDF (Super Admin Report)
          </button>
        </>
      )}
    </div>
  );
}

function CompareTable({ data }) {
  const { month1: a, month2: b } = data;
  const fmtM = m => { const [y,mo]=m.split('-'); return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(mo)-1]+' '+y; };
  const rows = [
    ['Total Fills', a.totalFills, b.totalFills, v=>v],
    ['Total Litres', a.totalLitres, b.totalLitres, v=>fmt(v,1)+'L'],
    ['Total Spend', a.totalCost, b.totalCost, v=>fmtRs(v)],
    ['Avg ₹/Litre', a.avgCostPerLitre, b.avgCostPerLitre, v=>fmtRs(v)],
    ['Avg L/100km', a.avgEfficiency, b.avgEfficiency, v=>v?fmt(v,2):'—'],
    ['Active Vehicles', a.activeVehicles, b.activeVehicles, v=>v],
    ['Active Users', a.activeUsers, b.activeUsers, v=>v],
  ];
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>
          <th>Metric</th>
          <th style={{ color:'var(--accent-l)' }}>{fmtM(data.month1.label)}</th>
          <th style={{ color:'var(--amber-l)' }}>{fmtM(data.month2.label)}</th>
          <th>Change</th>
        </tr></thead>
        <tbody>
          {rows.map(([l,va,vb,f])=>{
            const diff = va&&vb&&va!==0 ? (((vb-va)/Math.abs(va))*100) : null;
            const c = diff!=null ? (diff>0?'var(--red-l)':diff<0?'var(--green-l)':'var(--text-3)') : 'var(--text-3)';
            return (
              <tr key={l}>
                <td style={{ fontWeight:600 }}>{l}</td>
                <td style={{ fontWeight:700, fontSize:15 }}>{va!=null?f(va):'—'}</td>
                <td style={{ fontWeight:700, fontSize:15 }}>{vb!=null?f(vb):'—'}</td>
                <td>
                  {diff!=null ? (
                    <span style={{ color:c, fontWeight:700, fontSize:13, display:'flex', alignItems:'center', gap:4 }}>
                      {diff>0?<TrendingUp size={13}/>:diff<0?<TrendingDown size={13}/>:<Minus size={13}/>}
                      {Math.abs(diff).toFixed(1)}%
                    </span>
                  ) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DateRange({ toast, admin }) {
  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().split('T')[0];
  const [from,setFrom]=useState(monthStart);const [to,setTo]=useState(today);
  const [cid,setCid]=useState('');const [companies,setCompanies]=useState([]);
  const [data,setData]=useState(null);const [loading,setLoading]=useState(false);

  useEffect(()=>{api.get('/superadmin/companies?page=1&limit=200').then(r=>setCompanies(r.data||[])).catch(()=>{});},[]);

  async function load() {
    if(!from||!to){toast('Select date range','error');return;}
    setLoading(true);
    try{
      const q=new URLSearchParams({from,to});if(cid)q.set('companyId',cid);
      const r=await api.get(`/superadmin/reports/summary?${q}`);setData(r);
    }catch(err){toast(err.message,'error');}finally{setLoading(false);}
  }

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:12,alignItems:'end' }}>
        <div className="form-row"><label className="form-label">From</label><input className="form-input" type="date" value={from} onChange={e=>setFrom(e.target.value)} max={to}/></div>
        <div className="form-row"><label className="form-label">To</label><input className="form-input" type="date" value={to} onChange={e=>setTo(e.target.value)} min={from} max={today}/></div>
        <div className="form-row"><label className="form-label">Company</label>
          <select className="form-input" value={cid} onChange={e=>setCid(e.target.value)}>
            <option value="">All Companies</option>
            {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={load} disabled={loading}>
          {loading?<><span className="spinner"/>Loading...</>:<><Calendar size={13}/>Generate</>}
        </button>
      </div>

      {data && (
        <>
          <div className="grid-4">
            {[
              { label:'Total Fills', value:data.summary?.totalFills??0, color:'var(--amber-l)' },
              { label:'Total Spend', value:fmtRs(data.summary?.totalCost), color:'var(--green-l)' },
              { label:'Total Litres', value:fmt(data.summary?.totalLitres,1)+'L', color:'var(--accent-l)' },
              { label:'Avg Efficiency', value:data.summary?.avgEff?fmt(data.summary.avgEff,2)+' L/100km':'—', color:'var(--purple-l)' },
            ].map(c=>(
              <div key={c.label} className="card-sm">
                <p style={{ fontSize:11,color:'var(--text-3)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em' }}>{c.label}</p>
                <p style={{ fontSize:22,fontWeight:900,color:c.color,marginTop:4 }}>{c.value}</p>
              </div>
            ))}
          </div>

          {data.byCompany?.length > 0 && (
            <div>
              <p style={{ fontWeight:700,marginBottom:10,display:'flex',alignItems:'center',gap:6 }}><Building2 size={14}/>By Company</p>
              <div className="table-wrap"><table>
                <thead><tr><th>Company</th><th>Fills</th><th>Litres</th><th>Total Spend</th></tr></thead>
                <tbody>{data.byCompany.map((c,i)=>(
                  <tr key={i}><td style={{fontWeight:700}}>{c.companyName}</td><td>{c.fills}</td><td>{fmt(c.totalLitres,1)}L</td><td style={{fontWeight:800,color:'var(--green-l)'}}>{fmtRs(c.totalCost)}</td></tr>
                ))}</tbody>
              </table></div>
            </div>
          )}

          {data.byVehicle?.length > 0 && (
            <div>
              <p style={{ fontWeight:700,marginBottom:10,display:'flex',alignItems:'center',gap:6 }}><Car size={14}/>Top Vehicles by Spend</p>
              <div className="table-wrap"><table>
                <thead><tr><th>Plate</th><th>Fills</th><th>Litres</th><th>Total Spend</th></tr></thead>
                <tbody>{data.byVehicle.slice(0,15).map((v,i)=>(
                  <tr key={i}><td style={{fontFamily:'var(--mono)',fontWeight:700}}>{v.plateNumber}</td><td>{v.fills}</td><td>{fmt(v.totalLitres,1)}L</td><td style={{fontWeight:800,color:'var(--green-l)'}}>{fmtRs(v.totalCost)}</td></tr>
                ))}</tbody>
              </table></div>
            </div>
          )}

          {data.byUser?.length > 0 && (
            <div>
              <p style={{ fontWeight:700,marginBottom:10,display:'flex',alignItems:'center',gap:6 }}><Users size={14}/>Top Users by Spend</p>
              <div className="table-wrap"><table>
                <thead><tr><th>Name</th><th>Fills</th><th>Litres</th><th>Total Spend</th></tr></thead>
                <tbody>{data.byUser.slice(0,15).map((u,i)=>(
                  <tr key={i}><td style={{fontWeight:700}}>{u.userName}</td><td>{u.fills}</td><td>{fmt(u.totalLitres,1)}L</td><td style={{fontWeight:800,color:'var(--green-l)'}}>{fmtRs(u.totalCost)}</td></tr>
                ))}</tbody>
              </table></div>
            </div>
          )}

          <button className="btn btn-ghost btn-sm" style={{ alignSelf:'flex-start' }} onClick={()=>printSAReport(data,'range',{from,to},admin)}>
            <Download size={13}/> Export Full PDF (Super Admin Report)
          </button>
        </>
      )}
    </div>
  );
}

// ── PDF for Super Admin ───────────────────────────────────────────
function printSAReport(data, type, params, admin) {
  const fmt2=(n,d=2)=>n==null||isNaN(n)?'—':Number(n).toLocaleString('en-IN',{minimumFractionDigits:d,maximumFractionDigits:d});
  const fmtRs2=n=>n==null?'—':'₹'+fmt2(n,0);
  const now = new Date().toLocaleString('en-IN');

  let body='';
  if(type==='compare'){
    const {month1:a,month2:b}=data;
    const fmtM=m=>{const[y,mo]=m.split('-');return['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(mo)-1]+' '+y;};
    body=`<h2>Monthly Comparison: ${fmtM(params.m1)} vs ${fmtM(params.m2)}</h2>
    <table><thead><tr><th>Metric</th><th>${fmtM(params.m1)}</th><th>${fmtM(params.m2)}</th><th>Change %</th></tr></thead><tbody>
    ${[['Total Fills',a.totalFills,b.totalFills,v=>v],['Total Litres',a.totalLitres,b.totalLitres,v=>fmt2(v,1)+'L'],['Total Spend',a.totalCost,b.totalCost,v=>fmtRs2(v)],['Avg ₹/Litre',a.avgCostPerLitre,b.avgCostPerLitre,v=>fmtRs2(v)],['Active Vehicles',a.activeVehicles,b.activeVehicles,v=>v],['Active Users',a.activeUsers,b.activeUsers,v=>v]]
    .map(([l,va,vb,f])=>{const diff=va&&vb&&va!==0?(((vb-va)/Math.abs(va))*100).toFixed(1):null;const c=diff?(parseFloat(diff)>0?'#DC2626':'#059669'):'#888';return`<tr><td>${l}</td><td>${va!=null?f(va):'—'}</td><td>${vb!=null?f(vb):'—'}</td><td style="color:${c};font-weight:700">${diff?diff+'%':'—'}</td></tr>`;}).join('')}
    </tbody></table>`;
  } else {
    const s=data.summary||{};
    body=`<h2>Fleet Report: ${params.from} to ${params.to}</h2>
    <h3>Executive Summary</h3>
    <table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>
    <tr><td>Total Fuel Fills</td><td>${s.totalFills??0}</td></tr>
    <tr><td>Total Litres Consumed</td><td>${fmt2(s.totalLitres,1)}L</td></tr>
    <tr><td>Total Expenditure</td><td>${fmtRs2(s.totalCost)}</td></tr>
    </tbody></table>
    ${data.byCompany?.length?`<h3>By Company</h3><table><thead><tr><th>Company</th><th>Fills</th><th>Litres</th><th>Spend</th></tr></thead><tbody>${data.byCompany.map(c=>`<tr><td>${c.companyName}</td><td>${c.fills}</td><td>${fmt2(c.totalLitres,1)}L</td><td>${fmtRs2(c.totalCost)}</td></tr>`).join('')}</tbody></table>`:''}
    ${data.byVehicle?.length?`<h3>Top Vehicles</h3><table><thead><tr><th>Plate</th><th>Fills</th><th>Litres</th><th>Spend</th></tr></thead><tbody>${data.byVehicle.map(v=>`<tr><td>${v.plateNumber}</td><td>${v.fills}</td><td>${fmt2(v.totalLitres,1)}L</td><td>${fmtRs2(v.totalCost)}</td></tr>`).join('')}</tbody></table>`:''}
    ${data.byUser?.length?`<h3>Top Users</h3><table><thead><tr><th>Name</th><th>Fills</th><th>Litres</th><th>Spend</th></tr></thead><tbody>${data.byUser.map(u=>`<tr><td>${u.userName}</td><td>${u.fills}</td><td>${fmt2(u.totalLitres,1)}L</td><td>${fmtRs2(u.totalCost)}</td></tr>`).join('')}</tbody></table>`:''}
    `;
  }

  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Fleet Tracker — Super Admin Report</title>
  <style>
    @page{size:A4;margin:20mm}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#111}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #2563EB;padding-bottom:12px;margin-bottom:20px}
    .logo{font-size:24px;font-weight:900;color:#2563EB;letter-spacing:-0.02em}
    .super-badge{background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE;border-radius:4px;padding:2px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;display:inline-block;margin-top:4px}
    .meta{font-size:11px;color:#666;text-align:right}
    h2{font-size:18px;color:#1D4ED8;margin:0 0 4px;font-weight:800}
    h3{font-size:13px;color:#2563EB;margin:20px 0 8px;font-weight:700;border-bottom:1px solid #DBEAFE;padding-bottom:4px}
    table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px}
    th{background:#EFF6FF;color:#1D4ED8;font-weight:700;padding:8px 10px;text-align:left;border-bottom:2px solid #BFDBFE;font-size:10px;text-transform:uppercase;letter-spacing:0.04em}
    td{padding:8px 10px;border-bottom:1px solid #F1F5F9}
    tr:nth-child(even) td{background:#FAFAFA}
    .footer{margin-top:24px;font-size:10px;color:#aaa;text-align:center;border-top:1px solid #e5e7eb;padding-top:10px}
  </style></head><body>
  <div class="header">
    <div><div class="logo">⛽ Fleet Tracker</div><div class="super-badge">Super Admin Report</div></div>
    <div class="meta">Generated: ${now}<br/>Super Admin: ${admin?.username||'superadmin'}<br/>CONFIDENTIAL</div>
  </div>
  ${body}
  <div class="footer">Fleet Tracker v3.0 · Super Admin Report · CONFIDENTIAL · For authorized personnel only</div>
  </body></html>`;

  const w=window.open('','_blank');
  w.document.write(html);w.document.close();
  setTimeout(()=>w.print(),600);
}

import { useState, useEffect, useRef } from 'react';
import { api, fmt, fmtRs, fmtDT, clearAuth } from './api.js';
import { useToast } from './Toast.jsx';
import { Building2, Users, Car, Fuel, IndianRupee, Bell, RefreshCw, TrendingUp, Clock, Copy, Check } from 'lucide-react';

export default function Dashboard({ admin, onNavigate }) {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const prevOtpCount = useRef(0);

  useEffect(() => {
    load();
    const iv = setInterval(poll, 10000);
    return () => clearInterval(iv);
  }, []);

  async function load() {
    try { const d = await api.get('/superadmin/stats'); setStats(d); prevOtpCount.current = d.pendingOtps?.length||0; }
    catch(err) { if(err.message.includes('401')) { clearAuth(); window.location.reload(); } }
    finally { setLoading(false); }
  }

  async function poll() {
    try {
      const d = await api.get('/superadmin/stats');
      const newCount = d.pendingOtps?.length||0;
      if (newCount > prevOtpCount.current) toast(`🔔 ${newCount - prevOtpCount.current} new OTP request(s)`, 'success');
      prevOtpCount.current = newCount;
      setStats(d);
    } catch {}
  }

  if (loading) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100%' }}><span className="spinner" style={{width:32,height:32}} /></div>;

  const s = stats || {};
  const otps = s.pendingOtps || [];

  return (
    <div className="content" style={{ display:'flex',flexDirection:'column',gap:24 }}>
      {/* Header */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:22,fontWeight:900,letterSpacing:'-0.02em' }}>Overview</h1>
          <p style={{ fontSize:13,color:'var(--text-3)',marginTop:2 }}>Real-time platform metrics</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={13} /> Refresh</button>
      </div>

      {/* Stat cards */}
      <div className="grid-4">
        {[
          { icon:Building2, color:'var(--accent-l)', dim:'var(--accent-d)', label:'Companies', value:s.totals?.companies??0, sub:`${s.active?.companies??0} active`, nav:'companies' },
          { icon:Users,     color:'var(--green-l)', dim:'var(--green-d)',  label:'Admins',    value:s.totals?.admins??0,   sub:`${s.active?.admins??0} active`,   nav:'admins' },
          { icon:Users,     color:'var(--purple-l)',dim:'var(--purple-d)', label:'Users',     value:s.totals?.users??0,    sub:`${s.active?.users??0} active`,    nav:'users' },
          { icon:Car,       color:'var(--amber-l)', dim:'var(--amber-d)',  label:'Vehicles',  value:s.totals?.vehicles??0, sub:'total fleet', nav:'vehicles' },
        ].map(c => (
          <div key={c.label} className="card-clickable" onClick={()=>onNavigate(c.nav)} style={{ display:'flex',flexDirection:'column',gap:8 }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
              <div style={{ width:36,height:36,background:c.dim,borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center' }}>
                <c.icon size={17} color={c.color} />
              </div>
              <span style={{ fontSize:11,color:'var(--text-3)',fontWeight:600 }}>→</span>
            </div>
            <p className="stat-val" style={{ color:c.color }}>{c.value.toLocaleString()}</p>
            <p className="stat-lbl">{c.label}</p>
            <p className="stat-sub">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Financial row */}
      <div className="grid-3">
        <div className="card" style={{ background:'linear-gradient(135deg,#1D4ED8,#2563EB)',border:'none' }}>
          <p style={{ fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.7)',textTransform:'uppercase',letterSpacing:'0.07em' }}>Platform Total Spend</p>
          <p style={{ fontSize:32,fontWeight:900,letterSpacing:'-0.03em',marginTop:6 }}>{fmtRs(s.financial?.totalSpend)}</p>
          <p style={{ fontSize:12,color:'rgba(255,255,255,0.6)',marginTop:4 }}>{fmt(s.financial?.totalLitres,0)}L total fuel</p>
        </div>
        <div className="card" onClick={()=>onNavigate('fuellogs')} style={{ cursor:'pointer' }}>
          <p style={{ fontSize:11,color:'var(--text-3)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em' }}>Total Fuel Entries</p>
          <p className="stat-val" style={{ color:'var(--amber-l)',fontSize:32,marginTop:6 }}>{(s.totals?.fuelLogs??0).toLocaleString()}</p>
          <p style={{ fontSize:12,color:'var(--text-3)',marginTop:4 }}>across all companies</p>
        </div>
        <div className="card" style={{ display:'flex',alignItems:'center',gap:12 }}>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:11,color:'var(--text-3)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em' }}>Avg Spend / Litre</p>
            <p className="stat-val" style={{ color:'var(--green-l)',fontSize:32,marginTop:6 }}>
              {s.financial?.totalLitres && s.financial?.totalSpend ? fmtRs(s.financial.totalSpend/s.financial.totalLitres) : '—'}
            </p>
          </div>
          <TrendingUp size={40} color="var(--green-l)" style={{ opacity:0.2 }} />
        </div>
      </div>

      {/* Bottom row: OTP + Recent Activity */}
      <div className="grid-2" style={{ alignItems:'start' }}>
        {/* OTP Panel */}
        <div className="card">
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
            <div style={{ display:'flex',alignItems:'center',gap:8 }}>
              <Bell size={16} color={otps.length?'var(--amber-l)':'var(--text-3)'} />
              <h3 style={{ fontSize:14,fontWeight:700 }}>Pending OTP Requests</h3>
              {otps.length>0 && <span style={{ background:'var(--red)',color:'#fff',borderRadius:20,fontSize:10,fontWeight:800,padding:'1px 7px' }}>{otps.length}</span>}
              <span className="dot-live" />
            </div>
            <button className="btn btn-ghost btn-xs" onClick={()=>onNavigate('otps')}>View All</button>
          </div>

          {otps.length===0 ? (
            <div className="empty" style={{ padding:'28px 0' }}>
              <Bell size={28} style={{ opacity:0.2 }} />
              <p style={{ fontSize:13 }}>No pending OTP requests</p>
            </div>
          ) : (
            <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
              {otps.slice(0,5).map(otp => <OtpCard key={otp.id} otp={otp} toast={toast} />)}
              {otps.length>5 && <p style={{ fontSize:12,color:'var(--text-3)',textAlign:'center',paddingTop:4 }}>+{otps.length-5} more — <button style={{ background:'none',color:'var(--accent-l)',fontSize:12 }} onClick={()=>onNavigate('otps')}>view all</button></p>}
            </div>
          )}
        </div>

        {/* Recent Logs */}
        <div className="card">
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
            <h3 style={{ fontSize:14,fontWeight:700 }}>Recent Fuel Activity</h3>
            <button className="btn btn-ghost btn-xs" onClick={()=>onNavigate('fuellogs')}>View All</button>
          </div>
          {!s.recentLogs?.length ? (
            <div className="empty" style={{ padding:'28px 0' }}><Fuel size={28} style={{ opacity:0.2 }} /><p style={{ fontSize:13 }}>No recent activity</p></div>
          ) : (
            <div style={{ display:'flex',flexDirection:'column',gap:0 }}>
              {s.recentLogs.map((l,i) => (
                <div key={l.id} style={{ display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:i<s.recentLogs.length-1?'1px solid var(--border)':'none' }}>
                  <div style={{ width:34,height:34,background:'var(--amber-d)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                    <Fuel size={15} color="var(--amber-l)" />
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <p style={{ fontSize:13,fontWeight:700,fontFamily:'var(--mono)' }}>{l.vehiclePlate||'—'}</p>
                    <p style={{ fontSize:11,color:'var(--text-3)',marginTop:1 }}>{l.companyName} · {l.userName}</p>
                  </div>
                  <div style={{ textAlign:'right',flexShrink:0 }}>
                    <p style={{ fontSize:14,fontWeight:800,color:'var(--green-l)' }}>{fmtRs(l.totalCost)}</p>
                    <p style={{ fontSize:11,color:'var(--text-3)' }}>{fmtDT(l.filledAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OtpCard({ otp, toast }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(otp.otpCode).then(()=>{
      setCopied(true); toast('OTP code copied!','success');
      setTimeout(()=>setCopied(false),2000);
    });
  }

  const expiresIn = Math.max(0, Math.round((new Date(otp.expiresAt) - Date.now()) / 1000 / 60));

  return (
    <div className="otp-card">
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ display:'flex',alignItems:'center',gap:8,flexWrap:'wrap' }}>
          <p style={{ fontSize:14,fontWeight:700 }}>{otp.entityName}</p>
          <span className={`badge ${otp.role==='admin'?'badge-blue':'badge-purple'}`}>{otp.role}</span>
        </div>
        <p style={{ fontSize:11,color:'var(--text-3)',marginTop:3 }}>{otp.companyName} · {otp.phone}</p>
        <p style={{ fontSize:10,color:'var(--text-3)',marginTop:2,display:'flex',alignItems:'center',gap:4 }}>
          <Clock size={9} /> Expires in {expiresIn} min
        </p>
      </div>
      <div style={{ display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6,flexShrink:0 }}>
        <span className="otp-code">{otp.otpCode}</span>
        <button className="btn btn-ghost btn-xs" style={{ gap:4 }} onClick={copy}>
          {copied?<><Check size={11}/>Copied</>:<><Copy size={11}/>Copy</>}
        </button>
      </div>
    </div>
  );
}

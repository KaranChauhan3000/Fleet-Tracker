// Dashboard.jsx — Admin Dashboard
// Changes from original:
//   • No "Recent Fuel Entries" section (removed)
//   • "Reports" added to Quick Actions grid
//   • "Total Spend" stat card now shows THIS MONTH'S FUEL SPEND only
//   • "Fleet Avg" stat card now shows THIS YEAR'S avg efficiency (yearAvgKmpl)
//   • "Avg Cost/Litre" now shows MONTHLY avg cost per litre
//   • Month banner shows TOTAL spend = fuel + challans + services for that month
//   • Stat cards use .stat-card class (orange border, dashboard only)

//   • No glow box-shadows; uses updated index.css vars

import { useState, useEffect, useRef, useCallback } from 'react';
import { api, fmtRs, fmt, fmtDT, clearAuth, softLogout, swrFetch, prefetchMonths } from './api.js';
import { pcGet } from './persistCache.js';
import { useToast } from './Toast.jsx';
import ShareApp from './ShareApp.jsx';
import {
  Fuel, IndianRupee, RefreshCw, LogOut,
  ChevronRight, TrendingUp, Activity, AlertTriangle,
  Navigation, Gauge, Sun, Moon, ChevronLeft, Receipt, Wrench, BarChart2, CreditCard, Share2, ShieldCheck, UserPlus, Bell,
} from 'lucide-react';

const alertStyles = `
@keyframes slideInAlert { 0%{transform:translateY(-4px);opacity:0} 100%{transform:translateY(0);opacity:1} }
@keyframes urgentBlink  { 0%,100%{opacity:1} 50%{opacity:0.45} }
`;

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function TenBar({ daysLeft, isExpired }) {
  const getColor = (i) => {
    const days = isExpired ? 0 : Math.max(0, Math.min(daysLeft, 10));
    const activeStart = 10 - days;
    if (i < activeStart) return 'var(--danger)';
    const posFromRight = 9 - i;
    if (posFromRight <= 1) return 'var(--success)';
    if (posFromRight <= 4) return 'var(--warning)';
    return 'var(--danger)';
  };
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} style={{
          flex: 1, height: 6, borderRadius: 3,
          background: getColor(i), opacity: 0.85, transition: 'background 0.3s',
          animation: (isExpired || daysLeft <= 2) && getColor(i) === 'var(--danger)'
            ? 'urgentBlink 1.2s ease-in-out infinite' : 'none',
        }} />
      ))}
    </div>
  );
}

function ExpiryAlertCard({ alert, onNavigate, type = 'PUC' }) {
  const isExpired  = alert.daysLeft < 0;
  const isCritical = !isExpired && alert.daysLeft <= 3;
  const isWarning  = !isExpired && !isCritical && alert.daysLeft <= 7;
  const daysAbs    = Math.abs(alert.daysLeft);
  const color = isExpired || isCritical ? 'var(--danger)' : isWarning ? 'var(--warning)' : 'var(--success)';
  const bg    = isExpired || isCritical ? 'var(--danger-dim)' : isWarning ? 'var(--warning-dim)' : 'var(--success-dim)';
  const bdrClr= isExpired || isCritical ? 'rgba(220,38,38,0.25)' : isWarning ? 'rgba(217,119,6,0.20)' : 'rgba(22,163,74,0.20)';
  return (
    <div
      onClick={() => onNavigate && onNavigate('vehicleAnalytics', alert.id)}
      style={{ padding:'9px 11px 8px', borderRadius:10, cursor:'pointer', border:`1px solid ${bdrClr}`, background:bg, animation:'slideInAlert 0.3s ease', transition:'transform 0.12s', userSelect:'none' }}
      onMouseDown={e=>e.currentTarget.style.transform='scale(0.98)'}
      onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}
    >
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
        <span style={{ fontWeight:800, fontSize:12, fontFamily:'var(--font-mono)', color, flex:1 }}>{alert.plateNumber}</span>
        <span style={{ fontSize:9, fontWeight:600, color:'var(--text-muted)' }}>{alert.make} {alert.model}</span>
        <span style={{ fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:5, background:`${color}18`, color, border:`1px solid ${bdrClr}`, letterSpacing:'0.05em' }}>
          {type} · {isExpired ? `${daysAbs}d ago` : alert.daysLeft === 0 ? 'TODAY' : `${alert.daysLeft}d`}
        </span>
      </div>
      <TenBar daysLeft={alert.daysLeft} isExpired={isExpired} />
    </div>
  );
}

function ChallanAlertCard({ alert, onNavigate }) {
  const isOverdue = alert.daysLeft < 0;
  const isCritical= !isOverdue && alert.daysLeft <= 3;
  const isWarning = !isOverdue && !isCritical && alert.daysLeft <= 7;
  const daysAbs   = Math.abs(alert.daysLeft);
  const color  = isOverdue || isCritical ? 'var(--danger)' : isWarning ? 'var(--warning)' : 'var(--success)';
  const bg     = isOverdue || isCritical ? 'var(--danger-dim)' : isWarning ? 'var(--warning-dim)' : 'var(--success-dim)';
  const bdrClr = isOverdue || isCritical ? 'rgba(220,38,38,0.25)' : isWarning ? 'rgba(217,119,6,0.20)' : 'rgba(22,163,74,0.20)';
  return (
    <div
      onClick={() => onNavigate && onNavigate('challans')}
      style={{ padding:'9px 11px 8px', borderRadius:10, cursor:'pointer', border:`1px solid ${bdrClr}`, background:bg, animation:'slideInAlert 0.3s ease', transition:'transform 0.12s', userSelect:'none' }}
      onMouseDown={e=>e.currentTarget.style.transform='scale(0.98)'}
      onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}
    >
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
        <span style={{ fontWeight:800, fontSize:12, fontFamily:'var(--font-mono)', color, flex:1 }}>{alert.plateNumber}</span>
        <span style={{ fontSize:9, fontWeight:600, color:'var(--text-muted)', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', maxWidth:90 }}>{alert.offence}</span>
        <span style={{ fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:5, background:`${color}18`, color, border:`1px solid ${bdrClr}`, letterSpacing:'0.05em', flexShrink:0 }}>
          ₹{alert.amount?.toLocaleString('en-IN')} · {isOverdue ? `${daysAbs}d ago` : alert.daysLeft === 0 ? 'TODAY' : `${alert.daysLeft}d`}
        </span>
      </div>
      <TenBar daysLeft={isOverdue ? -1 : alert.daysLeft} isExpired={isOverdue} />
    </div>
  );
}

// StatCard — uses .stat-card class (orange border, dashboard-only via CSS class)
function StatCard({ icon: Icon, color, dimColor, label, value, sub, onClick }) {
  return (
    <div className="stat-card" onClick={onClick} style={{ userSelect:'none' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ width:32, height:32, background:dimColor, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={15} color={color} />
        </div>
        <ChevronRight size={13} color="var(--text-muted)" />
      </div>
      <p className="stat-value" style={{ color, fontSize:20 }}>{value}</p>
      <p className="stat-label">{label}</p>
      {sub && <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>{sub}</p>}
    </div>
  );
}

export default function Dashboard({ admin, onNavigate, onLogout, dark, onToggleTheme }) {
  const toast = useToast();
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0);
  const [showShare, setShowShare] = useState(false);
  const [financeEntries, setFinanceEntries] = useState([]);
  const [liveTime, setLiveTime] = useState(new Date());

  // Tick clock every second
  useEffect(() => {
    const tick = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);
  const browsedRef = useRef({ year: new Date().getFullYear(), month: new Date().getMonth() });

  useEffect(() => {
    api.get('/admin/finance').then(res => {
      setFinanceEntries(res.entries || []);
    }).catch(() => {});
  }, []);

  const now = new Date();
  const browsedDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const browsedYear = browsedDate.getFullYear();
  const browsedMonth = browsedDate.getMonth();
  browsedRef.current = { year: browsedYear, month: browsedMonth };

  useEffect(() => {
    const bd = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    loadStats(bd.getFullYear(), bd.getMonth());
  }, [monthOffset]);

  // Silent auto-refresh every 60s — no loading flash, only while on current month
  useEffect(() => {
    const timer = setInterval(() => {
      const cur = new Date();
      if (browsedRef.current.year === cur.getFullYear() &&
          browsedRef.current.month === cur.getMonth()) {
        silentRefresh();
      }
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  async function silentRefresh() {
    try {
      const { year, month } = browsedRef.current;
      const data = await api.get(`/admin/stats?year=${year}&month=${month}`);
      setStats(data);
    } catch {
      // ignore — next tick will retry
    }
  }

  async function loadStats(yr, mo) {
    const year  = (typeof yr === 'number') ? yr : browsedRef.current.year;
    const month = (typeof mo === 'number') ? mo : browsedRef.current.month;
    const path  = `/admin/stats?year=${year}&month=${month}`;
    const now   = new Date();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

    // Previous months → instant from cache (data never changes)
    // Current month → show cache instantly, ALWAYS fetch fresh in background
    const persisted = pcGet(path);
    if (persisted) {
      setStats(persisted.data);
      setLoading(false);
      // Always background-refresh current month; only if stale for past months
      if (isCurrentMonth || persisted.stale) {
        api.get(path).then(fresh => {
          const cur = browsedRef.current;
          if (cur.year === year && cur.month === month) setStats(fresh);
        }).catch(() => {});
      }
      return;
    }

    // Nothing cached at all — fetch with spinner (first ever load only)
    setLoading(true);
    try {
      const data = await api.get(path);
      setStats(data);
    } catch (err) {
      if (err.message?.includes('401')) { clearAuth(); onLogout(); return; }
      toast('Failed to load stats: ' + (err.message || 'Unknown error'), 'error');
    } finally { setLoading(false); }
  }

  // ── App Badge (home screen red dot) — must be before any early returns ──
  const badgeCount = stats
    ? (stats.pollutionAlerts?.length||0)+(stats.insuranceAlerts?.length||0)+(stats.challanAlerts?.length||0)+(stats.serviceAlerts?.length||0)+(stats.emiAlerts?.length||0)+(stats.nocAlerts?.length||0)
    : 0;
  useEffect(() => {
    if ('setAppBadge' in navigator) {
      if (badgeCount > 0) {
        navigator.setAppBadge(badgeCount).catch(() => {});
      } else {
        navigator.clearAppBadge().catch(() => {});
      }
    }
  }, [badgeCount]);

  if (loading && !stats) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
        <div className="logo-icon" style={{ width:48, height:48, borderRadius:14 }}>
          <Fuel size={22} color="#fff" />
        </div>
        <span className="spinner" style={{ width:24, height:24 }} />
      </div>
    </div>
  );

  const s = stats || {};
  const isCurrentMonth = monthOffset === 0;
  const monthLabel = `${MONTH_NAMES[browsedMonth]} ${browsedYear}`;

  const activeLoans = financeEntries.filter(e => e.emisPaid < e.totalEmis);
  const monthlyEmiObligation = activeLoans.reduce((sum, e) => sum + (e.emiAmount || 0), 0);

  // ── Banner: total spend = fuel + challans + services + insurance ──────────────
  // Backend sends monthFuelSpend, monthChallanSpend, monthServiceSpend, monthInsuranceSpend, monthTotalSpend
  // Fallback: if backend not yet updated, monthSpend is the fuel-only value
  const monthTotalSpend = s.monthTotalSpend ?? (
    (s.monthFuelSpend ?? s.monthSpend ?? 0)
    + (s.monthChallanSpend ?? 0)
    + (s.monthServiceSpend ?? 0)
    + (s.monthInsuranceSpend ?? 0)
  );
  const monthFuelSpend  = s.monthFuelSpend ?? s.monthSpend ?? 0;

  // ── Stat card values ───────────────────────────────────────────────
  // "Total Spend" → this month's fuel spend only (not year total)
  const totalSpendDisplay = '₹' + fmt(monthFuelSpend, 0);
  const totalSpendSub     = isCurrentMonth ? 'fuel this month' : `fuel · ${monthLabel}`;

  // "Fleet Avg" → this year's avg efficiency (yearAvgKmpl from backend)
  // Fallback to overallAvgKmpl if yearAvgKmpl not yet provided
  const fleetAvg = s.yearAvgKmpl ?? s.overallAvgKmpl ?? null;
  const fleetAvgDisplay = fleetAvg != null ? fleetAvg + ' km/L' : '—';

  // "Avg Cost/Litre" → monthly avg
  const monthLitres = s.monthLitres ?? 0;
  const monthAvgCostPerL = monthLitres > 0
    ? parseFloat((monthFuelSpend / monthLitres).toFixed(2))
    : (s.monthAvgCostPerL ?? null);

  const totalAlerts = (s.pollutionAlerts?.length||0)+(s.insuranceAlerts?.length||0)+(s.challanAlerts?.length||0)+(s.serviceAlerts?.length||0)+(s.emiAlerts?.length||0)+(s.nocAlerts?.length||0);

  return (
    <div className="page-wrapper page-enter">
      <style>{alertStyles}</style>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="page-header" style={{ justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div className="logo-icon">
            <Fuel size={17} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>
              {admin.companyName}
            </p>
            <p style={{ fontSize:15, fontWeight:800, letterSpacing:'-0.01em', color:'var(--text-primary)' }}>
              Hi, {admin.name?.split(' ')[0] || 'Admin'} 👋
            </p>
            <p style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600, marginTop:2, fontFamily:'var(--font-mono)', letterSpacing:'0.02em' }}>
              {liveTime.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' })}
              {' · '}
              {liveTime.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true })}
            </p>
          </div>
        </div>
        <div style={{ display:'flex', gap:7, alignItems:'center' }}>
          <button className="theme-toggle" onClick={onToggleTheme} title={dark?'Light mode':'Dark mode'}>
            {dark ? <Sun size={14}/> : <Moon size={14}/>}
          </button>
          <button className="btn-icon" onClick={() => loadStats(browsedYear, browsedMonth)} title="Refresh">
            <RefreshCw size={14}/>
          </button>
          {/* Bell button — opens Notifications page */}
          <button
            className="btn-icon"
            onClick={() => onNavigate('notifications')}
            title="Notifications"
            style={{ position:'relative' }}
          >
            <Bell size={14}/>
            {totalAlerts > 0 && (
              <span style={{
                position:'absolute', top:-4, right:-4,
                minWidth:15, height:15, borderRadius:8,
                background:'var(--danger)', color:'#fff',
                fontSize:9, fontWeight:800, display:'flex',
                alignItems:'center', justifyContent:'center',
                padding:'0 3px', lineHeight:1,
                border:'1.5px solid var(--bg-surface)',
                pointerEvents:'none',
              }}>
                {totalAlerts > 99 ? '99+' : totalAlerts}
              </span>
            )}
          </button>
          <button className="btn-icon" onClick={() => { softLogout(); onLogout(); }} title="Logout">
            <LogOut size={14}/>
          </button>
        </div>
      </div>

      <div className="page-content">

        {/* ── Month spend banner (fuel + challans + services) ──────── */}
        <div style={{
          background: 'var(--accent)', borderRadius: 'var(--radius)',
          padding: '14px 16px', position: 'relative', overflow: 'hidden',
        }}>
          {/* Subtle decorative circle — no glow */}
          <div style={{ position:'absolute', right:-20, top:-20, width:90, height:90, borderRadius:'50%', background:'rgba(255,255,255,0.07)', pointerEvents:'none' }} />
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <button
              onClick={() => setMonthOffset(o => o - 1)}
              style={{ width:32, height:32, borderRadius:8, background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.25)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', cursor:'pointer', flexShrink:0 }}
            >
              <ChevronLeft size={16} />
            </button>

            <div style={{ flex:1, textAlign:'center', padding:'0 8px' }}>
              <p style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.85)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                {isCurrentMonth ? "This Month's Total Spend" : `${monthLabel} Total Spend`}
              </p>
              <p style={{ fontSize:28, fontWeight:900, letterSpacing:'-0.03em', marginTop:2, color:'#fff', lineHeight:1 }}>
                ₹{fmt(monthTotalSpend, 0)}
              </p>
              <p style={{ fontSize:9, color:'rgba(255,255,255,0.65)', marginTop:4 }}>
                Fuel · Challans · Services · Insurance
              </p>
              {!isCurrentMonth && (
                <p style={{ fontSize:10, color:'rgba(255,255,255,0.70)', marginTop:2, fontWeight:600 }}>{monthLabel}</p>
              )}
            </div>

            <button
              onClick={() => { if (!isCurrentMonth) setMonthOffset(o => o + 1); }}
              disabled={isCurrentMonth}
              style={{ width:32, height:32, borderRadius:8, background: isCurrentMonth ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.25)', display:'flex', alignItems:'center', justifyContent:'center', color: isCurrentMonth ? 'rgba(255,255,255,0.30)' : '#fff', cursor: isCurrentMonth ? 'not-allowed' : 'pointer', flexShrink:0 }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Breakdown pills */}
          {(s.monthChallanSpend != null || s.monthServiceSpend != null || s.monthInsuranceSpend != null) && (
            <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:8 }}>
              <span style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.70)', background:'rgba(0,0,0,0.15)', padding:'2px 8px', borderRadius:10 }}>
                ⛽ ₹{fmt(monthFuelSpend, 0)}
              </span>
              {s.monthChallanSpend > 0 && (
                <span style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.70)', background:'rgba(0,0,0,0.15)', padding:'2px 8px', borderRadius:10 }}>
                  📋 ₹{fmt(s.monthChallanSpend, 0)}
                </span>
              )}
              {s.monthServiceSpend > 0 && (
                <span style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.70)', background:'rgba(0,0,0,0.15)', padding:'2px 8px', borderRadius:10 }}>
                  🔧 ₹{fmt(s.monthServiceSpend, 0)}
                </span>
              )}
              {s.monthInsuranceSpend > 0 && (
                <span style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.70)', background:'rgba(0,0,0,0.15)', padding:'2px 8px', borderRadius:10 }}>
                  🛡️ ₹{fmt(s.monthInsuranceSpend, 0)}
                </span>
              )}
            </div>
          )}

          {/* Breakdown CTA button */}
          <div style={{ display:'flex', justifyContent:'center', marginTop:10 }}>
            <button
              onClick={() => onNavigate('expenseBreakdown', null, { year: browsedYear, month: browsedMonth })}
              style={{
                fontSize:11, fontWeight:800, color:'#fff',
                background:'var(--purple)', border:'1px solid var(--purple)',
                borderRadius:20, padding:'5px 18px', cursor:'pointer', letterSpacing:'0.04em',
              }}
            >
              View Insights →
            </button>
          </div>

          {loading && (
            <div style={{ position:'absolute', top:8, right:8 }}>
              <span className="spinner" style={{ borderColor:'rgba(255,255,255,0.3)', borderTopColor:'#fff', width:14, height:14 }} />
            </div>
          )}
        </div>

        {/* ── 4 Stat Cards ────────────────────────────────────────────
            All use .stat-card class (orange border — dashboard only)
            "Total Spend"  = this month's FUEL spend
            "Total KM"     = monthly km
            "Fuel Logs"    = monthly fills
            "Fleet Avg"    = this year's efficiency
        ─────────────────────────────────────────────────────────────── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9 }}>
          <StatCard
            icon={IndianRupee}
            color="var(--success)"
            dimColor="var(--success-dim)"
            label="Fuel Spend"
            value={totalSpendDisplay}
            sub={totalSpendSub}
            onClick={() => onNavigate('monthlyFuellogs', null, { year: browsedYear, month: browsedMonth + 1 })}
          />
          <StatCard
            icon={Navigation}
            color="var(--purple)"
            dimColor="var(--purple-dim)"
            label="Total KM"
            value={fmt(s.monthKm??0, 0) + ' km'}
            sub={isCurrentMonth ? 'this month' : monthLabel}
            onClick={() => onNavigate('monthlyKmDetail', null, { year: browsedYear, month: browsedMonth })}
          />
          <StatCard
            icon={Fuel}
            color="var(--warning)"
            dimColor="var(--warning-dim)"
            label="Fuel Logs"
            value={s.monthFills ?? 0}
            sub={isCurrentMonth ? 'this month' : monthLabel}
            onClick={() => onNavigate('monthlyFuellogs', null, { year: browsedYear, month: browsedMonth + 1 })}
          />
          <StatCard
            icon={Gauge}
            color="var(--accent)"
            dimColor="var(--accent-dim)"
            label="Fleet Avg"
            value={fleetAvgDisplay}
            sub={`${now.getFullYear()} efficiency`}
            onClick={() => onNavigate('reports')}
          />
        </div>

        {/* ── Secondary stats: Monthly Litres + Monthly Avg Cost/Litre ─ */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9 }}>
          <div className="stat-card" style={{ cursor:'pointer', userSelect:'none' }} onClick={() => onNavigate('monthlyLitresDetail', null, { year: browsedYear, month: browsedMonth })}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
              <p style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                {isCurrentMonth ? 'This Month' : monthLabel} Litres
              </p>
              <ChevronRight size={12} color="var(--text-muted)" />
            </div>
            <p style={{ fontSize:18, fontWeight:800, color:'var(--warning)', marginTop:2 }}>
              {fmt(s.monthLitres??0, 0)}L
            </p>
          </div>
          <div className="stat-card" style={{ cursor:'default' }}>
            <p style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>
              Avg Cost/Litre
            </p>
            <p style={{ fontSize:18, fontWeight:800, color:'var(--accent)', marginTop:4 }}>
              {monthAvgCostPerL ? '₹' + fmt(monthAvgCostPerL, 2) : '—'}
            </p>
            <p style={{ fontSize:9, color:'var(--text-muted)', marginTop:1 }}>
              {isCurrentMonth ? 'this month' : monthLabel}
            </p>
          </div>
        </div>

        {/* ── Monthly Obligations card ─────────────────────────────── */}
        <div
          onClick={() => onNavigate('monthlyObligations')}
          className="stat-card"
          style={{
            padding: '13px 14px',
            cursor: 'pointer', userSelect: 'none',
            display: 'flex', alignItems: 'center', gap: 12,
          }}
          onMouseDown={e => e.currentTarget.style.opacity='0.75'}
          onMouseUp={e => e.currentTarget.style.opacity='1'}
          onTouchStart={e => e.currentTarget.style.opacity='0.75'}
          onTouchEnd={e => e.currentTarget.style.opacity='1'}
        >
          <div style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CreditCard size={18} color="var(--accent)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monthly Obligations</p>
            <p style={{ fontSize: 20, fontWeight: 900, color: 'var(--accent)', marginTop: 2, letterSpacing: '-0.02em' }}>
              ₹{fmt(monthlyEmiObligation, 0)}
            </p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
              {activeLoans.length > 0
                ? `${activeLoans.length} active loan${activeLoans.length > 1 ? 's' : ''} · tap to view this month's EMIs`
                : 'No active loans'}
            </p>
          </div>
          <ChevronRight size={16} color="var(--text-muted)" />
        </div>

        {/* ── Quick Actions ────────────────────────────────────────────
            Includes "Reports" as requested
        ─────────────────────────────────────────────────────────────── */}
        <div>
          <p className="section-title" style={{ marginBottom:8 }}>Quick Actions</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9 }}>
            {[
              { label:'Challans',  icon:Receipt,      nav:'challans',   color:'var(--danger)'   },
              { label:'Log Fuel',  icon:Fuel,         nav:'fuellogs',   color:'var(--warning)'  },
              { label:'Services',  icon:Wrench,       nav:'services',   color:'var(--accent)'   },
              { label:'Vehicles',  icon:Navigation,   nav:'vehicles',   color:'var(--purple)'   },
              { label:'Reports',   icon:BarChart2,    nav:'reports',    color:'var(--success)'  },
              { label:'Users',     icon:Activity,     nav:'users',      color:'var(--accent)'   },
              { label:'Finance',   icon:CreditCard,   nav:'finance',    color:'var(--warning)'  },
              { label:'Insurance', icon:ShieldCheck,  nav:'insurance',  color:'#a78bfa'         },
              { label:'Admins',    icon:UserPlus,     nav:'team',       color:'#34D399'         },
            ].map(({ label, icon:Icon, nav, color }) => (
              <button key={nav} onClick={() => onNavigate(nav)} className="card-tap" style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:34, height:34, background:'var(--bg-elevated)', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon size={16} color={color} />
                </div>
                <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{label}</span>
                <ChevronRight size={13} color="var(--text-muted)" style={{ marginLeft:'auto' }} />
              </button>
            ))}
            {/* Share App button */}
            <button onClick={() => setShowShare(true)} className="card-tap" style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:34, height:34, background:'var(--bg-elevated)', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Share2 size={16} color="var(--accent)" />
              </div>
              <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>Share App</span>
              <ChevronRight size={13} color="var(--text-muted)" style={{ marginLeft:'auto' }} />
            </button>
          </div>
        </div>

        {showShare && <ShareApp onClose={() => setShowShare(false)} />}

        {/* ── "Recent Fuel Entries" REMOVED as per requirements ────────── */}

      </div>
    </div>
  );
}

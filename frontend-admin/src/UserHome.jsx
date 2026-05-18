import { useState, useEffect, useRef } from 'react';
import { useLocationPing } from './useLocationPing.js';
import { usePushNotifications } from './usePushNotifications.js';
import { userApi as api, fmt, fmtRs, fmtDate, fmtDT } from './api.js';
import { useToast } from './Toast.jsx';
import { Fuel, Car, TrendingUp, IndianRupee, LogOut, RefreshCw, Gauge, AlertTriangle, MapPin, CheckCircle, XCircle, Shield, AlertCircle, MessageSquare, ShieldCheck, Paperclip, X, Eye } from 'lucide-react';

function fuelStatusStyle(s) {
  if (s === 'paid')     return { bg: 'var(--success-dim)', color: 'var(--success)',  label: 'Paid',     Icon: CheckCircle };
  if (s === 'disputed') return { bg: 'var(--warning-dim)', color: 'var(--warning)',  label: 'Disputed', Icon: MessageSquare };
  return                       { bg: 'var(--danger-dim)',  color: 'var(--danger)',   label: 'Unpaid',   Icon: AlertCircle };
}

const alertStyles = `
@keyframes u_slideIn {
  0% { transform: translateY(-4px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
@keyframes u_urgentBlink {
  0%,100% { opacity: 1; }
  50% { opacity: 0.45; }
}
@keyframes u_pulseRed {
  0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.35); }
  50% { box-shadow: 0 0 0 5px rgba(239,68,68,0.07); }
}
@keyframes u_pulseYellow {
  0%,100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.28); }
  50% { box-shadow: 0 0 0 4px rgba(245,158,11,0.06); }
}
`;


// ─── Shared: 10-Square Full-Width Bar ────────────────────────────────────────
function TenBar({ daysLeft, isExpired, animPrefix = 'u_' }) {
  const getColor = (i) => {
    const days = isExpired ? 0 : Math.max(0, Math.min(daysLeft, 10));
    const activeStart = 10 - days;
    if (i < activeStart) return '#ef4444';
    const posFromRight = 9 - i;
    if (posFromRight <= 1) return '#22c55e';
    if (posFromRight <= 4) return '#f59e0b';
    return '#ef4444';
  };
  const blinkAnim = animPrefix + 'urgentBlink 1.2s ease-in-out infinite';
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} style={{
          flex: 1, height: 8, borderRadius: 3,
          background: getColor(i),
          transition: 'background 0.3s',
          animation: (isExpired || daysLeft <= 2) && getColor(i) === '#ef4444' ? blinkAnim : 'none',
        }} />
      ))}
    </div>
  );
}

// ─── User Expiry Card (PUC / Insurance) ──────────────────────────────────────
function UserExpiryCard({ alert, type = 'PUC' }) {
  const isExpired  = alert.daysLeft < 0;
  const isCritical = !isExpired && alert.daysLeft <= 3;
  const isWarning  = !isExpired && !isCritical && alert.daysLeft <= 7;
  const daysAbs    = Math.abs(alert.daysLeft);
  const color = isExpired || isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#22c55e';
  const bg    = isExpired ? 'rgba(239,68,68,0.07)' : isCritical ? 'rgba(239,68,68,0.06)' : isWarning ? 'rgba(245,158,11,0.06)' : 'rgba(34,197,94,0.05)';
  const anim  = isExpired ? 'u_pulseRed 1.5s ease-in-out infinite, u_slideIn 0.3s ease'
    : isCritical ? 'u_pulseRed 2s ease-in-out infinite, u_slideIn 0.3s ease'
    : isWarning  ? 'u_pulseYellow 2.5s ease-in-out infinite, u_slideIn 0.3s ease'
    : 'u_slideIn 0.3s ease';

  return (
    <div style={{
      padding: '9px 11px 8px', borderRadius: 10,
      border: `1px solid ${color}38`, background: bg, animation: anim, userSelect: 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
        <span style={{ fontWeight: 800, fontSize: 12, fontFamily: 'var(--font-mono)', color, flex: 1 }}>
          {alert.plateNumber}
        </span>
        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)' }}>
          {isExpired ? 'Inform your admin' : type + ' expiring'}
        </span>
        <span style={{
          fontSize: 9, fontWeight: 900, padding: '2px 7px', borderRadius: 5,
          background: `${color}20`, color, border: `1px solid ${color}40`,
          letterSpacing: '0.05em',
        }}>
          {type} · {isExpired ? `${daysAbs}d ago` : alert.daysLeft === 0 ? 'TODAY' : `${alert.daysLeft}d`}
        </span>
      </div>
      <TenBar daysLeft={alert.daysLeft} isExpired={isExpired} animPrefix="u_" />
    </div>
  );
}

// ─── Challan Alert Card ───────────────────────────────────────────────────────
function ChallanAlertCard({ challan }) {
  const isDisputed = challan.status === 'disputed';
  const today = new Date(); today.setHours(0,0,0,0);
  const due = challan.dueDate ? new Date(challan.dueDate) : null;
  if (due) due.setHours(0,0,0,0);
  const daysLeft = due ? Math.round((due - today) / 86400000) : 0;
  const isOverdue  = due ? due < today : false;
  const isCritical = !isOverdue && !isDisputed && daysLeft <= 3;
  const isWarning  = !isOverdue && !isDisputed && !isCritical && daysLeft <= 7;
  const color = isDisputed ? '#f59e0b' : isOverdue || isCritical ? '#f43f5e' : isWarning ? '#f59e0b' : '#22c55e';
  const bg    = isDisputed ? 'rgba(245,158,11,0.06)' : isOverdue ? 'rgba(244,63,94,0.07)' : isCritical ? 'rgba(244,63,94,0.06)' : isWarning ? 'rgba(245,158,11,0.06)' : 'rgba(34,197,94,0.05)';
  const anim  = !isDisputed && isOverdue ? 'u_pulseRed 1.5s ease-in-out infinite, u_slideIn 0.3s ease' : 'u_slideIn 0.3s ease';

  return (
    <div style={{
      padding: '9px 11px 8px', borderRadius: 10,
      border: `1px solid ${color}38`, background: bg, animation: anim, userSelect: 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
        <span style={{ fontWeight: 800, fontSize: 12, fontFamily: 'var(--font-mono)', color, flex: 1 }}>
          {challan.plateNumber}
        </span>
        <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 80 }}>
          {challan.offence}
        </span>
        <span style={{
          fontSize: 9, fontWeight: 900, padding: '2px 7px', borderRadius: 5,
          background: `${color}20`, color, border: `1px solid ${color}40`,
          letterSpacing: '0.05em', flexShrink: 0,
        }}>
          ₹{challan.amount?.toLocaleString('en-IN')} · {isDisputed ? 'DISPUTED' : isOverdue ? `${Math.abs(daysLeft)}d ago` : daysLeft === 0 ? 'TODAY' : `${daysLeft}d`}
        </span>
      </div>
      <TenBar daysLeft={isDisputed || isOverdue ? -1 : daysLeft} isExpired={isDisputed || isOverdue} animPrefix="u_" />
    </div>
  );
}

// ─── User Fuel Log Card with Reimbursement Receipt ───────────────────────────
function UserFuelLogCard({ log }) {
  const [showReceipt, setShowReceipt] = useState(false);
  const st = fuelStatusStyle(log.status || 'unpaid');
  const StatusIcon = st.Icon;
  const isPaid = log.status === 'paid' && log.paidAt;

  const methodLabel = log.paymentMethod === 'upi' ? 'UPI'
    : log.paymentMethod === 'bank_transfer' ? 'Bank Transfer'
    : log.paymentMethod === 'cash' ? 'Cash' : '';

  return (
    <>
      <div style={{
        background:'var(--bg-card)', border:'1px solid var(--border)',
        borderRadius:12, padding:'12px 14px',
        borderLeft:`3px solid ${st.color}`,
      }}>
        {/* Top row */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6 }}>
          <div style={{ display:'flex',alignItems:'center',gap:8 }}>
            <div style={{ width:30,height:30,background:'var(--warning-dim)',borderRadius:8,
              display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
              <Fuel size={14} color="var(--warning)" />
            </div>
            <div>
              <p style={{ fontSize:13,fontWeight:800,fontFamily:'var(--font-mono)' }}>{log.vehiclePlate || '—'}</p>
              <p style={{ fontSize:10,color:'var(--text-muted)',marginTop:1 }}>
                {new Date(log.filledAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
              </p>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <p style={{ fontSize:15,fontWeight:900,color:'var(--success)' }}>₹{log.totalCost?.toLocaleString('en-IN')}</p>
            <div style={{ display:'flex',alignItems:'center',gap:4,justifyContent:'flex-end',marginTop:3 }}>
              <StatusIcon size={10} color={st.color} />
              <p style={{ fontSize:10,fontWeight:800,color:st.color }}>{st.label}</p>
            </div>
          </div>
        </div>

        {/* Bottom row — chips */}
        <div style={{ display:'flex',gap:8,flexWrap:'wrap',marginBottom: isPaid ? 8 : 0 }}>
          <span style={{ fontSize:10,color:'var(--text-muted)',background:'var(--bg-elevated)',borderRadius:5,padding:'2px 7px',fontWeight:600 }}>
            {fmt(log.litres,2)}L
          </span>
          <span style={{ fontSize:10,color:'var(--text-muted)',background:'var(--bg-elevated)',borderRadius:5,padding:'2px 7px',fontWeight:600 }}>
            ₹{fmt(log.costPerLitre,2)}/L
          </span>
          {log.odometer && (
            <span style={{ fontSize:10,color:'var(--text-muted)',background:'var(--bg-elevated)',borderRadius:5,padding:'2px 7px',fontWeight:600,display:'flex',alignItems:'center',gap:3 }}>
              <Gauge size={9} /> {log.odometer?.toLocaleString()}km
            </span>
          )}
          {log.fuelStation && (
            <span style={{ fontSize:10,color:'var(--text-muted)',background:'var(--bg-elevated)',borderRadius:5,padding:'2px 7px',fontWeight:600,display:'flex',alignItems:'center',gap:3 }}>
              <MapPin size={9} /> {log.fuelStation}
            </span>
          )}
        </div>

        {/* Reimbursement proof banner — driver sees this */}
        {isPaid && (
          <div
            onClick={() => setShowReceipt(true)}
            style={{ display:'flex',alignItems:'center',gap:8,background:'var(--success-dim)',
              border:'1px solid rgba(22,163,74,0.2)',borderRadius:8,padding:'7px 10px',cursor:'pointer',marginTop:4 }}>
            <ShieldCheck size={13} color="var(--success)" style={{ flexShrink:0 }} />
            <div style={{ flex:1,minWidth:0 }}>
              <p style={{ fontSize:11,fontWeight:800,color:'var(--success)' }}>Reimbursed</p>
              <p style={{ fontSize:10,color:'var(--text-muted)',marginTop:1 }}>
                {methodLabel}{log.transactionId ? ` · Ref: ${log.transactionId}` : ''} · Tap to view receipt
              </p>
            </div>
            <div style={{ display:'flex',alignItems:'center',gap:3,flexShrink:0 }}>
              {log.paymentProofUrl && <Paperclip size={10} color="var(--success)" />}
              <Eye size={10} color="var(--text-muted)" />
            </div>
          </div>
        )}
      </div>

      {/* Receipt overlay */}
      {showReceipt && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowReceipt(false)}>
          <div className="sheet" style={{ maxHeight:'90vh', overflowY:'auto' }}>
            <div className="sheet-handle" />
            <div style={{ padding:'0 16px 24px', display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                <p style={{ fontSize:15, fontWeight:800 }}>Reimbursement Receipt</p>
                <button onClick={() => setShowReceipt(false)} style={{ background:'none',border:'none',cursor:'pointer',padding:4 }}>
                  <X size={18} color="var(--text-muted)" />
                </button>
              </div>

              {/* Confirmed banner */}
              <div style={{ background:'var(--success-dim)',border:'1px solid rgba(22,163,74,0.25)',borderRadius:10,
                padding:'10px 13px',display:'flex',alignItems:'center',gap:9 }}>
                <ShieldCheck size={20} color="var(--success)" style={{ flexShrink:0 }} />
                <div>
                  <p style={{ fontSize:12,fontWeight:800,color:'var(--success)' }}>Payment confirmed</p>
                  <p style={{ fontSize:11,color:'var(--text-muted)',marginTop:1 }}>
                    by {log.paidByAdminName || 'Admin'} · {fmtDT(log.paidAt)}
                  </p>
                </div>
              </div>

              {/* Receipt rows */}
              {[
                { label: 'Vehicle',        value: log.vehiclePlate },
                { label: 'Amount',         value: `₹${log.totalCost?.toLocaleString('en-IN')}` },
                { label: 'Fuel date',      value: fmtDate(log.filledAt) },
                { label: 'Method',         value: methodLabel || '—' },
                { label: 'Transaction ID', value: log.transactionId || '—' },
                { label: 'Note',           value: log.paymentNote   || '—' },
                { label: 'Paid on',        value: fmtDT(log.paidAt) },
              ].map(({ label, value }) => (
                <div key={label} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',
                  borderBottom:'1px solid var(--border-subtle)',paddingBottom:9 }}>
                  <p style={{ fontSize:12,color:'var(--text-muted)',fontWeight:600 }}>{label}</p>
                  <p style={{ fontSize:12,fontWeight:700,color:'var(--text-primary)',textAlign:'right',maxWidth:'60%' }}>{value}</p>
                </div>
              ))}

              {/* Proof image */}
              {log.paymentProofUrl && (
                <div>
                  <p style={{ fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8 }}>Payment proof</p>
                  {log.paymentProofUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <a href={log.paymentProofUrl} target="_blank" rel="noreferrer">
                      <img src={log.paymentProofUrl} alt="payment proof"
                        style={{ width:'100%',borderRadius:10,border:'1px solid var(--border)',display:'block' }} />
                    </a>
                  ) : (
                    <a href={log.paymentProofUrl} target="_blank" rel="noreferrer"
                      style={{ display:'flex',alignItems:'center',gap:8,padding:'12px 14px',
                        background:'var(--bg-elevated)',borderRadius:10,border:'1px solid var(--border)',
                        textDecoration:'none',color:'var(--accent-light)',fontSize:12,fontWeight:600 }}>
                      <Paperclip size={14} /> View attached document
                    </a>
                  )}
                </div>
              )}

              <button className="btn btn-ghost" onClick={() => setShowReceipt(false)} style={{ marginTop:4 }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function Home({ user, onLogout, onNavigate }) {
  const [locationPermission, setLocationPermission] = useState('checking'); // checking | prompt | granted | denied
  const [pingActive, setPingActive] = useState(false);

  // Check permission state on mount
  useEffect(() => {
    if (!navigator?.geolocation) { setLocationPermission('denied'); return; }
    if (!navigator.permissions) {
      // Permissions API not supported — go straight to prompt
      setLocationPermission('prompt');
      return;
    }
    navigator.permissions.query({ name: 'geolocation' })
      .then(result => {
        setLocationPermission(result.state); // 'granted' | 'denied' | 'prompt'
        result.onchange = () => {
          setLocationPermission(result.state);
          if (result.state === 'granted') setPingActive(true);
        };
      })
      .catch(() => setLocationPermission('prompt'));
  }, []);

  // Activate pinging once permission is granted
  useEffect(() => {
    if (locationPermission === 'granted') setPingActive(true);
  }, [locationPermission]);

  function requestLocationPermission() {
    navigator.geolocation.getCurrentPosition(
      () => { setLocationPermission('granted'); setPingActive(true); },
      () => setLocationPermission('denied'),
      { enableHighAccuracy: false, timeout: 12000 }
    );
  }

  // Silently ping location every 30 minutes — only when permission granted
  useLocationPing(pingActive);

  // Push notifications — register FCM token with backend (APK only)
  usePushNotifications(true);

  // Expose navigator for push notification tap actions
  useEffect(() => {
    window.__fleetNavigate = onNavigate;
    return () => { delete window.__fleetNavigate; };
  }, [onNavigate]);
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveTime, setLiveTime] = useState(new Date());

  // Tick clock every second
  useEffect(() => {
    const tick = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    loadData();

    // ── Pause data refresh when app is in background ──────────────────────
    // loadData calls onLogout() on 401 — if the network blips while the tab
    // is minimised the user gets silently logged out. We only poll while
    // the tab is actually visible; location pings continue independently.
    let iv = setInterval(loadData, 30000);

    function handleVisibility() {
      if (document.hidden) {
        // App went to background — stop the polling interval
        clearInterval(iv);
        iv = null;
      } else {
        // App came back to foreground — refresh immediately then resume polling
        loadData();
        iv = setInterval(loadData, 30000);
      }
    }

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(iv);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const failCountRef = useRef(0);

  // ── App Badge (home screen red dot) — must be before any early returns ──
  const profileAlertsCount =
    (profile?.pollutionAlerts?.length || 0) +
    (profile?.insuranceAlerts?.length || 0) +
    (profile?.challanAlerts?.length || 0);
  useEffect(() => {
    if ('setAppBadge' in navigator) {
      if (profileAlertsCount > 0) {
        navigator.setAppBadge(profileAlertsCount).catch(() => {});
      } else {
        navigator.clearAppBadge().catch(() => {});
      }
    }
  }, [profileAlertsCount]);

  async function loadData() {
    try {
      const [p, logsRes] = await Promise.all([
        api.get('/user/profile'),
        api.get('/user/fuel-logs?limit=10&page=1'),
      ]);
      failCountRef.current = 0; // reset on success
      setProfile(p);
      setRecentLogs(logsRes.data || []);
    } catch (err) {
      if (err.message?.includes('401')) {
        failCountRef.current += 1;
        // Only logout after 3 consecutive 401s — prevents single network blip
        // from logging the user out while the app is minimised
        if (failCountRef.current >= 3) { onLogout(); }
      }
    } finally { setLoading(false); }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );

  // ── Location permission explanation screen ────────────────────────────────
  if (locationPermission === 'prompt') {
    return (
      <div className="page-wrapper page-enter">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '80vh', padding: '24px', gap: 0 }}>

          <div style={{ width: 72, height: 72, borderRadius: 20, marginBottom: 24,
            background: 'linear-gradient(135deg,#1E40AF,#3B82F6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 12px 32px rgba(59,130,246,0.30)' }}>
            <MapPin size={34} color="#fff" />
          </div>

          <p style={{ fontSize: 22, fontWeight: 900, textAlign: 'center', marginBottom: 8, letterSpacing: '-0.02em' }}>
            Enable Location Access
          </p>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center',
            lineHeight: 1.6, marginBottom: 28, maxWidth: 300 }}>
            <strong>{user.companyName}</strong> uses your location to track attendance and work hours.
            Your location is only recorded during office hours.
          </p>

          <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
            {[
              { icon: Shield,       text: 'Only recorded during office hours' },
              { icon: CheckCircle,  text: 'Visible only to your company admin' },
              { icon: MapPin,       text: 'Checked every 30 minutes automatically' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '10px 14px' }}>
                <Icon size={16} color="var(--accent-light)" />
                <p style={{ fontSize: 13, fontWeight: 600 }}>{text}</p>
              </div>
            ))}
          </div>

          <button onClick={requestLocationPermission}
            className="btn btn-primary"
            style={{ width: '100%', maxWidth: 320, fontSize: 16, padding: '16px',
              background: 'linear-gradient(135deg,#1E40AF,#3B82F6)',
              boxShadow: '0 4px 20px rgba(59,130,246,0.25)' }}>
            <MapPin size={18} /> Allow Location Access
          </button>

          <button onClick={() => setLocationPermission('denied_soft')}
            style={{ marginTop: 14, fontSize: 12, color: 'var(--text-muted)',
              background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  // ── Location denied screen ────────────────────────────────────────────────
  if (locationPermission === 'denied') {
    return (
      <div className="page-wrapper page-enter">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '80vh', padding: '24px', gap: 0 }}>

          <div style={{ width: 72, height: 72, borderRadius: 20, marginBottom: 24,
            background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <XCircle size={34} color="#ef4444" />
          </div>

          <p style={{ fontSize: 20, fontWeight: 900, textAlign: 'center', marginBottom: 8 }}>
            Location Access Blocked
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center',
            lineHeight: 1.6, marginBottom: 24, maxWidth: 300 }}>
            Your location is blocked. Please enable it from your browser settings so attendance can be tracked.
          </p>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '14px 16px', width: '100%', maxWidth: 320, marginBottom: 24 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              How to enable
            </p>
            {[
              '1. Tap the lock icon in your browser address bar',
              '2. Find "Location" in the permissions list',
              '3. Change it to "Allow"',
              '4. Reload this page',
            ].map(step => (
              <p key={step} style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, lineHeight: 1.5 }}>
                {step}
              </p>
            ))}
          </div>

          <button onClick={() => window.location.reload()}
            className="btn btn-primary" style={{ width: '100%', maxWidth: 320 }}>
            Reload Page
          </button>

          <button onClick={() => setLocationPermission('denied_soft')}
            style={{ marginTop: 14, fontSize: 12, color: 'var(--text-muted)',
              background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Continue without location
          </button>
        </div>
      </div>
    );
  }

  const totalAlerts = (profile?.pollutionAlerts?.length || 0) +
    (profile?.insuranceAlerts?.length || 0) +
    (profile?.challanAlerts?.length || 0);

  return (
    <div className="page-wrapper page-enter">
      <div style={{
        background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 50%, #3B82F6 100%)',
        padding: '16px 16px 40px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position:'absolute', top:-30, right:-30, width:120, height:120,
          borderRadius:'50%', background:'rgba(255,255,255,0.06)' }} />
        <div style={{ position:'absolute', bottom:-20, left:-20, width:80, height:80,
          borderRadius:'50%', background:'rgba(255,255,255,0.04)' }} />

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:40, height:40, background:'rgba(255,255,255,0.18)', borderRadius:12,
              display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>
              <Fuel size={20} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize:10, color:'rgba(255,255,255,0.7)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' }}>Fleet Tracker</p>
              <p style={{ fontSize:16, fontWeight:800, color:'#fff' }}>Hello, {user.name.split(' ')[0]} 👋</p>
              <p style={{ fontSize:10, color:'rgba(255,255,255,0.65)', fontWeight:600, marginTop:2, fontFamily:'var(--font-mono)' }}>
                {liveTime.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' })}
                {' · '}
                {liveTime.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true })}
              </p>
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={loadData} style={{ width:36, height:36, background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>
              <RefreshCw size={15} color="#fff" />
            </button>
            <button onClick={onLogout} style={{ width:36, height:36, background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>
              <LogOut size={15} color="#fff" />
            </button>
          </div>
        </div>

        {/* Company + ID badge */}
        <div style={{ marginTop:14, position:'relative', zIndex:1, display:'flex', alignItems:'center', justifyContent:'space-between',
          background:'rgba(255,255,255,0.12)', borderRadius:10, padding:'8px 12px', backdropFilter:'blur(4px)' }}>
          <span style={{ fontSize:12, color:'rgba(255,255,255,0.9)', fontWeight:700 }}>{user.companyName}</span>
          <span style={{ fontSize:11, color:'rgba(255,255,255,0.65)', fontFamily:'var(--font-mono)', background:'rgba(0,0,0,0.2)', padding:'2px 8px', borderRadius:5 }}>
            ID: {user.employeeId}
          </span>
        </div>
      </div>

      {/* ── Stats grid — overlaps header ─────────────────────────────── */}
      <div style={{ padding:'0 12px', marginTop:-22, position:'relative', zIndex:2 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8 }}>
          {[
            { icon: Fuel,         label:'Fills',   value: profile?.totalFills ?? 0,       color:'#3B82F6', dim:'rgba(59,130,246,0.12)' },
            { icon: IndianRupee,  label:'Spent',   value:`₹${fmt(profile?.totalSpend,0)}`, color:'var(--success)', dim:'var(--success-dim)' },
            { icon: TrendingUp,   label:'Litres',  value:`${fmt(profile?.totalLitres,0)}L`,color:'var(--warning)', dim:'var(--warning-dim)' },
            { icon: Car,          label:'Vehicles',value: profile?.assignedVehicles?.length ?? 0, color:'#A78BFA', dim:'rgba(139,92,246,0.12)' },
          ].map(({ icon: Icon, label, value, color, dim }) => (
            <div key={label} style={{ background:'var(--bg-card)', borderRadius:12, padding:'10px 8px',
              boxShadow:'var(--shadow)', border:'1px solid var(--border-subtle)', textAlign:'center' }}>
              <div style={{ width:28, height:28, background:dim, borderRadius:8,
                display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 6px' }}>
                <Icon size={13} color={color} />
              </div>
              <p style={{ fontSize:13, fontWeight:900, color, lineHeight:1, marginBottom:3 }}>{value}</p>
              <p style={{ fontSize:9, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="page-content" style={{ paddingTop:14 }}>

        {/* Location tracking status */}
        <div style={{ display:'flex', alignItems:'center', gap:8,
          background: pingActive ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
          border:`1px solid ${pingActive ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
          borderRadius:12, padding:'10px 14px' }}>
          <div style={{ width:8, height:8, borderRadius:'50%',
            background: pingActive ? '#22c55e' : '#ef4444',
            boxShadow: pingActive ? '0 0 0 3px rgba(34,197,94,0.2)' : 'none',
            flexShrink:0 }} />
          <p style={{ fontSize:12, fontWeight:700,
            color: pingActive ? '#22c55e' : '#ef4444', flex:1 }}>
            {pingActive ? 'Location tracking active' : 'Location tracking inactive'}
          </p>
          {!pingActive && (
            <button onClick={requestLocationPermission}
              style={{ fontSize:11, fontWeight:700, color:'var(--accent-light)',
                background:'var(--accent-dim)', border:'none', borderRadius:6,
                padding:'4px 10px', cursor:'pointer' }}>
              Enable
            </button>
          )}
          {pingActive && (
            <p style={{ fontSize:10, color:'rgba(34,197,94,0.7)', fontWeight:600 }}>Every 30 min</p>
          )}
        </div>

        {/* ── Compact Alerts ─────────────────────────────────────────────── */}
        {totalAlerts > 0 && (
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
              <AlertTriangle size={11} color="#f59e0b" />
              <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', margin:0 }}>
                Vehicle Alerts
              </p>
              <span style={{ marginLeft:'auto', fontSize:10, fontWeight:800,
                color:'var(--text-muted)', background:'var(--bg-elevated)',
                padding:'2px 7px', borderRadius:10 }}>{totalAlerts}</span>
            </div>

            {profile?.pollutionAlerts?.length > 0 && (
              <div style={{ marginBottom:6 }}>
                <p style={{ fontSize:9, fontWeight:800, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4, paddingLeft:2 }}>
                  PUC · {profile.pollutionAlerts.length}
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  {profile.pollutionAlerts.map(alert => (
                    <UserExpiryCard key={alert.id} alert={alert} type="PUC" />
                  ))}
                </div>
              </div>
            )}
            {profile?.insuranceAlerts?.length > 0 && (
              <div style={{ marginBottom:6 }}>
                <p style={{ fontSize:9, fontWeight:800, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4, paddingLeft:2 }}>
                  Insurance · {profile.insuranceAlerts.length}
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  {profile.insuranceAlerts.map(alert => (
                    <UserExpiryCard key={alert.id} alert={alert} type="INS" />
                  ))}
                </div>
              </div>
            )}
            {profile?.challanAlerts?.length > 0 && (
              <div style={{ marginBottom:2 }}>
                <p style={{ fontSize:9, fontWeight:800, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4, paddingLeft:2 }}>
                  Challans · {profile.challanAlerts.length}
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  {profile.challanAlerts.map(c => (
                    <ChallanAlertCard key={c.id} challan={c} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Quick Actions ───────────────────────────────────────────── */}
        <div>
          <p style={{ fontSize:11, fontWeight:800, color:'var(--text-muted)',
            textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 }}>
            Quick Actions
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <button
              onClick={() => onNavigate('log')}
              disabled={!profile?.assignedVehicles?.length}
              style={{
                display:'flex', flexDirection:'column', alignItems:'flex-start',
                gap:10, padding:'16px', borderRadius:16, cursor:'pointer', textAlign:'left',
                background:'linear-gradient(135deg,rgba(30,64,175,0.12),rgba(59,130,246,0.06))',
                border:'1.5px solid rgba(59,130,246,0.22)',
                opacity:!profile?.assignedVehicles?.length ? 0.5 : 1,
                transition:'all 0.15s',
              }}
            >
              <div style={{ width:40, height:40, background:'linear-gradient(135deg,#1E40AF,#3B82F6)',
                borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:'0 4px 12px rgba(59,130,246,0.30)' }}>
                <Fuel size={18} color="#fff" />
              </div>
              <div>
                <p style={{ fontSize:14, fontWeight:800, color:'var(--text-primary)' }}>Log Fuel</p>
                <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>Add fuel entry</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('timeline')}
              style={{
                display:'flex', flexDirection:'column', alignItems:'flex-start',
                gap:10, padding:'16px', borderRadius:16, cursor:'pointer', textAlign:'left',
                background: pingActive
                  ? 'linear-gradient(135deg,rgba(34,197,94,0.12),rgba(22,163,74,0.06))'
                  : 'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(79,70,229,0.06))',
                border:`1.5px solid ${pingActive ? 'rgba(34,197,94,0.22)' : 'rgba(99,102,241,0.22)'}`,
                transition:'all 0.15s',
              }}
            >
              <div style={{ width:40, height:40,
                background: pingActive ? 'linear-gradient(135deg,#16a34a,#22c55e)' : 'linear-gradient(135deg,#4f46e5,#6366f1)',
                borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:`0 4px 12px ${pingActive ? 'rgba(34,197,94,0.28)' : 'rgba(99,102,241,0.28)'}` }}>
                <MapPin size={18} color="#fff" />
              </div>
              <div>
                <p style={{ fontSize:14, fontWeight:800, color:'var(--text-primary)' }}>My Timeline</p>
                <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>Today's check-ins</p>
              </div>
            </button>
          </div>
        </div>

        {/* ── Assigned Vehicles ───────────────────────────────────────── */}
        {profile?.assignedVehicles?.length > 0 && (
          <div>
            <p style={{ fontSize:11, fontWeight:800, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>
              My Vehicles
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {profile.assignedVehicles.map(v => (
                <div key={v.id} style={{ display:'flex', alignItems:'center', gap:12,
                  background:'var(--bg-card)', border:'1px solid var(--border-subtle)',
                  borderRadius:14, padding:'12px 14px', boxShadow:'var(--shadow)' }}>
                  <div style={{ width:44, height:44,
                    background:'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.10))',
                    borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Car size={21} color="#A78BFA" />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontWeight:800, fontFamily:'var(--font-mono)', fontSize:15, letterSpacing:'0.04em' }}>{v.plateNumber}</p>
                    <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{v.make} {v.model} · {v.fuelType}</p>
                  </div>
                  <span className={`badge ${v.status === 'active' ? 'badge-success' : v.status === 'maintenance' ? 'badge-warning' : 'badge-danger'}`}>
                    {v.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No vehicle assigned */}
        {profile?.assignedVehicles?.length === 0 && (
          <div className="empty-state" style={{ padding:'28px' }}>
            <Car size={36} className="empty-icon" />
            <p className="empty-title">No vehicle assigned</p>
            <p className="empty-desc">Contact your admin to get a vehicle assigned</p>
          </div>
        )}

        {/* ── Recent Fuel Logs ────────────────────────────────────────── */}
        {recentLogs.length > 0 && (
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <p style={{ fontSize:11, fontWeight:800, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em' }}>
                Recent Fuel Logs
              </p>
              <p style={{ fontSize:11, color:'var(--text-muted)' }}>Last {recentLogs.length}</p>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {recentLogs.map(log => <UserFuelLogCard key={log.id} log={log} />)}
            </div>
          </div>
        )}

        {/* All-time summary */}
        {profile?.totalFills > 0 && (
          <div style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)',
            borderRadius:14, padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:38, height:38, background:'var(--accent-dim)', borderRadius:10,
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Gauge size={18} color="var(--accent-light)" />
            </div>
            <div>
              <p style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>All Time</p>
              <p style={{ fontSize:13, fontWeight:700, marginTop:2 }}>
                {profile.totalFills} {profile.totalFills === 1 ? 'entry' : 'entries'} · {fmt(profile.totalLitres,1)}L · ₹{fmt(profile.totalSpend,0)}
              </p>
            </div>
          </div>
        )}

        <div style={{ height:4 }} />
      </div>
    </div>
  );
}

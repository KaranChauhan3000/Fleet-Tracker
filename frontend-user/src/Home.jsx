import { useState, useEffect } from 'react';
import { api, fmt } from './api.js';
import { useToast } from './Toast.jsx';
import { Fuel, Car, TrendingUp, IndianRupee, LogOut, RefreshCw, Gauge, AlertTriangle, ChevronRight, Zap } from 'lucide-react';

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

// ─── FASTag Low Balance Alert Card ───────────────────────────────────────────
function FastagAlertCard({ alert }) {
  const isZero = alert.balance <= 0;
  const color  = isZero ? '#ef4444' : '#f59e0b';
  const bg     = isZero ? 'rgba(239,68,68,0.07)' : 'rgba(245,158,11,0.06)';
  const anim   = isZero
    ? 'u_pulseRed 1.5s ease-in-out infinite, u_slideIn 0.3s ease'
    : 'u_pulseYellow 2.5s ease-in-out infinite, u_slideIn 0.3s ease';
  return (
    <div style={{ padding: '9px 11px 8px', borderRadius: 10, border: `1px solid ${color}38`, background: bg, animation: anim, userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
        <span style={{ fontWeight: 800, fontSize: 12, fontFamily: 'var(--font-mono)', color, flex: 1 }}>
          {alert.plateNumber}
        </span>
        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)' }}>
          {alert.make} {alert.model}
        </span>
        <span style={{ fontSize: 9, fontWeight: 900, padding: '2px 7px', borderRadius: 5, background: `${color}20`, color, border: `1px solid ${color}40`, letterSpacing: '0.05em' }}>
          ⚡ ₹{alert.balance?.toLocaleString('en-IN') ?? '0'} · {isZero ? 'Recharge now!' : 'Low balance'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 3 }}>
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} style={{ flex: 1, height: 8, borderRadius: 3, background: color, opacity: i < Math.min(10, Math.round((alert.balance / 200) * 10)) ? 1 : 0.15 }} />
        ))}
      </div>
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

export default function Home({ user, onLogout, onNavigate }) {
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const iv = setInterval(loadData, 30000);
    return () => clearInterval(iv);
  }, []);

  async function loadData() {
    try {
      const p = await api.get('/user/profile');
      setProfile(p);
    } catch (err) {
      if (err.message.includes('401')) { onLogout(); }
    } finally { setLoading(false); }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );

  const totalAlerts = (profile?.pollutionAlerts?.length || 0) +
    (profile?.insuranceAlerts?.length || 0) +
    (profile?.challanAlerts?.length || 0) +
    (profile?.fastagAlerts?.length || 0);

  return (
    <div className="page-wrapper page-enter">
      <style>{alertStyles}</style>
      <div className="page-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, background: 'linear-gradient(135deg, #1E40AF, #3B82F6)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Fuel size={19} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fleet Tracker</p>
            <p style={{ fontSize: 15, fontWeight: 700 }}>Hello, {user.name.split(' ')[0]} 👋</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadData} style={{ width: 36, height: 36, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            <RefreshCw size={15} />
          </button>
          <button onClick={onLogout} style={{ width: 36, height: 36, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            <LogOut size={15} />
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* Company + ID badge */}
        <div style={{ background: 'var(--accent-dim)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: 'var(--accent-light)', fontWeight: 700 }}>{user.companyName}</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.2)', padding: '2px 8px', borderRadius: 4 }}>ID: {user.employeeId}</span>
        </div>

        {/* ── Compact Alerts Section ─────────────────────────────────────── */}
        {totalAlerts > 0 && (
          <div>
            {/* Header + legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <AlertTriangle size={11} color="#f59e0b" />
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                Vehicle Alerts
              </p>
              <span style={{
                marginLeft: 'auto', fontSize: 10, fontWeight: 800,
                color: 'var(--text-muted)', background: 'var(--bg-elevated)',
                padding: '2px 7px', borderRadius: 10,
              }}>{totalAlerts}</span>
            </div>



            {/* PUC */}
            {profile?.pollutionAlerts?.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4, paddingLeft: 2 }}>
                  PUC · {profile.pollutionAlerts.length}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {profile.pollutionAlerts.map(alert => (
                    <UserExpiryCard key={alert.id} alert={alert} type="PUC" />
                  ))}
                </div>
              </div>
            )}

            {/* Insurance */}
            {profile?.insuranceAlerts?.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4, paddingLeft: 2 }}>
                  Insurance · {profile.insuranceAlerts.length}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {profile.insuranceAlerts.map(alert => (
                    <UserExpiryCard key={alert.id} alert={alert} type="INS" />
                  ))}
                </div>
              </div>
            )}

            {/* Challans */}
            {profile?.challanAlerts?.length > 0 && (
              <div style={{ marginBottom: 2 }}>
                <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4, paddingLeft: 2 }}>
                  Challans · {profile.challanAlerts.length}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {profile.challanAlerts.map(c => (
                    <ChallanAlertCard key={c.id} challan={c} />
                  ))}
                </div>
              </div>
            )}

            {/* FASTag Low Balance */}
            {profile?.fastagAlerts?.length > 0 && (
              <div style={{ marginBottom: 2 }}>
                <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4, paddingLeft: 2 }}>
                  FASTag Low Balance · {profile.fastagAlerts.length}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {profile.fastagAlerts.map(a => (
                    <FastagAlertCard key={a.id} alert={a} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <div style={{ width: 28, height: 28, background: 'var(--accent-dim)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Fuel size={14} color="var(--accent-light)" />
              </div>
              <span className="stat-label">Total Fills</span>
            </div>
            <span className="stat-value" style={{ color: 'var(--accent-light)' }}>{profile?.totalFills ?? 0}</span>
          </div>
          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <div style={{ width: 28, height: 28, background: 'var(--success-dim)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IndianRupee size={14} color="var(--success)" />
              </div>
              <span className="stat-label">Total Spend</span>
            </div>
            <span className="stat-value" style={{ color: 'var(--success)', fontSize: 17 }}>₹{fmt(profile?.totalSpend, 0)}</span>
          </div>
          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <div style={{ width: 28, height: 28, background: 'var(--warning-dim)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={14} color="var(--warning)" />
              </div>
              <span className="stat-label">Litres Filled</span>
            </div>
            <span className="stat-value" style={{ color: 'var(--warning)', fontSize: 17 }}>{fmt(profile?.totalLitres, 1)}L</span>
          </div>
          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <div style={{ width: 28, height: 28, background: 'rgba(139,92,246,0.12)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Car size={14} color="#A78BFA" />
              </div>
              <span className="stat-label">Vehicles</span>
            </div>
            <span className="stat-value" style={{ color: '#A78BFA' }}>{profile?.assignedVehicles?.length ?? 0}</span>
          </div>
        </div>

        {/* Assigned Vehicles */}
        {profile?.assignedVehicles?.length > 0 && (
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>My Vehicles</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {profile.assignedVehicles.map(v => (
                <div key={v.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Car size={20} color="#A78BFA" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: 15, letterSpacing: '0.04em' }}>{v.plateNumber}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{v.make} {v.model} · {v.fuelType}</p>
                    {v.fastagBalance != null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5 }}>
                        <div style={{ width: 14, height: 14, borderRadius: 3, background: v.fastagBalance <= 0 ? 'rgba(239,68,68,0.15)' : v.fastagBalance < 200 ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Zap size={9} color={v.fastagBalance <= 0 ? '#ef4444' : v.fastagBalance < 200 ? '#f59e0b' : '#22c55e'} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: v.fastagBalance <= 0 ? '#ef4444' : v.fastagBalance < 200 ? '#f59e0b' : '#22c55e' }}>
                          FASTag ₹{v.fastagBalance.toLocaleString('en-IN')}
                        </span>
                        {v.fastagBalance < 200 && (
                          <span style={{ fontSize: 9, fontWeight: 800, color: v.fastagBalance <= 0 ? '#ef4444' : '#f59e0b' }}>
                            · {v.fastagBalance <= 0 ? 'Recharge now' : 'Low balance'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className={`badge ${v.status === 'active' ? 'badge-success' : v.status === 'maintenance' ? 'badge-warning' : 'badge-danger'}`}>{v.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No vehicle assigned */}
        {profile?.assignedVehicles?.length === 0 && (
          <div className="empty-state" style={{ padding: '28px' }}>
            <Car size={36} className="empty-icon" />
            <p className="empty-title">No vehicle assigned</p>
            <p className="empty-desc">Contact your admin to get a vehicle assigned</p>
          </div>
        )}

        {/* Quick Action */}
        <button
          onClick={() => onNavigate('log')}
          className="btn btn-primary"
          disabled={!profile?.assignedVehicles?.length}
          style={{ fontSize: 16, padding: '16px', background: 'linear-gradient(135deg, #1E40AF, #3B82F6)', boxShadow: '0 4px 20px rgba(59,130,246,0.25)' }}
        >
          <Fuel size={20} /> Log Fuel Entry
        </button>

        {/* Last fill summary */}
        {profile?.totalFills > 0 && (
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, background: 'var(--accent-dim)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Gauge size={17} color="var(--accent-light)" />
            </div>
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>ALL TIME</p>
              <p style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
                {profile.totalFills} fuel {profile.totalFills === 1 ? 'entry' : 'entries'} · {fmt(profile.totalLitres, 1)}L · ₹{fmt(profile.totalSpend, 0)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

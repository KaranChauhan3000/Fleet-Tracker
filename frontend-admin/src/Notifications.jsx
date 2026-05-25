// Notifications.jsx — All fleet alerts in one place
import { useState, useEffect, useRef } from 'react';
import { api, fmt } from './api.js';
import { pcGet } from './persistCache.js';
import {
  Bell, ArrowLeft, AlertTriangle, ShieldCheck,
  Receipt, Wrench, CreditCard, FileText,
} from 'lucide-react';

const alertStyles = `
@keyframes slideInAlert { 0%{transform:translateY(-4px);opacity:0} 100%{transform:translateY(0);opacity:1} }
@keyframes urgentBlink  { 0%,100%{opacity:1} 50%{opacity:0.45} }
`;

function TenBar({ daysLeft, isExpired }) {
  const days = isExpired ? 0 : Math.max(0, Math.min(daysLeft, 10));
  const activeStart = 10 - days;
  const shouldBlink = !isExpired && days > 0 && days <= 5;

  const getColor = (i) => {
    if (i < activeStart) return null;
    if (days >= 6) return 'var(--success)';
    if (i >= 7) return 'var(--danger)';
    return 'var(--success)';
  };

  return (
    <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
      {Array.from({ length: 10 }, (_, i) => {
        const color = getColor(i);
        const isEmpty = color === null;
        return (
          <div key={i} style={{
            flex: 1, height: 6, borderRadius: 3,
            background: isEmpty ? 'rgba(150,150,150,0.18)' : color,
            opacity: isEmpty ? 1 : 0.88,
            transition: 'background 0.3s',
            animation: shouldBlink && !isEmpty
              ? 'urgentBlink 1.2s ease-in-out infinite' : 'none',
          }} />
        );
      })}
    </div>
  );
}

function SectionHeader({ icon: Icon, label, count, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, marginTop: 4 }}>
      <Icon size={12} color={color} />
      <p style={{
        fontSize: 9, fontWeight: 800, color: 'var(--text-secondary)',
        textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0, flex: 1,
      }}>{label}</p>
      <span style={{
        fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 10,
        background: `${color}18`, color, border: `1px solid ${color}30`,
      }}>{count}</span>
    </div>
  );
}

function AlertCard({ children, onClick, color, bg, bdrClr }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
        border: `1px solid ${bdrClr}`, background: bg,
        animation: 'slideInAlert 0.3s ease', transition: 'transform 0.12s', userSelect: 'none',
      }}
      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      {children}
    </div>
  );
}

function alertColors(daysLeft, isExpiredOrOverdue) {
  const isCritical = !isExpiredOrOverdue && daysLeft <= 3;
  const isWarning  = !isExpiredOrOverdue && !isCritical && daysLeft <= 7;
  const color  = isExpiredOrOverdue || isCritical ? 'var(--danger)' : isWarning ? 'var(--warning)' : 'var(--success)';
  const bg     = isExpiredOrOverdue || isCritical ? 'var(--danger-dim)' : isWarning ? 'var(--warning-dim)' : 'var(--success-dim)';
  const bdrClr = isExpiredOrOverdue || isCritical ? 'rgba(220,38,38,0.25)' : isWarning ? 'rgba(217,119,6,0.20)' : 'rgba(22,163,74,0.20)';
  return { color, bg, bdrClr };
}

function ExpiryAlertCard({ alert, type, onNavigate }) {
  const isExpired = alert.daysLeft < 0;
  const daysAbs   = Math.abs(alert.daysLeft);
  const { color, bg, bdrClr } = alertColors(alert.daysLeft, isExpired);
  return (
    <AlertCard onClick={() => onNavigate('vehicleAnalytics', alert.id)} color={color} bg={bg} bdrClr={bdrClr}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontWeight: 800, fontSize: 12, fontFamily: 'var(--font-mono)', color, flex: 1 }}>{alert.plateNumber}</span>
        <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)' }}>{alert.make} {alert.model}</span>
        <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 5, background: `${color}18`, color, border: `1px solid ${bdrClr}`, letterSpacing: '0.05em' }}>
          {type} · {isExpired ? `${daysAbs}d ago` : alert.daysLeft === 0 ? 'TODAY' : `${alert.daysLeft}d`}
        </span>
      </div>
      <TenBar daysLeft={alert.daysLeft} isExpired={isExpired} />
    </AlertCard>
  );
}

function ChallanAlertCard({ alert, onNavigate }) {
  const isOverdue = alert.daysLeft < 0;
  const daysAbs   = Math.abs(alert.daysLeft);
  const { color, bg, bdrClr } = alertColors(alert.daysLeft, isOverdue);
  return (
    <AlertCard onClick={() => onNavigate('challans')} color={color} bg={bg} bdrClr={bdrClr}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontWeight: 800, fontSize: 12, fontFamily: 'var(--font-mono)', color, flex: 1 }}>{alert.plateNumber}</span>
        <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 90 }}>{alert.offence}</span>
        <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 5, background: `${color}18`, color, border: `1px solid ${bdrClr}`, letterSpacing: '0.05em', flexShrink: 0 }}>
          ₹{alert.amount?.toLocaleString('en-IN')} · {isOverdue ? `${daysAbs}d ago` : alert.daysLeft === 0 ? 'TODAY' : `${alert.daysLeft}d`}
        </span>
      </div>
      <TenBar daysLeft={isOverdue ? -1 : alert.daysLeft} isExpired={isOverdue} />
    </AlertCard>
  );
}

export default function Notifications({ admin, onNavigate, onBack, dark, onToggleTheme }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  async function loadAlerts() {
    const now   = new Date();
    const year  = now.getFullYear();
    const month = now.getMonth();
    const path  = `/admin/stats?year=${year}&month=${month}`;

    const persisted = pcGet(path);
    if (persisted) {
      setStats(persisted.data);
      setLoading(false);
      // Always refresh in background
      api.get(path).then(fresh => setStats(fresh)).catch(() => {});
      return;
    }
    try {
      const data = await api.get(path);
      setStats(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  const s = stats || {};
  const totalAlerts =
    (s.pollutionAlerts?.length || 0) +
    (s.insuranceAlerts?.length || 0) +
    (s.challanAlerts?.length || 0) +
    (s.serviceAlerts?.length || 0) +
    (s.emiAlerts?.length || 0) +
    (s.nocAlerts?.length || 0);

  return (
    <div className="page-wrapper page-enter">
      <style>{alertStyles}</style>

      {/* ── Header ── */}
      <div className="page-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn-icon" onClick={onBack} title="Back">
            <ArrowLeft size={16} />
          </button>
          <div>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Fleet Alerts
            </p>
            <p style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
              Notifications
            </p>
          </div>
        </div>
        {totalAlerts > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 20,
            background: 'var(--danger)', color: '#fff', letterSpacing: '0.02em',
          }}>
            {totalAlerts} active
          </span>
        )}
      </div>

      <div className="page-content">
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <span className="spinner" style={{ width: 24, height: 24 }} />
          </div>
        )}

        {!loading && totalAlerts === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '60px 20px', gap: 12,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, background: 'var(--success-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bell size={24} color="var(--success)" />
            </div>
            <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>All Clear!</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 220 }}>
              No active alerts for your fleet right now.
            </p>
          </div>
        )}

        {!loading && totalAlerts > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* PUC */}
            {s.pollutionAlerts?.length > 0 && (
              <div>
                <SectionHeader icon={AlertTriangle} label="PUC Expiry" count={s.pollutionAlerts.length} color="var(--danger)" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {s.pollutionAlerts.map(a => <ExpiryAlertCard key={a.id} alert={a} type="PUC" onNavigate={onNavigate} />)}
                </div>
              </div>
            )}

            {/* Insurance */}
            {s.insuranceAlerts?.length > 0 && (
              <div>
                <SectionHeader icon={ShieldCheck} label="Insurance Expiry" count={s.insuranceAlerts.length} color="var(--warning)" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {s.insuranceAlerts.map(a => <ExpiryAlertCard key={a.id} alert={a} type="INS" onNavigate={onNavigate} />)}
                </div>
              </div>
            )}

            {/* Challans */}
            {s.challanAlerts?.length > 0 && (
              <div>
                <SectionHeader icon={Receipt} label="Pending Challans" count={s.challanAlerts.length} color="var(--danger)" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {s.challanAlerts.map(a => <ChallanAlertCard key={a.id} alert={a} onNavigate={onNavigate} />)}
                </div>
              </div>
            )}

            {/* Service Due */}
            {s.serviceAlerts?.length > 0 && (
              <div>
                <SectionHeader icon={Wrench} label="Service Due" count={s.serviceAlerts.length} color="var(--accent)" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {s.serviceAlerts.map(alert => {
                    const isOverdue = alert.daysLeft < 0;
                    const { color, bg, bdrClr } = alertColors(alert.daysLeft, isOverdue);
                    return (
                      <AlertCard key={alert.id} onClick={() => onNavigate('services')} color={color} bg={bg} bdrClr={bdrClr}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 800, fontSize: 12, fontFamily: 'var(--font-mono)', color, flex: 1 }}>{alert.plateNumber}</span>
                          <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)' }}>{alert.make} {alert.model}</span>
                          <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 5, background: `${color}18`, color, border: `1px solid ${bdrClr}`, letterSpacing: '0.05em' }}>
                            {alert.serviceType} · {isOverdue ? `${Math.abs(alert.daysLeft)}d ago` : alert.daysLeft === 0 ? 'TODAY' : `${alert.daysLeft}d`}
                          </span>
                        </div>
                      </AlertCard>
                    );
                  })}
                </div>
              </div>
            )}

            {/* EMI Due */}
            {s.emiAlerts?.length > 0 && (
              <div>
                <SectionHeader icon={CreditCard} label="EMI Due" count={s.emiAlerts.length} color="var(--warning)" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {s.emiAlerts.map(alert => {
                    const { color, bg, bdrClr } = alertColors(alert.daysLeft, false);
                    return (
                      <AlertCard key={alert.id} onClick={() => onNavigate('finance')} color={color} bg={bg} bdrClr={bdrClr}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 800, fontSize: 12, fontFamily: 'var(--font-mono)', color, flex: 1 }}>{alert.plateNumber}</span>
                          <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 80 }}>{alert.lenderName}</span>
                          <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 5, background: `${color}18`, color, border: `1px solid ${bdrClr}`, letterSpacing: '0.05em', flexShrink: 0 }}>
                            ₹{alert.emiAmount?.toLocaleString('en-IN')} · {alert.daysLeft === 0 ? 'TODAY' : `${alert.daysLeft}d`}
                          </span>
                        </div>
                      </AlertCard>
                    );
                  })}
                </div>
              </div>
            )}

            {/* NOC */}
            {s.nocAlerts?.length > 0 && (
              <div>
                <SectionHeader icon={FileText} label="NOC Required" count={s.nocAlerts.length} color="var(--danger)" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {s.nocAlerts.map(alert => {
                    const isAllPaid = alert.allPaid;
                    const color  = isAllPaid ? 'var(--success)' : 'var(--danger)';
                    const bg     = isAllPaid ? 'var(--success-dim)' : 'var(--danger-dim)';
                    const bdrClr = isAllPaid ? 'rgba(22,163,74,0.25)' : 'rgba(220,38,38,0.25)';
                    return (
                      <AlertCard key={alert.id} onClick={() => onNavigate('finance')} color={color} bg={bg} bdrClr={bdrClr}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 800, fontSize: 12, fontFamily: 'var(--font-mono)', color, flex: 1 }}>{alert.plateNumber}</span>
                          <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 80 }}>{alert.lenderName}</span>
                          <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 5, background: `${color}18`, color, border: `1px solid ${bdrClr}`, letterSpacing: '0.05em', flexShrink: 0 }}>
                            NOC · {isAllPaid ? 'COLLECT NOW' : `${Math.abs(alert.daysToEnd)}d ago`}
                          </span>
                        </div>
                        <TenBar daysLeft={0} isExpired={true} />
                      </AlertCard>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

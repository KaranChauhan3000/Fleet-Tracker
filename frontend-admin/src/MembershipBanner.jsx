import { useState, useEffect } from 'react';
import { api } from './api.js';
import { Crown, AlertTriangle, X } from 'lucide-react';

export default function MembershipBanner({ onGetMembership }) {
  const [status,    setStatus]    = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    api.get('/admin/membership/status').then(setStatus).catch(() => {});
  }, []);

  if (!status || dismissed) return null;
  if (status.status === 'active' && status.daysLeft > 7) return null; // no banner needed

  const isTrial    = status.status === 'trial';
  const isExpiring = status.status === 'active' && status.daysLeft <= 7;
  const days       = status.daysLeft;

  let bg, border, color, icon, title, sub;

  if (isTrial && days > 7) {
    bg = 'rgba(59,130,246,0.08)'; border = 'rgba(59,130,246,0.2)'; color = '#3b82f6';
    title = `Trial: ${days} days left`;
    sub   = 'Get membership to continue after trial ends';
    icon  = Crown;
  } else if (isTrial && days <= 7 && days > 3) {
    bg = 'rgba(245,158,11,0.08)'; border = 'rgba(245,158,11,0.25)'; color = '#f59e0b';
    title = `Trial ending in ${days} days!`;
    sub   = 'Subscribe now to avoid interruption';
    icon  = AlertTriangle;
  } else if ((isTrial && days <= 3) || isExpiring) {
    bg = 'rgba(239,68,68,0.08)'; border = 'rgba(239,68,68,0.25)'; color = '#ef4444';
    title = isTrial ? `Trial ends in ${days} day${days === 1 ? '' : 's'}!` : `Membership expires in ${days} days!`;
    sub   = 'Subscribe now — your data is safe';
    icon  = AlertTriangle;
  } else {
    return null;
  }

  const Icon = icon;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: bg, border: `1px solid ${border}`,
      borderRadius: 10, padding: '9px 12px', margin: '0 0 8px',
    }}>
      <Icon size={15} color={color} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 800, color }}>{title}</p>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{sub}</p>
      </div>
      <button
        onClick={onGetMembership}
        style={{
          flexShrink: 0, background: color, color: '#fff', border: 'none',
          borderRadius: 7, padding: '5px 10px', fontSize: 11, fontWeight: 800,
          cursor: 'pointer',
        }}
      >
        Subscribe
      </button>
      <button
        onClick={() => setDismissed(true)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0 }}
      >
        <X size={13} color="var(--text-muted)" />
      </button>
    </div>
  );
}

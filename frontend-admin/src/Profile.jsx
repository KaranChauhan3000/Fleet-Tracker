import { clearAuth } from './api.js';
import { LogOut, Phone, Mail, Briefcase, Building2, ShieldCheck, Sun, Moon, Settings, ChevronRight } from 'lucide-react';

export default function Profile({ admin, onLogout, onNavigate, dark, onToggleTheme }) {
  return (
    <div className="page-wrapper page-enter">
      <div className="page-header" style={{ justifyContent: 'space-between' }}>
        <p style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em' }}>My Profile</p>
        {onToggleTheme && (
          <button className="theme-toggle" onClick={onToggleTheme} title={dark ? 'Light mode' : 'Dark mode'}>
            {dark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        )}
      </div>

      <div className="page-content">

        {/* Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0 12px', gap: 10 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg,#EA580C,#F97316)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(249,115,22,0.30)',
          }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: '#fff' }}>
              {admin.name?.[0]?.toUpperCase()}
            </span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              {admin.name}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {admin.designation || 'Fleet Admin'}
            </p>
          </div>
        </div>

        {/* Info rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { icon: Phone,       label: 'Phone',       value: admin.phone },
            { icon: Mail,        label: 'Email',        value: admin.email },
            { icon: Briefcase,   label: 'Designation',  value: admin.designation || '—' },
            { icon: Building2,   label: 'Company',      value: admin.companyName },
            { icon: ShieldCheck, label: 'Role',         value: 'Fleet Administrator' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 32, height: 32, background: 'var(--accent-dim)', borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon size={15} color="var(--accent)" />
              </div>
              <div>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {label}
                </p>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {value || '—'}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="divider" />

        {/* Settings button — explicit colors so dark mode works perfectly */}
        <button
          onClick={() => onNavigate && onNavigate('settings')}
          style={{
            width: '100%', cursor: 'pointer', textAlign: 'left',
            background: 'var(--accent-dim)',
            border: '1.5px solid rgba(249,115,22,0.30)',
            borderRadius: 14, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 14,
          }}
        >
          {/* Icon box */}
          <div style={{
            width: 42, height: 42, flexShrink: 0,
            background: 'linear-gradient(135deg,#EA580C,#F97316)',
            borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(249,115,22,0.35)',
          }}>
            <Settings size={19} color="#fff" />
          </div>

          {/* Text — explicit color avoids browser ButtonText in dark mode */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Settings
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Office timing &amp; company preferences
            </p>
          </div>

          {/* Arrow */}
          <ChevronRight size={18} color="var(--accent)" />
        </button>

        <div className="divider" />

        <button className="btn btn-danger-ghost" onClick={() => { clearAuth(); onLogout(); }} style={{ gap: 8 }}>
          <LogOut size={16} /> Sign Out
        </button>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          Fleet Tracker · Admin App
        </p>
      </div>
    </div>
  );
}

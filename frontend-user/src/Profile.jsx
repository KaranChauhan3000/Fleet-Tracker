import { LogOut, User, Phone, Hash, Building2, Car, ShieldCheck } from 'lucide-react';

export default function Profile({ user, onLogout }) {
  return (
    <div className="page-wrapper page-enter">
      <div className="page-header">
        <h1 style={{ fontSize: 17, fontWeight: 700 }}>Profile</h1>
      </div>

      <div className="page-content">
        {/* Avatar + Name */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0 16px', gap: 10 }}>
          <div style={{ width: 72, height: 72, background: 'linear-gradient(135deg, #1E40AF, #3B82F6)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>{user.name[0].toUpperCase()}</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 20, fontWeight: 800 }}>{user.name}</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>User / Field User</p>
          </div>
        </div>

        {/* Info cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <ProfileRow icon={Hash} label="Employee ID" value={user.employeeId} mono />
          <ProfileRow icon={Phone} label="Phone" value={user.phone} />
          <ProfileRow icon={Building2} label="Company" value={user.companyName} />
          <ProfileRow icon={ShieldCheck} label="Role" value="User / Field User" />
        </div>

        <div className="divider" />

        <button className="btn btn-danger" onClick={onLogout} style={{ gap: 8 }}>
          <LogOut size={18} /> Sign Out
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
          Fleet Tracker v3.0 · User App
        </p>
      </div>
    </div>
  );
}

function ProfileRow({ icon: Icon, label, value, mono }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, borderRadius: 8, marginBottom: 4 }}>
      <div style={{ width: 34, height: 34, background: 'var(--bg-elevated)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={16} color="var(--text-muted)" />
      </div>
      <div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
        <p style={{ fontSize: 15, fontWeight: 600, fontFamily: mono ? 'var(--font-mono)' : 'var(--font)' }}>{value || '—'}</p>
      </div>
    </div>
  );
}

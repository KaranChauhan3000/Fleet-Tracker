import { useState, useEffect, useCallback } from 'react';
import {
  UserPlus, Trash2, ShieldCheck, Crown, X,
  Phone, Mail, Briefcase, ChevronRight, Users,
  ToggleLeft, ToggleRight, Loader2, ArrowLeft,
} from 'lucide-react';
import { api } from './api.js';

// ─── helpers ──────────────────────────────────────────────────────────────────
function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function avatarColor(name) {
  const colors = [
    'linear-gradient(135deg,#7C3AED,#A78BFA)',
    'linear-gradient(135deg,#0369A1,#38BDF8)',
    'linear-gradient(135deg,#065F46,#34D399)',
    'linear-gradient(135deg,#92400E,#FCD34D)',
    'linear-gradient(135deg,#9D174D,#F9A8D4)',
    'linear-gradient(135deg,#1D4ED8,#60A5FA)',
  ];
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return colors[h % colors.length];
}

// ─── Add Admin Sheet ───────────────────────────────────────────────────────────
function AddAdminSheet({ onClose, onAdded, toast }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', designation: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  function validate() {
    const e = {};
    if (!form.name.trim())  e.name  = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.phone.trim()) e.phone = 'Phone is required';
    else if (!/^\d{10}$/.test(form.phone.replace(/\s/g, ''))) e.phone = '10-digit number required';
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try {
      const admin = await api.post('/admin/admins', {
        name:        form.name.trim(),
        email:       form.email.trim().toLowerCase(),
        phone:       form.phone.trim().replace(/\s/g, ''),
        designation: form.designation.trim(),
      });
      onAdded(admin);
      toast.success(`${admin.name} added as admin`);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  function field(key, label, placeholder, type = 'text', inputMode) {
    return (
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>
          {label}
        </label>
        <input
          type={type}
          inputMode={inputMode}
          value={form[key]}
          placeholder={placeholder}
          onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); setErrors(er => ({ ...er, [key]: undefined })); }}
          style={{
            width: '100%', padding: '11px 13px', borderRadius: 10,
            background: 'var(--bg-card)', border: `1.5px solid ${errors[key] ? '#EF4444' : 'var(--border)'}`,
            color: 'var(--text-primary)', fontSize: 15, outline: 'none', boxSizing: 'border-box',
          }}
        />
        {errors[key] && <p style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>{errors[key]}</p>}
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxWidth: 480, background: 'var(--bg-card)', borderRadius: '20px 20px 0 0', padding: '0 0 env(safe-area-inset-bottom,20px)', animation: 'slideUp 0.28s ease both' }}>
        <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2, margin: '12px auto 0' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 0' }}>
          <p style={{ fontSize: 17, fontWeight: 800 }}>Add New Admin</p>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--bg-base)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: '18px 20px 0' }}>
          {field('name',        'Full Name',    'e.g. Rahul Sharma')}
          {field('phone',       'Phone',        '98765 43210', 'tel', 'numeric')}
          {field('email',       'Email',        'rahul@company.com', 'email')}
          {field('designation', 'Designation',  'e.g. Fleet Manager (optional)')}

          <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 10, padding: '10px 12px', marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--accent)' }}>Full access:</strong> This admin will have the same permissions as you — vehicles, users, fuel, finance, and everything else.
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: 15, fontWeight: 700, borderRadius: 12, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <UserPlus size={18} />}
            {loading ? 'Adding…' : 'Add Admin'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Card ────────────────────────────────────────────────────────────────
function AdminCard({ admin, currentAdminId, onDelete, onToggle }) {
  const isSelf   = admin.id === currentAdminId;
  const isOwner  = admin.isOwner;
  const canAct   = !isSelf && !isOwner;

  return (
    <div className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: admin.isActive ? 1 : 0.55 }}>
      {/* Avatar */}
      <div style={{ width: 44, height: 44, borderRadius: 12, background: avatarColor(admin.name), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{initials(admin.name)}</span>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <p style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {admin.name}
          </p>
          {isOwner && (
            <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(251,191,36,0.15)', color: '#FCD34D', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 5, padding: '1px 6px', flexShrink: 0 }}>
              OWNER
            </span>
          )}
          {isSelf && !isOwner && (
            <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(59,130,246,0.12)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 5, padding: '1px 6px', flexShrink: 0 }}>
              YOU
            </span>
          )}
          {!admin.isActive && (
            <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 5, padding: '1px 6px', flexShrink: 0 }}>
              INACTIVE
            </span>
          )}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {admin.designation || 'Fleet Admin'} · {admin.phone}
        </p>
      </div>

      {/* Actions */}
      {canAct && (
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => onToggle(admin)}
            title={admin.isActive ? 'Deactivate' : 'Activate'}
            style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', color: admin.isActive ? '#34D399' : 'var(--text-muted)' }}
          >
            {admin.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          </button>
          <button
            onClick={() => onDelete(admin)}
            title="Remove admin"
            style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.08)', color: '#EF4444' }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Confirm Delete Sheet ──────────────────────────────────────────────────────
function ConfirmSheet({ admin, onConfirm, onCancel, loading }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onCancel()}>
      <div style={{ width: '100%', maxWidth: 480, background: 'var(--bg-card)', borderRadius: '20px 20px 0 0', padding: '20px 20px env(safe-area-inset-bottom,24px)', animation: 'slideUp 0.24s ease both' }}>
        <div style={{ textAlign: 'center', padding: '8px 0 18px' }}>
          <div style={{ width: 52, height: 52, background: 'rgba(239,68,68,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Trash2 size={22} color="#EF4444" />
          </div>
          <p style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>Remove Admin?</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--text-primary)' }}>{admin.name}</strong> will lose access to the admin dashboard immediately.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} className="btn btn-ghost" style={{ flex: 1, padding: '13px', fontWeight: 700 }}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="btn btn-danger-ghost" style={{ flex: 1, padding: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={16} />}
            {loading ? 'Removing…' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function TeamPage({ admin, toast, onBack }) {
  const [admins,      setAdmins]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showAdd,     setShowAdd]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.fresh('/admin/admins');
      setAdmins(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/admins/${deleteTarget.id}`);
      setAdmins(prev => prev.filter(a => a.id !== deleteTarget.id));
      toast.success(`${deleteTarget.name} removed`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleToggle(target) {
    try {
      const updated = await api.put(`/admin/admins/${target.id}`, { isActive: !target.isActive });
      setAdmins(prev => prev.map(a => a.id === target.id ? { ...a, isActive: updated.isActive } : a));
      toast.success(`${target.name} ${updated.isActive ? 'activated' : 'deactivated'}`);
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="page-wrapper page-enter">
      <style>{`@keyframes slideUp { from{transform:translateY(40px);opacity:0} to{transform:translateY(0);opacity:1} }`}</style>

      {/* Header */}
      <div className="page-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {onBack && (
            <button onClick={onBack} style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--bg-card)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', flexShrink: 0 }}>
              <ArrowLeft size={17} />
            </button>
          )}
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em' }}>Team Admins</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{admin.companyName}</p>
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowAdd(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13, fontWeight: 700 }}
        >
          <UserPlus size={15} /> Add Admin
        </button>
      </div>

      <div className="page-content">

        {/* Stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Total Admins', value: admins.length,                         icon: Users,       color: '#60A5FA' },
            { label: 'Active',       value: admins.filter(a => a.isActive).length, icon: ShieldCheck, color: '#34D399' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card-sm" style={{ textAlign: 'center', padding: '14px 10px' }}>
              <Icon size={18} color={color} style={{ marginBottom: 4 }} />
              <p style={{ fontSize: 22, fontWeight: 800, color }}>{loading ? '—' : value}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <Loader2 size={24} color="var(--text-muted)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : admins.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <Users size={36} color="var(--text-muted)" style={{ marginBottom: 12 }} />
            <p style={{ fontWeight: 700, fontSize: 15 }}>No admins yet</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Tap "Add Admin" to invite a team member.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {admins.map(a => (
              <AdminCard
                key={a.id}
                admin={a}
                currentAdminId={admin.id}
                onDelete={setDeleteTarget}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}

        {/* Info note */}
        <div style={{ marginTop: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <ShieldCheck size={16} color="var(--accent)" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>About admin access</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                All admins in your company have full access to vehicles, users, fuel logs, finance, and reports.
                The <strong style={{ color: '#FCD34D' }}>Owner</strong> account (created during registration) cannot be removed.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sheets */}
      {showAdd && (
        <AddAdminSheet
          onClose={() => setShowAdd(false)}
          onAdded={newAdmin => setAdmins(prev => [...prev, newAdmin])}
          toast={toast}
        />
      )}
      {deleteTarget && (
        <ConfirmSheet
          admin={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}
    </div>
  );
}

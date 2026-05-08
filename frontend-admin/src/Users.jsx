import { useState, useEffect } from 'react';
import { api, fmtDate, fmtRs, fmt, clearAuth } from './api.js';
import { useToast } from './Toast.jsx';
import { Users, Plus, Search, ChevronLeft, ChevronRight, Phone, Hash, Car, Check, X,
         Edit2, Trash2, Eye, EyeOff, Copy, Fuel, ChevronRight as ArrowRight } from 'lucide-react';


const LIMIT = 10;

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function UsersPage({ admin, onLogout, onNavigate }) {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(null);
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => { loadVehicles(); }, []);
  useEffect(() => { const t = setTimeout(() => { setPage(1); loadUsers(1, search); }, 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => { loadUsers(page, search); }, [page]);

  async function loadUsers(p = page, q = search) {
    setLoading(true);
    try {
      const res = await api.get(`/admin/users?page=${p}&limit=${LIMIT}&search=${encodeURIComponent(q)}`);
      setUsers(res.data || []); setTotal(res.total || 0);
    } catch (err) { if (err.message.includes('401')) { clearAuth(); onLogout(); } toast(err.message, 'error'); }
    finally { setLoading(false); }
  }

  async function loadVehicles() {
    try { const res = await api.get('/admin/vehicles?page=1&limit=100'); setVehicles(res.data || []); } catch {}
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="page-wrapper page-enter">
      <div className="page-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: 'var(--accent-dim)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={16} color="var(--accent-light)" />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800 }}>Users</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{total} total</p>
          </div>
        </div>
        <button className="btn btn-primary btn-sm" style={{ width: 'auto', padding: '8px 14px' }} onClick={() => setSheet('create')}>
          <Plus size={14} /> Add User
        </button>
      </div>

      <div className="page-content">
        <div className="search-wrap">
          <Search size={15} />
          <input className="search-bar" placeholder="Search name, ID or phone..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><span className="spinner" style={{ width: 28, height: 28 }} /></div>
          : users.length === 0 ? (
            <div className="empty-state">
              <Users size={36} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
              <p className="empty-title">No users found</p>
              <p className="empty-desc">{search ? 'Try a different search' : 'Add your first user'}</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {users.map(u => (
                  <UserRow
                    key={u.id}
                    user={u}
                    onEdit={e => { e.stopPropagation(); setSheet(u); }}
                    onRefresh={() => loadUsers(page, search)}
                    onViewDetail={() => onNavigate && onNavigate('userDetail', u.id)}
                    toast={toast}
                  />
                ))}
              </div>
              <Pagination page={page} total={total} limit={LIMIT} totalPages={totalPages} onPage={setPage} />
            </>
          )}
      </div>

      {sheet && (
        <UserSheet
          user={sheet === 'create' ? null : sheet}
          vehicles={vehicles}
          onClose={() => setSheet(null)}
          onSaved={() => { setSheet(null); loadUsers(1, ''); setSearch(''); setPage(1); }}
          toast={toast}
        />
      )}
    </div>
  );
}

// ── User Row ──────────────────────────────────────────────────────────────────
// Clicking the row body navigates to UserDetail.
// Edit / Activate / Delete buttons stop propagation so they don't trigger navigation.
function UserRow({ user, onEdit, onRefresh, onViewDetail, toast }) {
  async function toggleActive(e) {
    e.stopPropagation();
    try {
      await api.put(`/admin/users/${user.id}`, { isActive: !user.isActive });
      toast(`User ${user.isActive ? 'deactivated' : 'activated'}`, 'success');
      onRefresh();
    } catch (err) { toast(err.message, 'error'); }
  }

  async function deleteUser(e) {
    e.stopPropagation();
    if (!confirm(`Delete user "${user.name}"? This cannot be undone.`)) return;
    try { await api.delete(`/admin/users/${user.id}`); toast('User deleted', 'success'); onRefresh(); }
    catch (err) { toast(err.message, 'error'); }
  }

  return (
    <div
      className="list-row"
      style={{ padding: '12px 14px', cursor: 'pointer' }}
      onClick={onViewDetail}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
        {/* Avatar */}
        <div style={{
          width: 40, height: 40, background: user.isActive ? 'var(--accent-dim)' : 'var(--bg-elevated)',
          borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, fontWeight: 800, fontSize: 16,
          color: user.isActive ? 'var(--accent-light)' : 'var(--text-muted)',
        }}>
          {user.name[0].toUpperCase()}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <p style={{ fontWeight: 700, fontSize: 14 }}>{user.name}</p>
            <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
              {user.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}><Hash size={10} />{user.employeeId}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}><Phone size={10} />{user.phone}</span>
            {user.totalFills > 0 && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Fuel size={10} />{user.totalFills} fills · {fmtRs(user.totalSpend)}
              </span>
            )}
          </div>
          {user.assignedVehicles?.length > 0 && (
            <div style={{ marginTop: 5, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {user.assignedVehicles.map(v => (
                <span key={v.id} style={{ fontSize: 10, background: 'var(--purple-dim)', color: '#A78BFA', borderRadius: 4, padding: '2px 6px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  {v.plateNumber}
                </span>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
            <button onClick={onEdit} className="btn btn-ghost btn-sm" style={{ flex: 1, padding: '6px' }}>
              <Edit2 size={12} /> Edit
            </button>
            <button onClick={toggleActive} className="btn btn-ghost btn-sm" style={{ flex: 1, padding: '6px', color: user.isActive ? 'var(--warning)' : 'var(--success)' }}>
              {user.isActive ? <><EyeOff size={12} /> Deactivate</> : <><Eye size={12} /> Activate</>}
            </button>
            <button onClick={deleteUser} className="btn btn-danger-ghost btn-sm" style={{ padding: '6px 10px' }}>
              <Trash2 size={12} />
            </button>
            {/* Visual hint that row is tappable */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 6px', color: 'var(--text-muted)' }}>
              <ArrowRight size={14} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── User Sheet (Create / Edit) ─────────────────────────────────────────────────
function UserSheet({ user, vehicles, onClose, onSaved, toast }) {
  const [form, setForm] = useState({
    name: user?.name || '', employeeId: user?.employeeId || '',
    phone: user?.phone || '', licenseNumber: user?.licenseNumber || '',
    assignedVehicleIds: user?.assignedVehicleIds?.map(v => (v?.id || v)?.toString()) || [],
  });
  const [saving, setSaving] = useState(false);
  const [createdUser, setCreatedUser] = useState(null);
  const [idLoading, setIdLoading] = useState(false);
  const isEdit = !!user;

  useEffect(() => {
    if (isEdit) return;
    async function fetchNextId() {
      setIdLoading(true);
      try {
        const res = await api.get('/admin/users?page=1&limit=1000');
        const allUsers = res.data || [];
        let maxNum = 0;
        allUsers.forEach(u => {
          const match = u.employeeId?.match(/^EMP(\d+)$/i);
          if (match) { const n = parseInt(match[1], 10); if (n > maxNum) maxNum = n; }
        });
        setForm(f => ({ ...f, employeeId: 'EMP' + String(maxNum + 1).padStart(3, '0') }));
      } catch {} finally { setIdLoading(false); }
    }
    fetchNextId();
  }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  function toggleVehicle(id) {
    setForm(f => {
      const ids = f.assignedVehicleIds.includes(id)
        ? f.assignedVehicleIds.filter(x => x !== id)
        : [...f.assignedVehicleIds, id];
      return { ...f, assignedVehicleIds: ids };
    });
  }

  async function save(e) {
    e.preventDefault();
    if (!form.name.trim()) { toast('Name is required', 'error'); return; }
    if (!form.employeeId.trim()) { toast('User ID is required', 'error'); return; }
    if (!form.phone.trim()) { toast('Phone is required', 'error'); return; }
    setSaving(true);
    try {
      const body = { name: form.name, employeeId: form.employeeId, phone: form.phone, licenseNumber: form.licenseNumber, assignedVehicleIds: form.assignedVehicleIds };
      if (isEdit) {
        await api.put(`/admin/users/${user.id}`, body);
        toast('User updated', 'success'); onSaved();
      } else {
        const res = await api.post('/admin/users', body);
        setCreatedUser({ ...res, employeeId: form.employeeId, name: form.name });
        toast('User created!', 'success');
      }
    } catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  }

  if (createdUser) {
    return (
      <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="sheet">
          <div className="sheet-handle" />
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, background: 'var(--success-dim)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={28} color="var(--success)" />
            </div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 800 }}>User Created!</p>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>{createdUser.name} has been added successfully.</p>
            </div>
            <div style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, textAlign: 'left' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Login Credentials</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>User ID (for login)</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 20, color: 'var(--accent-light)', letterSpacing: '0.05em' }}>{createdUser.employeeId}</p>
                </div>
                </div>
            </div>
            <div style={{ display: 'flex', gap: 9, width: '100%' }}>
              <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Done</button>
              <button className="btn btn-primary" onClick={async () => {
                setCreatedUser(null);
                setForm({ name:'', employeeId:'', phone:'', licenseNumber:'', assignedVehicleIds:[] });
                setIdLoading(true);
                try {
                  const res = await api.get('/admin/users?page=1&limit=1000');
                  const allUsers = res.data || [];
                  let maxNum = 0;
                  allUsers.forEach(u => {
                    const match = u.employeeId?.match(/^EMP(\d+)$/i);
                    if (match) { const n = parseInt(match[1], 10); if (n > maxNum) maxNum = n; }
                  });
                  setForm(f => ({ ...f, employeeId: 'EMP' + String(maxNum + 1).padStart(3, '0') }));
                } catch {} finally { setIdLoading(false); }
              }} style={{ flex: 1 }}>Add Another</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="sheet-handle" />
        <p className="sheet-title">{isEdit ? 'Edit User' : 'Add New User'}</p>
        <form onSubmit={save} style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="input-group"><label className="input-label">Full Name *</label><input className="input-field" value={form.name} onChange={set('name')} placeholder="Full name" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="input-group">
              <label className="input-label">User ID * <span style={{color:'var(--accent-light)',fontWeight:500}}>(used to login)</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input-field"
                  value={form.employeeId}
                  onChange={isEdit ? undefined : set('employeeId')}
                  readOnly={isEdit}
                  placeholder={idLoading ? 'Generating...' : 'EMP001'}
                  style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, background: isEdit ? 'var(--bg-elevated)' : undefined, paddingRight: idLoading ? 36 : undefined, opacity: idLoading ? 0.6 : 1 }}
                />
                {idLoading && <span className="spinner" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14 }} />}
              </div>
              {!isEdit && !idLoading && <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Auto-generated · you can change it</p>}
            </div>
            <div className="input-group"><label className="input-label">Phone Number *</label><input className="input-field" type="tel" value={form.phone} onChange={set('phone')} placeholder="+91..." /></div>
          </div>
          <div className="input-group"><label className="input-label">License Number (optional)</label><input className="input-field" value={form.licenseNumber} onChange={set('licenseNumber')} placeholder="DL number" /></div>

          {vehicles.length > 0 && (
            <div className="input-group">
              <label className="input-label">Assign Vehicles</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 8 }}>
                {vehicles.map(v => (
                  <label key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px', background: form.assignedVehicleIds.includes(v.id?.toString() || v.id) ? 'var(--accent-dim)' : 'transparent', borderRadius: 7, cursor: 'pointer', border: `1px solid ${form.assignedVehicleIds.includes(v.id?.toString() || v.id) ? 'rgba(14,165,233,0.3)' : 'transparent'}` }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, background: form.assignedVehicleIds.includes(v.id?.toString() || v.id) ? 'var(--accent)' : 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                      onClick={() => toggleVehicle(v.id?.toString() || v.id)}>
                      {form.assignedVehicleIds.includes(v.id?.toString() || v.id) && <Check size={11} color="#fff" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{v.plateNumber}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.make} {v.model} · {v.fuelType}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 9, marginTop: 4 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2 }}>
              {saving ? <><span className="spinner" /> Saving...</> : isEdit ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Pagination ─────────────────────────────────────────────────────────────────
function Pagination({ page, total, limit, totalPages, onPage }) {
  if (totalPages <= 1) return null;
  return (
    <div className="pagination">
      <span className="pagination-info">Showing {(page-1)*limit+1}–{Math.min(page*limit,total)} of {total}</span>
      <div className="pagination-btns">
        <button className="pg-btn" disabled={page <= 1} onClick={() => onPage(p=>p-1)}><ChevronLeft size={13} /></button>
        {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
          let p=i+1;
          if(totalPages>5){if(page<=3)p=i+1;else if(page>=totalPages-2)p=totalPages-4+i;else p=page-2+i;}
          return <button key={p} className={`pg-btn ${p===page?'active':''}`} onClick={()=>onPage(p)}>{p}</button>;
        })}
        <button className="pg-btn" disabled={page>=totalPages} onClick={()=>onPage(p=>p+1)}><ChevronRight size={13} /></button>
      </div>
    </div>
  );
}

export { Pagination };

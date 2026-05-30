import { useState, useEffect, useCallback } from 'react';
import { api, fmtDate, fmtDT } from './api.js';
import { useToast } from './Toast.jsx';
import {
  Search, Plus, Edit2, Trash2, X, Check,
  ChevronLeft, ChevronRight, User, Car,
} from 'lucide-react';

// ── Reusable Pagination ───────────────────────────────────────────────────────
function Pagination({ page, total, limit, onChange }) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
      <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{total} total</span>
      <button className="icon-btn" onClick={() => onChange(page - 1)} disabled={page <= 1}><ChevronLeft size={14} /></button>
      {Array.from({ length: Math.min(7, pages) }, (_, i) => {
        let p = i + 1;
        if (pages > 7 && page > 4) { p = page - 3 + i; if (p > pages) return null; }
        return <button key={p} className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onChange(p)} style={{ minWidth: 30, padding: '4px 8px' }}>{p}</button>;
      })}
      <button className="icon-btn" onClick={() => onChange(page + 1)} disabled={page >= pages}><ChevronRight size={14} /></button>
    </div>
  );
}

// ── Confirm Delete ────────────────────────────────────────────────────────────
function ConfirmDelete({ item, label, onConfirm, onCancel }) {
  return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth: 400 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, background: 'var(--red-d)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 size={18} color="var(--red-l)" />
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15 }}>Delete {label}?</p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>This action cannot be undone.</p>
          </div>
        </div>
        <div style={{ background: 'var(--bg-2)', borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: 'var(--text-2)' }}>{item}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// USERS
// ═════════════════════════════════════════════════════════════════════════════
export function UsersView() {
  const toast = useToast();
  const [data,      setData]      = useState([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [search,    setSearch]    = useState('');
  const [companies, setCompanies] = useState([]);
  const [cFilter,   setCFilter]   = useState('');
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [form,      setForm]      = useState({ name: '', employeeId: '', phone: '', licenseNumber: '', companyId: '', isActive: true });
  const [saving,    setSaving]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let qs = `?page=${page}&limit=15`;
      if (search)  qs += '&search=' + encodeURIComponent(search);
      if (cFilter) qs += '&companyId=' + cFilter;
      const r = await api.get('/superadmin/users' + qs);
      setData(r.data); setTotal(r.total);
    } catch {}
    finally { setLoading(false); }
  }, [page, search, cFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, cFilter]);

  useEffect(() => {
    api.get('/superadmin/companies?limit=100').then(r => setCompanies(r.data || [])).catch(() => {});
  }, []);

  function openCreate() { setForm({ name: '', employeeId: '', phone: '', licenseNumber: '', companyId: companies[0]?.id || '', isActive: true }); setModal('create'); }
  function openEdit(u) { setForm({ name: u.name, employeeId: u.employeeId, phone: u.phone, licenseNumber: u.licenseNumber || '', companyId: u.companyId, isActive: u.isActive, _id: u.id }); setModal('edit'); }

  async function save() {
    if (!form.name || !form.employeeId || !form.phone || !form.companyId) { toast('Name, Employee ID, Phone, and Company are required', 'error'); return; }
    setSaving(true);
    try {
      if (modal === 'create') {
        await api.post('/superadmin/users', form);
        toast('User created', 'success');
      } else {
        await api.put(`/superadmin/users/${form._id}`, { name: form.name, phone: form.phone, licenseNumber: form.licenseNumber, isActive: form.isActive });
        toast('User updated', 'success');
      }
      setModal(null); load();
    } catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  }

  async function confirmDelete() {
    try {
      await api.delete(`/superadmin/users/${delTarget.id}`);
      toast('User deleted', 'success');
      setDelTarget(null); load();
    } catch (err) { toast(err.message, 'error'); }
  }

  const fld = (f, v) => setForm(x => ({ ...x, [f]: v }));

  return (
    <div className="content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900 }}>Users (Drivers)</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>{total} drivers across all companies</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={14} /> New User</button>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <div className="search" style={{ flex: 1 }}>
          <Search size={14} />
          <input placeholder="Search by name, employee ID or phone…" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="icon-btn" onClick={() => setSearch('')}><X size={13} /></button>}
        </div>
        <select className="field-input" style={{ width: 200 }} value={cFilter} onChange={e => setCFilter(e.target.value)}>
          <option value="">All Companies</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr><th>User</th><th>Emp ID</th><th>Phone</th><th>Company</th><th>Vehicle</th><th>Status</th><th>Joined</th><th>Last Login</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading
                ? <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32 }}><div className="spin-ring" style={{ margin: '0 auto' }} /></td></tr>
                : data.length === 0
                ? <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)' }}>No users found</td></tr>
                : data.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 30, height: 30, background: 'var(--bg-3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <User size={13} color="var(--text-3)" />
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</p>
                          {u.licenseNumber && <p style={{ fontSize: 11, color: 'var(--text-3)' }}>DL: {u.licenseNumber}</p>}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent-l)' }}>{u.employeeId}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{u.phone}</td>
                    <td><span className="chip chip-blue">{u.companyName}</span></td>
                    <td style={{ fontSize: 12 }}>{u.assignedVehiclePlate ? <span className="chip chip-amber">{u.assignedVehiclePlate}</span> : <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
                    <td><span className={`badge ${u.isActive ? 'chip-green' : 'chip-red'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{fmtDate(u.createdAt)}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{u.lastLogin ? fmtDT(u.lastLogin) : 'Never'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="icon-btn" onClick={() => openEdit(u)}><Edit2 size={14} /></button>
                        <button className="icon-btn danger" onClick={() => setDelTarget(u)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 20px' }}>
          <Pagination page={page} total={total} limit={15} onChange={setPage} />
        </div>
      </div>

      {modal && (
        <div className="overlay">
          <div className="modal">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <p style={{ fontSize: 16, fontWeight: 700 }}>{modal === 'create' ? 'New User' : 'Edit User'}</p>
              <button className="icon-btn" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div className="g2">
              <div className="field"><label className="field-lbl">Full Name *</label><input className="field-input" value={form.name} onChange={e => fld('name', e.target.value)} placeholder="Ravi Singh" /></div>
              {modal === 'create' && <div className="field"><label className="field-lbl">Employee ID *</label><input className="field-input" value={form.employeeId} onChange={e => fld('employeeId', e.target.value)} placeholder="EMP001" /></div>}
              <div className="field"><label className="field-lbl">Phone *</label><input className="field-input" value={form.phone} onChange={e => fld('phone', e.target.value)} placeholder="9876543210" /></div>
              <div className="field"><label className="field-lbl">License Number</label><input className="field-input" value={form.licenseNumber} onChange={e => fld('licenseNumber', e.target.value)} placeholder="DL-0123456789" /></div>
            </div>
            {modal === 'create' && (
              <div className="field">
                <label className="field-lbl">Company *</label>
                <select className="field-input" value={form.companyId} onChange={e => fld('companyId', e.target.value)}>
                  <option value="">Select company…</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            {modal === 'edit' && (
              <div className="field">
                <label className="field-lbl">Status</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[true, false].map(val => (
                    <button key={String(val)} className={`btn btn-sm ${form.isActive === val ? 'btn-primary' : 'btn-ghost'}`} onClick={() => fld('isActive', val)}>
                      {val ? 'Active' : 'Inactive'}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? <><span className="spin-ring" style={{ borderTopColor: '#fff' }} />&nbsp;Saving…</> : <><Check size={14} /> {modal === 'create' ? 'Create' : 'Save'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {delTarget && (
        <ConfirmDelete item={`${delTarget.name} (${delTarget.employeeId}) — ${delTarget.companyName}`}
          label="User" onConfirm={confirmDelete} onCancel={() => setDelTarget(null)} />
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// VEHICLES
// ═════════════════════════════════════════════════════════════════════════════
const FUEL_TYPES = ['Diesel', 'Petrol', 'CNG', 'Electric', 'Other'];
const STATUS_OPTS = ['active', 'inactive', 'maintenance'];

export function VehiclesView() {
  const toast = useToast();
  const [data,      setData]      = useState([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [search,    setSearch]    = useState('');
  const [companies, setCompanies] = useState([]);
  const [cFilter,   setCFilter]   = useState('');
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [form,      setForm]      = useState({ plateNumber: '', make: '', model: '', year: new Date().getFullYear(), fuelType: 'Diesel', status: 'active', companyId: '' });
  const [saving,    setSaving]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let qs = `?page=${page}&limit=15`;
      if (search)  qs += '&search=' + encodeURIComponent(search);
      if (cFilter) qs += '&companyId=' + cFilter;
      const r = await api.get('/superadmin/vehicles' + qs);
      setData(r.data); setTotal(r.total);
    } catch {}
    finally { setLoading(false); }
  }, [page, search, cFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, cFilter]);

  useEffect(() => {
    api.get('/superadmin/companies?limit=100').then(r => setCompanies(r.data || [])).catch(() => {});
  }, []);

  function openCreate() { setForm({ plateNumber: '', make: '', model: '', year: new Date().getFullYear(), fuelType: 'Diesel', status: 'active', companyId: companies[0]?.id || '' }); setModal('create'); }
  function openEdit(v)  { setForm({ plateNumber: v.plateNumber, make: v.make, model: v.model, year: v.year, fuelType: v.fuelType, status: v.status, companyId: v.companyId, _id: v.id }); setModal('edit'); }

  async function save() {
    if (!form.plateNumber || !form.make || !form.model || !form.year || !form.companyId) { toast('All required fields must be filled', 'error'); return; }
    setSaving(true);
    try {
      if (modal === 'create') {
        await api.post('/superadmin/vehicles', form);
        toast('Vehicle created', 'success');
      } else {
        await api.put(`/superadmin/vehicles/${form._id}`, { make: form.make, model: form.model, year: form.year, fuelType: form.fuelType, status: form.status });
        toast('Vehicle updated', 'success');
      }
      setModal(null); load();
    } catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  }

  async function confirmDelete() {
    try {
      await api.delete(`/superadmin/vehicles/${delTarget.id}`);
      toast('Vehicle deleted', 'success');
      setDelTarget(null); load();
    } catch (err) { toast(err.message, 'error'); }
  }

  const fld = (f, v) => setForm(x => ({ ...x, [f]: v }));

  const statusColor = { active: 'chip-green', inactive: 'chip-red', maintenance: 'chip-amber' };

  return (
    <div className="content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900 }}>Vehicles</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>{total} vehicles across all companies</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={14} /> New Vehicle</button>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <div className="search" style={{ flex: 1 }}>
          <Search size={14} />
          <input placeholder="Search by plate, make or model…" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="icon-btn" onClick={() => setSearch('')}><X size={13} /></button>}
        </div>
        <select className="field-input" style={{ width: 200 }} value={cFilter} onChange={e => setCFilter(e.target.value)}>
          <option value="">All Companies</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr><th>Vehicle</th><th>Plate</th><th>Company</th><th>Driver</th><th>Fuel</th><th>Status</th><th>Fills</th><th>Total Cost</th><th>Added</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading
                ? <tr><td colSpan={10} style={{ textAlign: 'center', padding: 32 }}><div className="spin-ring" style={{ margin: '0 auto' }} /></td></tr>
                : data.length === 0
                ? <tr><td colSpan={10} style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)' }}>No vehicles found</td></tr>
                : data.map(v => (
                  <tr key={v.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 30, height: 30, background: 'var(--bg-3)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Car size={13} color="var(--amber-l)" />
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: 13 }}>{v.make} {v.model}</p>
                          <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{v.year}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className="chip chip-amber" style={{ fontFamily: 'var(--mono)' }}>{v.plateNumber}</span></td>
                    <td><span className="chip chip-blue">{v.companyName}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{v.assignedUserName || <span style={{ color: 'var(--text-3)' }}>Unassigned</span>}</td>
                    <td><span className="chip chip-default">{v.fuelType}</span></td>
                    <td><span className={`badge ${statusColor[v.status] || ''}`}>{v.status}</span></td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent-l)' }}>{v.totalFills ?? 0}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--green-l)' }}>₹{(v.totalFuelCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{fmtDate(v.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="icon-btn" onClick={() => openEdit(v)}><Edit2 size={14} /></button>
                        <button className="icon-btn danger" onClick={() => setDelTarget(v)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 20px' }}>
          <Pagination page={page} total={total} limit={15} onChange={setPage} />
        </div>
      </div>

      {modal && (
        <div className="overlay">
          <div className="modal">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <p style={{ fontSize: 16, fontWeight: 700 }}>{modal === 'create' ? 'New Vehicle' : 'Edit Vehicle'}</p>
              <button className="icon-btn" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div className="g2">
              {modal === 'create' && <div className="field"><label className="field-lbl">Plate Number *</label><input className="field-input" value={form.plateNumber} onChange={e => fld('plateNumber', e.target.value.toUpperCase())} placeholder="MH12AB1234" /></div>}
              <div className="field"><label className="field-lbl">Make *</label><input className="field-input" value={form.make} onChange={e => fld('make', e.target.value)} placeholder="Tata" /></div>
              <div className="field"><label className="field-lbl">Model *</label><input className="field-input" value={form.model} onChange={e => fld('model', e.target.value)} placeholder="Ace" /></div>
              <div className="field"><label className="field-lbl">Year *</label><input className="field-input" type="number" min={1990} max={2050} value={form.year} onChange={e => fld('year', parseInt(e.target.value))} /></div>
              <div className="field">
                <label className="field-lbl">Fuel Type</label>
                <select className="field-input" value={form.fuelType} onChange={e => fld('fuelType', e.target.value)}>
                  {FUEL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-lbl">Status</label>
                <select className="field-input" value={form.status} onChange={e => fld('status', e.target.value)}>
                  {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            {modal === 'create' && (
              <div className="field">
                <label className="field-lbl">Company *</label>
                <select className="field-input" value={form.companyId} onChange={e => fld('companyId', e.target.value)}>
                  <option value="">Select company…</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? <><span className="spin-ring" style={{ borderTopColor: '#fff' }} />&nbsp;Saving…</> : <><Check size={14} /> {modal === 'create' ? 'Create' : 'Save'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {delTarget && (
        <ConfirmDelete item={`${delTarget.make} ${delTarget.model} (${delTarget.plateNumber}) — ${delTarget.companyName}`}
          label="Vehicle" onConfirm={confirmDelete} onCancel={() => setDelTarget(null)} />
      )}
    </div>
  );
}

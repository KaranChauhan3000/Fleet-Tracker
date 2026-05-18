// Services.jsx — Admin Services
// Changes from original:
//   • Edit button added to each ServiceCard
//   • EditServiceSheet component added
//   • Backend: PUT /admin/service-logs/:id must be added (see backend/admin.js changes)

import { useState, useEffect, useRef } from 'react';
import { api, fmt, fmtRs, fmtDate, fmtDT, clearAuth } from './api.js';
import { useToast } from './Toast.jsx';
import { Pagination } from './Users.jsx';
import {
  Wrench, Plus, Filter, Trash2,
  Car, User, Calendar, Gauge, IndianRupee, X, CheckCircle, Edit2,
} from 'lucide-react';

const LIMIT = 15;

const SERVICE_TYPES = [
  'Oil Change', 'Tyre Rotation', 'Tyre Replacement', 'Brake Service',
  'Air Filter', 'Battery Replacement', 'Coolant Flush', 'Transmission Service',
  'Wheel Alignment', 'AC Service', 'Engine Tune-up', 'Suspension Check',
  'General Service', 'Other',
];

function getNow() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now - offset).toISOString().slice(0, 16);
}

function toLocalDT(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d - offset).toISOString().slice(0, 16);
}

function toDateInput(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toISOString().slice(0, 10);
}

function getDueStyle(nextServiceDate) {
  if (!nextServiceDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(nextServiceDate); due.setHours(0, 0, 0, 0);
  const days = Math.round((due - today) / 86400000);
  if (days < 0)  return { label: `${Math.abs(days)}d overdue`, color: 'var(--danger)' };
  if (days === 0) return { label: 'Due today', color: 'var(--danger)' };
  if (days <= 3)  return { label: `Due in ${days}d`, color: 'var(--danger)' };
  if (days <= 7)  return { label: `Due in ${days}d`, color: 'var(--warning)' };
  if (days <= 14) return { label: `Due in ${days}d`, color: 'var(--success)' };
  return null;
}

// ─── Service Card ─────────────────────────────────────────────────
function ServiceCard({ log, onDelete, onEdit, toast }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const due = getDueStyle(log.nextServiceDate);

  async function del() {
    setDeleting(true);
    try {
      await api.delete(`/admin/service-logs/${log.id}`);
      toast('Service entry deleted', 'success');
      onDelete();
    } catch (err) { toast(err.message, 'error'); }
    finally { setDeleting(false); setConfirming(false); }
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 11, position: 'relative' }}>
      {confirming && (
        <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-card)', borderRadius: 'var(--radius)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>Delete this service entry?</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>{log.serviceType} · {log.plateNumber}</p>
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setConfirming(false)}>Cancel</button>
            <button className="btn btn-danger" style={{ flex: 1 }} onClick={del} disabled={deleting}>
              {deleting ? <span className="spinner" /> : 'Delete'}
            </button>
          </div>
        </div>
      )}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 40, height: 40, background: 'var(--accent-dim)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Wrench size={18} color="var(--accent)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <p style={{ fontWeight: 900, fontSize: 14, fontFamily: 'var(--font-mono)' }}>{log.plateNumber || '—'}</p>
            {log.cost != null && (
              <p style={{ fontWeight: 800, fontSize: 15, color: 'var(--success)', flexShrink: 0 }}>{fmtRs(log.cost)}</p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-dim)', padding: '2px 8px', borderRadius: 5 }}>
              {log.serviceType}
            </span>
            {due && (
              <span style={{ fontSize: 10, fontWeight: 800, color: due.color, background: `${due.color}18`, padding: '2px 7px', borderRadius: 5, border: `1px solid ${due.color}33` }}>
                {due.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Detail icon={User} label="Driver" value={log.userName || '—'} />
        <Detail icon={Gauge} label="Current KM" value={fmt(log.currentKm, 0) + ' km'} />
        <Detail icon={Calendar} label="Serviced" value={fmtDate(log.servicedAt)} />
        {log.nextServiceDate && <Detail icon={Calendar} label="Next Due" value={fmtDate(log.nextServiceDate)} color={due?.color} />}
        {log.nextServiceKm && <Detail icon={Gauge} label="Next KM" value={fmt(log.nextServiceKm, 0) + ' km'} />}
        {log.vendor && <Detail icon={Wrench} label="Vendor" value={log.vendor} />}
      </div>

      {log.description && (
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-elevated)', borderRadius: 8, padding: '8px 10px' }}>
          {log.description}
        </p>
      )}
      {log.notes && <p style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{log.notes}</p>}

      {/* Actions: Edit + Delete */}
      <div style={{ display: 'flex', gap: 7, borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
        <button onClick={onEdit} className="btn btn-ghost btn-sm" style={{ flex: 1 }}>
          <Edit2 size={12} /> Edit
        </button>
        <button onClick={() => setConfirming(true)} className="btn btn-danger-ghost btn-sm" style={{ flex: 1 }}>
          <Trash2 size={12} /> Delete
        </button>
      </div>
    </div>
  );
}

function Detail({ icon: Icon, label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Icon size={11} color="var(--text-muted)" />
      <div>
        <p style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
        <p style={{ fontSize: 12, fontWeight: 700, color: color || 'var(--text-secondary)' }}>{value}</p>
      </div>
    </div>
  );
}

// ─── Shared Service Form ──────────────────────────────────────────
function ServiceForm({ initialForm, vehicles, users, onSubmit, onClose, saving, title, submitLabel }) {
  const [form, setForm] = useState(initialForm);
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: '18px 18px 0 0', padding: '20px 16px 32px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 16, fontWeight: 900 }}>{title}</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div className="input-group">
          <label className="input-label">Service Date & Time</label>
          <input className="input-field" type="datetime-local" value={form.servicedAt} onChange={e => set('servicedAt', e.target.value)} />
        </div>

        <div className="input-group">
          <label className="input-label">Vehicle *</label>
          <select className="input-field" value={form.vehicleId} onChange={e => set('vehicleId', e.target.value)}>
            <option value="">Select vehicle</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.plateNumber} · {v.make} {v.model}</option>)}
          </select>
        </div>

        <div className="input-group">
          <label className="input-label">Driver / User *</label>
          <select className="input-field" value={form.userId} onChange={e => set('userId', e.target.value)}>
            <option value="">Select user</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name} · {u.employeeId}</option>)}
          </select>
        </div>

        <div className="input-group">
          <label className="input-label">Service Type *</label>
          <select className="input-field" value={form.serviceType} onChange={e => set('serviceType', e.target.value)}>
            <option value="">Select type</option>
            {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="input-group">
          <label className="input-label">Description</label>
          <input className="input-field" type="text" placeholder="e.g. Replaced front brake pads" value={form.description} onChange={e => set('description', e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="input-group">
            <label className="input-label">Current KM *</label>
            <input className="input-field" type="number" placeholder="0" value={form.currentKm} onChange={e => set('currentKm', e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">Cost (₹)</label>
            <input className="input-field" type="number" placeholder="Optional" value={form.cost} onChange={e => set('cost', e.target.value)} />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Vendor / Workshop</label>
          <input className="input-field" type="text" placeholder="Optional" value={form.vendor} onChange={e => set('vendor', e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="input-group">
            <label className="input-label">Next Service Date</label>
            <input className="input-field" type="date" value={form.nextServiceDate} onChange={e => set('nextServiceDate', e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">Next Service KM</label>
            <input className="input-field" type="number" placeholder="Optional" value={form.nextServiceKm} onChange={e => set('nextServiceKm', e.target.value)} />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Notes</label>
          <textarea className="input-field" rows={2} placeholder="Optional notes" value={form.notes} onChange={e => set('notes', e.target.value)} style={{ resize: 'none' }} />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 2 }} disabled={saving} onClick={() => onSubmit(form)}>
            {saving ? <><span className="spinner" />Saving…</> : <><Wrench size={14} />{submitLabel}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddServiceSheet({ vehicles, users, onClose, onSaved, toast }) {
  const [saving, setSaving] = useState(false);

  async function handleSubmit(form) {
    if (!form.vehicleId) { toast('Select a vehicle', 'error'); return; }
    if (!form.userId) { toast('Select a user', 'error'); return; }
    if (!form.serviceType) { toast('Select service type', 'error'); return; }
    if (!form.currentKm || parseFloat(form.currentKm) < 0) { toast('Enter current KM reading', 'error'); return; }
    setSaving(true);
    try {
      await api.post('/admin/service-logs', {
        vehicleId: form.vehicleId, userId: form.userId,
        serviceType: form.serviceType, description: form.description,
        currentKm: parseFloat(form.currentKm),
        cost: form.cost ? parseFloat(form.cost) : null,
        vendor: form.vendor,
        nextServiceDate: form.nextServiceDate || null,
        nextServiceKm: form.nextServiceKm ? parseFloat(form.nextServiceKm) : null,
        notes: form.notes, servicedAt: form.servicedAt,
      });
      toast('Service entry added', 'success'); onSaved();
    } catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  }

  return (
    <ServiceForm
      title="Add Service Entry"
      submitLabel="Add Entry"
      initialForm={{ vehicleId: vehicles.length===1?vehicles[0].id:'', userId:'', serviceType:'', description:'', currentKm:'', cost:'', vendor:'', nextServiceDate:'', nextServiceKm:'', notes:'', servicedAt: getNow() }}
      vehicles={vehicles} users={users}
      onSubmit={handleSubmit} onClose={onClose} saving={saving}
    />
  );
}

// ─── Edit Service Sheet ───────────────────────────────────────────
function EditServiceSheet({ log, vehicles, users, onClose, onSaved, toast }) {
  const [saving, setSaving] = useState(false);

  async function handleSubmit(form) {
    if (!form.vehicleId) { toast('Select a vehicle', 'error'); return; }
    if (!form.userId) { toast('Select a user', 'error'); return; }
    if (!form.serviceType) { toast('Select service type', 'error'); return; }
    if (!form.currentKm) { toast('Enter current KM reading', 'error'); return; }
    setSaving(true);
    try {
      // PUT /admin/service-logs/:id  (see backend changes in admin.js)
      await api.put(`/admin/service-logs/${log.id}`, {
        vehicleId: form.vehicleId, userId: form.userId,
        serviceType: form.serviceType, description: form.description,
        currentKm: parseFloat(form.currentKm),
        cost: form.cost ? parseFloat(form.cost) : null,
        vendor: form.vendor,
        nextServiceDate: form.nextServiceDate || null,
        nextServiceKm: form.nextServiceKm ? parseFloat(form.nextServiceKm) : null,
        notes: form.notes,
        servicedAt: form.servicedAt,
      });
      toast('Service entry updated', 'success'); onSaved();
    } catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  }

  return (
    <ServiceForm
      title="Edit Service Entry"
      submitLabel="Save Changes"
      initialForm={{
        vehicleId: log.vehicleId ? String(log.vehicleId) : '',
        userId: log.userId ? String(log.userId) : '',
        serviceType: log.serviceType || '',
        description: log.description || '',
        currentKm: String(log.currentKm || ''),
        cost: log.cost != null ? String(log.cost) : '',
        vendor: log.vendor || '',
        nextServiceDate: toDateInput(log.nextServiceDate),
        nextServiceKm: log.nextServiceKm != null ? String(log.nextServiceKm) : '',
        notes: log.notes || '',
        servicedAt: toLocalDT(log.servicedAt),
      }}
      vehicles={vehicles} users={users}
      onSubmit={handleSubmit} onClose={onClose} saving={saving}
    />
  );
}

// ─── Filter Sheet ─────────────────────────────────────────────────
function FilterSheet({ filters, vehicles, users, onApply, onClose }) {
  const [f, setF] = useState({ ...filters });
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: '18px 18px 0 0', padding: '20px 16px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 15, fontWeight: 800 }}>Filter Entries</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div className="input-group">
          <label className="input-label">Vehicle</label>
          <select className="input-field" value={f.vehicleId} onChange={e => setF(p => ({ ...p, vehicleId: e.target.value }))}>
            <option value="">All vehicles</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.plateNumber}</option>)}
          </select>
        </div>
        <div className="input-group">
          <label className="input-label">User</label>
          <select className="input-field" value={f.userId} onChange={e => setF(p => ({ ...p, userId: e.target.value }))}>
            <option value="">All users</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => onApply({ vehicleId: '', userId: '' })}>Clear</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onApply(f)}>Apply</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
export default function Services({ admin, onLogout, onNavigate }) {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ vehicleId: '', userId: '' });
  const [showFilter, setShowFilter] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editLog, setEditLog] = useState(null); // service log being edited
  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => { loadMeta(); }, []);
  useEffect(() => { load(page); }, [page, filters]);

  async function loadMeta() {
    try {
      const [vr, ur] = await Promise.all([
        api.get('/admin/vehicles?page=1&limit=200'),
        api.get('/admin/users?page=1&limit=200'),
      ]);
      setVehicles(vr.data || []);
      setUsers(ur.data || []);
    } catch {}
  }

  function buildUrl(p) {
    const q = new URLSearchParams({ page: p, limit: LIMIT });
    if (filters.vehicleId) q.set('vehicleId', filters.vehicleId);
    if (filters.userId) q.set('userId', filters.userId);
    return `/admin/service-logs?${q}`;
  }

  async function load(p = page) {
    setLoading(true);
    try {
      const res = await api.get(buildUrl(p));
      setLogs(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      if (err.message.includes('401')) { clearAuth(); onLogout(); }
      toast(err.message, 'error');
    } finally { setLoading(false); }
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const hasFilters = filters.vehicleId || filters.userId;

  return (
    <div className="page-wrapper page-enter">
      <div className="page-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: 'var(--accent-dim)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wrench size={16} color="var(--accent)" />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800 }}>Services</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{total} entries · newest first</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          <button
            className="btn-icon"
            onClick={() => setShowFilter(true)}
            style={{ color: hasFilters ? 'var(--accent-light)' : 'var(--text-secondary)', borderColor: hasFilters ? 'var(--accent)' : undefined }}
          >
            <Filter size={14} />
          </button>
          <button className="btn btn-primary btn-sm" style={{ width: 'auto', padding: '8px 12px' }} onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      <div className="page-content">
        {hasFilters && (
          <div style={{ background: 'var(--accent-dim)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>Filters active</span>
            <button onClick={() => setFilters({ vehicleId: '', userId: '' })} style={{ background: 'none', fontSize: 12, color: 'var(--text-secondary)' }}>Clear all</button>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><span className="spinner" style={{ width: 28, height: 28 }} /></div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <Wrench size={36} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
            <p className="empty-title">No service entries</p>
            <p className="empty-desc">Tap + Add to log a service</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {logs.map(log => (
                <ServiceCard
                  key={log.id}
                  log={log}
                  onDelete={() => load(page)}
                  onEdit={() => setEditLog(log)}
                  toast={toast}
                />
              ))}
            </div>
            <Pagination page={page} total={total} limit={LIMIT} totalPages={totalPages} onPage={setPage} />
          </>
        )}
      </div>

      {showFilter && (
        <FilterSheet
          filters={filters} vehicles={vehicles} users={users}
          onApply={f => { setFilters(f); setPage(1); setShowFilter(false); }}
          onClose={() => setShowFilter(false)}
        />
      )}
      {showAdd && (
        <AddServiceSheet
          vehicles={vehicles} users={users}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load(1); setPage(1); }}
          toast={toast}
        />
      )}
      {editLog && (
        <EditServiceSheet
          log={editLog}
          vehicles={vehicles} users={users}
          onClose={() => setEditLog(null)}
          onSaved={() => { setEditLog(null); load(page); }}
          toast={toast}
        />
      )}
    </div>
  );
}

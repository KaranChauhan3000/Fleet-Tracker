import { useState, useEffect } from 'react';
import { api, fmt, fmtRs, fmtDate, fmtDT } from './api.js';
import { useToast } from './Toast.jsx';
import {
  Wrench, Plus, Calendar, Gauge, IndianRupee,
  CheckCircle, ChevronLeft, ChevronRight, X, Car,
} from 'lucide-react';

const SERVICE_TYPES = [
  'Oil Change', 'Tyre Rotation', 'Tyre Replacement', 'Brake Service',
  'Air Filter', 'Battery Replacement', 'Coolant Flush', 'Transmission Service',
  'Wheel Alignment', 'AC Service', 'Engine Tune-up', 'Suspension Check',
  'General Service', 'Other',
];

const LIMIT = 15;

function getNow() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now - offset).toISOString().slice(0, 16);
}

function getDueStyle(nextServiceDate) {
  if (!nextServiceDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(nextServiceDate); due.setHours(0, 0, 0, 0);
  const days = Math.round((due - today) / 86400000);
  if (days < 0)   return { label: `${Math.abs(days)}d overdue`, color: '#ef4444' };
  if (days === 0)  return { label: 'Due today',                  color: '#ef4444' };
  if (days <= 3)   return { label: `Due in ${days}d`,            color: '#ef4444' };
  if (days <= 7)   return { label: `Due in ${days}d`,            color: '#f59e0b' };
  if (days <= 14)  return { label: `Due in ${days}d`,            color: '#22c55e' };
  return null;
}

// ─── Service Card ─────────────────────────────────────────────────
function ServiceCard({ log }) {
  const due = getDueStyle(log.nextServiceDate);
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 40, height: 40, background: 'var(--accent-dim)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Wrench size={18} color="var(--accent)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <p style={{ fontWeight: 900, fontSize: 14, fontFamily: 'var(--font-mono)' }}>{log.plateNumber || '—'}</p>
            {log.cost != null && (
              <p style={{ fontWeight: 800, fontSize: 15, color: '#22c55e', flexShrink: 0 }}>{fmtRs(log.cost)}</p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-light)', background: 'var(--accent-dim)', padding: '2px 8px', borderRadius: 5 }}>
              {log.serviceType}
            </span>
            {due && (
              <span style={{ fontSize: 10, fontWeight: 800, color: due.color, background: `${due.color}18`, padding: '2px 7px', borderRadius: 5, border: `1px solid ${due.color}40` }}>
                {due.label}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Serviced</p>
          <p style={{ fontSize: 12, fontWeight: 700 }}>{fmtDate(log.servicedAt)}</p>
        </div>
        <div>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Current KM</p>
          <p style={{ fontSize: 12, fontWeight: 700 }}>{fmt(log.currentKm, 0)} km</p>
        </div>
        {log.nextServiceDate && (
          <div>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Next Due</p>
            <p style={{ fontSize: 12, fontWeight: 700, color: due?.color }}>{fmtDate(log.nextServiceDate)}</p>
          </div>
        )}
        {log.nextServiceKm && (
          <div>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Next KM</p>
            <p style={{ fontSize: 12, fontWeight: 700 }}>{fmt(log.nextServiceKm, 0)} km</p>
          </div>
        )}
        {log.vendor && (
          <div style={{ gridColumn: '1 / -1' }}>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Vendor</p>
            <p style={{ fontSize: 12, fontWeight: 700 }}>{log.vendor}</p>
          </div>
        )}
      </div>

      {log.description && (
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-elevated)', borderRadius: 8, padding: '8px 10px' }}>
          {log.description}
        </p>
      )}

      <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmtDT(log.servicedAt)}</p>
    </div>
  );
}

// ─── Add Service Sheet ────────────────────────────────────────────
function AddServiceSheet({ vehicles, onClose, onSaved, toast }) {
  const [form, setForm] = useState({
    vehicleId: vehicles.length === 1 ? vehicles[0].id : '',
    serviceType: '',
    description: '',
    currentKm: '',
    cost: '',
    vendor: '',
    nextServiceDate: '',
    nextServiceKm: '',
    notes: '',
    servicedAt: getNow(),
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit() {
    if (!form.vehicleId) { toast('Select a vehicle', 'error'); return; }
    if (!form.serviceType) { toast('Select service type', 'error'); return; }
    if (!form.currentKm || parseFloat(form.currentKm) < 0) { toast('Enter current KM reading', 'error'); return; }

    setLoading(true);
    try {
      await api.post('/user/service-logs', {
        vehicleId: form.vehicleId,
        serviceType: form.serviceType,
        description: form.description,
        currentKm: parseFloat(form.currentKm),
        cost: form.cost ? parseFloat(form.cost) : null,
        vendor: form.vendor,
        nextServiceDate: form.nextServiceDate || null,
        nextServiceKm: form.nextServiceKm ? parseFloat(form.nextServiceKm) : null,
        notes: form.notes,
        servicedAt: form.servicedAt,
      });
      setSubmitted(true);
    } catch (err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  }

  if (submitted) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: '18px 18px 0 0', padding: '36px 16px 48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 56, height: 56, background: 'var(--success-dim)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={28} color="var(--success)" />
          </div>
          <p style={{ fontSize: 17, fontWeight: 900 }}>Service Logged!</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>Your service entry has been saved successfully.</p>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={onSaved}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: '18px 18px 0 0', padding: '20px 16px 32px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 16, fontWeight: 900 }}>Log Service</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div className="input-group">
          <label className="input-label">Service Date & Time</label>
          <input className="input-field" type="datetime-local" value={form.servicedAt} onChange={e => set('servicedAt', e.target.value)} />
        </div>

        {vehicles.length > 1 && (
          <div className="input-group">
            <label className="input-label">Vehicle *</label>
            <select className="input-field" value={form.vehicleId} onChange={e => set('vehicleId', e.target.value)}>
              <option value="">Select vehicle</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.plateNumber} · {v.make} {v.model}</option>)}
            </select>
          </div>
        )}
        {vehicles.length === 1 && (
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Car size={14} color="var(--accent)" />
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{vehicles[0].plateNumber}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{vehicles[0].make} {vehicles[0].model}</span>
          </div>
        )}

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
          <input className="input-field" type="text" placeholder="e.g. Sharma Auto Works" value={form.vendor} onChange={e => set('vendor', e.target.value)} />
        </div>

        <div style={{ height: 1, background: 'var(--border)' }} />
        <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Next Service Reminder</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="input-group">
            <label className="input-label">Next Due Date</label>
            <input className="input-field" type="date" value={form.nextServiceDate} onChange={e => set('nextServiceDate', e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">Next Due KM</label>
            <input className="input-field" type="number" placeholder="e.g. 55000" value={form.nextServiceKm} onChange={e => set('nextServiceKm', e.target.value)} />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Notes</label>
          <input className="input-field" type="text" placeholder="Any extra notes" value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>

        <button className="btn btn-primary" onClick={submit} disabled={loading} style={{ marginTop: 4 }}>
          {loading ? <><span className="spinner" /> Saving...</> : <><CheckCircle size={15} /> Save Service Entry</>}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
export default function Services({ user, onBack }) {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => { loadVehicles(); }, []);
  useEffect(() => { load(page); }, [page]);

  async function loadVehicles() {
    try {
      const data = await api.get('/user/vehicles');
      setVehicles(data || []);
    } catch {}
  }

  async function load(p = page) {
    setLoading(true);
    try {
      const res = await api.get(`/user/service-logs?page=${p}&limit=${LIMIT}`);
      setLogs(res.data || []);
      setTotal(res.total || 0);
    } catch (err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="page-wrapper page-enter">
      <div className="page-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
            <ChevronLeft size={20} />
          </button>
          <div style={{ width: 32, height: 32, background: 'var(--accent-dim)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wrench size={16} color="var(--accent)" />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800 }}>Services</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{total} entries</p>
          </div>
        </div>
        <button className="btn btn-primary btn-sm" style={{ width: 'auto', padding: '8px 12px' }} onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Log
        </button>
      </div>

      <div className="page-content">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><span className="spinner" style={{ width: 28, height: 28 }} /></div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <Wrench size={36} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
            <p className="empty-title">No service entries</p>
            <p className="empty-sub">Tap Log to add your first service</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {logs.map(log => <ServiceCard key={log.id} log={log} />)}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '8px 0' }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ background: 'none', border: 'none', color: page === 1 ? 'var(--text-muted)' : 'var(--accent)', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ background: 'none', border: 'none', color: page === totalPages ? 'var(--text-muted)' : 'var(--accent)', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showAdd && (
        <AddServiceSheet
          vehicles={vehicles}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load(1); setPage(1); }}
          toast={toast}
        />
      )}
    </div>
  );
}

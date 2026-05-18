// MonthlyFuelLogs.jsx
// Opened from Dashboard by clicking "Fuel Spend" or "Fuel Logs" stat cards.
// Uses the same rich card style as FuelLogs.jsx.
// Stats (spend / litres / fills) come from a backend aggregate so they are
// always correct for the whole month, not just the current page.

import { useState, useEffect } from 'react';
import { api, fmt, fmtRs, fmtDT, clearAuth } from './api.js';
import { useToast } from './Toast.jsx';
import {
  Fuel, ChevronLeft, ChevronRight, ArrowLeft,
  IndianRupee, Droplets, Hash,
  Gauge, TrendingUp, MapPin, Trash2, Edit2,
} from 'lucide-react';
import { Pagination } from './Users.jsx';

const LIMIT = 20;
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function pad(n) { return String(n).padStart(2, '0'); }

function monthRange(year, month) {
  const from = `${year}-${pad(month)}-01`;
  const last  = new Date(year, month, 0).getDate();
  const to    = `${year}-${pad(month)}-${pad(last)}`;
  return { from, to };
}

// ── Shared helpers (mirrored from FuelLogs.jsx) ───────────────────
function toLocalDT(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d - offset).toISOString().slice(0, 16);
}
function getNow() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now - offset).toISOString().slice(0, 16);
}

// ── MetaChip ───────────────────────────────────────────────────────
function MetaChip({ icon: Icon, label, value, color = 'var(--text-primary)' }) {
  return (
    <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '7px 8px' }}>
      <p style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ fontSize: 12, fontWeight: 700, color, marginTop: 2, fontFamily: 'var(--font-mono)' }}>{value || '—'}</p>
    </div>
  );
}

// ── ConfirmSheet ───────────────────────────────────────────────────
function ConfirmSheet({ message, onConfirm, onCancel }) {
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div style={{ padding: '8px 16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', textAlign: 'center', paddingTop: 8 }}>
            <div style={{ width: 48, height: 48, background: 'var(--danger-dim)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={22} color="var(--danger)" />
            </div>
            <p style={{ fontSize: 16, fontWeight: 700 }}>Delete Entry?</p>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>{message}</p>
          </div>
          <div style={{ display: 'flex', gap: 9 }}>
            <button className="btn btn-ghost" onClick={onCancel} style={{ flex: 1 }}>Cancel</button>
            <button className="btn btn-danger" onClick={onConfirm} style={{ flex: 1 }}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Rich LogCard (same as FuelLogs.jsx) ───────────────────────────
function LogCard({ log, serial, onRefresh, onEdit, toast, onNavigate }) {
  const [confirming, setConfirming] = useState(false);

  async function del() {
    try { await api.delete(`/admin/fuel-logs/${log.id}`); toast('Entry deleted', 'success'); onRefresh(); }
    catch (err) { toast(err.message, 'error'); }
    finally { setConfirming(false); }
  }

  function goToAnalytics(e) {
    e.stopPropagation();
    if (onNavigate && log.vehicleId) onNavigate('vehicleAnalytics', log.vehicleId);
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {confirming && (
        <ConfirmSheet
          message={`This will permanently remove the fuel entry for ${log.vehiclePlate || 'this vehicle'}.`}
          onConfirm={del}
          onCancel={() => setConfirming(false)}
        />
      )}

      {/* Header row */}
      <div onClick={goToAnalytics} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: onNavigate && log.vehicleId ? 'pointer' : 'default' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 38, height: 38, background: 'var(--warning-dim)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Fuel size={17} color="var(--warning)" />
          </div>
          {serial != null && (
            <div style={{
              position: 'absolute', top: -6, left: -6,
              width: 18, height: 18, borderRadius: 6,
              background: 'var(--bg-card)', border: '1.5px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 9, fontWeight: 900, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {serial}
              </span>
            </div>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontWeight: 800, fontSize: 14, fontFamily: 'var(--font-mono)' }}>{log.vehiclePlate || '—'}</p>
            <p style={{ fontWeight: 900, fontSize: 16, color: 'var(--success)' }}>{fmtRs(log.totalCost)}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.userName} · {fmtDT(log.filledAt)}</p>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{fmt(log.litres, 2)}L @ ₹{fmt(log.costPerLitre, 2)}</p>
          </div>
        </div>
      </div>

      {/* Metrics chips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7 }}>
        <MetaChip icon={Gauge} label="Odometer" value={log.odometer?.toLocaleString() + 'km'} />
        {log.kmDriven != null && log.kmDriven > 0 && <MetaChip icon={TrendingUp} label="KM Driven" value={fmt(log.kmDriven, 0) + ' km'} color="var(--warning)" />}
        {log.efficiency != null && log.efficiency > 0 && <MetaChip icon={TrendingUp} label="km/L" value={fmt(log.efficiency, 1)} color={log.efficiency >= 8 ? 'var(--success)' : log.efficiency >= 5 ? 'var(--warning)' : 'var(--danger)'} />}
      </div>

      {log.fuelStation && (
        <p style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <MapPin size={10} /> {log.fuelStation}
        </p>
      )}
      {log.notes && (
        <p style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>"{log.notes}"</p>
      )}

      {/* Edit + Delete */}
      <div style={{ display: 'flex', gap: 7, alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
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

// ── LogForm (shared by EditLogSheet) ──────────────────────────────
function LogForm({ initialForm, vehicles, users, onSubmit, onClose, saving, title, submitLabel }) {
  const [form, setForm] = useState(initialForm);

  function handleChange(k, val) {
    setForm(f => {
      const next = { ...f, [k]: val };
      const l = parseFloat(k === 'litres' ? val : next.litres);
      const r = parseFloat(k === 'costPerLitre' ? val : next.costPerLitre);
      const t = parseFloat(k === 'totalCost' ? val : next.totalCost);
      const hasL = !isNaN(l) && l > 0, hasR = !isNaN(r) && r > 0, hasT = !isNaN(t) && t > 0;
      if (k === 'litres') {
        if (hasL && hasR) next.totalCost = (l * r).toFixed(2);
        else if (hasL && hasT) next.costPerLitre = (t / l).toFixed(4);
      } else if (k === 'costPerLitre') {
        if (hasR && hasL) next.totalCost = (l * r).toFixed(2);
        else if (hasR && hasT) next.litres = (t / r).toFixed(2);
      } else if (k === 'totalCost') {
        if (hasT && hasL) next.costPerLitre = (t / l).toFixed(4);
        else if (hasT && hasR) next.litres = (t / r).toFixed(2);
      }
      return next;
    });
  }

  const displayTotal = parseFloat(form.totalCost) || (form.litres && form.costPerLitre ? parseFloat(form.litres) * parseFloat(form.costPerLitre) : 0);

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="sheet-handle" />
        <p className="sheet-title">{title}</p>
        <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="input-group"><label className="input-label">Vehicle *</label>
              <select className="input-field" value={form.vehicleId} onChange={e => handleChange('vehicleId', e.target.value)}>
                <option value="">Select</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.plateNumber}</option>)}
              </select>
            </div>
            <div className="input-group"><label className="input-label">User *</label>
              <select className="input-field" value={form.userId} onChange={e => handleChange('userId', e.target.value)}>
                <option value="">Select</option>
                {users.filter(u => u.isActive || (u.id === form.userId)).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="input-group"><label className="input-label">Fill Date & Time</label>
            <input className="input-field" type="datetime-local" value={form.filledAt} onChange={e => handleChange('filledAt', e.target.value)} />
          </div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: -4 }}>Fill any 2 — third auto-calculates</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="input-group"><label className="input-label">Litres</label>
              <input className="input-field" type="number" step="0.01" min="0.1" value={form.litres} onChange={e => handleChange('litres', e.target.value)} placeholder="35.5" />
            </div>
            <div className="input-group"><label className="input-label">₹/Litre</label>
              <input className="input-field" type="number" step="0.01" min="0.01" value={form.costPerLitre} onChange={e => handleChange('costPerLitre', e.target.value)} placeholder="94.50" />
            </div>
          </div>
          <div className="input-group"><label className="input-label">Total Cost (₹)</label>
            <input className="input-field" type="number" step="0.01" min="0.01" value={form.totalCost} onChange={e => handleChange('totalCost', e.target.value)} placeholder="e.g. 3354.75" />
          </div>
          {displayTotal > 0 && (
            <div style={{ background: 'var(--success-dim)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '10px 12px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Total Cost</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--success)' }}>₹{fmt(displayTotal)}</span>
            </div>
          )}
          <div className="input-group"><label className="input-label">Odometer (km) *</label>
            <input className="input-field" type="number" step="1" min="0" value={form.odometer} onChange={e => handleChange('odometer', e.target.value)} placeholder="Current km reading" />
          </div>
          <div className="input-group"><label className="input-label">Fuel Station</label>
            <input className="input-field" value={form.fuelStation} onChange={e => handleChange('fuelStation', e.target.value)} placeholder="Optional" />
          </div>
          <div className="input-group"><label className="input-label">Notes</label>
            <textarea className="input-field" rows={2} value={form.notes} onChange={e => handleChange('notes', e.target.value)} placeholder="Optional notes" style={{ resize: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: 9, marginTop: 4 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2 }}>
              {saving ? <><span className="spinner" />Saving...</> : <><Fuel size={14} />{submitLabel}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── EditLogSheet ───────────────────────────────────────────────────
function EditLogSheet({ log, vehicles, users, onClose, onSaved, toast }) {
  const [saving, setSaving] = useState(false);

  async function handleSubmit(form) {
    if (!form.vehicleId || !form.userId) { toast('Select vehicle and user', 'error'); return; }
    if (!form.litres || !form.costPerLitre || !form.odometer) { toast('Litres, cost and odometer required', 'error'); return; }
    setSaving(true);
    try {
      await api.put(`/admin/fuel-logs/${log.id}`, {
        litres: parseFloat(form.litres),
        costPerLitre: parseFloat(form.costPerLitre),
        odometer: parseFloat(form.odometer),
        fuelStation: form.fuelStation,
        notes: form.notes,
        filledAt: new Date(form.filledAt).toISOString(),
      });
      toast('Fuel entry updated', 'success');
      onSaved();
    } catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  }

  return (
    <LogForm
      title="Edit Fuel Entry"
      submitLabel="Save Changes"
      initialForm={{
        vehicleId: log.vehicleId || '',
        userId: log.userId || '',
        litres: String(log.litres || ''),
        costPerLitre: String(log.costPerLitre || ''),
        totalCost: String(log.totalCost || ''),
        odometer: String(log.odometer || ''),
        fuelStation: log.fuelStation || '',
        notes: log.notes || '',
        filledAt: toLocalDT(log.filledAt),
      }}
      vehicles={vehicles}
      users={users}
      onSubmit={handleSubmit}
      onClose={onClose}
      saving={saving}
    />
  );
}

// ── Main Component ─────────────────────────────────────────────────
export default function MonthlyFuelLogs({ admin, onLogout, onNavigate, initialMonth }) {
  const toast = useToast();
  const now = new Date();

  const [year,  setYear]  = useState(initialMonth?.year  ?? now.getFullYear());
  const [month, setMonth] = useState(initialMonth?.month ?? now.getMonth() + 1);

  const [logs,    setLogs]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);

  // Aggregate stats — fetched separately so they cover the whole month,
  // not just the current page.
  const [stats, setStats] = useState({ spend: 0, litres: 0, fills: 0 });

  // Vehicles + users for the edit sheet
  const [vehicles, setVehicles] = useState([]);
  const [users,    setUsers]    = useState([]);

  // Edit state
  const [editLog, setEditLog] = useState(null);

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  // Load vehicles + users once
  useEffect(() => {
    (async () => {
      try {
        const [vr, ur] = await Promise.all([
          api.get('/admin/vehicles?page=1&limit=200'),
          api.get('/admin/users?page=1&limit=200'),
        ]);
        setVehicles(vr.data || []);
        setUsers(ur.data || []);
      } catch {}
    })();
  }, []);

  // Reload when month changes
  useEffect(() => { load(1); }, [year, month]);

  async function load(p = 1) {
    setLoading(true);
    const { from, to } = monthRange(year, month);
    try {
      // Logs (paginated) + aggregate stats in parallel
      const [res, agg] = await Promise.all([
        api.get(`/admin/fuel-logs?page=${p}&limit=${LIMIT}&from=${from}&to=${to}`),
        api.get(`/admin/fuel-logs/stats?from=${from}&to=${to}`),
      ]);

      setLogs(res.data ?? []);
      setTotal(res.total ?? 0);
      setPage(p);
      setStats({
        spend:  agg.spend  ?? 0,
        litres: agg.litres ?? 0,
        fills:  agg.fills  ?? 0,
      });
    } catch (err) {
      if (err.message?.includes('401')) { clearAuth(); onLogout(); }
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else { setMonth(m => m - 1); }
  }
  function nextMonth() {
    if (isCurrentMonth) return;
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else { setMonth(m => m + 1); }
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="page-wrapper page-enter">

      {/* Header */}
      <div className="page-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn-icon" onClick={() => onNavigate('dashboard')} style={{ marginRight: 2 }}>
            <ArrowLeft size={16} />
          </button>
          <div style={{ width: 32, height: 32, background: 'var(--warning-dim)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Fuel size={16} color="var(--warning)" />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Fuel Logs</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
              {isCurrentMonth ? 'This month' : `${MONTH_NAMES[month - 1]} ${year}`}
            </p>
          </div>
        </div>
      </div>

      <div className="page-content">

        {/* Month navigator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 16px' }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: 4 }}>
            <ChevronLeft size={18} />
          </button>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {MONTH_NAMES[month - 1]} {year}
            </p>
            {isCurrentMonth && (
              <p style={{ fontSize: 11, color: 'var(--accent)', margin: 0, fontWeight: 600 }}>Current month</p>
            )}
          </div>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            style={{ background: 'none', border: 'none', cursor: isCurrentMonth ? 'not-allowed' : 'pointer', color: isCurrentMonth ? 'var(--border)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: 4 }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Summary stats — always whole-month totals */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <div className="stat-card" style={{ cursor: 'default' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <IndianRupee size={13} color="var(--success)" />
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Spend</span>
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--success)' }}>₹{fmt(stats.spend, 0)}</span>
          </div>
          <div className="stat-card" style={{ cursor: 'default' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <Droplets size={13} color="var(--warning)" />
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Litres</span>
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--warning)' }}>{fmt(stats.litres, 1)}L</span>
          </div>
          <div className="stat-card" style={{ cursor: 'default' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <Hash size={13} color="var(--accent)" />
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fills</span>
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent)' }}>{stats.fills}</span>
          </div>
        </div>

        {/* Logs list */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <span className="spinner" style={{ width: 28, height: 28 }} />
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <Fuel size={36} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
            <p className="empty-title">No fuel logs</p>
            <p className="empty-sub">No entries for {MONTH_NAMES[month - 1]} {year}</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {logs.map((log, i) => (
                <LogCard
                  key={log.id}
                  log={log}
                  serial={(page - 1) * LIMIT + i + 1}
                  onRefresh={() => load(page)}
                  onEdit={() => setEditLog(log)}
                  toast={toast}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
            <Pagination page={page} total={total} limit={LIMIT} totalPages={totalPages} onPage={p => load(p)} />
          </>
        )}
      </div>

      {editLog && (
        <EditLogSheet
          log={editLog}
          vehicles={vehicles}
          users={users}
          onClose={() => setEditLog(null)}
          onSaved={() => { setEditLog(null); load(page); }}
          toast={toast}
        />
      )}
    </div>
  );
}
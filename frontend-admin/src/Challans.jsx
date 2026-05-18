// Challans.jsx — Admin Challans
// Changes from original:
//   • Vehicle quick-select dropdown at top of page (2-click filter by vehicle)
//   • Edit button added to each ChallanCard
//   • EditChallanSheet component added
//   • Backend: PATCH /admin/challans/:id already supports all fields

import { useState, useEffect, useMemo, useCallback } from 'react';
import { api, fmt, fmtRs, fmtDate, clearAuth } from './api.js';
import { useToast } from './Toast.jsx';
import { Pagination } from './Users.jsx';
import {
  FileText, Plus, Filter, Trash2, CheckCircle,
  AlertTriangle, Clock, MapPin, Hash, User, ChevronDown,
  ClipboardPaste, RotateCcw, Sparkles, Zap, Edit2, Car,
} from 'lucide-react';

const LIMIT = 15;

const OFFENCES = [
  'Overspeeding', 'Red Light Jumping', 'No Parking', 'Wrong Side Driving',
  'No Seat Belt', 'Mobile Usage While Driving', 'Overloading', 'No Helmet',
  'Drunk Driving', 'Document Violation', 'Lane Violation', 'No Horn',
  'Illegal Parking', 'Reckless Driving', 'Other',
];

// ─── Status helpers ───────────────────────────────────────────────
function getStatusStyle(status) {
  if (status === 'paid')     return { bg: 'var(--success-dim)',  color: 'var(--success)',  label: 'Paid'     };
  if (status === 'disputed') return { bg: 'var(--warning-dim)',  color: 'var(--warning)',  label: 'Disputed' };
  return                            { bg: 'var(--danger-dim)',   color: 'var(--danger)',   label: 'Unpaid'   };
}

function getDueStyle(dueDate, status) {
  if (status === 'paid') return null;
  if (!dueDate) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const due   = new Date(dueDate); due.setHours(0,0,0,0);
  const days  = Math.round((due - today) / 86400000);
  if (days < 0)  return { label: `${Math.abs(days)}d overdue`, color: 'var(--danger)' };
  if (days === 0) return { label: 'Due today',                  color: 'var(--danger)' };
  if (days <= 3)  return { label: `Due in ${days}d`,            color: 'var(--danger)' };
  if (days <= 7)  return { label: `Due in ${days}d`,            color: 'var(--warning)' };
  return null;
}

// ─── Summary strip ────────────────────────────────────────────────
function SummaryStrip({ summary }) {
  if (!summary) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
      <SummaryTile label="Unpaid"   count={summary.unpaid?.count||0}   amount={summary.unpaid?.total||0}   color="var(--danger)"  dim="var(--danger-dim)"  />
      <SummaryTile label="Paid"     count={summary.paid?.count||0}     amount={summary.paid?.total||0}     color="var(--success)" dim="var(--success-dim)" />
      <SummaryTile label="Disputed" count={summary.disputed?.count||0} amount={summary.disputed?.total||0} color="var(--warning)" dim="var(--warning-dim)" />
    </div>
  );
}

function SummaryTile({ label, count, amount, color, dim }) {
  return (
    <div style={{ background: dim, border: `1px solid ${color}33`, borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
      <p style={{ fontSize: 9, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      <p style={{ fontSize: 17, fontWeight: 900, color, fontFamily: 'var(--font-mono)', marginTop: 2 }}>{count}</p>
      <p style={{ fontSize: 10, color, opacity: 0.7, marginTop: 1 }}>₹{fmt(amount, 0)}</p>
    </div>
  );
}

// ─── Challan card ─────────────────────────────────────────────────
function ChallanCard({ challan, onStatusChange, onDelete, onEdit, toast }) {
  const [actioning, setActioning] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const st  = getStatusStyle(challan.status);
  const due = getDueStyle(challan.dueDate, challan.status);

  async function changeStatus(newStatus) {
    setShowStatusMenu(false);
    if (newStatus === challan.status) return;
    setActioning(true);
    try {
      await api.patch(`/admin/challans/${challan.id}`, { status: newStatus });
      toast(`Marked as ${newStatus}`, 'success');
      onStatusChange();
    } catch(err) { toast(err.message, 'error'); }
    finally { setActioning(false); }
  }

  async function del() {
    setConfirming(false);
    setActioning(true);
    try {
      await api.delete(`/admin/challans/${challan.id}`);
      toast('Challan deleted', 'success');
      onDelete();
    } catch(err) { toast(err.message, 'error'); }
    finally { setActioning(false); }
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
      {confirming && <DeleteConfirm challanNo={challan.challanNo} offence={challan.offence} onConfirm={del} onCancel={() => setConfirming(false)} />}

      {/* Top row — plate + amount + status */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 40, height: 40, background: st.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${st.color}33` }}>
          <FileText size={18} color={st.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <p style={{ fontWeight: 900, fontSize: 15, fontFamily: 'var(--font-mono)', letterSpacing: '0.03em' }}>
              {challan.plateNumber || '—'}
            </p>
            <p style={{ fontWeight: 900, fontSize: 17, color: challan.status === 'paid' ? 'var(--success)' : 'var(--danger)' }}>
              {fmtRs(challan.amount)}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>
              {challan.vehicleMake} {challan.vehicleModel}
            </span>
            {challan.challanNo && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Hash size={9} /> {challan.challanNo}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Offence row */}
      <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <AlertTriangle size={13} color="var(--warning)" />
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{challan.offence}</p>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{fmtDate(challan.issuedAt)}</p>
      </div>

      {/* Meta chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {challan.driverName && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
            <User size={10} /> {challan.driverName} ({challan.driverEmpId})
          </span>
        )}
        {challan.location && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
            <MapPin size={10} /> {challan.location}
          </span>
        )}
        {challan.dueDate && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: due ? due.color : 'var(--text-muted)' }}>
            <Clock size={10} /> {due ? due.label : `Due ${fmtDate(challan.dueDate)}`}
          </span>
        )}
      </div>

      {challan.notes && (
        <p style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
          "{challan.notes}"
        </p>
      )}

      {/* Actions row: status dropdown + Edit + Delete */}
      <div style={{ display: 'flex', gap: 7, alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
        {/* Status dropdown */}
        <div style={{ position: 'relative', flex: 1 }}>
          <button
            onClick={() => setShowStatusMenu(s => !s)}
            disabled={actioning}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: st.bg, border: `1px solid ${st.color}44`, borderRadius: 8,
              padding: '7px 11px', color: st.color, fontWeight: 700, fontSize: 12,
              cursor: 'pointer', gap: 6, transition: 'all 0.15s',
            }}
          >
            <span>{actioning ? 'Updating…' : st.label}</span>
            <ChevronDown size={13} />
          </button>
          {showStatusMenu && (
            <div style={{
              position: 'absolute', bottom: '110%', left: 0, right: 0,
              background: 'var(--bg-elevated)', border: '1px solid var(--border-active)',
              borderRadius: 10, overflow: 'hidden', zIndex: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}>
              {['unpaid', 'paid', 'disputed'].map(s => {
                const { bg, color, label } = getStatusStyle(s);
                return (
                  <button
                    key={s}
                    onClick={() => changeStatus(s)}
                    style={{
                      width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
                      background: s === challan.status ? bg : 'transparent',
                      border: 'none', borderBottom: '1px solid var(--border)',
                      color: s === challan.status ? color : 'var(--text-secondary)',
                      fontSize: 13, fontWeight: s === challan.status ? 700 : 500,
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                    {label}
                    {s === challan.status && <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.6 }}>Current</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Edit button */}
        <button
          onClick={onEdit}
          disabled={actioning}
          className="btn btn-ghost btn-sm"
          style={{ padding: '7px 11px', width: 'auto', flexShrink: 0 }}
        >
          <Edit2 size={13} />
        </button>

        {/* Delete button */}
        <button
          onClick={() => setConfirming(true)}
          disabled={actioning}
          className="btn btn-danger-ghost btn-sm"
          style={{ padding: '7px 11px', width: 'auto', flexShrink: 0 }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function DeleteConfirm({ challanNo, offence, onConfirm, onCancel }) {
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div style={{ padding: '8px 16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', textAlign: 'center', paddingTop: 8 }}>
            <div style={{ width: 52, height: 52, background: 'var(--danger-dim)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={24} color="var(--danger)" />
            </div>
            <p style={{ fontSize: 17, fontWeight: 800 }}>Delete Challan?</p>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Permanently remove <strong style={{ color: 'var(--text-primary)' }}>{offence}</strong>
              {challanNo ? ` (${challanNo})` : ''}. This cannot be undone.
            </p>
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

// ─── Edit Challan Sheet ───────────────────────────────────────────
function EditChallanSheet({ challan, vehicles, users, onClose, onSaved, toast }) {
  const [form, setForm] = useState({
    vehicleId: challan.vehicleId ? String(challan.vehicleId) : '',
    driverId: challan.driverId ? String(challan.driverId) : '',
    challanNo: challan.challanNo || '',
    offence: challan.offence || '',
    otherOffence: '',
    amount: String(challan.amount || ''),
    location: challan.location || '',
    issuedAt: challan.issuedAt ? new Date(challan.issuedAt).toISOString().split('T')[0] : '',
    dueDate: challan.dueDate ? new Date(challan.dueDate).toISOString().split('T')[0] : '',
    notes: challan.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    const offence = form.offence === 'Other' ? form.otherOffence.trim() : form.offence;
    if (!offence) { toast('Select an offence', 'error'); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast('Enter a valid amount', 'error'); return; }
    setSaving(true);
    try {
      await api.patch(`/admin/challans/${challan.id}`, {
        challanNo: form.challanNo,
        offence,
        amount: parseFloat(form.amount),
        location: form.location,
        driverId: form.driverId || null,
        issuedAt: form.issuedAt ? new Date(form.issuedAt).toISOString() : undefined,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        notes: form.notes,
      });
      toast('Challan updated', 'success');
      onSaved();
    } catch(err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="sheet-handle" />
        <p className="sheet-title">Edit Challan</p>
        <form onSubmit={save} style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Vehicle (read-only display) */}
          <div className="input-group">
            <label className="input-label">Vehicle</label>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', padding: '10px 13px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)' }}>
              {challan.plateNumber || '—'}
            </p>
          </div>

          {/* Driver */}
          <div className="input-group">
            <label className="input-label">Driver</label>
            <select className="input-field" value={form.driverId} onChange={set('driverId')}>
              <option value="">Not specified</option>
              {users.filter(u => u.isActive).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          {/* Offence */}
          <div className="input-group">
            <label className="input-label">Offence *</label>
            <select className="input-field" value={form.offence} onChange={set('offence')}>
              <option value="">Select offence</option>
              {OFFENCES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          {form.offence === 'Other' && (
            <div className="input-group">
              <label className="input-label">Specify Offence *</label>
              <input className="input-field" value={form.otherOffence} onChange={set('otherOffence')} placeholder="Describe the offence" />
            </div>
          )}

          {/* Amount */}
          <div className="input-group">
            <label className="input-label">Fine Amount (₹) *</label>
            <input className="input-field" type="number" step="1" min="1" value={form.amount} onChange={set('amount')} />
          </div>

          {/* Challan No + Location */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="input-group">
              <label className="input-label">Challan No.</label>
              <input className="input-field" value={form.challanNo} onChange={set('challanNo')} placeholder="Optional" />
            </div>
            <div className="input-group">
              <label className="input-label">Location</label>
              <input className="input-field" value={form.location} onChange={set('location')} placeholder="Optional" />
            </div>
          </div>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="input-group">
              <label className="input-label">Issued Date</label>
              <input className="input-field" type="date" value={form.issuedAt} onChange={set('issuedAt')} />
            </div>
            <div className="input-group">
              <label className="input-label">Due Date</label>
              <input className="input-field" type="date" value={form.dueDate} onChange={set('dueDate')} />
            </div>
          </div>

          {/* Notes */}
          <div className="input-group">
            <label className="input-label">Notes</label>
            <textarea className="input-field" rows={2} value={form.notes} onChange={set('notes')} placeholder="Optional remarks" style={{ resize: 'none' }} />
          </div>

          <div style={{ display: 'flex', gap: 9, marginTop: 4 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2 }}>
              {saving ? <><span className="spinner" />Saving…</> : <><Edit2 size={14} />Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Filter sheet ─────────────────────────────────────────────────
function FilterSheet({ filters, vehicles, onApply, onClose }) {
  const [f, setF] = useState(filters);
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="sheet-handle" />
        <p className="sheet-title">Filter Challans</p>
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div className="input-group">
            <label className="input-label">Vehicle</label>
            <select className="input-field" value={f.vehicleId} onChange={e => setF(x => ({ ...x, vehicleId: e.target.value }))}>
              <option value="">All vehicles</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.plateNumber} – {v.make} {v.model}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Status</label>
            <select className="input-field" value={f.status} onChange={e => setF(x => ({ ...x, status: e.target.value }))}>
              <option value="">All statuses</option>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="disputed">Disputed</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="input-group">
              <label className="input-label">From Date</label>
              <input className="input-field" type="date" value={f.from} onChange={e => setF(x => ({ ...x, from: e.target.value }))} />
            </div>
            <div className="input-group">
              <label className="input-label">To Date</label>
              <input className="input-field" type="date" value={f.to} onChange={e => setF(x => ({ ...x, to: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 9, marginTop: 4 }}>
            <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button className="btn btn-primary" onClick={() => onApply(f)} style={{ flex: 2 }}>Apply Filters</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Add challan sheet ────────────────────────────────────────────
function AddChallanSheet({ vehicles, users, onClose, onSaved, toast }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    vehicleId: '', driverId: '', challanNo: '', offence: '', otherOffence: '',
    amount: '', location: '', issuedAt: today, dueDate: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    const offence = form.offence === 'Other' ? form.otherOffence.trim() : form.offence;
    if (!form.vehicleId) { toast('Select a vehicle', 'error'); return; }
    if (!offence)        { toast('Select an offence', 'error'); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast('Enter a valid amount', 'error'); return; }
    setSaving(true);
    try {
      await api.post('/admin/challans', {
        vehicleId: form.vehicleId, driverId: form.driverId || null,
        challanNo: form.challanNo, offence,
        amount: parseFloat(form.amount), location: form.location,
        issuedAt: form.issuedAt ? new Date(form.issuedAt).toISOString() : new Date().toISOString(),
        dueDate: form.dueDate  ? new Date(form.dueDate).toISOString()  : null,
        notes: form.notes,
      });
      toast('Challan added', 'success'); onSaved();
    } catch(err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  }

  const parsedAmount = parseFloat(form.amount);

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="sheet-handle" />
        <p className="sheet-title">Add Challan</p>
        <form onSubmit={save} style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="input-group">
              <label className="input-label">Vehicle *</label>
              <select className="input-field" value={form.vehicleId} onChange={set('vehicleId')}>
                <option value="">Select</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.plateNumber}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Driver</label>
              <select className="input-field" value={form.driverId} onChange={set('driverId')}>
                <option value="">Not specified</option>
                {users.filter(u => u.isActive).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Offence *</label>
            <select className="input-field" value={form.offence} onChange={set('offence')}>
              <option value="">Select offence</option>
              {OFFENCES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          {form.offence === 'Other' && (
            <div className="input-group">
              <label className="input-label">Specify Offence *</label>
              <input className="input-field" value={form.otherOffence} onChange={set('otherOffence')} placeholder="Describe the offence" />
            </div>
          )}
          <div className="input-group">
            <label className="input-label">Fine Amount (₹) *</label>
            <input className="input-field" type="number" step="1" min="1" value={form.amount} onChange={set('amount')} placeholder="e.g. 500" />
          </div>
          {parsedAmount > 0 && (
            <div style={{ background: 'var(--danger-dim)', border: '1px solid rgba(185,28,28,0.2)', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Fine Amount</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>₹{fmt(parsedAmount, 0)}</span>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="input-group"><label className="input-label">Challan No.</label><input className="input-field" value={form.challanNo} onChange={set('challanNo')} placeholder="Optional" /></div>
            <div className="input-group"><label className="input-label">Location</label><input className="input-field" value={form.location} onChange={set('location')} placeholder="Optional" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="input-group"><label className="input-label">Issued Date</label><input className="input-field" type="date" value={form.issuedAt} onChange={set('issuedAt')} /></div>
            <div className="input-group"><label className="input-label">Due Date</label><input className="input-field" type="date" value={form.dueDate} onChange={set('dueDate')} /></div>
          </div>
          <div className="input-group">
            <label className="input-label">Notes</label>
            <textarea className="input-field" rows={2} value={form.notes} onChange={set('notes')} placeholder="Optional remarks" style={{ resize: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: 9, marginTop: 4 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2 }}>
              {saving ? <><span className="spinner" />Saving…</> : <><FileText size={14} />Add Challan</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Smart Paste Sheet (preserved from original) ──────────────────
function parseChallanText(text, today) {
  const t = text; const tLower = t.toLowerCase();
  function parseDate(str) {
    if (!str) return null; str = str.trim().replace(/\s+/g,' ');
    const months={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11,january:0,february:1,march:2,april:3,june:5,july:6,august:7,september:8,october:9,november:10,december:11};
    let m;
    if((m=str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/))){const[,d,mo,y]=m;const yr=y.length===2?2000+parseInt(y):parseInt(y);return`${yr}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}
    if((m=str.match(/^(\d{1,2})[\s\-]([A-Za-z]+)[\s\-,](\d{2,4})$/))){const[,d,mo,y]=m;const mn=months[mo.toLowerCase()];if(mn===undefined)return null;const yr=y.length===2?2000+parseInt(y):parseInt(y);return`${yr}-${String(mn+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}
    if((m=str.match(/^([A-Za-z]+)[\s\-](\d{1,2})[,\s]+(\d{4})$/))){const[,mo,d,y]=m;const mn=months[mo.toLowerCase()];if(mn===undefined)return null;return`${y}-${String(mn+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}
    if((m=str.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/))){const[,y,mo,d]=m;return`${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}
    return null;
  }
  let plateNumber=null;const pm=t.match(/\b([A-Z]{2}\s*\d{1,2}\s*[A-Z]{1,3}\s*\d{4})\b/i);if(pm)plateNumber=pm[1].replace(/\s/g,'').toUpperCase();
  let challanNo=null;const cn=t.match(/(?:challan|violation|notice|echallan|e-challan)\s*(?:no|number|#|id)?[:\s#]*([A-Z0-9\-\/]{5,20})/i);if(cn)challanNo=cn[1];
  const offenceMap=[{keys:['overspeed','speed limit','excess speed','speeding'],label:'Overspeeding'},{keys:['red light','signal','traffic light'],label:'Red Light Jumping'},{keys:['no parking','parking violation','wrong parking'],label:'No Parking'},{keys:['wrong side','wrong lane','one way','against traffic'],label:'Wrong Side Driving'},{keys:['seat belt','seatbelt'],label:'No Seat Belt'},{keys:['mobile','phone','talking while driving','using phone'],label:'Mobile Usage While Driving'},{keys:['overload','excess load','overweight'],label:'Overloading'},{keys:['helmet'],label:'No Helmet'},{keys:['drunk','alcohol','dui','drink and drive','intoxicat'],label:'Drunk Driving'},{keys:['document','rc','registration','license','licence','insurance','puc','pollution'],label:'Document Violation'},{keys:['lane'],label:'Lane Violation'},{keys:['illegal park'],label:'Illegal Parking'},{keys:['reckless','dangerous driving','negligent'],label:'Reckless Driving'}];
  let offence='';for(const{keys,label}of offenceMap){if(keys.some(k=>tLower.includes(k))){offence=label;break;}}
  let amount=null;const ap=[/(?:fine|amount|penalty|fee|charge|total)[^\d₹Rs]*(?:₹|Rs\.?|INR)?\s*([\d,]+)/i,/(?:₹|Rs\.?|INR)\s*([\d,]+)/i,/(?:pay|paid|payable)\s+(?:₹|Rs\.?)?\s*([\d,]+)/i];for(const p of ap){const m2=t.match(p);if(m2){amount=parseInt(m2[1].replace(/,/g,''));break;}}
  let location=null;const lm=t.match(/(?:at|near|location|place|road|highway|junction|intersection)[:\s]+([^,.;\n]{5,60})/i);if(lm)location=lm[1].trim();
  let issuedAt=today;const dp=[/(?:date|issued|challan date|offence date|violation date)[:\s]+(\d{1,2}[\s\/\-\.][A-Za-z\d]{2,9}[\s\/\-\.]\d{2,4})/i,/(?:on|dated)[:\s]+(\d{1,2}[\s\/\-\.][A-Za-z\d]{2,9}[\s\/\-\.]\d{2,4})/i];for(const p of dp){const m3=t.match(p);if(m3){const d=parseDate(m3[1]);if(d){issuedAt=d;break;}}}
  let dueDate=null;const dm=t.match(/(?:pay\s*(?:before|by|on)|due\s*(?:date|by|on|:)|last\s*(?:date|day)|payment\s*(?:before|by|due)|valid\s*(?:till|until|upto))\s*[:\-]?\s*([\d]{1,2}[-/.\s][A-Za-z\d]{2,9}[-/.,\s][\d]{2,4})/i);if(dm){const d=parseDate(dm[1]);if(d)dueDate=d;}
  return{plateNumber,challanNo,offence,amount,location,issuedAt,dueDate};
}

function SmartPasteSheet({ vehicles, users, onClose, onSaved, toast }) {
  const [step,setStep]=useState('paste');const[rawText,setRawText]=useState('');const[form,setForm]=useState(null);const[saving,setSaving]=useState(false);const[parsing,setParsing]=useState(false);const[parseMethod,setParseMethod]=useState(null);
  const today=new Date().toISOString().split('T')[0];const set=k=>e=>setForm(f=>({...f,[k]:typeof e==='string'?e:e.target.value}));
  function buildForm(result){const mv=result.plateNumber?vehicles.find(v=>v.plateNumber?.replace(/\s/g,'').toUpperCase()===result.plateNumber?.replace(/\s/g,'').toUpperCase()):null;const known=['Overspeeding','Red Light Jumping','No Parking','Wrong Side Driving','No Seat Belt','Mobile Usage While Driving','Overloading','No Helmet','Drunk Driving','Document Violation','Lane Violation','Illegal Parking','Reckless Driving'];const isKnown=known.includes(result.offence);const offence=isKnown?result.offence:(result.offence?'Other':'');const otherOffence=offence==='Other'?(result.offence||''):'';return{vehicleId:mv?.id||'',driverId:'',challanNo:result.challanNo||'',offence,otherOffence,amount:result.amount?String(result.amount):'',location:result.location||'',issuedAt:result.issuedAt||today,dueDate:result.dueDate||'',notes:'',_plateNumber:result.plateNumber||'',_matchedVehicle:mv};}
  async function parse(){if(!rawText.trim()){toast('Paste a challan message first','error');return;}setParsing(true);setParseMethod(null);try{const token=localStorage.getItem('fp_admin_token');const res=await fetch('https://fleet-tracker-s5ts.onrender.com/api/admin/challans/parse',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({text:rawText})});if(!res.ok)throw new Error(`${res.status}`);const result=await res.json();setForm(buildForm(result));setParseMethod('ai');setStep('review');setParsing(false);return;}catch(aiErr){toast('AI unavailable — using smart regex','error');}try{const result=parseChallanText(rawText,today);setForm(buildForm(result));setParseMethod('regex');setStep('review');}catch{toast('Could not parse — fill manually','error');setForm(buildForm({}));setParseMethod('regex');setStep('review');}setParsing(false);}
  async function save(){const offence=form.offence==='Other'?form.otherOffence.trim():form.offence;if(!form.vehicleId){toast('Select a vehicle','error');return;}if(!offence){toast('Select an offence','error');return;}if(!form.amount||parseFloat(form.amount)<=0){toast('Enter a valid amount','error');return;}setSaving(true);try{await api.post('/admin/challans',{vehicleId:form.vehicleId,driverId:form.driverId||null,challanNo:form.challanNo,offence,amount:parseFloat(form.amount),location:form.location,issuedAt:form.issuedAt?new Date(form.issuedAt).toISOString():new Date().toISOString(),dueDate:form.dueDate?new Date(form.dueDate).toISOString():null,notes:form.notes});toast('Challan added','success');onSaved();}catch(err){toast(err.message,'error');}finally{setSaving(false);}}
  return(<div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}><div className="sheet" style={{maxHeight:'92vh',overflowY:'auto'}}><div className="sheet-handle"/><div style={{padding:'4px 16px 12px',display:'flex',alignItems:'center',gap:10}}><div style={{width:34,height:34,background:'var(--purple-dim)',border:'1px solid rgba(139,92,246,0.3)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Sparkles size={15} color="var(--purple)"/></div><div style={{flex:1}}><div style={{display:'flex',alignItems:'center',gap:7}}><p style={{fontSize:15,fontWeight:800}}>AI Smart Paste</p>{parseMethod==='ai'&&<span style={{fontSize:9,fontWeight:800,background:'var(--purple)',color:'#fff',borderRadius:5,padding:'2px 6px'}}>AI</span>}{parseMethod==='regex'&&<span style={{fontSize:9,fontWeight:800,background:'var(--bg-elevated)',color:'var(--text-muted)',border:'1px solid var(--border)',borderRadius:5,padding:'2px 6px'}}>REGEX</span>}</div><p style={{fontSize:11,color:'var(--text-muted)'}}>{step==='paste'?'Paste challan message — AI extracts details':'Review & confirm'}</p></div>{step==='review'&&<button onClick={()=>{setStep('paste');setParseMethod(null);}} style={{background:'none',display:'flex',alignItems:'center',gap:4,fontSize:11,color:'var(--text-muted)',padding:'4px 8px',borderRadius:6,border:'1px solid var(--border)'}}><RotateCcw size={11}/> Re-paste</button>}</div><div style={{padding:'0 16px 24px',display:'flex',flexDirection:'column',gap:13}}>{step==='paste'&&<><textarea className="input-field" rows={7} value={rawText} onChange={e=>setRawText(e.target.value)} placeholder="Paste challan SMS or notice here…" style={{resize:'none',fontSize:13,lineHeight:1.6}} autoFocus/><div style={{display:'flex',gap:9}}><button className="btn btn-ghost" onClick={onClose} style={{flex:1}}>Cancel</button><button onClick={parse} disabled={!rawText.trim()||parsing} className="btn btn-primary" style={{flex:2,background:rawText.trim()&&!parsing?'var(--purple)':'var(--bg-elevated)',color:rawText.trim()&&!parsing?'#fff':'var(--text-muted)'}}>{parsing?<><span className="spinner"/>Extracting…</>:<><Sparkles size={14}/>Extract with AI</>}</button></div></>}{step==='review'&&form&&<>{form._plateNumber&&<div style={{background:form._matchedVehicle?'var(--success-dim)':'var(--warning-dim)',border:`1px solid ${form._matchedVehicle?'rgba(16,185,129,0.2)':'rgba(245,158,11,0.2)'}`,borderRadius:10,padding:'10px 13px',display:'flex',alignItems:'center',gap:9}}>{form._matchedVehicle?<CheckCircle size={14} color="var(--success)"/>:<AlertTriangle size={14} color="var(--warning)"/>}<div><p style={{fontSize:12,fontWeight:700,color:form._matchedVehicle?'var(--success)':'var(--warning)'}}>{form._matchedVehicle?`Matched: ${form._matchedVehicle.plateNumber}`:`Plate: ${form._plateNumber}`}</p><p style={{fontSize:11,color:'var(--text-muted)',marginTop:1}}>{form._matchedVehicle?`${form._matchedVehicle.make} ${form._matchedVehicle.model}`:'Select vehicle manually'}</p></div></div>}<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}><div className="input-group"><label className="input-label">Vehicle *</label><select className="input-field" value={form.vehicleId} onChange={set('vehicleId')}><option value="">Select</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.plateNumber}</option>)}</select></div><div className="input-group"><label className="input-label">Driver</label><select className="input-field" value={form.driverId} onChange={set('driverId')}><option value="">Not specified</option>{users.filter(u=>u.isActive).map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></div></div><div className="input-group"><label className="input-label">Offence *</label><select className="input-field" value={form.offence} onChange={set('offence')}><option value="">Select</option>{OFFENCES.map(o=><option key={o} value={o}>{o}</option>)}</select></div>{form.offence==='Other'&&<div className="input-group"><label className="input-label">Specify Offence *</label><input className="input-field" value={form.otherOffence} onChange={set('otherOffence')} placeholder="Describe the offence"/></div>}<div className="input-group"><label className="input-label">Fine Amount (₹) *</label><input className="input-field" type="number" step="1" min="1" value={form.amount} onChange={set('amount')}/></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}><div className="input-group"><label className="input-label">Challan No.</label><input className="input-field" value={form.challanNo} onChange={set('challanNo')} placeholder="Optional"/></div><div className="input-group"><label className="input-label">Location</label><input className="input-field" value={form.location} onChange={set('location')} placeholder="Optional"/></div></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}><div className="input-group"><label className="input-label">Issued Date</label><input className="input-field" type="date" value={form.issuedAt} onChange={set('issuedAt')}/></div><div className="input-group"><label className="input-label">Due Date</label><input className="input-field" type="date" value={form.dueDate} onChange={set('dueDate')}/></div></div><div className="input-group"><label className="input-label">Notes</label><textarea className="input-field" rows={2} value={form.notes} onChange={set('notes')} placeholder="Optional remarks" style={{resize:'none'}}/></div><div style={{display:'flex',gap:9,marginTop:4}}><button className="btn btn-ghost" onClick={onClose} style={{flex:1}}>Cancel</button><button onClick={save} disabled={saving} className="btn btn-primary" style={{flex:2,background:'var(--purple)'}}>{saving?<><span className="spinner"/>Saving…</>:<>Save Challan</>}</button></div></>}</div></div></div>);
}

// ─── Main page ────────────────────────────────────────────────────
export default function Challans({ admin, onLogout }) {
  const toast = useToast();
  const [challans, setChallans]   = useState([]);
  const [summary, setSummary]     = useState(null);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [vehicles, setVehicles]   = useState([]);
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filters, setFilters]     = useState({ vehicleId: '', status: '', from: '', to: '' });
  const [showFilter, setShowFilter] = useState(false);
  const [showAdd, setShowAdd]     = useState(false);
  const [showSmartPaste, setShowSmartPaste] = useState(false);
  const [editChallan, setEditChallan] = useState(null); // challan being edited

  // ── Quick vehicle filter (inline dropdown, replaces going into filter sheet) ──
  const [quickVehicleId, setQuickVehicleId] = useState('');

  useEffect(() => { loadMeta(); }, []);

  // Merge quick vehicle filter into the applied filters.
  // useMemo keeps the same object reference when values haven't changed,
  // preventing the infinite re-render loop caused by a new object every render.
  const effectiveFilters = useMemo(() => ({
    ...filters,
    vehicleId: quickVehicleId || filters.vehicleId,
  }), [filters, quickVehicleId]);

  // Use a stable primitive key as the dependency (not the object itself)
  // so the effect only re-runs when a filter value actually changes.
  const filterKey = `${effectiveFilters.vehicleId}|${effectiveFilters.status}|${effectiveFilters.from}|${effectiveFilters.to}`;

  useEffect(() => { load(page); }, [page, filterKey]);

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
    if (effectiveFilters.vehicleId) q.set('vehicleId', effectiveFilters.vehicleId);
    if (effectiveFilters.status)    q.set('status', effectiveFilters.status);
    if (effectiveFilters.from)      q.set('from', effectiveFilters.from);
    if (effectiveFilters.to)        q.set('to', effectiveFilters.to);
    return `/admin/challans?${q}`;
  }

  async function load(p = page) {
    setLoading(true);
    try {
      const [res, sum] = await Promise.all([
        api.get(buildUrl(p)),
        api.get('/admin/challans/summary'),
      ]);
      setChallans(res.data || []);
      setTotal(res.total || 0);
      setSummary(sum);
    } catch(err) {
      if (err.message.includes('401')) { clearAuth(); onLogout(); }
      toast(err.message, 'error');
    } finally { setLoading(false); }
  }

  function applyFilter(f) { setFilters(f); setPage(1); setShowFilter(false); }
  function clearFilters()  { setFilters({ vehicleId: '', status: '', from: '', to: '' }); setQuickVehicleId(''); setPage(1); }
  const hasFilters = Object.values(effectiveFilters).some(Boolean);
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="page-wrapper page-enter">
      <div className="page-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: 'var(--danger-dim)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={16} color="var(--danger)" />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800 }}>Challans</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{total} {total === 1 ? 'entry' : 'entries'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          <button
            className="btn-icon"
            onClick={() => setShowFilter(true)}
            style={{ color: hasFilters ? 'var(--accent)' : 'var(--text-secondary)', borderColor: hasFilters ? 'var(--accent)' : undefined }}
          >
            <Filter size={14} />
          </button>
          <button
            onClick={() => setShowSmartPaste(true)}
            style={{ height: 36, display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 700, background: 'var(--purple-dim)', color: 'var(--purple)', border: '1px solid rgba(139,92,246,0.3)', cursor: 'pointer', flexShrink: 0 }}
          >
            <ClipboardPaste size={13} /> Paste
          </button>
          <button className="btn btn-primary btn-sm" style={{ width: 'auto', padding: '8px 12px' }} onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      <div className="page-content">

        {/* ── Vehicle Quick-Filter Dropdown ─────────────────────────
            Select a vehicle → instantly shows only that vehicle's challans
            2 clicks: tap dropdown → select vehicle
        ─────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Car size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, position: 'relative' }}>
            <select
              className="input-field"
              value={quickVehicleId}
              onChange={e => { setQuickVehicleId(e.target.value); setPage(1); }}
              style={{ paddingLeft: 10, fontSize: 13 }}
            >
              <option value="">All vehicles</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.plateNumber} — {v.make} {v.model}
                </option>
              ))}
            </select>
          </div>
          {quickVehicleId && (
            <button
              onClick={() => { setQuickVehicleId(''); setPage(1); }}
              style={{ background: 'none', color: 'var(--text-muted)', fontSize: 11, whiteSpace: 'nowrap' }}
            >
              Clear
            </button>
          )}
        </div>

        <SummaryStrip summary={summary} />

        {hasFilters && !quickVehicleId && (
          <div style={{ background: 'var(--accent-dim)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>Filters active</span>
            <button onClick={clearFilters} style={{ background: 'none', fontSize: 12, color: 'var(--text-secondary)' }}>Clear all</button>
          </div>
        )}

        {loading
          ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><span className="spinner" style={{ width: 28, height: 28 }} /></div>
          : challans.length === 0
          ? (
            <div className="empty-state">
              <FileText size={36} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
              <p className="empty-title">No challans found</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                {hasFilters ? 'Try clearing your filters' : 'Tap + Add to log a challan'}
              </p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {challans.map(c => (
                  <ChallanCard
                    key={c.id}
                    challan={c}
                    onStatusChange={() => load(page)}
                    onDelete={() => { load(1); setPage(1); }}
                    onEdit={() => setEditChallan(c)}
                    toast={toast}
                  />
                ))}
              </div>
              <Pagination page={page} total={total} limit={LIMIT} totalPages={totalPages} onPage={setPage} />
            </>
          )
        }
      </div>

      {showFilter    && <FilterSheet filters={filters} vehicles={vehicles} onApply={applyFilter} onClose={() => setShowFilter(false)} />}
      {showAdd       && <AddChallanSheet vehicles={vehicles} users={users} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(1); setPage(1); }} toast={toast} />}
      {showSmartPaste && <SmartPasteSheet vehicles={vehicles} users={users} onClose={() => setShowSmartPaste(false)} onSaved={() => { setShowSmartPaste(false); load(1); setPage(1); }} toast={toast} />}
      {editChallan   && <EditChallanSheet challan={editChallan} vehicles={vehicles} users={users} onClose={() => setEditChallan(null)} onSaved={() => { setEditChallan(null); load(page); }} toast={toast} />}
    </div>
  );
}

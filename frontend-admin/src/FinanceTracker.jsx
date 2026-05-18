// FinanceTracker.jsx — Vehicle EMI / Finance Tracker
import { useState, useEffect } from 'react';
import { api, fmtRs, fmtDate } from './api.js';
import { useToast } from './Toast.jsx';
import {
  ArrowLeft, Plus, CreditCard, ChevronRight, CheckCircle2,
  Trash2, Edit3, X, TrendingDown, Calendar, Building2,
  AlertCircle, BadgeIndianRupee, Percent, StickyNote, ArrowRight,
} from 'lucide-react';

const EMI_COLORS = {
  active:   { color: 'var(--accent)',  dim: 'var(--accent-dim)',  border: 'rgba(249,115,22,0.25)' },
  warning:  { color: 'var(--warning)', dim: 'var(--warning-dim)', border: 'rgba(217,119,6,0.25)'  },
  overdue:  { color: 'var(--danger)',  dim: 'var(--danger-dim)',  border: 'rgba(220,38,38,0.25)'  },
  done:     { color: 'var(--success)', dim: 'var(--success-dim)', border: 'rgba(22,163,74,0.25)'  },
};

function getStatus(entry) {
  if (entry.emisPaid >= entry.totalEmis) return 'done';
  const today = new Date(); today.setHours(0,0,0,0);
  const emiDate = new Date(today.getFullYear(), today.getMonth(), entry.emiDay);
  if (emiDate < today) emiDate.setMonth(emiDate.getMonth() + 1);
  const daysLeft = Math.round((emiDate - today) / 86400000);
  if (daysLeft <= 3) return 'overdue';
  if (daysLeft <= 7) return 'warning';
  return 'active';
}

function getNextEmiDate(emiDay) {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(today.getFullYear(), today.getMonth(), emiDay);
  if (d < today) d.setMonth(d.getMonth() + 1);
  return d;
}

// Calculate how many EMIs have been paid based on startDate → today
function calcEmisFromDate(startDate, totalEmis) {
  if (!startDate) return 0;
  const start = new Date(startDate);
  if (isNaN(start)) return 0;
  const today = new Date();
  const months =
    (today.getFullYear() - start.getFullYear()) * 12 +
    (today.getMonth() - start.getMonth());
  return Math.min(Math.max(0, months), totalEmis || 0);
}

function ProgressBar({ paid, total }) {
  const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
  const color = pct >= 100 ? 'var(--success)' : pct > 60 ? 'var(--accent)' : pct > 30 ? 'var(--warning)' : 'var(--danger)';
  return (
    <div style={{ background: 'var(--bg-elevated)', borderRadius: 4, height: 5, overflow: 'hidden', marginTop: 6 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.4s ease' }} />
    </div>
  );
}

function FinanceCard({ entry, onEdit, onDelete, onMarkPaid }) {
  const status = getStatus(entry);
  const { color, dim, border } = EMI_COLORS[status];
  const nextEmi = getNextEmiDate(entry.emiDay);
  const today = new Date(); today.setHours(0,0,0,0);
  const daysLeft = Math.round((nextEmi - today) / 86400000);
  const remaining = entry.totalEmis - entry.emisPaid;
  const remainingAmt = remaining * entry.emiAmount;
  const isDone = status === 'done';

  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 'var(--radius)',
      border: `1px solid ${isDone ? 'rgba(22,163,74,0.2)' : 'var(--border)'}`,
      padding: '13px 14px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Status stripe */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: color, borderRadius: '4px 0 0 4px' }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginLeft: 8 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: dim, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <CreditCard size={15} color={color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {entry.vehicleId?.plateNumber || '—'}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 5,
              background: `${color}18`, color, border: `1px solid ${border}`,
              letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>
              {isDone ? 'PAID OFF' : status === 'overdue' ? `${daysLeft}d` : status === 'warning' ? `${daysLeft}d` : `${daysLeft}d`}
            </span>
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
            {entry.vehicleId?.make} {entry.vehicleId?.model} · {entry.lenderName}
          </p>
        </div>
        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {!isDone && (
            <button
              onClick={() => onMarkPaid(entry)}
              style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--success-dim)', border: '1px solid rgba(22,163,74,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              title="Mark EMI Paid"
            >
              <CheckCircle2 size={13} color="var(--success)" />
            </button>
          )}
          <button
            onClick={() => onEdit(entry)}
            style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <Edit3 size={12} color="var(--text-muted)" />
          </button>
          <button
            onClick={() => onDelete(entry)}
            style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--danger-dim)', border: '1px solid rgba(220,38,38,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <Trash2 size={12} color="var(--danger)" />
          </button>
        </div>
      </div>

      {/* EMI Info */}
      <div style={{ marginLeft: 8, marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '7px 8px' }}>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>EMI</p>
          <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)', marginTop: 2 }}>{fmtRs(entry.emiAmount)}</p>
        </div>
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '7px 8px' }}>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Paid</p>
          <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{entry.emisPaid}/{entry.totalEmis}</p>
        </div>
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '7px 8px' }}>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Left</p>
          <p style={{ fontSize: 13, fontWeight: 800, color: isDone ? 'var(--success)' : color, marginTop: 2 }}>{isDone ? '—' : fmtRs(remainingAmt)}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginLeft: 8, marginTop: 8 }}>
        <ProgressBar paid={entry.emisPaid} total={entry.totalEmis} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
            {isDone ? 'Fully paid off' : `Next EMI: ${nextEmi.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
          </span>
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
            Loan: {fmtRs(entry.loanAmount)}
          </span>
        </div>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div
        style={{
          background: 'var(--bg-card)', borderRadius: '20px 20px 0 0',
          padding: '20px 16px 32px', width: '100%', maxWidth: 480,
          maxHeight: '90vh', overflowY: 'auto',
          animation: 'slideUp 0.25s ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{title}</h3>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={14} color="var(--text-muted)" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
        {Icon && <Icon size={10} />} {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  borderRadius: 9, padding: '9px 11px', fontSize: 13, color: 'var(--text-primary)',
  outline: 'none', boxSizing: 'border-box',
};

const EMPTY_FORM = {
  vehicleId: '', lenderName: '', loanAmount: '', emiAmount: '',
  emiDay: '1', startDate: '', endDate: '', totalEmis: '',
  emisPaid: '0', interestRate: '', notes: '',
};

export default function FinanceTracker({ admin, onNavigate, onLogout, dark, onToggleTheme, onMonthlyObligations }) {
  const toast = useToast();
  const [entries, setEntries] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all'); // all | active | done
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [fin, veh] = await Promise.all([
        api.fresh('/admin/finance'),
        api.get('/admin/vehicles?limit=100'),
      ]);
      setEntries(fin.entries || []);
      setVehicles(Array.isArray(veh) ? veh : (veh.data || veh.vehicles || []));
    } catch (err) {
      toast('Failed to load finance data', 'error');
    } finally { setLoading(false); }
  }

  function openAdd() {
    setEditEntry(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(entry) {
    setEditEntry(entry);
    const startDate = entry.startDate ? entry.startDate.slice(0, 10) : '';
    const totalEmis = entry.totalEmis || 0;
    // Recalculate from date on edit; use stored value if loan is fully paid
    const autoCalc = calcEmisFromDate(startDate, totalEmis);
    const emisPaid = entry.emisPaid >= totalEmis ? totalEmis : autoCalc;
    setForm({
      vehicleId: entry.vehicleId?._id || entry.vehicleId || '',
      lenderName: entry.lenderName || '',
      loanAmount: String(entry.loanAmount || ''),
      emiAmount: String(entry.emiAmount || ''),
      emiDay: String(entry.emiDay || '1'),
      startDate,
      endDate: entry.endDate ? entry.endDate.slice(0, 10) : '',
      totalEmis: String(totalEmis),
      emisPaid: String(emisPaid),
      interestRate: entry.interestRate != null ? String(entry.interestRate) : '',
      notes: entry.notes || '',
    });
    setShowForm(true);
  }

  async function handleMarkPaid(entry) {
    const newPaid = Math.min(entry.emisPaid + 1, entry.totalEmis);
    try {
      const { entry: updated } = await api.patch(`/admin/finance/${entry._id}`, { emisPaid: newPaid });
      setEntries(prev => prev.map(e => e._id === updated._id ? updated : e));
      toast(`EMI marked paid (${newPaid}/${entry.totalEmis})`, 'success');
    } catch (err) {
      toast('Failed to update: ' + err.message, 'error');
    }
  }

  async function handleSave() {
    if (!form.vehicleId) return toast('Select a vehicle', 'error');
    if (!form.lenderName.trim()) return toast('Enter lender name', 'error');
    if (!form.loanAmount || isNaN(form.loanAmount)) return toast('Enter valid loan amount', 'error');
    if (!form.emiAmount || isNaN(form.emiAmount)) return toast('Enter valid EMI amount', 'error');
    if (!form.startDate || !form.endDate) return toast('Enter start and end dates', 'error');
    if (!form.totalEmis || isNaN(form.totalEmis)) return toast('Enter total EMIs', 'error');

    setSaving(true);
    const payload = {
      vehicleId: form.vehicleId,
      lenderName: form.lenderName.trim(),
      loanAmount: parseFloat(form.loanAmount),
      emiAmount: parseFloat(form.emiAmount),
      emiDay: parseInt(form.emiDay),
      startDate: form.startDate,
      endDate: form.endDate,
      totalEmis: parseInt(form.totalEmis),
      emisPaid: parseInt(form.emisPaid) || 0,
      interestRate: form.interestRate ? parseFloat(form.interestRate) : null,
      notes: form.notes.trim(),
    };
    try {
      if (editEntry) {
        const { entry: updated } = await api.patch(`/admin/finance/${editEntry._id}`, payload);
        setEntries(prev => prev.map(e => e._id === updated._id ? updated : e));
        toast('Finance entry updated', 'success');
      } else {
        const { entry: created } = await api.post('/admin/finance', payload);
        setEntries(prev => [created, ...prev]);
        toast('Finance entry added', 'success');
      }
      setShowForm(false);
    } catch (err) {
      toast('Error: ' + err.message, 'error');
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/admin/finance/${deleteTarget._id}`);
      setEntries(prev => prev.filter(e => e._id !== deleteTarget._id));
      toast('Finance entry deleted', 'success');
      setDeleteTarget(null);
    } catch (err) {
      toast('Delete failed: ' + err.message, 'error');
    }
  }

  const filtered = entries.filter(e => {
    if (filter === 'active') return e.emisPaid < e.totalEmis;
    if (filter === 'done') return e.emisPaid >= e.totalEmis;
    return true;
  });

  const totalActiveEmi = entries
    .filter(e => e.emisPaid < e.totalEmis)
    .reduce((s, e) => s + e.emiAmount, 0);
  const totalActive = entries.filter(e => e.emisPaid < e.totalEmis).length;

  return (
    <div className="page-wrapper page-enter">
      <style>{`@keyframes slideUp { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }`}</style>

      {/* Header */}
      <div className="page-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn-icon" onClick={() => onNavigate('dashboard')}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Finance</p>
            <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>EMI Tracker</p>
          </div>
        </div>
        <button className="btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '7px 12px' }}>
          <Plus size={13} /> Add Finance
        </button>
      </div>

      <div className="page-content">

        {/* Monthly Obligations — tappable card */}
        <div
          onClick={() => onMonthlyObligations && onMonthlyObligations()}
          style={{
            background: 'var(--accent)', borderRadius: 'var(--radius)',
            padding: '13px 16px', position: 'relative', overflow: 'hidden',
            cursor: 'pointer', userSelect: 'none',
            transition: 'opacity 0.12s',
          }}
          onMouseDown={e => e.currentTarget.style.opacity = '0.85'}
          onMouseUp={e => e.currentTarget.style.opacity = '1'}
          onTouchStart={e => e.currentTarget.style.opacity = '0.85'}
          onTouchEnd={e => e.currentTarget.style.opacity = '1'}
        >
          <div style={{ position: 'absolute', right: -15, top: -15, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Monthly Obligations
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '3px 10px' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>View EMIs</span>
              <ArrowRight size={11} color="#fff" />
            </div>
          </div>
          <p style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', marginTop: 4 }}>
            {fmtRs(totalActiveEmi)}
          </p>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 3 }}>
            {totalActive > 0
              ? `${totalActive} active loan${totalActive > 1 ? 's' : ''} · due this month`
              : 'No active loans'}
          </p>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[['all','All'], ['active','Active'], ['done','Paid Off']].map(([val, lbl]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              style={{
                padding: '6px 13px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                border: `1px solid ${filter === val ? 'var(--accent)' : 'var(--border)'}`,
                background: filter === val ? 'var(--accent-dim)' : 'var(--bg-card)',
                color: filter === val ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              {lbl}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <span className="spinner" style={{ width: 22, height: 22 }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
            <CreditCard size={32} color="var(--text-muted)" style={{ marginBottom: 10, opacity: 0.5 }} />
            <p style={{ fontWeight: 700, fontSize: 13 }}>No finance entries</p>
            <p style={{ fontSize: 11, marginTop: 4 }}>Add a financed vehicle to track EMIs</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(entry => (
              <FinanceCard
                key={entry._id}
                entry={entry}
                onEdit={openEdit}
                onDelete={e => setDeleteTarget(e)}
                onMarkPaid={handleMarkPaid}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <Modal title={editEntry ? 'Edit Finance Entry' : 'Add Finance Entry'} onClose={() => setShowForm(false)}>
          <Field label="Vehicle" icon={TrendingDown}>
            <select
              value={form.vehicleId}
              onChange={e => setForm(f => ({ ...f, vehicleId: e.target.value }))}
              style={{ ...inputStyle, appearance: 'none' }}
              disabled={!!editEntry}
            >
              <option value="">Select vehicle...</option>
              {vehicles.map(v => (
                <option key={v.id || v._id} value={v.id || v._id}>
                  {v.plateNumber} — {v.make} {v.model}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Lender / Bank Name" icon={Building2}>
            <input
              style={inputStyle}
              placeholder="e.g. HDFC Bank, SBI, etc."
              value={form.lenderName}
              onChange={e => setForm(f => ({ ...f, lenderName: e.target.value }))}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Loan Amount (₹)" icon={BadgeIndianRupee}>
              <input style={inputStyle} type="number" placeholder="500000" value={form.loanAmount} onChange={e => setForm(f => ({ ...f, loanAmount: e.target.value }))} />
            </Field>
            <Field label="EMI Amount (₹)" icon={BadgeIndianRupee}>
              <input style={inputStyle} type="number" placeholder="12000" value={form.emiAmount} onChange={e => setForm(f => ({ ...f, emiAmount: e.target.value }))} />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="EMI Due Day" icon={Calendar}>
              <input style={inputStyle} type="number" min={1} max={31} placeholder="1-31" value={form.emiDay} onChange={e => setForm(f => ({ ...f, emiDay: e.target.value }))} />
            </Field>
            <Field label="Interest Rate %" icon={Percent}>
              <input style={inputStyle} type="number" placeholder="Optional" value={form.interestRate} onChange={e => setForm(f => ({ ...f, interestRate: e.target.value }))} />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Start Date" icon={Calendar}>
              <input
                style={inputStyle}
                type="date"
                value={form.startDate}
                onChange={e => {
                  const startDate = e.target.value;
                  const auto = calcEmisFromDate(startDate, parseInt(form.totalEmis) || 0);
                  setForm(f => ({ ...f, startDate, emisPaid: String(auto) }));
                }}
              />
            </Field>
            <Field label="End Date" icon={Calendar}>
              <input style={inputStyle} type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Total EMIs" icon={CreditCard}>
              <input
                style={inputStyle}
                type="number"
                placeholder="36"
                value={form.totalEmis}
                onChange={e => {
                  const totalEmis = e.target.value;
                  const auto = calcEmisFromDate(form.startDate, parseInt(totalEmis) || 0);
                  setForm(f => ({ ...f, totalEmis, emisPaid: String(auto) }));
                }}
              />
            </Field>
            <Field label="EMIs Paid (Auto)" icon={CheckCircle2}>
              <input
                style={{ ...inputStyle, color: 'var(--accent)', fontWeight: 700 }}
                type="number"
                placeholder="0"
                min={0}
                value={form.emisPaid}
                onChange={e => setForm(f => ({ ...f, emisPaid: e.target.value }))}
                title="Auto-calculated from start date. You can override manually."
              />
            </Field>
          </div>

          <Field label="Notes (Optional)" icon={StickyNote}>
            <textarea
              style={{ ...inputStyle, resize: 'none', minHeight: 60 }}
              placeholder="Loan account number, branch, etc."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </Field>

          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
          >
            {saving ? <span className="spinner" style={{ width: 14, height: 14, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : editEntry ? 'Save Changes' : 'Add Finance Entry'}
          </button>
        </Modal>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <Modal title="Delete Finance Entry?" onClose={() => setDeleteTarget(null)}>
          <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
            <AlertCircle size={36} color="var(--danger)" style={{ marginBottom: 10 }} />
            <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
              Remove finance entry for <strong>{deleteTarget.vehicleId?.plateNumber}</strong>?
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>This cannot be undone.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setDeleteTarget(null)}
              style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'var(--danger)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

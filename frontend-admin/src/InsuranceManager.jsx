// InsuranceManager.jsx — Vehicle Insurance Policy Manager
// • Lists all policies across fleet (or filtered by vehicle)
// • Add / Edit / Delete policies
// • Expiry chips, premium expense tracking
// • insuranceExpiry on vehicle is auto-synced from latest active policy (backend)

import { useState, useEffect } from 'react';
import { api, fmtRs, fmtDate } from './api.js';
import { useToast } from './Toast.jsx';
import {
  ShieldCheck, Plus, Search, Edit2, Trash2, Car,
  Calendar, AlertTriangle, CheckCircle, XCircle,
  ChevronDown, ChevronUp, IndianRupee, FileText,
  ShieldAlert, ShieldOff, RefreshCw, X,
} from 'lucide-react';

const COVERAGE_TYPES = ['Comprehensive', 'Third Party', 'Own Damage', 'Other'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getExpiryInfo(expiryDate) {
  if (!expiryDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp   = new Date(expiryDate); exp.setHours(0, 0, 0, 0);
  const diff  = Math.round((exp - today) / 86400000);
  if (diff < 0)   return { type: 'expired',  diff, label: `Expired ${Math.abs(diff)}d ago`,     color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)'   };
  if (diff === 0) return { type: 'today',    diff, label: 'Expires TODAY',                       color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)'   };
  if (diff <= 7)  return { type: 'critical', diff, label: `Expires in ${diff}d`,                 color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)'  };
  if (diff <= 30) return { type: 'warning',  diff, label: `Expires in ${diff}d`,                 color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)',  border: 'rgba(14,165,233,0.3)'  };
  return                  { type: 'valid',   diff, label: `Valid · ${diff}d left`,               color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)'  };
}

function toDateInput(d) {
  if (!d) return '';
  return new Date(d).toISOString().split('T')[0];
}

// ── Summary strip ─────────────────────────────────────────────────────────────

function SummaryStrip({ policies }) {
  const active   = policies.filter(p => p.isActive);
  const expired  = active.filter(p => { const i = getExpiryInfo(p.expiryDate); return i && i.type === 'expired'; });
  const expiring = active.filter(p => { const i = getExpiryInfo(p.expiryDate); return i && (i.type === 'critical' || i.type === 'today'); });
  const totalPremium = active.reduce((s, p) => s + (p.premiumAmount || 0), 0);

  const items = [
    { label: 'Active Policies', value: active.length,         color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
    { label: 'Expiring Soon',   value: expiring.length,       color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
    { label: 'Expired',         value: expired.length,        color: '#ef4444', bg: 'rgba(239,68,68,0.08)'  },
    { label: 'Total Premium',   value: fmtRs(totalPremium),   color: '#a78bfa', bg: 'rgba(167,139,250,0.08)'},
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 4 }}>
      {items.map(({ label, value, color, bg }) => (
        <div key={label} style={{ background: bg, border: `1px solid ${color}22`, borderRadius: 12, padding: '10px 13px' }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</p>
          <p style={{ fontSize: 17, fontWeight: 800, color, letterSpacing: '-0.02em' }}>{value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Policy Card ───────────────────────────────────────────────────────────────

function PolicyCard({ policy: p, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const expiry = getExpiryInfo(p.expiryDate);

  const vehicle = p.vehicleId;
  const plateNumber = vehicle?.plateNumber || '—';
  const vehicleName = vehicle ? `${vehicle.make} ${vehicle.model} · ${vehicle.year}` : '';

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Left color stripe */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: expiry ? expiry.color : '#10b981',
        borderRadius: '4px 0 0 4px',
      }} />

      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '12px 14px 12px 18px' }}>
        <div style={{ width: 38, height: 38, background: 'rgba(167,139,250,0.1)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ShieldCheck size={17} color="#a78bfa" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Vehicle + policy number */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 2 }}>
            <span style={{ fontWeight: 800, fontSize: 14, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{plateNumber}</span>
            {p.policyNumber && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 5, border: '1px solid var(--border)' }}>
                #{p.policyNumber}
              </span>
            )}
            {/* Coverage badge */}
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: 'rgba(14,165,233,0.12)', color: '#0ea5e9', border: '1px solid rgba(14,165,233,0.25)', letterSpacing: '0.04em' }}>
              {p.coverageType}
            </span>
            {!p.isActive && (
              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: 'rgba(107,114,128,0.15)', color: 'var(--text-muted)', border: '1px solid var(--border)', letterSpacing: '0.04em' }}>
                INACTIVE
              </span>
            )}
          </div>

          {/* Provider + vehicle name */}
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
            {p.provider}
            {vehicleName && <span style={{ color: 'var(--text-muted)' }}> · {vehicleName}</span>}
          </p>

          {/* Expiry chip + premium */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            {expiry && (
              <span style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                background: expiry.bg, color: expiry.color, border: `1px solid ${expiry.border}`,
              }}>
                <Calendar size={10} /> {expiry.label}
              </span>
            )}
            <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>
              {fmtRs(p.premiumAmount)} premium
            </span>
            {p.insuredValue && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>IDV {fmtRs(p.insuredValue)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Action row */}
      <div style={{ display: 'flex', gap: 7, padding: '0 14px 11px 18px' }}>
        <button onClick={() => onEdit(p)} className="btn btn-ghost btn-sm" style={{ flex: 1, padding: '6px' }}>
          <Edit2 size={12} /> Edit
        </button>
        <button onClick={() => onDelete(p)} className="btn btn-danger-ghost btn-sm" style={{ padding: '6px 12px' }}>
          <Trash2 size={12} />
        </button>
        <button onClick={() => setExpanded(e => !e)} className="btn btn-ghost btn-sm" style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)', padding: '11px 18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {[
              { label: 'Start Date',    value: fmtDate(p.startDate) },
              { label: 'Expiry Date',   value: fmtDate(p.expiryDate) },
              { label: 'Premium',       value: fmtRs(p.premiumAmount) },
              { label: 'IDV / Sum Insured', value: p.insuredValue ? fmtRs(p.insuredValue) : '—' },
              { label: 'Coverage Type', value: p.coverageType },
              { label: 'Status',        value: p.isActive ? 'Active' : 'Inactive' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</p>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</p>
              </div>
            ))}
          </div>
          {p.notes && (
            <div style={{ marginTop: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Notes</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Add / Edit Sheet ──────────────────────────────────────────────────────────

function PolicySheet({ policy, vehicles, onClose, onSaved, toast }) {
  const isEdit = !!policy;
  const [form, setForm] = useState({
    vehicleId:     policy?.vehicleId?._id || policy?.vehicleId || '',
    provider:      policy?.provider || '',
    policyNumber:  policy?.policyNumber || '',
    coverageType:  policy?.coverageType || 'Comprehensive',
    startDate:     toDateInput(policy?.startDate),
    expiryDate:    toDateInput(policy?.expiryDate),
    premiumAmount: policy?.premiumAmount?.toString() || '',
    insuredValue:  policy?.insuredValue?.toString() || '',
    notes:         policy?.notes || '',
    isActive:      policy?.isActive !== undefined ? policy.isActive : true,
  });
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    if (!form.vehicleId)     { toast('Select a vehicle', 'error'); return; }
    if (!form.provider)      { toast('Enter insurance provider', 'error'); return; }
    if (!form.startDate)     { toast('Enter start date', 'error'); return; }
    if (!form.expiryDate)    { toast('Enter expiry date', 'error'); return; }
    if (!form.premiumAmount) { toast('Enter premium amount', 'error'); return; }

    setSaving(true);
    try {
      const body = {
        vehicleId:    form.vehicleId,
        provider:     form.provider,
        policyNumber: form.policyNumber,
        coverageType: form.coverageType,
        startDate:    form.startDate,
        expiryDate:   form.expiryDate,
        premiumAmount: parseFloat(form.premiumAmount),
        insuredValue:  form.insuredValue ? parseFloat(form.insuredValue) : null,
        notes:        form.notes,
        isActive:     form.isActive,
      };

      if (isEdit) await api.put(`/admin/insurance/${policy._id || policy.id}`, body);
      else        await api.post('/admin/insurance', body);

      toast(isEdit ? 'Policy updated ✓' : 'Policy added ✓', 'success');
      onSaved();
    } catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="sheet-handle" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px 14px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
          <div style={{ width: 32, height: 32, background: 'rgba(167,139,250,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={16} color="#a78bfa" />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800 }}>{isEdit ? 'Edit Insurance Policy' : 'Add Insurance Policy'}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Expiry date auto-syncs to vehicle analytics & alerts</p>
          </div>
        </div>

        <form onSubmit={save} style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Vehicle selector */}
          <div className="input-group">
            <label className="input-label">Vehicle *</label>
            <select className="input-field" value={form.vehicleId} onChange={set('vehicleId')} disabled={isEdit}>
              <option value="">— Select vehicle —</option>
              {vehicles.map(v => (
                <option key={v.id || v._id} value={v.id || v._id}>
                  {v.plateNumber} — {v.make} {v.model} ({v.year})
                </option>
              ))}
            </select>
            {isEdit && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>Vehicle cannot be changed after creation</p>}
          </div>

          {/* Provider */}
          <div className="input-group">
            <label className="input-label">Insurance Provider *</label>
            <input className="input-field" value={form.provider} onChange={set('provider')} placeholder="e.g. HDFC ERGO, Bajaj Allianz, ICICI Lombard..." />
          </div>

          {/* Policy number + coverage type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="input-group">
              <label className="input-label">Policy Number</label>
              <input className="input-field" value={form.policyNumber} onChange={set('policyNumber')} placeholder="Optional" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }} />
            </div>
            <div className="input-group">
              <label className="input-label">Coverage Type</label>
              <select className="input-field" value={form.coverageType} onChange={set('coverageType')}>
                {COVERAGE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="input-group">
              <label className="input-label">Start Date *</label>
              <input className="input-field" type="date" value={form.startDate} onChange={set('startDate')} />
            </div>
            <div className="input-group">
              <label className="input-label">Expiry Date *</label>
              <input className="input-field" type="date" value={form.expiryDate} onChange={set('expiryDate')} />
            </div>
          </div>

          {/* Premium + IDV */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="input-group">
              <label className="input-label">Premium Amount (₹) *</label>
              <input className="input-field" type="number" value={form.premiumAmount} onChange={set('premiumAmount')} placeholder="e.g. 25000" min="0" step="1" />
            </div>
            <div className="input-group">
              <label className="input-label">IDV / Sum Insured (₹)</label>
              <input className="input-field" type="number" value={form.insuredValue} onChange={set('insuredValue')} placeholder="Optional" min="0" step="1" />
            </div>
          </div>

          {/* Notes */}
          <div className="input-group">
            <label className="input-label">Notes (optional)</label>
            <input className="input-field" value={form.notes} onChange={set('notes')} placeholder="Renewal reminder, broker contact..." />
          </div>

          {/* Active toggle for edits */}
          {isEdit && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-elevated)', borderRadius: 10, padding: '10px 12px', border: '1px solid var(--border)' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700 }}>Active Policy</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Inactive policies won't affect vehicle expiry date</p>
              </div>
              <div
                onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                style={{
                  width: 42, height: 24, borderRadius: 12, cursor: 'pointer',
                  background: form.isActive ? '#10b981' : 'var(--border)',
                  position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                }}
              >
                <div style={{
                  position: 'absolute', top: 3, left: form.isActive ? 21 : 3,
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} />
              </div>
            </div>
          )}

          <div style={{ background: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.2)', borderRadius: 8, padding: '8px 10px', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <ShieldAlert size={12} color="#0ea5e9" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 11, color: '#0ea5e9', lineHeight: 1.5 }}>
              Vehicle's insurance expiry will be automatically updated to the latest active policy's expiry date. Alerts and analytics will reflect this.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 9, marginTop: 4, paddingBottom: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2 }}>
              {saving ? <><span className="spinner" /> Saving...</> : isEdit ? 'Save Changes' : 'Add Policy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InsuranceManager({ admin, onLogout, onNavigate }) {
  const toast = useToast();
  const [policies, setPolicies] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('all'); // all | expiring | expired | active
  const [sheet, setSheet]       = useState(null);  // null | 'create' | policy object

  useEffect(() => {
    load();
    loadVehicles();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/admin/insurance');
      setPolicies(res.data || []);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadVehicles() {
    try {
      const res = await api.get('/admin/vehicles?page=1&limit=200');
      setVehicles(res.data || []);
    } catch {}
  }

  async function deletePolicy(p) {
    const plate = p.vehicleId?.plateNumber || '';
    if (!confirm(`Delete insurance policy for ${plate}?\nThis will clear the vehicle's insurance expiry date.`)) return;
    try {
      await api.delete(`/admin/insurance/${p._id || p.id}`);
      toast('Policy deleted ✓', 'success');
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  // Filter + search
  const filtered = policies.filter(p => {
    // Search
    const q = search.toLowerCase();
    if (q) {
      const plate    = p.vehicleId?.plateNumber?.toLowerCase() || '';
      const provider = p.provider?.toLowerCase() || '';
      const policyNo = p.policyNumber?.toLowerCase() || '';
      if (!plate.includes(q) && !provider.includes(q) && !policyNo.includes(q)) return false;
    }
    // Filter
    if (filter === 'active') return p.isActive && getExpiryInfo(p.expiryDate)?.type !== 'expired';
    if (filter === 'expired') {
      const info = getExpiryInfo(p.expiryDate);
      return info?.type === 'expired';
    }
    if (filter === 'expiring') {
      const info = getExpiryInfo(p.expiryDate);
      return info && (info.type === 'critical' || info.type === 'today' || info.type === 'warning');
    }
    return true;
  });

  const expiringSoon = policies.filter(p => {
    const info = getExpiryInfo(p.expiryDate);
    return p.isActive && info && (info.type === 'critical' || info.type === 'today');
  }).length;

  return (
    <div className="page-wrapper page-enter">
      {/* Header */}
      <div className="page-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: 'rgba(167,139,250,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={16} color="#a78bfa" />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800 }}>Insurance</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {policies.length} {policies.length === 1 ? 'policy' : 'policies'}
              {expiringSoon > 0 && <span style={{ color: '#f59e0b', fontWeight: 700 }}> · {expiringSoon} expiring</span>}
            </p>
          </div>
        </div>
        <button
          className="btn btn-primary btn-sm"
          style={{ width: 'auto', padding: '8px 14px' }}
          onClick={() => setSheet('create')}
        >
          <Plus size={14} /> Add Policy
        </button>
      </div>

      <div className="page-content">
        {/* Summary strip */}
        {!loading && policies.length > 0 && <SummaryStrip policies={policies} />}

        {/* Search */}
        <div className="search-wrap">
          <Search size={15} />
          <input
            className="search-bar"
            placeholder="Search by plate, provider or policy no..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {[
            { key: 'all',      label: 'All' },
            { key: 'expiring', label: '⚠ Expiring' },
            { key: 'expired',  label: '🔴 Expired' },
            { key: 'active',   label: '✓ Active' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                background: filter === key ? 'var(--accent)' : 'var(--bg-elevated)',
                color: filter === key ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <span className="spinner" style={{ width: 28, height: 28 }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <ShieldOff size={36} style={{ color: 'var(--text-muted)', opacity: 0.35 }} />
            <p className="empty-title">
              {policies.length === 0 ? 'No insurance policies yet' : 'No policies match filter'}
            </p>
            <p className="empty-desc">
              {policies.length === 0
                ? 'Add policies to track premiums and get expiry alerts. Vehicle analytics will auto-update.'
                : 'Try changing your search or filter.'}
            </p>
            {policies.length === 0 && (
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setSheet('create')}>
                <Plus size={13} /> Add First Policy
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(p => (
              <PolicyCard
                key={p._id || p.id}
                policy={p}
                onEdit={p => setSheet(p)}
                onDelete={deletePolicy}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sheet */}
      {sheet && (
        <PolicySheet
          policy={sheet === 'create' ? null : sheet}
          vehicles={vehicles}
          onClose={() => setSheet(null)}
          onSaved={() => { setSheet(null); load(); }}
          toast={toast}
        />
      )}
    </div>
  );
}

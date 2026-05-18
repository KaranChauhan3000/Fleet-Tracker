// MonthlyObligations.jsx — This month's active EMIs
import { useState, useEffect } from 'react';
import { api, fmtRs } from './api.js';
import { useToast } from './Toast.jsx';
import {
  ArrowLeft, CreditCard, CheckCircle2, Calendar,
  BadgeIndianRupee,
} from 'lucide-react';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function getStatus(entry) {
  if (entry.emisPaid >= entry.totalEmis) return 'done';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const emiDate = new Date(today.getFullYear(), today.getMonth(), entry.emiDay);
  if (emiDate < today) emiDate.setMonth(emiDate.getMonth() + 1);
  const daysLeft = Math.round((emiDate - today) / 86400000);
  if (daysLeft <= 3) return 'overdue';
  if (daysLeft <= 7) return 'warning';
  return 'active';
}

function getNextEmiDate(emiDay) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(today.getFullYear(), today.getMonth(), emiDay);
  if (d < today) d.setMonth(d.getMonth() + 1);
  return d;
}

function ObligationCard({ entry, onMarkPaid }) {
  const status = getStatus(entry);
  const isDone = status === 'done';

  const now    = new Date();
  const start  = entry.startDate ? new Date(entry.startDate) : null;
  const end    = entry.endDate   ? new Date(entry.endDate)   : null;

  // Auto-calculate emisPaid from startDate when available
  const emisPaid = (() => {
    if (entry.emisPaid >= entry.totalEmis) return entry.totalEmis;
    if (start) {
      const monthsElapsed =
        (now.getFullYear() - start.getFullYear()) * 12 +
        (now.getMonth() - start.getMonth());
      return Math.min(Math.max(0, monthsElapsed), entry.totalEmis);
    }
    return entry.emisPaid;
  })();

  const emisLeft   = entry.totalEmis - emisPaid;
  const pct        = entry.totalEmis > 0 ? Math.round((emisPaid / entry.totalEmis) * 100) : 0;
  const amountPaid = emisPaid * entry.emiAmount;
  const amountLeft = emisLeft * entry.emiAmount;

  // Next EMI date & urgency colour
  const nextEmi  = getNextEmiDate(entry.emiDay);
  const today0   = new Date(); today0.setHours(0, 0, 0, 0);
  const daysToEmi = Math.round((nextEmi - today0) / 86400000);
  const emiColor  = isDone ? '#22c55e'
    : daysToEmi <= 3 ? '#ef4444'
    : daysToEmi <= 7 ? '#f59e0b'
    : '#22c55e';

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '13px 14px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: 'rgba(99,102,241,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <CreditCard size={13} color="#6366f1" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vehicle Finance</p>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginTop: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            {entry.vehicleId?.plateNumber
              ? `${entry.vehicleId.plateNumber}${entry.lenderName ? ' · ' + entry.lenderName : ''}`
              : (entry.lenderName || '—')}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {!isDone && (
            <button
              onClick={() => onMarkPaid(entry)}
              style={{
                width: 28, height: 28, borderRadius: 7,
                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
              }}
              title="Mark EMI Paid"
            >
              <CheckCircle2 size={13} color="#22c55e" />
            </button>
          )}
          <span style={{
            fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 6,
            background: isDone ? 'rgba(34,197,94,0.12)' : 'rgba(99,102,241,0.12)',
            color: isDone ? '#22c55e' : '#6366f1',
            border: `1px solid ${isDone ? 'rgba(34,197,94,0.25)' : 'rgba(99,102,241,0.25)'}`,
          }}>
            {isDone ? 'PAID OFF' : 'ACTIVE'}
          </span>
        </div>
      </div>

      {/* Loan amount + progress */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
          <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {fmtRs(entry.loanAmount)}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Loan Amount</span>
        </div>
        <div style={{ height: 7, background: 'var(--bg-elevated)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: 4, transition: 'width 0.4s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 10, color: '#8b5cf6', fontWeight: 700 }}>{emisPaid}/{entry.totalEmis} EMIs paid ({pct}%)</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{emisLeft} remaining</span>
        </div>
      </div>

      {/* Monthly EMI + Next due */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Monthly EMI</p>
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{fmtRs(entry.emiAmount)}</p>
        </div>
        <div style={{ padding: '8px 10px', borderRadius: 8, background: `${emiColor}0f`, border: `1px solid ${emiColor}30` }}>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Next EMI Due</p>
          <p style={{ fontSize: 15, fontWeight: 800, color: isDone ? '#22c55e' : emiColor }}>
            {isDone ? 'Paid Off' : daysToEmi === 0 ? 'Today' : daysToEmi === 1 ? 'Tomorrow' : `${daysToEmi}d`}
          </p>
          {!isDone && (
            <p style={{ fontSize: 9, color: emiColor, fontWeight: 600, marginTop: 1 }}>
              {nextEmi.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} · Day {entry.emiDay}
            </p>
          )}
        </div>
      </div>

      {/* Paid so far / Outstanding */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Paid So Far</p>
          <p style={{ fontSize: 14, fontWeight: 800, color: '#22c55e' }}>{fmtRs(amountPaid)}</p>
        </div>
        <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Outstanding</p>
          <p style={{ fontSize: 14, fontWeight: 800, color: isDone ? 'var(--text-muted)' : '#ef4444' }}>{isDone ? '—' : fmtRs(amountLeft)}</p>
        </div>
      </div>

      {/* Meta chips: interest, date range, vehicle info, notes */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {entry.interestRate != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Interest: {entry.interestRate}% p.a.</span>
          </div>
        )}
        {start && end && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <Calendar size={10} color="var(--text-muted)" />
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
              {start.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} – {end.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
            </span>
          </div>
        )}
        {entry.vehicleId?.make && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
              {entry.vehicleId.make} {entry.vehicleId.model}
            </span>
          </div>
        )}
        {entry.notes && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{entry.notes}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MonthlyObligations({ onBack }) {
  const toast = useToast();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const monthLabel = MONTH_NAMES[now.getMonth()];

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const fin = await api.fresh('/admin/finance');
      setEntries(fin.entries || []);
    } catch {
      toast('Failed to load finance data', 'error');
    } finally {
      setLoading(false);
    }
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

  // Active entries only (not fully paid off)
  const activeEntries = entries.filter(e => e.emisPaid < e.totalEmis);
  const totalObligation = activeEntries.reduce((s, e) => s + e.emiAmount, 0);

  // Sort: overdue first → warning → active
  const ORDER = { overdue: 0, warning: 1, active: 2, done: 3 };
  const sorted = [...activeEntries].sort((a, b) => ORDER[getStatus(a)] - ORDER[getStatus(b)]);

  const overdueCount = sorted.filter(e => getStatus(e) === 'overdue').length;
  const warningCount = sorted.filter(e => getStatus(e) === 'warning').length;

  return (
    <div className="page-wrapper page-enter">

      {/* Header */}
      <div className="page-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn-icon" onClick={onBack}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Finance</p>
            <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              {monthLabel} Obligations
            </p>
          </div>
        </div>
      </div>

      <div className="page-content">

        {/* Summary banner */}
        {!loading && activeEntries.length > 0 && (
          <div style={{
            background: 'var(--accent)', borderRadius: 'var(--radius)',
            padding: '14px 16px', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', right: -20, top: -20, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {monthLabel} Total EMI Obligation
            </p>
            <p style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', marginTop: 2 }}>
              {fmtRs(totalObligation)}
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.75)', background: 'rgba(0,0,0,0.15)', padding: '2px 8px', borderRadius: 10 }}>
                {activeEntries.length} active loan{activeEntries.length !== 1 ? 's' : ''}
              </span>
              {overdueCount > 0 && (
                <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: 'rgba(220,38,38,0.55)', padding: '2px 8px', borderRadius: 10 }}>
                  ⚠ {overdueCount} due soon
                </span>
              )}
              {warningCount > 0 && (
                <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: 'rgba(217,119,6,0.45)', padding: '2px 8px', borderRadius: 10 }}>
                  🕐 {warningCount} upcoming
                </span>
              )}
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <span className="spinner" style={{ width: 22, height: 22 }} />
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={36} color="var(--success)" style={{ marginBottom: 10, opacity: 0.6 }} />
            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--success)' }}>No pending EMIs!</p>
            <p style={{ fontSize: 12, marginTop: 5 }}>All loans are fully paid off this month.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sorted.map(entry => (
              <ObligationCard
                key={entry._id}
                entry={entry}
                onMarkPaid={handleMarkPaid}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

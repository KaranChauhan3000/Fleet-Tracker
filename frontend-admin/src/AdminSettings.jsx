import { useState, useEffect } from 'react';
import { api } from './api.js';
import { useToast } from './Toast.jsx';
import { ArrowLeft, Save, Clock, Calendar, Briefcase, Crown } from 'lucide-react';
import MembershipSettings from './MembershipSettings.jsx';

const DAYS = [
  { key: '1', label: 'Monday',    short: 'Mon' },
  { key: '2', label: 'Tuesday',   short: 'Tue' },
  { key: '3', label: 'Wednesday', short: 'Wed' },
  { key: '4', label: 'Thursday',  short: 'Thu' },
  { key: '5', label: 'Friday',    short: 'Fri' },
  { key: '6', label: 'Saturday',  short: 'Sat' },
  { key: '0', label: 'Sunday',    short: 'Sun' },
];

function fmt12(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

// ── Time Input ─────────────────────────────────────────────────────────────────
function TimeInput({ label, value, onChange }) {
  return (
    <div style={{ flex: 1 }}>
      <p style={{
        fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
      }}>
        {label}
      </p>
      <input
        type="time"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '10px 12px', boxSizing: 'border-box',
          background: 'var(--bg-elevated)',
          border: '1.5px solid var(--border)',
          borderRadius: 10,
          color: 'var(--text-primary)',
          fontSize: 15, fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          outline: 'none',
        }}
      />
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontWeight: 600 }}>
        {fmt12(value)}
      </p>
    </div>
  );
}

// ── Day Card ───────────────────────────────────────────────────────────────────
// Layout: top row = day info, bottom row = 3 equal mode buttons
function DayCard({ day, mode, customStart, customEnd, defaultStart, defaultEnd, onChange }) {
  const isHoliday = mode === 'holiday';
  const isCustom  = mode === 'custom';

  const accentColor = isHoliday ? '#f59e0b' : isCustom ? 'var(--accent)' : 'var(--success)';
  const accentBg    = isHoliday ? 'rgba(245,158,11,0.10)' : isCustom ? 'var(--accent-dim)' : 'rgba(34,197,94,0.08)';

  const timeLabel = isHoliday
    ? 'Holiday — day off'
    : isCustom
      ? `${fmt12(customStart || defaultStart)} – ${fmt12(customEnd || defaultEnd)}`
      : `${fmt12(defaultStart)} – ${fmt12(defaultEnd)}`;

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      overflow: 'hidden',
    }}>

      {/* Row 1 — Day info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: accentBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <p style={{ fontSize: 11, fontWeight: 900, color: accentColor }}>
            {day.short}
          </p>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
            {day.label}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {timeLabel}
          </p>
        </div>
      </div>

      {/* Row 2 — Mode selector: 3 equal buttons */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: 6, padding: '0 14px 12px',
      }}>
        {[
          { id: 'work',    label: 'Working',  color: 'var(--success)', bg: 'rgba(34,197,94,0.10)' },
          { id: 'holiday', label: 'Holiday',  color: '#f59e0b',        bg: 'rgba(245,158,11,0.10)' },
          { id: 'custom',  label: 'Custom',   color: 'var(--accent)',  bg: 'var(--accent-dim)' },
        ].map(opt => {
          const active = mode === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onChange({ mode: opt.id, customStart, customEnd })}
              style={{
                padding: '7px 4px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s',
                background: active ? opt.bg : 'var(--bg-elevated)',
                color: active ? opt.color : 'var(--text-muted)',
                border: active
                  ? `1.5px solid ${opt.color}50`
                  : '1.5px solid var(--border)',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Row 3 — Custom time pickers (only when Custom is selected) */}
      {isCustom && (
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: '12px 14px',
          display: 'flex', gap: 12,
          background: 'var(--bg-elevated)',
        }}>
          <TimeInput
            label="Start"
            value={customStart || defaultStart}
            onChange={val => onChange({ mode: 'custom', customStart: val, customEnd })}
          />
          <TimeInput
            label="End"
            value={customEnd || defaultEnd}
            onChange={val => onChange({ mode: 'custom', customStart, customEnd: val })}
          />
        </div>
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function AdminSettings({ admin, onBack, onGetMembership }) {
  const [activeTab, setActiveTab] = useState('timing'); // 'timing' | 'membership'
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [start,   setStart]   = useState('09:00');
  const [end,     setEnd]     = useState('18:00');
  const [dayConfig, setDayConfig] = useState({});

  useEffect(() => {
    api.get('/admin/company-settings')
      .then(r => {
        const ot  = r.officeTiming || {};
        setStart(ot.startTime || '09:00');
        setEnd(ot.endTime     || '18:00');
        const ovr = ot.overrides instanceof Map
          ? Object.fromEntries(ot.overrides)
          : (ot.overrides || {});
        const cfg = {};
        for (const day of DAYS) {
          const o = ovr[day.key];
          if (o?.holiday)      cfg[day.key] = { mode: 'holiday', customStart: '09:00', customEnd: '18:00' };
          else if (o?.enabled) cfg[day.key] = { mode: 'custom',  customStart: o.startTime, customEnd: o.endTime };
          else                 cfg[day.key] = { mode: 'work',    customStart: '09:00', customEnd: '18:00' };
        }
        setDayConfig(cfg);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function getCfg(key) {
    return dayConfig[key] || { mode: 'work', customStart: start, customEnd: end };
  }

  function setDay(key, val) {
    setDayConfig(prev => ({ ...prev, [key]: val }));
  }

  async function save() {
    if (start >= end) {
      toast('End time must be after start time', 'error'); return;
    }
    for (const day of DAYS) {
      const cfg = getCfg(day.key);
      if (cfg.mode === 'custom') {
        const s = cfg.customStart || start;
        const e = cfg.customEnd   || end;
        if (s >= e) { toast(`${day.label}: end time must be after start time`, 'error'); return; }
      }
    }

    const overrides = {};
    for (const day of DAYS) {
      const cfg = getCfg(day.key);
      if (cfg.mode === 'holiday') {
        overrides[day.key] = { enabled: false, holiday: true,  startTime: '09:00', endTime: '18:00' };
      } else if (cfg.mode === 'custom') {
        overrides[day.key] = { enabled: true,  holiday: false, startTime: cfg.customStart || start, endTime: cfg.customEnd || end };
      } else {
        overrides[day.key] = { enabled: false, holiday: false, startTime: start, endTime: end };
      }
    }

    setSaving(true);
    try {
      await api.put('/admin/company-settings', {
        officeTiming: { enabled: true, startTime: start, endTime: end, overrides },
      });
      toast('Office timing saved', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const workDays    = DAYS.filter(d => getCfg(d.key).mode === 'work').length;
  const holidayDays = DAYS.filter(d => getCfg(d.key).mode === 'holiday').length;
  const customDays  = DAYS.filter(d => getCfg(d.key).mode === 'custom').length;

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <span className="spinner" style={{ width: 28, height: 28 }} />
    </div>
  );

  return (
    <div className="page-wrapper page-enter">

      {/* ── Header ── */}
      <div className="page-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="btn btn-ghost btn-sm"
            style={{ padding: '6px 8px', width: 'auto' }}
            onClick={onBack}
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{
            width: 34, height: 34,
            background: 'linear-gradient(135deg,#EA580C,#F97316)',
            borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Briefcase size={16} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
              Office Timing
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {admin?.companyName || 'Company settings'}
            </p>
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={save}
          disabled={saving}
          style={{ padding: '8px 18px', fontSize: 13, width: 'auto', gap: 6, flexShrink: 0 }}
        >
          {saving
            ? <span className="spinner" style={{ width: 14, height: 14 }} />
            : <Save size={14} />}
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display:'flex', gap:0, padding:'0 16px 0',
        borderBottom:'1px solid var(--border)', flexShrink:0, marginBottom:0 }}>
        {[
          { id:'timing',     label:'Office Timing', icon:Clock  },
          { id:'membership', label:'Membership',     icon:Crown  },
        ].map(({ id, label, icon:Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{
              flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6,
              padding:'10px 4px', fontSize:12, fontWeight:700, cursor:'pointer',
              border:'none', background:'none',
              color: activeTab === id ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: activeTab === id ? '2px solid var(--accent)' : '2px solid transparent',
            }}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {activeTab === 'membership' ? (
        <div className="page-content">
          <MembershipSettings admin={admin} onGetMembership={onGetMembership} />
        </div>
      ) : (
        <div className="page-content">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: 'Working',  value: workDays,    color: 'var(--success)', bg: 'rgba(34,197,94,0.08)',    border: 'rgba(34,197,94,0.20)' },
            { label: 'Holidays', value: holidayDays, color: '#f59e0b',        bg: 'rgba(245,158,11,0.08)',   border: 'rgba(245,158,11,0.20)' },
            { label: 'Custom',   value: customDays,  color: 'var(--accent)',  bg: 'var(--accent-dim)',       border: 'rgba(249,115,22,0.20)' },
          ].map(s => (
            <div key={s.label} style={{
              background: s.bg,
              border: `1px solid ${s.border}`,
              borderRadius: 12, padding: '10px 12px',
            }}>
              <p style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</p>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* ── Default hours card ── */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 16, overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '13px 16px',
            borderBottom: '1px solid var(--border)',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--accent-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Clock size={16} color="var(--accent)" />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                Default Office Hours
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Applies to all days set as Working
              </p>
            </div>
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', gap: 14 }}>
            <TimeInput label="Start Time" value={start} onChange={setStart} />
            <TimeInput label="End Time"   value={end}   onChange={setEnd} />
          </div>
        </div>

        {/* ── Weekly schedule ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Calendar size={14} color="var(--text-muted)" />
            <p style={{
              fontSize: 12, fontWeight: 800, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Weekly Schedule
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DAYS.map(day => {
              const cfg = getCfg(day.key);
              return (
                <DayCard
                  key={day.key}
                  day={day}
                  mode={cfg.mode}
                  customStart={cfg.customStart}
                  customEnd={cfg.customEnd}
                  defaultStart={start}
                  defaultEnd={end}
                  onChange={val => setDay(day.key, val)}
                />
              );
            })}
          </div>
        </div>

        {/* ── Bottom save ── */}
        <button
          className="btn btn-primary"
          onClick={save}
          disabled={saving}
          style={{ marginTop: 4 }}
        >
          {saving
            ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Saving…</>
            : <><Save size={16} /> Save Office Timing</>}
        </button>

      </div>
      )} {/* end timing tab */}
    </div>
  );
}

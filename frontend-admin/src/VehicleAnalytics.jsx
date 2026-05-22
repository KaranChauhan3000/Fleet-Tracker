import { useState, useEffect, useRef } from 'react';
import DocManager from './DocManager.jsx';
import { api, fmtRs, fmt, fmtDate, fmtDT } from './api.js';
import { pcGet } from './persistCache.js';
import {
  ArrowLeft, Car, Fuel, TrendingUp, TrendingDown, Gauge, MapPin,
  BarChart2, Activity, DollarSign, CheckCircle, Wrench, XCircle,
  AlertTriangle, Plus, User, Calendar, ChevronLeft, ChevronRight,
  List, Edit2, Trash2, Navigation, IndianRupee, Clock, ShieldAlert, FileText, CreditCard
} from 'lucide-react';

// ─── Expiry Animation Styles ─────────────────────────────────────────────────
const analyticsExpiryStyles = `
@keyframes va_slideDown {
  0%{transform:translateY(-8px);opacity:0} 100%{transform:translateY(0);opacity:1}
}
@keyframes va_urgentBlink {
  0%,100%{opacity:1} 50%{opacity:0.45}
}
@keyframes va_pulseRed {
  0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.35)} 50%{box-shadow:0 0 0 5px rgba(239,68,68,0.07)}
}
@keyframes va_pulseYellow {
  0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0.28)} 50%{box-shadow:0 0 0 4px rgba(245,158,11,0.06)}
}
`;

// ─── 10-Square Full-Width Bar ─────────────────────────────────────────────────
function VATenBar({ daysLeft, isExpired }) {
  const getColor = (i) => {
    const days = isExpired ? 0 : Math.max(0, Math.min(daysLeft, 10));
    const activeStart = 10 - days;
    if (i < activeStart) return '#ef4444';
    const posFromRight = 9 - i;
    if (posFromRight <= 1) return '#22c55e';
    if (posFromRight <= 4) return '#f59e0b';
    return '#ef4444';
  };
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} style={{
          flex: 1, height: 9, borderRadius: 3,
          background: getColor(i),
          transition: 'background 0.3s',
          animation: (isExpired || daysLeft <= 2) && getColor(i) === '#ef4444' ? 'va_urgentBlink 1.2s ease-in-out infinite' : 'none',
        }} />
      ))}
    </div>
  );
}

function ExpiryBanner({ vehicle }) {
  if (!vehicle?.pollutionExpiry) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const exp = new Date(vehicle.pollutionExpiry); exp.setHours(0,0,0,0);
  const daysLeft = Math.round((exp - today) / 86400000);
  if (daysLeft > 10) return null;
  const isExpired  = daysLeft < 0;
  const isCritical = !isExpired && daysLeft <= 3;
  const isWarning  = !isExpired && !isCritical && daysLeft <= 7;
  const daysAbs    = Math.abs(daysLeft);
  const color = isExpired || isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#22c55e';
  const bg    = isExpired ? 'rgba(239,68,68,0.07)' : isCritical ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)';
  const anim  = isExpired
    ? 'va_pulseRed 1.5s ease-in-out infinite, va_slideDown 0.35s ease'
    : isCritical
    ? 'va_pulseRed 2s ease-in-out infinite, va_slideDown 0.35s ease'
    : 'va_pulseYellow 2.5s ease-in-out infinite, va_slideDown 0.35s ease';

  return (
    <div style={{ margin: '0 16px', borderRadius: 12, border: `1px solid ${color}38`, background: bg, animation: anim, overflow: 'hidden' }}>
      <style>{analyticsExpiryStyles}</style>
      <div style={{ padding: '10px 14px 9px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 12, color, flex: 1 }}>PUC Certificate</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {isExpired ? `Expired ${daysAbs}d ago` : daysLeft === 0 ? 'Expires TODAY' : `Expires in ${daysLeft}d`}
          </span>
          <span style={{
            fontSize: 9, fontWeight: 900, padding: '2px 8px', borderRadius: 5,
            background: `${color}20`, color, border: `1px solid ${color}40`,
            letterSpacing: '0.05em',
            animation: isExpired ? 'va_urgentBlink 1.2s ease-in-out infinite' : 'none',
          }}>
            {isExpired ? 'EXPIRED' : isCritical ? 'CRITICAL' : 'EXPIRING'}
          </span>
        </div>
        <VATenBar daysLeft={daysLeft} isExpired={isExpired} />
      </div>
    </div>
  );
}

function InsuranceBanner({ vehicle, onNavigate }) {
  if (!vehicle?.insuranceExpiry) {
    // Show a soft nudge to add a policy
    return (
      <div style={{ margin: '0 16px', borderRadius: 12, border: '1px solid rgba(167,139,250,0.25)', background: 'rgba(167,139,250,0.05)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <ShieldAlert size={16} color="#a78bfa" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa' }}>No Insurance Policy Linked</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Add a policy via Quick Actions → Insurance to track expiry & premium</p>
        </div>
      </div>
    );
  }
  const today = new Date(); today.setHours(0,0,0,0);
  const exp = new Date(vehicle.insuranceExpiry); exp.setHours(0,0,0,0);
  const daysLeft = Math.round((exp - today) / 86400000);
  if (daysLeft > 10) return null;
  const isExpired  = daysLeft < 0;
  const isCritical = !isExpired && daysLeft <= 3;
  const isWarning  = !isExpired && !isCritical && daysLeft <= 7;
  const daysAbs    = Math.abs(daysLeft);
  const color = isExpired || isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#22c55e';
  const bg    = isExpired ? 'rgba(239,68,68,0.07)' : isCritical ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)';
  const anim  = isExpired
    ? 'va_pulseRed 1.5s ease-in-out infinite, va_slideDown 0.35s ease'
    : isCritical
    ? 'va_pulseRed 2s ease-in-out infinite, va_slideDown 0.35s ease'
    : 'va_pulseYellow 2.5s ease-in-out infinite, va_slideDown 0.35s ease';

  return (
    <div style={{ margin: '0 16px', borderRadius: 12, border: `1px solid ${color}38`, background: bg, animation: anim, overflow: 'hidden' }}>
      <style>{analyticsExpiryStyles}</style>
      <div style={{ padding: '10px 14px 9px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 12, color, flex: 1 }}>Insurance</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {isExpired ? `Expired ${daysAbs}d ago` : daysLeft === 0 ? 'Expires TODAY' : `Expires in ${daysLeft}d`}
          </span>
          <span style={{
            fontSize: 9, fontWeight: 900, padding: '2px 8px', borderRadius: 5,
            background: `${color}20`, color, border: `1px solid ${color}40`,
            letterSpacing: '0.05em',
            animation: isExpired ? 'va_urgentBlink 1.2s ease-in-out infinite' : 'none',
          }}>
            {isExpired ? 'EXPIRED' : isCritical ? 'CRITICAL' : 'EXPIRING'}
          </span>
        </div>
        <VATenBar daysLeft={daysLeft} isExpired={isExpired} />
      </div>
    </div>
  );
}

// ─── SVG Charts ──────────────────────────────────────────────────────────────

function LineChart({ data, color = '#0EA5E9', height = 120, targetLine = null, yLabel = v => v }) {
  if (!data || data.length < 2) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Not enough data</div>;
  const valid = data.filter(d => d != null);
  if (valid.length < 2) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Not enough data</div>;

  const w = 320, h = height;
  const pad = { t: 10, r: 8, b: 28, l: 44 };
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;

  const allVals = [...valid, ...(targetLine != null ? [targetLine] : [])];
  const min = Math.min(...allVals) * 0.92;
  const max = Math.max(...allVals) * 1.05;
  const range = max - min || 1;

  const pts = data.map((v, i) => ({
    x: pad.l + (i / (data.length - 1)) * iw,
    y: v != null ? pad.t + (1 - (v - min) / range) * ih : null,
    v,
  }));

  const pathD = pts.reduce((acc, p, i) => {
    if (p.y == null) return acc;
    const prev = pts.slice(0, i).reverse().find(q => q.y != null);
    if (!acc) return `M ${p.x} ${p.y}`;
    if (!prev) return acc + ` M ${p.x} ${p.y}`;
    const cx = (prev.x + p.x) / 2;
    return acc + ` C ${cx} ${prev.y} ${cx} ${p.y} ${p.x} ${p.y}`;
  }, '');

  const validPts = pts.filter(p => p.y != null);
  const areaD = pathD + ` L ${validPts[validPts.length - 1].x} ${pad.t + ih} L ${pad.l} ${pad.t + ih} Z`;
  const targetY = targetLine != null ? pad.t + (1 - (targetLine - min) / range) * ih : null;
  const yTicks = Array.from({ length: 5 }, (_, i) => ({ val: min + (range * i) / 4, y: pad.t + ih - (i / 4) * ih }));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`g${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={pad.l} x2={pad.l + iw} y1={t.y} y2={t.y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          <text x={pad.l - 4} y={t.y + 4} textAnchor="end" fontSize="9" fill="var(--text-muted)">{yLabel(t.val)}</text>
        </g>
      ))}
      {targetY != null && <line x1={pad.l} x2={pad.l + iw} y1={targetY} y2={targetY} stroke="#6B7A90" strokeWidth="1.2" strokeDasharray="4 4" />}
      <path d={areaD} fill={`url(#g${color.replace('#','')})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {validPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} stroke="var(--bg-card)" strokeWidth="1.5" />)}
    </svg>
  );
}

function BarChart({ data, color = '#10B981', height = 120, yLabel = v => v, labels = [] }) {
  if (!data || data.length === 0) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No data</div>;
  const w = 320, h = height;
  const pad = { t: 10, r: 8, b: 28, l: 50 };
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const max = Math.max(...data.filter(v => v != null), 1) * 1.1;
  const barW = (iw / data.length) * 0.6;
  const gap  = iw / data.length;
  const yTicks = Array.from({ length: 5 }, (_, i) => ({ val: (max * i) / 4, y: pad.t + ih - (i / 4) * ih }));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height }} preserveAspectRatio="none">
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={pad.l} x2={pad.l + iw} y1={t.y} y2={t.y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          <text x={pad.l - 4} y={t.y + 4} textAnchor="end" fontSize="9" fill="var(--text-muted)">{yLabel(t.val)}</text>
        </g>
      ))}
      {data.map((v, i) => {
        if (v == null) return null;
        const bh = (v / max) * ih;
        const x = pad.l + i * gap + (gap - barW) / 2;
        return (
          <g key={i}>
            <rect x={x} y={pad.t + ih - bh} width={barW} height={bh} fill={color} rx="3" opacity="0.85" />
            {labels[i] && <text x={x + barW / 2} y={pad.t + ih + 14} textAnchor="middle" fontSize="9" fill="var(--text-muted)">{labels[i]}</text>}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Fuel Logs Tab ────────────────────────────────────────────────────────────

const LOG_LIMIT = 20;

function effColor(eff) {
  if (eff == null) return 'var(--text-muted)';
  if (eff >= 8) return '#10B981';
  if (eff >= 5) return '#F59E0B';
  return '#EF4444';
}

function effLabel(eff) {
  if (eff == null) return null;
  if (eff >= 12) return 'Excellent';
  if (eff >= 8)  return 'Good';
  if (eff >= 5)  return 'Average';
  return 'Poor';
}

function FuelLogsTab({ vehicleId, vehicle, users, toast, onRefreshAnalytics }) {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [editSheet, setEditSheet] = useState(null);

  useEffect(() => { loadLogs(page); }, [page]);

  async function loadLogs(p) {
    const path1 = `/admin/fuel-logs?vehicleId=${vehicleId}&page=${p}&limit=${LOG_LIMIT}`;
    const path2 = `/admin/vehicles/${vehicleId}/fuel-logs?limit=1`;
    // Show cached instantly
    const cached = pcGet(path1);
    if (cached && cached.data) {
      setLogs(cached.data?.data || []); setTotal(cached.data?.total || 0);
      setLoading(false);
      // Refresh in background only if stale
      if (cached.stale) {
        Promise.all([
          api.fresh(path1),
          p === 1 ? api.fresh(path2) : Promise.resolve(null),
        ]).then(([logsRes, statsRes]) => {
          setLogs(logsRes.data || []); setTotal(logsRes.total || 0);
          if (statsRes) setStats(statsRes.stats || null);
        }).catch(() => {});
      }
      return;
    }
    setLoading(true);
    try {
      const [logsRes, statsRes] = await Promise.all([
        api.get(path1),
        p === 1 ? api.get(path2) : Promise.resolve(null),
      ]);
      setLogs(logsRes.data || []);
      setTotal(logsRes.total || 0);
      if (statsRes) setStats(statsRes.stats || null);
    } catch (err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  }

  async function deleteLog(logId) {
    if (!confirm('Delete this fuel log? Calculations will be updated automatically.')) return;
    try {
      await api.delete(`/admin/fuel-logs/${logId}`);
      toast('Deleted — calculations updated ✓', 'success');
      loadLogs(page);
      onRefreshAnalytics();
    } catch (err) { toast(err.message, 'error'); }
  }

  const totalPages = Math.max(1, Math.ceil(total / LOG_LIMIT));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Stats strip */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
          {[
            { label: 'Total Fills',    val: stats.totalFills,                                          color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
            { label: 'Total Spent',    val: fmtRs(stats.totalCost),                                    color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
            { label: 'Total KM',       val: stats.totalKm ? fmt(stats.totalKm, 0) + ' km' : '—',      color: '#0EA5E9', bg: 'rgba(14,165,233,0.1)' },
            { label: 'Last Odometer',  val: stats.lastOdometer ? fmt(stats.lastOdometer, 0) + ' km' : '—', color: '#A78BFA', bg: 'rgba(167,139,250,0.1)' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}22`, borderRadius: 12, padding: '11px 13px' }}>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{s.label}</p>
              <p style={{ fontSize: 17, fontWeight: 800, color: s.color, letterSpacing: '-0.02em' }}>{s.val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Count header */}
      {!loading && total > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
            {total} log{total !== 1 ? 's' : ''} · newest first
          </p>
          {totalPages > 1 && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Page {page}/{totalPages}
            </p>
          )}
        </div>
      )}

      {/* Log cards */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <span className="spinner" style={{ width: 28, height: 28 }} />
        </div>
      ) : logs.length === 0 ? (
        <div className="empty-state" style={{ padding: 32 }}>
          <Fuel size={36} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
          <p className="empty-title">No fuel logs yet</p>
          <p className="empty-desc">Use the Add Log button above to add entries</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {logs.map((log, idx) => (
              <FuelLogCard
                key={log.id}
                log={log}
                onEdit={() => setEditSheet(log)}
                onDelete={() => deleteLog(log.id)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {(page - 1) * LOG_LIMIT + 1}–{Math.min(page * LOG_LIMIT, total)} of {total}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: '6px 12px' }}>
                  <ChevronLeft size={14} /> Prev
                </button>
                <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '6px 12px' }}>
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {editSheet && (
        <EditFuelLogSheet
          log={editSheet}
          onClose={() => setEditSheet(null)}
          onSaved={() => { setEditSheet(null); loadLogs(page); onRefreshAnalytics(); }}
          toast={toast}
        />
      )}
    </div>
  );
}

// ─── Beautiful Fuel Log Card ──────────────────────────────────────────────────

function FuelLogCard({ log, onEdit, onDelete }) {
  const eff = log.efficiency;
  const ec  = effColor(eff);
  const el  = effLabel(eff);

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      overflow: 'hidden',
    }}>
      {/* Top bar: date + driver + cost */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '11px 14px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-elevated)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div style={{ width: 32, height: 32, background: 'rgba(245,158,11,0.12)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Fuel size={15} color="#F59E0B" />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
              {fmtDate(log.filledAt)}
            </p>
            {log.userName && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
                <User size={10} /> {log.userName}
              </p>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: 16, fontWeight: 900, color: '#10B981', letterSpacing: '-0.02em' }}>{fmtRs(log.totalCost)}</p>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{fmt(log.litres, 1)}L @ ₹{fmt(log.costPerLitre, 1)}/L</p>
        </div>
      </div>

      {/* Main metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: eff != null ? 'repeat(3,1fr)' : 'repeat(2,1fr)', borderBottom: '1px solid var(--border)' }}>
        {/* Odometer */}
        <div style={{ padding: '10px 14px', borderRight: '1px solid var(--border)' }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Odometer</p>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {fmt(log.odometer, 0)} <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>km</span>
          </p>
        </div>

        {/* KM driven — only if available */}
        {log.kmDriven != null && log.kmDriven > 0 ? (
          <div style={{ padding: '10px 14px', borderRight: eff != null ? '1px solid var(--border)' : 'none' }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>KM Driven</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B' }}>
              {fmt(log.kmDriven, 0)} <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>km</span>
            </p>
          </div>
        ) : (
          <div style={{ padding: '10px 14px', borderRight: eff != null ? '1px solid var(--border)' : 'none' }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>KM Driven</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>—</p>
          </div>
        )}

        {/* Efficiency — only if available */}
        {eff != null && eff > 0 && (
          <div style={{ padding: '10px 14px' }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Avg km/L</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: ec }}>{fmt(eff, 1)}</p>
              <div>
                <p style={{ fontSize: 9, color: ec, fontWeight: 700 }}>km/L</p>
                {el && <p style={{ fontSize: 9, color: ec, opacity: 0.7 }}>{el}</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom: station + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {log.fuelStation ? (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <MapPin size={10} /> {log.fuelStation}
            </p>
          ) : (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.4 }}>No station recorded</p>
          )}
          {log.notes && (
            <p style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              "{log.notes}"
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            onClick={onEdit}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border)',
              background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Edit2 size={11} /> Edit
          </button>
          <button
            onClick={onDelete}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.3)',
              background: 'rgba(239,68,68,0.06)', color: '#EF4444',
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Trash2 size={11} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VehicleAnalyticsPage({ vehicleId, onBack, users, toast, fromExpiry, onNavigate }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [logSheet, setLogSheet] = useState(false);
  const [tab, setTab]         = useState('analytics');
  const [allUsers, setAllUsers] = useState(users || []);

  useEffect(() => {
    load();
    if (!users || users.length === 0) {
      api.get('/admin/users?page=1&limit=200').then(r => setAllUsers(r.data || [])).catch(() => {});
    }
  }, [vehicleId]);

  async function load() {
    const path = `/admin/vehicles/${vehicleId}/analytics`;
    const cached = pcGet(path);
    if (cached && cached.data) {
      setData(cached.data);
      setLoading(false);
      // Use api.fresh to bypass in-memory cache so background revalidation
      // always hits the server, not a stale in-memory entry
      if (cached.stale) {
        api.fresh(path).then(res => { if (res) setData(res); }).catch(() => {});
      }
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(path);
      setData(res);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <div className="page-wrapper page-enter" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="page-header">
        <button onClick={onBack} className="btn-icon"><ArrowLeft size={16} /></button>
        <span style={{ fontWeight: 800, fontSize: 15 }}>Vehicle Analytics</span>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <span className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    </div>
  );

  if (!data) return null;

  const { vehicle: v, summary: s, monthly, perFill, finance: fin } = data;

  const monthLabels = monthly.map(m => m.label);
  const effData  = monthly.map(m => m.avgEfficiency);
  const costData = monthly.map(m => m.totalCost);
  const kmData   = monthly.map(m => m.totalKm);
  const cpkData  = monthly.map(m => m.avgCostPerKm);
  const effTarget = s.avgEfficiency ? parseFloat((s.avgEfficiency * 1.1).toFixed(1)) : 15;

  const statusIcon = v.status === 'active'
    ? <CheckCircle size={11} color="var(--success)" />
    : v.status === 'maintenance'
    ? <Wrench size={11} color="var(--warning)" />
    : <XCircle size={11} color="var(--danger)" />;

  const trendColor = s.efficiencyTrend == null ? 'var(--text-muted)'
    : s.efficiencyTrend >= 0 ? 'var(--success)' : 'var(--danger)';
  const TrendIcon = s.efficiencyTrend == null ? null
    : s.efficiencyTrend >= 0 ? TrendingUp : TrendingDown;

  const assignedUser = v.assignedUserId
    ? allUsers.find(u => u._id === v.assignedUserId?.toString() || u._id === v.assignedUserId)
    : null;

  return (
    <div className="page-wrapper page-enter">
      {/* Header */}
      <div className="page-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onBack} className="btn-icon" style={{ width: 32, height: 32 }}>
            <ArrowLeft size={15} />
          </button>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{v.plateNumber}</p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>{v.make} {v.model} · {v.year}</p>
            {assignedUser && (
              <p style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700, marginTop: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
                <User size={9} /> {assignedUser.name}
              </p>
            )}
          </div>
        </div>
        {/* Add Log button only in header — not duplicated in logs tab */}
        <button
          className="btn btn-primary btn-sm"
          style={{ width: 'auto', padding: '7px 12px' }}
          onClick={() => setLogSheet(true)}
        >
          <Plus size={13} /> Add Log
        </button>
      </div>

      {/* Tab switcher */}
      <div style={{ padding: '0 16px', marginBottom: -4 }}>
        <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: 10, padding: 3, gap: 2 }}>
          {[
            { key: 'analytics', icon: <BarChart2 size={13} />, label: 'Analytics' },
            { key: 'logs',      icon: <List size={13} />,     label: `Fuel Logs${s.totalFills > 0 ? ` (${s.totalFills})` : ''}` },
            { key: 'docs',      icon: <FileText size={13} />, label: 'Documents' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '8px 12px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.15s',
                background: tab === t.key ? 'var(--bg-card)' : 'transparent',
                color: tab === t.key ? 'var(--accent)' : 'var(--text-muted)',
                boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="page-content">

        {/* Expiry banners — PUC and Insurance */}
        <ExpiryBanner vehicle={v} />
        <InsuranceBanner vehicle={v} onNavigate={onNavigate} />

        {/* ── ANALYTICS TAB ── */}
        {tab === 'analytics' && (
          <>
            {/* Vehicle card */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, background: 'var(--purple-dim)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Car size={20} color="#A78BFA" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 3 }}>
                  <span style={{ fontWeight: 800, fontSize: 15, fontFamily: 'var(--font-mono)' }}>{v.plateNumber}</span>
                  <span className={`badge ${v.status === 'active' ? 'badge-success' : v.status === 'maintenance' ? 'badge-warning' : 'badge-danger'}`} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    {statusIcon} {v.status}
                  </span>
                  <span className="badge badge-blue">{v.fuelType}</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{v.make} {v.model} · {v.year}</p>
                {/* Expiry dates — always visible as inline chips */}
                <div style={{ display:'flex', gap:8, marginTop:7, flexWrap:'wrap' }}>
                  {/* PUC chip */}
                  {(() => {
                    const today = new Date(); today.setHours(0,0,0,0);
                    if (!v.pollutionExpiry) return (
                      <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 9px', borderRadius:8, background:'var(--bg-elevated)', border:'1px solid var(--border)' }}>
                        <Calendar size={11} color="var(--text-muted)" />
                        <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>PUC: </span>
                        <span style={{ fontSize:11, color:'var(--text-muted)' }}>Not set</span>
                      </div>
                    );
                    const exp = new Date(v.pollutionExpiry); exp.setHours(0,0,0,0);
                    const diff = Math.round((exp - today) / 86400000);
                    const isExp = diff < 0;
                    const isWarn = diff >= 0 && diff <= 10;
                    const accentColor = isExp ? '#ef4444' : isWarn ? '#f59e0b' : '#10b981';
                    const bgColor = isExp ? 'rgba(239,68,68,0.1)' : isWarn ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.08)';
                    const borderColor = isExp ? 'rgba(239,68,68,0.3)' : isWarn ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.2)';
                    const statusLabel = isExp ? `Expired ${Math.abs(diff)}d ago` : diff === 0 ? 'Today!' : diff <= 10 ? `${diff}d left` : 'Valid';
                    return (
                      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 10px', borderRadius:8, background:bgColor, border:`1px solid ${borderColor}` }}>
                        <Calendar size={11} color={accentColor} />
                        <div>
                          <p style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', lineHeight:1 }}>PUC Expiry</p>
                          <p style={{ fontSize:12, fontWeight:800, color:accentColor, letterSpacing:'-0.01em', marginTop:2 }}>
                            {new Date(v.pollutionExpiry).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                          </p>
                        </div>
                        <span style={{ fontSize:10, fontWeight:700, color:accentColor, background: isExp ? 'rgba(239,68,68,0.15)' : isWarn ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', padding:'2px 6px', borderRadius:5, marginLeft:2 }}>
                          {statusLabel}
                        </span>
                      </div>
                    );
                  })()}
                  {/* Insurance chip */}
                  {(() => {
                    const today = new Date(); today.setHours(0,0,0,0);
                    if (!v.insuranceExpiry) return (
                      <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 9px', borderRadius:8, background:'rgba(167,139,250,0.08)', border:'1px solid rgba(167,139,250,0.2)' }}>
                        <ShieldAlert size={11} color="#a78bfa" />
                        <span style={{ fontSize:11, color:'#a78bfa', fontWeight:600 }}>Insurance: </span>
                        <span style={{ fontSize:11, color:'var(--text-muted)' }}>No policy linked</span>
                      </div>
                    );
                    const exp = new Date(v.insuranceExpiry); exp.setHours(0,0,0,0);
                    const diff = Math.round((exp - today) / 86400000);
                    const isExp = diff < 0;
                    const isWarn = diff >= 0 && diff <= 10;
                    const accentColor = isExp ? '#ef4444' : isWarn ? '#0ea5e9' : '#10b981';
                    const bgColor = isExp ? 'rgba(239,68,68,0.1)' : isWarn ? 'rgba(14,165,233,0.1)' : 'rgba(16,185,129,0.08)';
                    const borderColor = isExp ? 'rgba(239,68,68,0.3)' : isWarn ? 'rgba(14,165,233,0.3)' : 'rgba(16,185,129,0.2)';
                    const statusLabel = isExp ? `Expired ${Math.abs(diff)}d ago` : diff === 0 ? 'Today!' : diff <= 10 ? `${diff}d left` : 'Valid';
                    return (
                      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 10px', borderRadius:8, background:bgColor, border:`1px solid ${borderColor}` }}>
                        <ShieldAlert size={11} color={accentColor} />
                        <div>
                          <p style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', lineHeight:1 }}>Insurance Expiry</p>
                          <p style={{ fontSize:12, fontWeight:800, color:accentColor, letterSpacing:'-0.01em', marginTop:2 }}>
                            {new Date(v.insuranceExpiry).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                          </p>
                        </div>
                        <span style={{ fontSize:10, fontWeight:700, color:accentColor, background: isExp ? 'rgba(239,68,68,0.15)' : isWarn ? 'rgba(14,165,233,0.15)' : 'rgba(16,185,129,0.15)', padding:'2px 6px', borderRadius:5, marginLeft:2 }}>
                          {statusLabel}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* ── Finance / EMI ─────────────────────────────────────────── */}
            {fin && (() => {
              const now = new Date();
              const start = new Date(fin.startDate);
              const end   = new Date(fin.endDate);
              // Auto-calculate emisPaid from startDate → today so the progress bar is always current
              const monthsElapsed =
                (now.getFullYear() - start.getFullYear()) * 12 +
                (now.getMonth() - start.getMonth());
              const emisPaid = fin.emisPaid >= fin.totalEmis
                ? fin.totalEmis  // fully paid — respect stored value
                : Math.min(Math.max(0, monthsElapsed), fin.totalEmis);
              const emisLeft = fin.totalEmis - emisPaid;
              const pct = Math.round((emisPaid / fin.totalEmis) * 100);
              // Next EMI date
              const emiDate = new Date(now.getFullYear(), now.getMonth(), fin.emiDay);
              if (emiDate < now) emiDate.setMonth(emiDate.getMonth() + 1);
              emiDate.setHours(0, 0, 0, 0);
              const today0 = new Date(); today0.setHours(0, 0, 0, 0);
              const daysToEmi = Math.round((emiDate - today0) / 86400000);
              const emiColor = daysToEmi <= 3 ? '#ef4444' : daysToEmi <= 7 ? '#f59e0b' : '#22c55e';
              const amountPaid = emisPaid * fin.emiAmount;
              const amountLeft = emisLeft * fin.emiAmount;
              return (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '13px 14px' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CreditCard size={13} color="#6366f1" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vehicle Finance</p>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginTop: 1 }}>{fin.lenderName}</p>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 6, background: 'rgba(99,102,241,0.12)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.25)' }}>
                      ACTIVE
                    </span>
                  </div>

                  {/* Loan amount + progress */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                      <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>₹{fin.loanAmount?.toLocaleString('en-IN')}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Loan Amount</span>
                    </div>
                    {/* Progress bar */}
                    <div style={{ height: 7, background: 'var(--bg-elevated)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border)' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: 4, transition: 'width 0.4s ease' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={{ fontSize: 10, color: '#8b5cf6', fontWeight: 700 }}>{emisPaid}/{fin.totalEmis} EMIs paid ({pct}%)</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{emisLeft} remaining</span>
                    </div>
                  </div>

                  {/* EMI + next due */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                    <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                      <p style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Monthly EMI</p>
                      <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>₹{fin.emiAmount?.toLocaleString('en-IN')}</p>
                    </div>
                    <div style={{ padding: '8px 10px', borderRadius: 8, background: `${emiColor}0f`, border: `1px solid ${emiColor}30` }}>
                      <p style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Next EMI Due</p>
                      <p style={{ fontSize: 15, fontWeight: 800, color: emiColor }}>
                        {daysToEmi === 0 ? 'Today' : daysToEmi === 1 ? 'Tomorrow' : `${daysToEmi}d`}
                      </p>
                      <p style={{ fontSize: 9, color: emiColor, fontWeight: 600, marginTop: 1 }}>
                        {emiDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} · Day {fin.emiDay}
                      </p>
                    </div>
                  </div>

                  {/* Amount paid / outstanding */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                    <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
                      <p style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Paid So Far</p>
                      <p style={{ fontSize: 14, fontWeight: 800, color: '#22c55e' }}>₹{amountPaid?.toLocaleString('en-IN')}</p>
                    </div>
                    <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <p style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Outstanding</p>
                      <p style={{ fontSize: 14, fontWeight: 800, color: '#ef4444' }}>₹{amountLeft?.toLocaleString('en-IN')}</p>
                    </div>
                  </div>

                  {/* Meta chips */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {fin.interestRate != null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Interest: {fin.interestRate}% p.a.</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                      <Calendar size={10} color="var(--text-muted)" />
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
                        {start.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} – {end.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {fin.notes && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{fin.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Last 30 days */}
            <div>
              <p className="section-title">This Month</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                <EfficiencyBrowserCard
                  summary={s}
                  perFill={perFill}
                  trendColor={trendColor}
                  TrendIcon={TrendIcon}
                  thisMonthEfficiency={monthly.length ? monthly[monthly.length - 1].avgEfficiency : null}
                />
                <MetricCard label="Fuel Spend" value={fmtRs(s.recentCost)} sub="this month" icon={<DollarSign size={13} color="var(--success)" />} accent="var(--success-dim)" />
                <MetricCard label="KM Driven" value={s.recentKm > 0 ? `${fmt(s.recentKm, 0)} km` : '—'} sub="this month" icon={<Gauge size={13} color="var(--accent-light)" />} accent="var(--accent-dim)" />
                <MetricCard label="Fuel Logs" value={s.recentFills} sub="entries this month" icon={<Fuel size={13} color="var(--warning)" />} accent="var(--warning-dim)" onClick={() => setTab('logs')} />
              </div>
            </div>

            {/* All time */}
            <div>
              <p className="section-title">All Time</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                <MetricCard label="Total Fills"  value={s.totalFills} sub="all time" icon={<Fuel size={13} color="var(--warning)" />} accent="var(--warning-dim)" onClick={() => setTab('logs')} />
                <MetricCard label="Total Spent"  value={fmtRs(s.totalCost)} sub="all time" icon={<DollarSign size={13} color="var(--success)" />} accent="var(--success-dim)" />
                <MetricCard label="Total KM"     value={s.totalKm > 0 ? `${fmt(s.totalKm, 0)} km` : '—'} sub="total driven" icon={<Gauge size={13} color="var(--accent-light)" />} accent="var(--accent-dim)" />
                <MetricCard label="Cost / KM"    value={s.avgCostPerKm != null ? `₹${s.avgCostPerKm}` : '—'} sub="avg ₹ per km" icon={<TrendingUp size={13} color="#F472B6" />} accent="rgba(244,114,182,0.1)" />
              </div>
            </div>

            {/* 6-month charts */}
            <div>
              <p className="section-title">6-Month Trend</p>
              <ChartCard title="Fuel Efficiency" sub="km/L average per month" legend={[{ color: '#A78BFA', label: 'efficiency' }, { color: '#4A6080', dashed: true, label: `target (${effTarget})` }]}>
                <LineChart data={effData} color="#A78BFA" height={130} targetLine={effTarget} yLabel={v => v != null ? v.toFixed(1) : ''} />
                <XLabels labels={monthLabels} />
              </ChartCard>
              <ChartCard title="Monthly Fuel Cost" sub="Total ₹ per month" legend={[{ color: '#10B981', label: 'cost' }]}>
                <BarChart data={costData} color="#10B981" height={130} labels={monthLabels} yLabel={v => v >= 1000 ? '₹' + Math.round(v / 1000) + 'k' : '₹' + Math.round(v)} />
              </ChartCard>
              <ChartCard title="KM Driven per Month" sub="Odometer delta between fills" legend={[{ color: '#F59E0B', label: 'km' }]}>
                <BarChart data={kmData} color="#F59E0B" height={130} labels={monthLabels} yLabel={v => Math.round(v) + ''} />
              </ChartCard>
              <ChartCard title="Cost per KM" sub="₹ per kilometre driven" legend={[{ color: '#F87171', label: '₹/km' }]}>
                <LineChart data={cpkData} color="#F87171" height={130} yLabel={v => '₹' + v.toFixed(1)} />
                <XLabels labels={monthLabels} />
              </ChartCard>
            </div>
          </>
        )}

        {/* ── FUEL LOGS TAB ── */}
        {tab === 'logs' && (
          <FuelLogsTab
            vehicleId={vehicleId}
            vehicle={v}
            users={allUsers}
            toast={toast}
            onRefreshAnalytics={load}
          />
        )}

        {/* ── DOCUMENTS TAB ── */}
        {tab === 'docs' && (
          <DocManager
            entityType="vehicle"
            entityId={vehicleId}
            toast={toast}
          />
        )}
      </div>

      {/* Add Log sheet — triggered from header button only */}
      {logSheet && (
        <AdminFuelLogSheet
          vehicleId={vehicleId}
          vehicle={v}
          users={allUsers}
          onClose={() => setLogSheet(false)}
          onSaved={() => { setLogSheet(false); load(); }}
          toast={toast}
        />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// ─── Efficiency Browser Card ──────────────────────────────────────────────────
// Shows avg efficiency for "This Month" by default.
// Arrow buttons let user step backwards through individual fill entries.
// Index 0 = "This Month" (summary), index 1 = most recent fill, 2 = second most recent, etc.

function EfficiencyBrowserCard({ summary: s, perFill, trendColor, TrendIcon, thisMonthEfficiency }) {
  // fills sorted newest-first (perFill from backend is oldest-first)
  // Keep ALL fills — don't filter out null efficiency ones, or numbering breaks
  const fills = [...(perFill || [])].reverse();
  // idx=0 means "This Month" summary view; idx=1..N means individual fills
  const [idx, setIdx] = useState(0);

  const isMonthView = idx === 0;
  const fillIdx     = idx - 1; // 0-based index into `fills`
  const fill        = isMonthView ? null : fills[fillIdx];

  const eff = isMonthView ? thisMonthEfficiency : fill?.efficiency;
  const effColor = eff == null ? 'var(--text-muted)'
    : eff >= 15 ? '#22c55e'
    : eff >= 11 ? '#f59e0b'
    : '#ef4444';

  // sub-label
  let sublabel;
  if (isMonthView) {
    if (s.efficiencyTrend != null) {
      sublabel = (
        <span style={{ color: trendColor, display: 'flex', alignItems: 'center', gap: 3, fontSize: 10 }}>
          {TrendIcon && <TrendIcon size={10} />}
          {Math.abs(s.efficiencyTrend)} km/L vs prev
        </span>
      );
    } else {
      sublabel = <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>this month avg</span>;
    }
  } else if (fill) {
    const d = new Date(fill.filledAt);
    const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    sublabel = <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label} · {fmt(fill.litres, 1)}L</span>;
  }

  const canPrev = idx < fills.length; // go older
  const canNext = idx > 0;            // go newer (back toward month view)

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '12px 13px',
      display: 'flex', flexDirection: 'column', gap: 0,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <div style={{ width: 24, height: 24, background: 'var(--purple-dim)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Activity size={13} color="#A78BFA" />
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1 }}>
          {isMonthView ? 'Avg Efficiency' : `Fill #${fills.length - fillIdx} of ${fills.length}${fill?.efficiency == null ? ' (no avg yet)' : ''}`}
        </p>
        {/* Nav arrows */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => canNext && setIdx(i => i - 1)}
            disabled={!canNext}
            title="Newer fill"
            style={{
              width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)',
              background: canNext ? 'var(--bg-elevated)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: canNext ? 'pointer' : 'default',
              opacity: canNext ? 1 : 0.3,
              padding: 0,
            }}
          >
            <ChevronRight size={16} color="var(--text-muted)" />
          </button>
          <button
            onClick={() => canPrev && setIdx(i => i + 1)}
            disabled={!canPrev}
            title="Older fill"
            style={{
              width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)',
              background: canPrev ? 'var(--bg-elevated)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: canPrev ? 'pointer' : 'default',
              opacity: canPrev ? 1 : 0.3,
              padding: 0,
            }}
          >
            <ChevronLeft size={16} color="var(--text-muted)" />
          </button>
        </div>
      </div>

      {/* Value */}
      <p style={{ fontSize: 20, fontWeight: 800, color: eff != null ? effColor : 'var(--text-primary)', letterSpacing: '-0.02em' }}>
        {eff != null ? `${eff} km/L` : '—'}
      </p>

      {/* Sub */}
      <div style={{ marginTop: 3 }}>{sublabel}</div>

      {/* Dot indicator — shows position in fill history */}
      {fills.length > 0 && (
        <div style={{ display: 'flex', gap: 3, marginTop: 7, flexWrap: 'wrap' }}>
          {/* "This Month" dot */}
          <div style={{
            width: idx === 0 ? 14 : 5, height: 5, borderRadius: 3,
            background: idx === 0 ? '#A78BFA' : 'var(--border)',
            transition: 'width 0.2s ease',
          }} />
          {fills.map((f, i) => (
            <div key={i} style={{
              width: idx === i + 1 ? 14 : 5, height: 5, borderRadius: 3,
              background: idx === i + 1 ? (f.efficiency != null ? effColor : 'var(--text-muted)') : 'var(--border)',
              transition: 'width 0.2s ease',
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, sub, icon, accent, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 13px',
        cursor: onClick ? 'pointer' : 'default',
        transition: onClick ? 'opacity 0.15s' : 'none',
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.opacity = '0.8'; }}
      onMouseLeave={e => { if (onClick) e.currentTarget.style.opacity = '1'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <div style={{ width: 24, height: 24, background: accent || 'var(--bg-elevated)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      </div>
      <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{sub}</p>}
    </div>
  );
}

function ChartCard({ title, sub, legend, children }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '13px 14px', marginBottom: 8 }}>
      <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{title}</p>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{sub}</p>
      {legend && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
          {legend.map((l, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
              <span style={{ width: l.dashed ? 16 : 8, height: l.dashed ? 2 : 8, borderRadius: l.dashed ? 0 : '50%', flexShrink: 0, backgroundColor: l.dashed ? 'transparent' : l.color, backgroundImage: l.dashed ? `repeating-linear-gradient(90deg,${l.color} 0,${l.color} 4px,transparent 4px,transparent 8px)` : 'none' }} />
              {l.label}
            </span>
          ))}
        </div>
      )}
      {children}
    </div>
  );
}

function XLabels({ labels }) {
  if (!labels?.length) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, paddingLeft: 44, paddingRight: 8 }}>
      {labels.map((l, i) => <span key={i} style={{ fontSize: 9, color: 'var(--text-muted)' }}>{l}</span>)}
    </div>
  );
}

// ─── Edit Fuel Log Sheet ──────────────────────────────────────────────────────

function EditFuelLogSheet({ log, onClose, onSaved, toast }) {
  const toLocalDT = d => {
    const dt = new Date(d);
    return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const [form, setForm] = useState({
    litres: String(log.litres),
    costPerLitre: String(log.costPerLitre),
    odometer: String(log.odometer),
    fuelStation: log.fuelStation || '',
    notes: log.notes || '',
    filledAt: toLocalDT(log.filledAt),
  });
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const previewCost = form.litres && form.costPerLitre
    ? (parseFloat(form.litres) * parseFloat(form.costPerLitre)).toFixed(2)
    : null;

  async function save() {
    if (!form.litres || parseFloat(form.litres) <= 0) { toast('Enter litres', 'error'); return; }
    if (!form.costPerLitre || parseFloat(form.costPerLitre) <= 0) { toast('Enter cost per litre', 'error'); return; }
    if (!form.odometer || parseFloat(form.odometer) < 0) { toast('Enter odometer', 'error'); return; }
    setSaving(true);
    try {
      await api.put(`/admin/fuel-logs/${log.id}`, {
        litres: parseFloat(form.litres), costPerLitre: parseFloat(form.costPerLitre),
        odometer: parseFloat(form.odometer), fuelStation: form.fuelStation,
        notes: form.notes, filledAt: new Date(form.filledAt).toISOString(),
      });
      toast('Updated — recalculated ✓', 'success');
      onSaved();
    } catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="sheet-handle" />
        <p className="sheet-title">Edit Fuel Log</p>
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="input-group">
            <label className="input-label">📅 Date & Time *</label>
            <input className="input-field" type="datetime-local" value={form.filledAt} onChange={set('filledAt')} />
          </div>
          <div className="input-group">
            <label className="input-label">Odometer (km) *</label>
            <input className="input-field" type="number" value={form.odometer} onChange={set('odometer')} min="0" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="input-group"><label className="input-label">Litres *</label><input className="input-field" type="number" value={form.litres} onChange={set('litres')} min="0" step="0.01" /></div>
            <div className="input-group"><label className="input-label">₹/Litre *</label><input className="input-field" type="number" value={form.costPerLitre} onChange={set('costPerLitre')} min="0" step="0.01" /></div>
          </div>
          {previewCost && (
            <div style={{ background: 'var(--success-dim)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>Total</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--success)' }}>₹{previewCost}</span>
            </div>
          )}
          <div className="input-group"><label className="input-label">Fuel Station</label><input className="input-field" value={form.fuelStation} onChange={set('fuelStation')} /></div>
          <div className="input-group"><label className="input-label">Notes</label><input className="input-field" value={form.notes} onChange={set('notes')} /></div>
          <div style={{ display: 'flex', gap: 9, marginTop: 4, paddingBottom: 8 }}>
            <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving} style={{ flex: 2 }}>
              {saving ? <><span className="spinner" /> Saving...</> : 'Save & Recalculate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Add Fuel Log Sheet ───────────────────────────────────────────────────────

function AdminFuelLogSheet({ vehicleId, vehicle, users, onClose, onSaved, toast }) {
  const now = new Date();
  const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const [form, setForm] = useState({ userId: '', litres: '', costPerLitre: '', odometer: '', fuelStation: '', notes: '', filledAt: localNow });
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const previewCost = form.litres && form.costPerLitre
    ? (parseFloat(form.litres) * parseFloat(form.costPerLitre)).toFixed(2)
    : null;

  async function save() {
    if (!form.userId) { toast('Select a user', 'error'); return; }
    if (!form.litres || parseFloat(form.litres) <= 0) { toast('Enter litres', 'error'); return; }
    if (!form.costPerLitre || parseFloat(form.costPerLitre) <= 0) { toast('Enter cost per litre', 'error'); return; }
    if (!form.odometer || parseFloat(form.odometer) < 0) { toast('Enter odometer reading', 'error'); return; }
    if (!form.filledAt) { toast('Select date & time', 'error'); return; }
    setSaving(true);
    try {
      await api.post('/admin/fuel-logs', {
        vehicleId, userId: form.userId,
        litres: parseFloat(form.litres), costPerLitre: parseFloat(form.costPerLitre),
        odometer: parseFloat(form.odometer), fuelStation: form.fuelStation,
        notes: form.notes, filledAt: new Date(form.filledAt).toISOString(),
      });
      toast('Fuel log added — calculations updated ✓', 'success');
      onSaved();
    } catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="sheet-handle" />
        <div style={{ padding: '0 16px 4px', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
          <p style={{ fontSize: 16, fontWeight: 800 }}>Add Fuel Log</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{vehicle.plateNumber} · {vehicle.make} {vehicle.model}</p>
          <div style={{ marginTop: 8, marginBottom: 4, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '8px 10px', display: 'flex', gap: 7, alignItems: 'flex-start' }}>
            <AlertTriangle size={13} color="var(--warning)" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 11, color: 'var(--warning)', lineHeight: 1.5 }}>Set the correct <strong>date & time</strong> — all km/efficiency values will be recalculated in order.</p>
          </div>
        </div>
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="input-group"><label className="input-label">📅 Date & Time *</label><input className="input-field" type="datetime-local" value={form.filledAt} onChange={set('filledAt')} style={{ fontSize: 14, fontWeight: 600 }} /></div>
          <div className="input-group">
            <label className="input-label">Driver *</label>
            <select className="input-field" value={form.userId} onChange={set('userId')}>
              <option value="">— Select user —</option>
              {users.filter(u => u.isActive).map(u => <option key={u.id} value={u.id}>{u.name} ({u.employeeId})</option>)}
            </select>
          </div>
          <div className="input-group"><label className="input-label">Odometer (km) *</label><input className="input-field" type="number" placeholder="e.g. 45320" value={form.odometer} onChange={set('odometer')} min="0" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="input-group"><label className="input-label">Litres *</label><input className="input-field" type="number" placeholder="e.g. 40" value={form.litres} onChange={set('litres')} min="0" step="0.01" /></div>
            <div className="input-group"><label className="input-label">₹/Litre *</label><input className="input-field" type="number" placeholder="e.g. 96.5" value={form.costPerLitre} onChange={set('costPerLitre')} min="0" step="0.01" /></div>
          </div>
          {previewCost && (
            <div style={{ background: 'var(--success-dim)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>Total Cost</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--success)' }}>₹{previewCost}</span>
            </div>
          )}
          <div className="input-group"><label className="input-label">Fuel Station (optional)</label><input className="input-field" placeholder="HP, Indian Oil, BPCL..." value={form.fuelStation} onChange={set('fuelStation')} /></div>
          <div className="input-group"><label className="input-label">Notes (optional)</label><input className="input-field" value={form.notes} onChange={set('notes')} /></div>
          <div style={{ display: 'flex', gap: 9, marginTop: 4, paddingBottom: 8 }}>
            <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving} style={{ flex: 2 }}>
              {saving ? <><span className="spinner" /> Saving...</> : 'Save & Recalculate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

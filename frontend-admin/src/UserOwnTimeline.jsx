import { useState, useEffect, useCallback } from 'react';
import { userApi } from './api.js';
import {
  ArrowLeft, MapPin, Clock, Navigation2, Calendar,
  WifiOff, ChevronLeft, ChevronRight, ExternalLink, Info,
} from 'lucide-react';

function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function minsGap(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 60000);
}

function displayDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function mapsLink(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function dotColor(index, total) {
  const pct = total <= 1 ? 0.5 : index / (total - 1);
  if (pct < 0.33) return { bg: '#3b82f6', dim: 'rgba(59,130,246,0.15)' };
  if (pct < 0.66) return { bg: '#8b5cf6', dim: 'rgba(139,92,246,0.15)' };
  return              { bg: '#f59e0b', dim: 'rgba(245,158,11,0.15)' };
}

function PingCard({ log, index, total, showGapBefore, gapMinutes }) {
  const color = dotColor(index, total);
  return (
    <>
      {showGapBefore && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0 4px 20px', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 19, top: 0, bottom: 0, width: 2,
            background: 'repeating-linear-gradient(to bottom,var(--border) 0,var(--border) 5px,transparent 5px,transparent 10px)' }} />
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 20, padding: '2px 10px', marginLeft: 26,
            display: 'flex', alignItems: 'center', gap: 4 }}>
            <WifiOff size={9} />
            {gapMinutes >= 60
              ? `${Math.floor(gapMinutes / 60)}h ${gapMinutes % 60}m gap`
              : `${gapMinutes}m gap`}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 0, position: 'relative' }}>
        <div style={{ width: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
          {index > 0 && !showGapBefore && (
            <div style={{ width: 2, flex: 1, background: 'var(--border)', minHeight: 8 }} />
          )}
          <div style={{
            width: 14, height: 14, borderRadius: '50%', background: color.bg,
            border: '2.5px solid var(--bg-card)', boxShadow: `0 0 0 3px ${color.dim}`,
            flexShrink: 0, zIndex: 1,
            marginTop: (index === 0 || showGapBefore) ? 16 : 0,
          }} />
          {index < total - 1 && (
            <div style={{ width: 2, flex: 1, background: 'var(--border)', minHeight: 8 }} />
          )}
        </div>

        <div style={{
          flex: 1, margin: '8px 0',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '12px 14px',
          borderLeft: `3px solid ${color.bg}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 26, height: 26, borderRadius: 6, background: color.dim,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={13} color={color.bg} />
              </div>
              <p style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                {fmtTime(log.recordedAt)}
              </p>
            </div>
            <a href={mapsLink(log.lat, log.lng)} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 11, fontWeight: 700, color: 'var(--accent-light)',
                background: 'var(--accent-dim)', borderRadius: 6, padding: '4px 8px',
                textDecoration: 'none' }}>
              <ExternalLink size={10} /> Maps
            </a>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: log.address ? 6 : 0 }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600,
              color: 'var(--text-muted)', background: 'var(--bg-elevated)', borderRadius: 5, padding: '2px 7px' }}>
              {log.lat.toFixed(5)}, {log.lng.toFixed(5)}
            </span>
            {log.accuracy != null && (
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
                background: 'var(--bg-elevated)', borderRadius: 5, padding: '2px 7px',
                display: 'flex', alignItems: 'center', gap: 3 }}>
                <Navigation2 size={9} /> ±{Math.round(log.accuracy)}m
              </span>
            )}
          </div>

          {log.address && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
              <MapPin size={10} style={{ display: 'inline', marginRight: 3 }} />
              {log.address}
            </p>
          )}
        </div>
      </div>
    </>
  );
}

export default function UserOwnTimeline({ onBack }) {
  const [data,    setData]    = useState(null);
  const [date,    setDate]    = useState(todayStr());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setData(null);
    try {
      const tz  = -new Date().getTimezoneOffset(); // e.g. 330 for IST
      const res = await userApi.get(`/user/location-timeline?date=${date}&tz=${tz}`);
      setData(res);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const logs    = data?.logs || [];
  const isToday = date === todayStr();

  const enriched = logs.map((log, i) => {
    const prev = i > 0 ? logs[i - 1] : null;
    const gap  = prev ? minsGap(prev.recordedAt, log.recordedAt) : 0;
    return { log, index: i, total: logs.length, showGapBefore: gap > 65, gapMinutes: gap };
  });

  return (
    <div className="page-wrapper page-enter">
      <div className="page-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-ghost btn-sm"
            style={{ padding: '6px 8px', width: 'auto' }} onClick={onBack}>
            <ArrowLeft size={18} />
          </button>
          <div style={{ width: 32, height: 32, background: 'var(--accent-dim)', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MapPin size={16} color="var(--accent-light)" />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800 }}>My Location History</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Your check-ins during office hours</p>
          </div>
        </div>
      </div>

      <div className="page-content">

        {/* Info banner */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start',
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '10px 12px' }}>
          <Info size={13} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Shows your location check-ins recorded by the app during your company's office hours.
            Pings are recorded every 30 minutes while the app is open.
          </p>
        </div>

        {/* Date navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '10px 14px' }}>
          <button className="btn btn-ghost btn-sm"
            style={{ padding: '6px', width: 'auto', flexShrink: 0 }}
            onClick={() => setDate(d => addDays(d, -1))}>
            <ChevronLeft size={16} />
          </button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 800 }}>
              {isToday ? 'Today' : displayDate(date)}
            </p>
            {!isToday && <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{date}</p>}
          </div>
          <button className="btn btn-ghost btn-sm"
            style={{ padding: '6px', width: 'auto', flexShrink: 0 }}
            disabled={isToday} onClick={() => setDate(d => addDays(d, 1))}>
            <ChevronRight size={16} />
          </button>
          <input type="date" value={date} max={todayStr()}
            onChange={e => e.target.value && setDate(e.target.value)}
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 7, padding: '5px 7px', fontSize: 11,
              color: 'var(--text-primary)', outline: 'none', flexShrink: 0 }} />
        </div>

        {/* Office timing badge */}
        {data && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8,
            background: data.timing.isHoliday ? 'rgba(245,158,11,0.08)'
              : data.timing.enabled ? 'var(--accent-dim)' : 'var(--bg-elevated)',
            border: '1px solid ' + (data.timing.isHoliday ? 'rgba(245,158,11,0.25)'
              : data.timing.enabled ? 'rgba(249,115,22,0.2)' : 'var(--border)'),
            borderRadius: 10, padding: '8px 12px' }}>
            <Clock size={13} color={data.timing.isHoliday ? '#f59e0b'
              : data.timing.enabled ? 'var(--accent-light)' : 'var(--text-muted)'} />
            <p style={{ fontSize: 12, fontWeight: 600,
              color: data.timing.isHoliday ? '#f59e0b'
                : data.timing.enabled ? 'var(--accent-light)' : 'var(--text-muted)' }}>
              {data.timing.isHoliday ? '🏖 Holiday today'
                : data.timing.enabled
                  ? <>Office hours: <strong>{data.timing.startTime} – {data.timing.endTime}</strong></>
                  : 'Full day shown'}
            </p>
          </div>
        )}

        {/* Stats */}
        {data && !loading && logs.length > 0 && (
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { label: 'Check-ins', value: data.totalPings },
              { label: 'First ping', value: fmtTime(logs[0].recordedAt) },
              { label: 'Last ping',  value: fmtTime(logs[logs.length - 1].recordedAt) },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, background: 'var(--bg-card)',
                border: '1px solid var(--border)', borderRadius: 10, padding: '10px',
                display: 'flex', flexDirection: 'column', gap: 4 }}>
                <p style={{ fontSize: 15, fontWeight: 800 }}>{s.value}</p>
                <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <span className="spinner" style={{ width: 28, height: 28 }} />
          </div>
        )}

        {/* Empty */}
        {!loading && logs.length === 0 && (
          <div className="empty-state">
            <MapPin size={38} style={{ color: 'var(--text-muted)', opacity: 0.35 }} />
            <p className="empty-title">No check-ins found</p>
            <p className="empty-desc">
              {data?.timing?.enabled
                ? `No pings recorded between ${data.timing.startTime}–${data.timing.endTime} on this day.`
                : 'No location pings found for this day.'}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
              Make sure the app was open and location permission was granted.
            </p>
          </div>
        )}

        {/* Timeline */}
        {!loading && logs.length > 0 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              {logs.length} check-in{logs.length !== 1 ? 's' : ''}
            </p>
            <div style={{ paddingLeft: 4 }}>
              {enriched.map(({ log, index, total, showGapBefore, gapMinutes }) => (
                <PingCard key={log.id} log={log} index={index} total={total}
                  showGapBefore={showGapBefore} gapMinutes={gapMinutes} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

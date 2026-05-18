// MonthlyKmDetail.jsx
// Opened from Dashboard by clicking the "Total KM" stat card.
// Shows per-vehicle kilometre breakdown for the browsed month.

import { useState, useEffect } from 'react';
import { api, fmt } from './api.js';
import { useToast } from './Toast.jsx';
import {
  Navigation, ArrowLeft, ChevronLeft, ChevronRight,
  Car, Fuel, Gauge, Hash, TrendingUp,
} from 'lucide-react';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function VehicleKmCard({ v, rank }) {
  const hasEff = v.avgEff != null && v.avgEff > 0;
  const isTop = rank === 1;

  return (
    <div
      className="card-tap"
      style={{
        padding: '0',
        overflow: 'hidden',
        border: isTop ? '1.5px solid var(--purple)' : '1px solid var(--border)',
        background: isTop ? 'linear-gradient(135deg, rgba(139,92,246,0.06) 0%, var(--bg-card) 60%)' : 'var(--bg-card)',
      }}
    >
      {/* Top strip: plate + rank + KM hero */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 8px',
      }}>
        {/* Rank badge */}
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: isTop ? 'var(--purple-dim)' : 'var(--bg-elevated)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: isTop ? '1px solid rgba(139,92,246,0.35)' : 'none',
        }}>
          <span style={{
            fontSize: 12, fontWeight: 900,
            color: isTop ? 'var(--purple)' : 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
          }}>#{rank}</span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: 13, fontWeight: 800, color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
            }}>{v.plateNumber}</span>
            {v.make && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {v.make} {v.model}
              </span>
            )}
            {v.fuelType && (
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 6,
                background: 'var(--accent-dim)', color: 'var(--accent)',
                marginLeft: 'auto', flexShrink: 0,
              }}>{v.fuelType}</span>
            )}
          </div>
        </div>

        {/* KM Hero number — the star of the show */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{
            fontSize: 26, fontWeight: 900, color: 'var(--purple)',
            fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em', lineHeight: 1,
          }}>{fmt(v.totalKm, 0)}</p>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--purple)', opacity: 0.7, marginTop: 1 }}>km</p>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ paddingInline: 14, marginBottom: 10 }}>
        <div style={{ height: 6, borderRadius: 4, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 4,
            background: isTop
              ? 'linear-gradient(90deg, var(--purple), rgba(139,92,246,0.6))'
              : 'var(--purple)',
            width: `${v._barPct}%`,
            transition: 'width 0.7s ease',
            opacity: isTop ? 1 : 0.65,
          }} />
        </div>
      </div>

      {/* Secondary chips */}
      <div style={{
        display: 'flex', gap: 6, flexWrap: 'wrap', paddingInline: 14, paddingBottom: 12,
      }}>
        <Chip icon={Fuel}  label="Litres"  value={fmt(v.totalLitres, 1) + ' L'} color="var(--warning)" />
        <Chip icon={Hash}  label="Fills"   value={v.fills}                       color="var(--accent)" />
        {hasEff && <Chip icon={Gauge} label="Avg km/L" value={fmt(v.avgEff, 1)} color="var(--success)" />}
      </div>
    </div>
  );
}

function Chip({ icon: Icon, label, value, color }) {
  return (
    <div style={{ background: 'var(--bg-elevated)', borderRadius: 7, padding: '4px 8px', display: 'flex', gap: 4, alignItems: 'center' }}>
      <Icon size={10} color={color} />
      <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 800, color, fontFamily: 'var(--font-mono)' }}>{value}</span>
    </div>
  );
}

export default function MonthlyKmDetail({ onBack, initialYear, initialMonth }) {
  const toast = useToast();
  const now = new Date();
  const [year,  setYear]  = useState(initialYear  ?? now.getFullYear());
  const [month, setMonth] = useState(initialMonth ?? now.getMonth()); // 0-based
  const [data,  setData]  = useState(null);
  const [loading, setLoading] = useState(true);

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  useEffect(() => { load(year, month); }, [year, month]);

  async function load(y, m) {
    setLoading(true);
    try {
      const res = await api.get(`/admin/stats/monthly-vehicle-breakdown?year=${y}&month=${m}`);
      const maxKm = Math.max(...(res.vehicles || []).map(v => v.totalKm), 1);
      res.vehicles = (res.vehicles || []).map(v => ({ ...v, _barPct: (v.totalKm / maxKm) * 100 }));
      setData(res);
    } catch (err) {
      toast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (isCurrentMonth) return;
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  const vehicles = data?.vehicles ?? [];
  const totals   = data?.totals   ?? {};

  return (
    <div className="page-wrapper page-enter">
      {/* Header */}
      <div className="page-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn-icon" onClick={onBack}>
            <ArrowLeft size={16} />
          </button>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--purple-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Navigation size={15} color="var(--purple)" />
          </div>
          <div>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Detail View</p>
            <p style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
              KM This Month
            </p>
          </div>
        </div>
      </div>

      <div className="page-content">

        {/* Month navigator */}
        <div style={{
          background: 'var(--bg-card)', borderRadius: 'var(--radius)',
          border: '1px solid var(--border)', padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <button
            onClick={prevMonth}
            style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)' }}
          >
            <ChevronLeft size={16} />
          </button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
              {MONTH_NAMES[month]} {year}
            </p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
              {isCurrentMonth ? 'Current month' : 'Past month'}
            </p>
          </div>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isCurrentMonth ? 'not-allowed' : 'pointer', color: isCurrentMonth ? 'var(--text-muted)' : 'var(--text-primary)', opacity: isCurrentMonth ? 0.4 : 1 }}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* ── Hero summary banner ── */}
        <div style={{
          background: 'linear-gradient(135deg, var(--purple) 0%, rgba(139,92,246,0.75) 100%)',
          borderRadius: 'var(--radius)', padding: '18px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', right: -20, top: -20, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: 30, bottom: -30, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              Total Fleet KM
            </p>
            <p style={{ fontSize: 38, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)', letterSpacing: '-0.04em', lineHeight: 1 }}>
              {fmt(totals.km ?? 0, 0)}
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginTop: 3 }}>kilometres driven</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Litres</p>
              <p style={{ fontSize: 18, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)' }}>{fmt(totals.litres ?? 0, 1)} L</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Vehicles</p>
              <p style={{ fontSize: 18, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)' }}>{vehicles.length}</p>
            </div>
          </div>
        </div>

        {/* Vehicle list */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <span className="spinner" style={{ width: 24, height: 24 }} />
          </div>
        ) : vehicles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Car size={22} color="var(--text-muted)" />
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>No data for this month</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>No fuel logs found for {MONTH_NAMES[month]} {year}.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <TrendingUp size={12} color="var(--purple)" />
              <p className="section-title" style={{ margin: 0 }}>
                Ranked by KM · {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}
              </p>
            </div>
            {vehicles.map((v, i) => (
              <VehicleKmCard key={v.vehicleId} v={v} rank={i + 1} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

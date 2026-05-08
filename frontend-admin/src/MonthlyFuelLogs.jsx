// MonthlyFuelLogs.jsx
// Shows fuel logs filtered to a specific month.
// Opened from Dashboard by clicking "Fuel Spend" or "Fuel Logs" stat cards.
// Receives { year, month } as initialMonth prop — defaults to current month.

import { useState, useEffect } from 'react';
import { api, fmt, fmtRs, fmtDT, clearAuth } from './api.js';
import { useToast } from './Toast.jsx';
import { Fuel, ChevronLeft, ChevronRight, ArrowLeft, IndianRupee, Droplets, Hash } from 'lucide-react';
import { Pagination } from './Users.jsx';

const LIMIT = 20;
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function pad(n) { return String(n).padStart(2,'0'); }

function monthRange(year, month) {
  const from = `${year}-${pad(month)}-01`;
  const last = new Date(year, month, 0).getDate();
  const to   = `${year}-${pad(month)}-${pad(last)}`;
  return { from, to };
}

function LogCard({ log }) {
  return (
    <div className="card" style={{ display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'var(--warning-dim)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Fuel size={15} color="var(--warning)" />
          </div>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', margin:0 }}>
              {log.vehicle?.regNumber || log.vehicleId || '—'}
            </p>
            <p style={{ fontSize:11, color:'var(--text-muted)', margin:0 }}>
              {log.vehicle?.make} {log.vehicle?.model}
            </p>
          </div>
        </div>
        <span style={{ fontSize:14, fontWeight:800, color:'var(--success)' }}>
          ₹{fmt(log.amount ?? log.cost, 0)}
        </span>
      </div>

      <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
        {(log.litres ?? log.quantity) != null && (
          <span style={{ fontSize:11, color:'var(--text-muted)' }}>
            <Droplets size={11} style={{ marginRight:3, verticalAlign:'middle' }} />
            {fmt(log.litres ?? log.quantity, 1)}L
          </span>
        )}
        {log.odometer != null && (
          <span style={{ fontSize:11, color:'var(--text-muted)' }}>
            {fmt(log.odometer, 0)} km
          </span>
        )}
        {log.user?.name && (
          <span style={{ fontSize:11, color:'var(--text-muted)' }}>
            {log.user.name}
          </span>
        )}
      </div>

      <p style={{ fontSize:11, color:'var(--text-muted)', margin:0, borderTop:'1px solid var(--border-subtle)', paddingTop:6 }}>
        {fmtDT(log.date ?? log.createdAt)}
      </p>
    </div>
  );
}

export default function MonthlyFuelLogs({ admin, onLogout, onNavigate, initialMonth }) {
  const toast = useToast();
  const now = new Date();

  const [year,  setYear]  = useState(initialMonth?.year  ?? now.getFullYear());
  const [month, setMonth] = useState(initialMonth?.month ?? now.getMonth() + 1);
  const [logs,  setLogs]  = useState([]);
  const [total, setTotal] = useState(0);
  const [page,  setPage]  = useState(1);
  const [loading, setLoading] = useState(true);

  // Summary stats for the header
  const [stats, setStats] = useState({ spend: 0, litres: 0, fills: 0 });

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  useEffect(() => { load(1); }, [year, month]);

  async function load(p = 1) {
    setLoading(true);
    const { from, to } = monthRange(year, month);
    try {
      const res = await api.get(
        `/admin/fuel-logs?page=${p}&limit=${LIMIT}&from=${from}&to=${to}`
      );
      const data = res.data ?? [];
      setLogs(data);
      setTotal(res.total ?? data.length);
      setPage(p);

      // Compute summary from returned data
      // If backend paginates, only current page is available —
      // fetch totals from a separate stats call if possible, else compute from page
      const spend  = data.reduce((s, l) => s + (l.amount ?? l.cost ?? 0), 0);
      const litres = data.reduce((s, l) => s + (l.litres ?? l.quantity ?? 0), 0);
      if (p === 1) setStats({ spend, litres, fills: res.total ?? data.length });
    } catch(err) {
      if (err.message?.includes('401')) { clearAuth(); onLogout(); }
      toast(err.message, 'error');
    } finally { setLoading(false); }
  }

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else { setMonth(m => m - 1); }
  }

  function nextMonth() {
    if (isCurrentMonth) return; // can't go into the future
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else { setMonth(m => m + 1); }
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="page-wrapper page-enter">

      {/* Header */}
      <div className="page-header" style={{ justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button
            className="btn-icon"
            onClick={() => onNavigate('dashboard')}
            style={{ marginRight:2 }}
          >
            <ArrowLeft size={16} />
          </button>
          <div style={{ width:32, height:32, background:'var(--warning-dim)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Fuel size={16} color="var(--warning)" />
          </div>
          <div>
            <p style={{ fontSize:15, fontWeight:800, margin:0 }}>Fuel Logs</p>
            <p style={{ fontSize:11, color:'var(--text-muted)', margin:0 }}>
              {isCurrentMonth ? 'This month' : `${MONTH_NAMES[month-1]} ${year}`}
            </p>
          </div>
        </div>
      </div>

      <div className="page-content">

        {/* Month navigator */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:12, padding:'10px 16px' }}>
          <button
            onClick={prevMonth}
            style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)', display:'flex', alignItems:'center', padding:4 }}
          >
            <ChevronLeft size={18} />
          </button>

          <div style={{ textAlign:'center' }}>
            <p style={{ fontSize:15, fontWeight:800, color:'var(--text-primary)', margin:0 }}>
              {MONTH_NAMES[month-1]} {year}
            </p>
            {isCurrentMonth && (
              <p style={{ fontSize:11, color:'var(--accent)', margin:0, fontWeight:600 }}>Current month</p>
            )}
          </div>

          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            style={{ background:'none', border:'none', cursor: isCurrentMonth ? 'not-allowed' : 'pointer', color: isCurrentMonth ? 'var(--border)' : 'var(--text-secondary)', display:'flex', alignItems:'center', padding:4 }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Summary stats */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
          <div className="stat-card" style={{ cursor:'default' }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:4 }}>
              <IndianRupee size={13} color="var(--success)" />
              <span style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>Spend</span>
            </div>
            <span style={{ fontSize:16, fontWeight:800, color:'var(--success)' }}>
              ₹{fmt(stats.spend, 0)}
            </span>
          </div>
          <div className="stat-card" style={{ cursor:'default' }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:4 }}>
              <Droplets size={13} color="var(--warning)" />
              <span style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>Litres</span>
            </div>
            <span style={{ fontSize:16, fontWeight:800, color:'var(--warning)' }}>
              {fmt(stats.litres, 1)}L
            </span>
          </div>
          <div className="stat-card" style={{ cursor:'default' }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:4 }}>
              <Hash size={13} color="var(--accent)" />
              <span style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>Fills</span>
            </div>
            <span style={{ fontSize:16, fontWeight:800, color:'var(--accent)' }}>
              {stats.fills}
            </span>
          </div>
        </div>

        {/* Logs list */}
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:32 }}>
            <span className="spinner" style={{ width:28, height:28 }} />
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <Fuel size={36} style={{ color:'var(--text-muted)', opacity:0.4 }} />
            <p className="empty-title">No fuel logs</p>
            <p className="empty-sub">No entries for {MONTH_NAMES[month-1]} {year}</p>
          </div>
        ) : (
          <>
            <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
              {logs.map(log => <LogCard key={log.id} log={log} />)}
            </div>
            <Pagination page={page} total={total} limit={LIMIT} totalPages={totalPages} onPage={p => load(p)} />
          </>
        )}
      </div>
    </div>
  );
}

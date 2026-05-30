// api.js — Fleet Tracker Super Admin API Client
const BASE = import.meta.env.VITE_API_BASE || '/api';

export const getToken  = () => localStorage.getItem('fp_sa_token');
export const getAdmin  = () => { try { return JSON.parse(localStorage.getItem('fp_sa') || 'null'); } catch { return null; } };
export const saveAuth  = (t, u) => { localStorage.setItem('fp_sa_token', t); localStorage.setItem('fp_sa', JSON.stringify(u)); };
export const clearAuth = () => { localStorage.removeItem('fp_sa_token'); localStorage.removeItem('fp_sa'); };

async function req(method, path, body) {
  const h = { 'Content-Type': 'application/json' };
  const t = getToken(); if (t) h['Authorization'] = `Bearer ${t}`;
  const r = await fetch(`${BASE}${path}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({ message: 'Network error' }));
  if (!r.ok) throw new Error(d.message || `HTTP ${r.status}`);
  return d;
}

export const api = {
  get:    p => req('GET', p),
  post:   (p, b) => req('POST', p, b),
  put:    (p, b) => req('PUT', p, b),
  delete: p => req('DELETE', p),
};

// ── Formatting helpers ───────────────────────────────────────────────────────
export const fmt     = (n, d = 2) => n == null || isNaN(n) ? '—' : Number(n).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
export const fmtRs   = n => n == null ? '—' : '₹' + fmt(n, 0);
export const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
export const fmtDT   = d => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
export const fmtShort = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—';

export const MONTH_OPTS = () => {
  const opts = []; const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({ value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()] + ' ' + d.getFullYear() });
  }
  return opts;
};

export const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]; };

export const BASE = import.meta.env.VITE_API_BASE || 'https://fleetpro.duckdns.org/api';

// ─── Persistent cache ─────────────────────────────────────────────────────────
export { pcGet, pcSet, pcClear, swrFetch, prefetchMonths, startBackgroundSync } from './persistCache.js';

// ─── Admin auth helpers ───────────────────────────────────────────────────────
export function getToken()       { return localStorage.getItem('fp_admin_token'); }
export function getStoredAdmin() {
  try { const d = localStorage.getItem('fp_admin_data'); return d ? JSON.parse(d) : null; } catch { return null; }
}
export function saveAuth(token, user) {
  localStorage.setItem('fp_admin_token', token);
  localStorage.setItem('fp_admin_data', JSON.stringify(user));
  // Lightweight profile for "remembered" banner (no slug stored here)
  localStorage.setItem('fp_admin_profile', JSON.stringify({
    name: user.name, phone: user.phone, companyName: user.companyName,
  }));
  localStorage.removeItem('fp_admin_logged_out');
  cache.clear();
}
export function softLogout()    { localStorage.setItem('fp_admin_logged_out', '1'); cache.clear(); }
export function resumeSession() { localStorage.removeItem('fp_admin_logged_out'); }
export function isLoggedOut()   { return localStorage.getItem('fp_admin_logged_out') === '1'; }
export function getSavedProfile() {
  try { const d = localStorage.getItem('fp_admin_profile'); return d ? JSON.parse(d) : null; } catch { return null; }
}
export function clearAuth() {
  ['fp_admin_token', 'fp_admin_data', 'fp_admin_profile', 'fp_admin_logged_out'].forEach(k => localStorage.removeItem(k));
  cache.clear();
}

// ─── Smart Cache ──────────────────────────────────────────────────────────────
const CACHE_TTL = {
  '/admin/stats': 12000,
  default:        20000,
};
function getTtl(path) { return CACHE_TTL[path.split('?')[0]] ?? CACHE_TTL.default; }

class ApiCache {
  constructor() { this._store = new Map(); }
  get(path) {
    const entry = this._store.get(path);
    if (!entry) return null;
    if (Date.now() - entry.ts > entry.ttl) { this._store.delete(path); return null; }
    return entry.data;
  }
  set(path, data) { this._store.set(path, { data, ts: Date.now(), ttl: getTtl(path) }); }
  bust(pattern) {
    for (const k of this._store.keys()) {
      if (k === pattern || k.startsWith(pattern)) this._store.delete(k);
    }
    for (const k of this._store.keys()) {
      if (k.startsWith('/admin/stats')) this._store.delete(k);
    }
  }
  clear() { this._store.clear(); }
}
export const cache = new ApiCache();

// ─── Request ──────────────────────────────────────────────────────────────────
async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  if (method === 'GET') {
    const cached = cache.get(path);
    if (cached) return cached;
  }

  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch (err) {
    // Give a specific, actionable error message
    const isNative = !!(window?.Capacitor?.isNativePlatform?.());
    if (isNative) {
      throw new Error('Cannot reach server. Make sure your phone has internet connection and the server is running.');
    }
    throw new Error('Cannot reach server. Check your internet connection.');
  }

  let data;
  try { data = await res.json(); } catch {
    if (!res.ok) throw new Error(`Server error (${res.status})`);
    return {};
  }

  // Membership expired — throw a special error the app can catch
  if (res.status === 403 && data.membershipExpired) {
    const err = new Error(data.message || 'Membership expired');
    err.membershipExpired = true;
    throw err;
  }

  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);

  if (method === 'GET') {
    cache.set(path, data);
    import('./persistCache.js').then(m => m.pcSet(path, data)).catch(() => {});
  }
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const segment = '/' + path.split('/').filter(Boolean).slice(0, 2).join('/');
    cache.bust(segment);
    import('./persistCache.js').then(m => m.pcBust && m.pcBust(segment)).catch(() => {});
  }
  return data;
}

export const api = {
  get:    p      => request('GET',    p),
  post:   (p, b) => request('POST',   p, b),
  put:    (p, b) => request('PUT',    p, b),
  patch:  (p, b) => request('PATCH',  p, b),
  delete: p      => request('DELETE', p),
  fresh:  p      => { const base = p.split('?')[0]; cache.bust(base); return request('GET', p); },
};

// ─── Format helpers ───────────────────────────────────────────────────────────
export const fmt     = (n, d = 2) => n == null || isNaN(n) ? '—' : Number(n).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
export const fmtRs   = n => n == null ? '—' : '₹' + fmt(n, 0);
export const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
export const fmtDT   = d => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
export const MONTHS  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const MONTH_OPTS = () => {
  const opts = []; const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({ value: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` });
  }
  return opts;
};

// ─── User session helpers ─────────────────────────────────────────────────────
export function getUserToken()  { return localStorage.getItem('fp_user_token'); }
export function getStoredUser() {
  try { const d = localStorage.getItem('fp_user_data'); return d ? JSON.parse(d) : null; } catch { return null; }
}
export function saveUserAuth(token, user) {
  localStorage.setItem('fp_user_token', token);
  localStorage.setItem('fp_user_data', JSON.stringify(user));
  localStorage.setItem('fp_user_profile', JSON.stringify({ name: user.name, employeeId: user.employeeId, companyName: user.companyName }));
}
export function clearUserAuth() {
  ['fp_user_token', 'fp_user_data', 'fp_user_profile', 'fp_user_logged_out'].forEach(k => localStorage.removeItem(k));
}
export function getSavedUserProfile() {
  try { const d = localStorage.getItem('fp_user_profile'); return d ? JSON.parse(d) : null; } catch { return null; }
}
export function softLogoutUser()    { localStorage.setItem('fp_user_logged_out', '1'); }
export function resumeUserSession() { localStorage.removeItem('fp_user_logged_out'); }
export function isUserLoggedOut()   { return localStorage.getItem('fp_user_logged_out') === '1'; }

async function userRequest(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getUserToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch { throw new Error('Cannot reach server.'); }
  let data;
  try { data = await res.json(); } catch { if (!res.ok) throw new Error(`Server error (${res.status})`); return {}; }
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}
export const userApi = {
  get:    p      => userRequest('GET',    p),
  post:   (p, b) => userRequest('POST',   p, b),
  put:    (p, b) => userRequest('PUT',    p, b),
  patch:  (p, b) => userRequest('PATCH',  p, b),
  delete: p      => userRequest('DELETE', p),
};

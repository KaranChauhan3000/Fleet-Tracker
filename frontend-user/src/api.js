const BASE = import.meta.env.VITE_API_BASE || '/api';

function getToken() {
  return localStorage.getItem('fp_user_token');
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({ message: 'Network error' }));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

export const api = {
  get:    (path)        => request('GET',    path),
  post:   (path, body)  => request('POST',   path, body),
  put:    (path, body)  => request('PUT',    path, body),
  delete: (path)        => request('DELETE', path),
};

// Save token + full user data + profile snapshot (survives logout for "Continue as" screen)
export function saveAuth(token, user) {
  localStorage.setItem('fp_user_token', token);
  localStorage.setItem('fp_user_data',  JSON.stringify(user));
  // Profile kept even after logout so Login page can show "Continue as [Name]"
  localStorage.setItem('fp_user_profile', JSON.stringify({
    name:        user.name,
    employeeId:  user.employeeId,
    companyName: user.companyName,
  }));
}

export function getStoredUser() {
  try { const d = localStorage.getItem('fp_user_data'); return d ? JSON.parse(d) : null; } catch { return null; }
}

export function getSavedProfile() {
  try { const d = localStorage.getItem('fp_user_profile'); return d ? JSON.parse(d) : null; } catch { return null; }
}

// Clears active session but keeps fp_user_profile so "Continue as" screen works
export function clearAuth() {
  localStorage.removeItem('fp_user_token');
  localStorage.removeItem('fp_user_data');
  // fp_user_profile intentionally kept
}

// ── came-from-admin flag ──────────────────────────────────────────────────────
//
// When the admin app opens the user portal (admin tapping a user on their login
// page), it passes three URL params:
//   _t    = user JWT token
//   _u    = employeeId
//   _from = the admin app's own origin  ← this is the key addition
//
// We store _from here so that on logout we can send the admin back to the
// correct admin portal URL — without depending on VITE_ADMIN_APP_URL being
// correctly configured on this (user) app's deployment.
//
// Normal users who open the user portal directly never have _from set,
// so isAdminSession() stays false and logout just shows the user login page.

export function setAdminSession(adminOrigin) {
  localStorage.setItem('fp_from_admin', '1');
  // Store the admin app's origin so getLogoutDestination() can use it
  if (adminOrigin) {
    localStorage.setItem('fp_admin_origin', adminOrigin);
  }
}

export function isAdminSession() {
  return localStorage.getItem('fp_from_admin') === '1';
}

export function clearAdminSession() {
  localStorage.removeItem('fp_from_admin');
  localStorage.removeItem('fp_admin_origin');
}

// ── redirect helpers ──────────────────────────────────────────────────────────

// Env-var fallback — used only if _from was somehow not passed (shouldn't happen
// with the updated admin Login.jsx, but kept as a safety net).
const ADMIN_APP_ORIGIN = (import.meta.env.VITE_ADMIN_APP_URL || '').replace(/\/$/, '');

export function getCompanySlug() {
  const params = new URLSearchParams(window.location.search);
  const urlSlug = params.get('company');
  if (urlSlug) { localStorage.setItem('fp_company_slug', urlSlug); return urlSlug; }
  return localStorage.getItem('fp_company_slug') || '';
}

/**
 * Called on logout.
 *
 * - If this session was started by the admin app (_from was stored):
 *     → return the admin app URL so the user gets sent back there.
 *       They will land on the ADMIN login page which shows both
 *       "Continue as Admin" and "Continue as User".
 *
 * - If this is a normal user session (no _from):
 *     → return null, which tells App.jsx to just do setUser(null)
 *       and stay on the user login page.
 */
export function getLogoutDestination() {
  if (isAdminSession()) {
    // Prefer the origin the admin app passed directly (_from param).
    // Fall back to the env var only as a last resort.
    const adminOrigin = localStorage.getItem('fp_admin_origin') || ADMIN_APP_ORIGIN;
    clearAdminSession(); // removes fp_from_admin + fp_admin_origin
    clearAuth();
    const slug = localStorage.getItem('fp_company_slug') || '';
    return slug ? `${adminOrigin}/?company=${slug}` : `${adminOrigin}/`;
  }
  return null; // null = stay on user app login page
}

export const fmt       = (n, d = 2) => n == null || isNaN(n) ? '—' : Number(n).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
export const fmtDate   = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
export const fmtDateTime = d => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
